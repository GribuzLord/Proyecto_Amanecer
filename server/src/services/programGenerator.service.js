const { Op } = require('sequelize');
const { sequelize, Persona, TipoParte, Programa, PartePrograma } = require('../models');

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
    if (tipo.codigo.startsWith('custom_')) continue;

    const salas = tipo.requiereSala ? ['principal', 'auxiliar'] : ['unica'];

    for (const sala of salas) {
      await PartePrograma.create({
        programaId: programa.id,
        tipoParteId: tipo.id,
        titulo: null, // el usuario lo completa/edita en el frontend (ej. "No tengas miedo")
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

  return Programa.findByPk(programa.id, {
    include: [{ association: 'partes', include: ['tipoParte', 'persona'] }],
  });
}

/**
 * Marca el programa como finalizado (o actualiza sus asignaciones) y re-sincroniza
 * ultima_asignacion de cada persona de la congregación de forma precisa.
 * Cada persona tendrá como ultima_asignacion la fecha del programa finalizado
 * más reciente en el que participe (o NULL si no tiene ninguna participación finalizada).
 */
async function finalizarPrograma(programaId, userId) {
  const programa = await Programa.findOne({ where: { id: programaId, userId } });
  if (!programa) return null;

  programa.estado = 'finalizado';
  await programa.save();

  // Sincronización precisa y global de ultima_asignacion para toda la congregación
  await sequelize.query(`
    UPDATE personas p
    LEFT JOIN (
      SELECT pp.persona_id, MAX(pr.semana_inicio) as ultima_fecha
      FROM partes_programa pp
      JOIN programas pr ON pp.programa_id = pr.id
      WHERE pr.user_id = :userId 
        AND pr.estado = 'finalizado' 
        AND pp.persona_id IS NOT NULL
      GROUP BY pp.persona_id
    ) ult ON p.id = ult.persona_id
    SET p.ultima_asignacion = ult.ultima_fecha
    WHERE p.user_id = :userId
  `, {
    replacements: { userId }
  });

  return programa;
}

module.exports = { generarPrograma, finalizarPrograma };
