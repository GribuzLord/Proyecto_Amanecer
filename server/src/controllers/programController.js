const { Programa, PartePrograma } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { generarPrograma, finalizarPrograma } = require('../services/programGenerator.service');
const { generateProgramPDF } = require('../services/pdfGenerator.service');

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

  const { grupoAseo } = req.body;
  await programa.update({ grupoAseo });

  res.status(200).json({ status: 'success', programa });
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

// DELETE /api/programas/:id
exports.deletePrograma = catchAsync(async (req, res, next) => {
  const programa = await Programa.findOne({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!programa) return next(new AppError('Programa no encontrado.', 404));

  await programa.destroy();
  res.status(204).json({ status: 'success', data: null });
});
