const { Programa, PartePrograma } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { generarPrograma, finalizarPrograma } = require('../services/programGenerator.service');
const { generateProgramPDF } = require('../services/pdfGenerator.service');
const { generateSlipsPDF } = require('../services/slipsGenerator.service');

// GET /api/programas
exports.getAllProgramas = catchAsync(async (req, res) => {
  const programas = await Programa.findAll({
    where: { userId: req.user.id },
    order: [['semanaInicio', 'DESC']],
  });
  res.status(200).json({ status: 'success', results: programas.length, programas });
});

// GET /api/programas/:id  (con todas sus partes, para el editor)
exports.getPrograma = catchAsync(async (req, res, next) => {
  const programa = await Programa.findOne({
    where: { id: req.params.id, userId: req.user.id },
    include: [{ association: 'partes', include: ['tipoParte', 'persona'] }],
    order: [
      [{ model: require('../models').PartePrograma, as: 'partes' }, 'orden', 'ASC'],
      [{ model: require('../models').PartePrograma, as: 'partes' }, 'id', 'ASC']
    ]
  });
  if (!programa) return next(new AppError('Programa no encontrado.', 404));
  res.status(200).json({ status: 'success', programa });
});

// POST /api/programas/generar
// Body: { semanaInicio: 'YYYY-MM-DD', semanaFin: 'YYYY-MM-DD' }
// Genera (o regenera) el borrador semi-automático con un clic.
exports.generarPrograma = catchAsync(async (req, res, next) => {
  const { semanaInicio, semanaFin } = req.body;
  if (!semanaInicio || !semanaFin) {
    return next(new AppError('Debes indicar semanaInicio y semanaFin.', 400));
  }

  const programa = await generarPrograma({ userId: req.user.id, semanaInicio, semanaFin });
  res.status(200).json({ status: 'success', programa });
});

// PATCH /api/programas/:id/partes/:parteId
// Permite editar manualmente una parte antes de exportar (persona, título, texto libre)
exports.updateParte = catchAsync(async (req, res, next) => {
  const parte = await PartePrograma.findOne({
    where: { id: req.params.parteId, programaId: req.params.id },
  });
  if (!parte) return next(new AppError('Parte no encontrada.', 404));

  const { titulo, personaId, textoLibre } = req.body;
  await parte.update({ titulo, personaId, textoLibre });

  res.status(200).json({ status: 'success', parte });
});

// PATCH /api/programas/:id
// Permite actualizar campos del programa, como grupoAseo
exports.updatePrograma = catchAsync(async (req, res, next) => {
  const programa = await Programa.findOne({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!programa) return next(new AppError('Programa no encontrado.', 404));

  const { grupoAseo, esDiscursoMaestros, plantillaPersonalizadaMaestros, plantillaPersonalizadaVida, tieneSalaAuxiliar } = req.body;
  
  const updateData = {};
  if (grupoAseo !== undefined) updateData.grupoAseo = grupoAseo;
  if (esDiscursoMaestros !== undefined) updateData.esDiscursoMaestros = esDiscursoMaestros;
  if (tieneSalaAuxiliar !== undefined) updateData.tieneSalaAuxiliar = tieneSalaAuxiliar;
  if (plantillaPersonalizadaMaestros !== undefined) updateData.plantillaPersonalizadaMaestros = plantillaPersonalizadaMaestros;
  if (plantillaPersonalizadaVida !== undefined) updateData.plantillaPersonalizadaVida = plantillaPersonalizadaVida;

  await programa.update(updateData);

  res.status(200).json({ status: 'success', programa });
});

// PATCH /api/programas/:id/toggle-custom
// Activa o desactiva la plantilla personalizada para una sección, borrando las partes previas
exports.toggleCustomSection = catchAsync(async (req, res, next) => {
  const { seccion, enabled } = req.body; // seccion: 'maestros' | 'vida_cristiana'
  const programa = await Programa.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!programa) return next(new AppError('Programa no encontrado.', 404));

  const updateField = seccion === 'maestros' ? 'plantillaPersonalizadaMaestros' : 'plantillaPersonalizadaVida';
  await programa.update({ [updateField]: enabled });

  // Borrar todas las partes existentes de esa sección
  const { TipoParte, PartePrograma } = require('../models');
  const tiposSeccion = await TipoParte.findAll({ where: { seccion }, order: [['orden', 'ASC']] });
  const tipoIds = tiposSeccion.map(t => t.id);
  
  await PartePrograma.destroy({ where: { programaId: programa.id, tipoParteId: tipoIds } });

  // Si se desactivó la plantilla personalizada, restaurar la plantilla base para esta sección
  if (!enabled) {
    for (const tipo of tiposSeccion) {
      if (tipo.codigo.startsWith('custom_')) continue;

      const salas = tipo.requiereSala ? ['principal', 'auxiliar'] : ['unica'];
      for (const sala of salas) {
        await PartePrograma.create({
          programaId: programa.id,
          tipoParteId: tipo.id,
          titulo: null,
          sala,
          rolSlot: 'titular',
          personaId: null,
          textoLibre: 'Por asignar',
          orden: tipo.orden,
        });

        if (tipo.requiereAyudante) {
          await PartePrograma.create({
            programaId: programa.id,
            tipoParteId: tipo.id,
            sala,
            rolSlot: 'ayudante',
            personaId: null,
            textoLibre: 'Por asignar',
            orden: tipo.orden,
          });
        }
      }
    }
  }

  res.status(200).json({ status: 'success', programa });
});

// POST /api/programas/:id/partes-custom
// Añade una parte dinámica a una sección personalizada
exports.addCustomParte = catchAsync(async (req, res, next) => {
  const { seccion, requiereAyudante, requiereSala, titulo, esEstudioLibro } = req.body;
  const { TipoParte, PartePrograma } = require('../models');

  const programaId = req.params.id;

  if (seccion === 'vida_cristiana' && esEstudioLibro) {
    const tipoEstudio = await TipoParte.findOne({ where: { codigo: 'estudio_congregacion' } });
    const tipoLector = await TipoParte.findOne({ where: { codigo: 'lector_estudio' } });
    if (!tipoEstudio || !tipoLector) return next(new AppError('Tipos de parte del estudio no encontrados', 500));

    const grupoCustom = Date.now().toString() + Math.floor(Math.random() * 1000);
    const creadas = await PartePrograma.bulkCreate([
      {
        programaId,
        tipoParteId: tipoEstudio.id,
        titulo: 'Estudio Bíblico de la Congregación',
        sala: 'unica',
        rolSlot: 'titular',
        textoLibre: 'Por asignar',
        grupoCustom,
        orden: 98
      },
      {
        programaId,
        tipoParteId: tipoLector.id,
        titulo: 'Lector del Estudio',
        sala: 'unica',
        rolSlot: 'titular',
        textoLibre: 'Por asignar',
        grupoCustom,
        orden: 99
      }
    ]);
    return res.status(201).json({ status: 'success', partes: creadas });
  }

  const codigoTipo = seccion === 'maestros' 
    ? (req.body.esDiscurso ? 'discurso_estudiante' : 'custom_maestros') 
    : 'custom_vida_cristiana';
  const tipoParte = await TipoParte.findOne({ where: { codigo: codigoTipo } });

  if (!tipoParte) return next(new AppError('Tipo de parte genérico no encontrado en BD', 500));

  const grupoCustom = Date.now().toString() + Math.floor(Math.random() * 1000);
  const partesACrear = [];
  const salas = requiereSala ? ['principal', 'auxiliar'] : ['unica'];

  for (const sala of salas) {
    partesACrear.push({
      programaId,
      tipoParteId: tipoParte.id,
      titulo: titulo || 'Asignación Nueva',
      sala,
      rolSlot: 'titular',
      textoLibre: 'Por asignar',
      grupoCustom,
      orden: tipoParte.orden
    });

    if (requiereAyudante) {
      partesACrear.push({
        programaId,
        tipoParteId: tipoParte.id,
        titulo: titulo || 'Asignación Nueva',
        sala,
        rolSlot: 'ayudante',
        textoLibre: 'Por asignar',
        grupoCustom,
        orden: tipoParte.orden
      });
    }
  }

  const creadas = await PartePrograma.bulkCreate(partesACrear);
  res.status(201).json({ status: 'success', partes: creadas });
});

// DELETE /api/programas/:id/partes-custom/:grupoCustom
// Elimina una parte dinámica completa
exports.deleteCustomParte = catchAsync(async (req, res, next) => {
  const { PartePrograma } = require('../models');
  await PartePrograma.destroy({
    where: { programaId: req.params.id, grupoCustom: req.params.grupoCustom }
  });
  res.status(204).json({ status: 'success', data: null });
});

// POST /api/programas/:id/finalizar
// Congela el programa y actualiza el historial de rotación de cada persona
exports.finalizarPrograma = catchAsync(async (req, res, next) => {
  const programa = await finalizarPrograma(req.params.id, req.user.id);
  if (!programa) return next(new AppError('Programa no encontrado.', 404));
  res.status(200).json({ status: 'success', programa });
});

// GET /api/programas/:id/pdf
exports.exportarPdf = catchAsync(async (req, res, next) => {
  const programa = await Programa.findOne({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!programa) return next(new AppError('Programa no encontrado.', 404));

  const pdfBuffer = await generateProgramPDF(req.params.id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="programa-${programa.semanaInicio}.pdf"`);
  res.send(pdfBuffer);
});

// GET /api/programas/:id/hojitas
exports.exportarHojitasPdf = catchAsync(async (req, res, next) => {
  const programa = await Programa.findOne({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!programa) return next(new AppError('Programa no encontrado.', 404));

  const pdfBuffer = await generateSlipsPDF(req.params.id);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="hojitas-S89-${programa.semanaInicio}.pdf"`);
  res.send(pdfBuffer);
});

// DELETE /api/programas/:id
exports.deletePrograma = catchAsync(async (req, res, next) => {
  const programa = await Programa.findOne({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!programa) return next(new AppError('Programa no encontrado.', 404));

  await programa.destroy();
  res.status(204).json({ status: 'success', data: null });
});
