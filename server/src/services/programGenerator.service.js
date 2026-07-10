const { Op } = require('sequelize');
const { Persona, TipoParte, Programa, PartePrograma } = require('../models');

const habilitacionesMap = {
  'presidente': ['Presidente'],
  'consejero_auxiliar': ['Consejero_sala_auxiliar'],
  'tesoro_1': ['Tesoros_de_la_biblia (1)'],
  'perlas_escondidas': ['Perlas_escondidas'],
  'lectura_biblia': ['Lectura_de_la_biblia'],
  'conversaciones_1': ['Primera_conversación'],
  'conversaciones_2': ['Segunda_conversación'],
  'discurso_estudiante': ['Tercera_conversación', 'Discurso_estudiante'],
  'vida_cristiana_tema': ['Vida_cristiana (7)'],
  'estudio_congregacion': ['Estudio_del_libro'],
  'lector_estudio': ['Lector_libro'],
  'oracion_final': ['Oracion_final'],
  'presidente_atalaya': ['Presidente'],
  'conductor_atalaya': ['Conductor_atalaya'],
  'lector_atalaya': ['Lector_atalaya'],
  'oracion_final_atalaya': ['Oracion_final']
};

/**
 * Busca la mejor persona disponible para un tipo de parte dado.
 * Criterio de "rotación equitativa": prioriza a quien tiene más tiempo
 * sin ser asignado (ultima_asignacion más antigua o nula primero).
 *
 * excluidos: array de IDs de personas ya usadas en ESTE mismo programa,
 * para no repetir a la misma persona dos veces en la misma semana.
 */
async function encontrarCandidato(userId, tipoParte, excluidos = []) {
  const where = {
    userId,
    activo: true,
    id: { [Op.notIn]: excluidos.length ? excluidos : [0] },
  };

  if (tipoParte.restriccionGenero !== 'ninguna') {
    where.genero = tipoParte.restriccionGenero;
  }

  // habilitaciones es JSON (array de códigos). Se filtra en memoria porque
  // el soporte de JSON_CONTAINS varía según versión/config de MySQL.
  const candidatos = await Persona.findAll({
    where,
    order: [
      // NULL primero (nunca asignado), luego el más antiguo
      ['ultimaAsignacion', 'ASC'],
    ],
  });

  const requeridas = habilitacionesMap[tipoParte.codigo] || [tipoParte.codigo];
  return candidatos.find((p) => {
    const habs = p.habilitaciones || [];
    return requeridas.some(req => habs.includes(req));
  }) || null;
}

/**
 * Genera (o regenera) el borrador de un programa para una semana dada,
 * asignando automáticamente personas disponibles a cada tipo de parte.
 * El resultado queda en estado 'borrador' y es editable antes de finalizar.
 */
async function generarPrograma({ userId, semanaInicio, semanaFin }) {
  const [programa] = await Programa.findOrCreate({
    where: { userId, semanaInicio },
    defaults: { userId, semanaInicio, semanaFin, estado: 'borrador' },
  });

  // Si ya existía, limpiamos sus partes para regenerar desde cero
  await PartePrograma.destroy({ where: { programaId: programa.id } });

  const tiposParte = await TipoParte.findAll({ order: [['orden', 'ASC']] });
  const usadosEnEstaSemana = new Set();

  for (const tipo of tiposParte) {
    const salas = tipo.requiereSala ? ['principal', 'auxiliar'] : ['unica'];

    for (const sala of salas) {
      const candidato = await encontrarCandidato(userId, tipo, [...usadosEnEstaSemana]);
      if (candidato) usadosEnEstaSemana.add(candidato.id);

      await PartePrograma.create({
        programaId: programa.id,
        tipoParteId: tipo.id,
        titulo: null, // el usuario lo completa/edita en el frontend (ej. "No tengas miedo")
        sala,
        rolSlot: 'titular',
        personaId: candidato ? candidato.id : null,
        textoLibre: candidato ? null : 'Por asignar',
        orden: tipo.orden,
      });

      if (tipo.requiereAyudante) {
        const ayudante = await encontrarCandidato(userId, tipo, [...usadosEnEstaSemana]);
        if (ayudante) usadosEnEstaSemana.add(ayudante.id);

        await PartePrograma.create({
          programaId: programa.id,
          tipoParteId: tipo.id,
          sala,
          rolSlot: 'ayudante',
          personaId: ayudante ? ayudante.id : null,
          textoLibre: ayudante ? null : 'Por asignar',
          orden: tipo.orden,
        });
      }
    }
  }

  return Programa.findByPk(programa.id, {
    include: [{ association: 'partes', include: ['tipoParte', 'persona'] }],
  });
}

/**
 * Marca el programa como finalizado y actualiza ultima_asignacion
 * de cada persona incluida, para que la próxima generación rote correctamente.
 * Solo aquí se "compromete" la rotación (los borradores no afectan el historial).
 */
async function finalizarPrograma(programaId, userId) {
  const programa = await Programa.findOne({ where: { id: programaId, userId } });
  if (!programa) return null;

  const partes = await PartePrograma.findAll({ where: { programaId } });
  const personaIds = [...new Set(partes.map((p) => p.personaId).filter(Boolean))];

  await Persona.update(
    { ultimaAsignacion: programa.semanaInicio },
    { where: { id: personaIds } }
  );

  programa.estado = 'finalizado';
  await programa.save();
  return programa;
}

module.exports = { generarPrograma, finalizarPrograma };
