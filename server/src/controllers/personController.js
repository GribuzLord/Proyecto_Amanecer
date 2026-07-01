const { Persona } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Todas las rutas aquí están protegidas y siempre filtran por req.user.id
// (cada usuario/congregación solo ve y gestiona su propio personal)

// GET /api/personas
exports.getAllPersonas = catchAsync(async (req, res) => {
  const personas = await Persona.findAll({
    where: { userId: req.user.id },
    order: [['nombre', 'ASC']],
  });
  res.status(200).json({ status: 'success', results: personas.length, personas });
});

// POST /api/personas
exports.createPersona = catchAsync(async (req, res, next) => {
  const { nombre, genero, privilegio, habilitaciones } = req.body;
  if (!nombre || !genero) {
    return next(new AppError('Nombre y género son obligatorios.', 400));
  }

  const persona = await Persona.create({
    userId: req.user.id,
    nombre,
    genero,
    privilegio,
    habilitaciones: habilitaciones || [],
  });

  res.status(201).json({ status: 'success', persona });
});

// PATCH /api/personas/:id
exports.updatePersona = catchAsync(async (req, res, next) => {
  const persona = await Persona.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!persona) return next(new AppError('Persona no encontrada.', 404));

  const { nombre, genero, privilegio, habilitaciones, activo } = req.body;
  await persona.update({ nombre, genero, privilegio, habilitaciones, activo });

  res.status(200).json({ status: 'success', persona });
});

// DELETE /api/personas/:id
exports.deletePersona = catchAsync(async (req, res, next) => {
  const persona = await Persona.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!persona) return next(new AppError('Persona no encontrada.', 404));

  await persona.destroy();
  res.status(204).json({ status: 'success', data: null });
});
