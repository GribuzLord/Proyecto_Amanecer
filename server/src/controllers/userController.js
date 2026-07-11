const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Todas estas rutas están protegidas y restringidas a rol 'admin' (ver routes/user.routes.js), excepto getMe y updateMyConfig

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'nombre', 'email', 'nombreCongregacion', 'diaEntreSemana', 'diaFinSemana']
  });
  res.status(200).json({ status: 'success', user });
});

exports.updateMyConfig = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);
  if (!user) return next(new AppError('Usuario no encontrado.', 404));

  const { diaEntreSemana, diaFinSemana } = req.body;
  
  if (diaEntreSemana !== undefined) user.diaEntreSemana = diaEntreSemana;
  if (diaFinSemana !== undefined) user.diaFinSemana = diaFinSemana;
  
  await user.save();
  
  res.status(200).json({ status: 'success', user: { diaEntreSemana: user.diaEntreSemana, diaFinSemana: user.diaFinSemana } });
});

// GET /api/users
exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.findAll({
    attributes: ['id', 'nombre', 'email', 'rol', 'nombreCongregacion', 'activo', 'createdAt'],
    order: [['createdAt', 'DESC']],
  });
  res.status(200).json({ status: 'success', results: users.length, users });
});

// POST /api/users  -> el admin crea un usuario autorizado (congregación)
exports.createUser = catchAsync(async (req, res, next) => {
  const { nombre, email, password, nombreCongregacion, rol } = req.body;
  if (!nombre || !email || !password) {
    return next(new AppError('Nombre, correo y contraseña son obligatorios.', 400));
  }

  const existente = await User.findOne({ where: { email } });
  if (existente) return next(new AppError('Ya existe un usuario con ese correo.', 400));

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    nombre,
    email,
    passwordHash,
    nombreCongregacion,
    rol: rol === 'admin' ? 'admin' : 'usuario',
  });

  res.status(201).json({
    status: 'success',
    user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
  });
});

// PATCH /api/users/:id  -> activar/desactivar o editar datos básicos
exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return next(new AppError('Usuario no encontrado.', 404));

  const { nombre, email, password, nombreCongregacion, activo } = req.body;
  const updateData = { nombre, nombreCongregacion };
  
  if (activo !== undefined) updateData.activo = activo;

  if (email && email !== user.email) {
    const existente = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
    if (existente) return next(new AppError('Ya existe otro usuario con ese correo.', 400));
    updateData.email = email;
  }

  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 12);
  }

  await user.update(updateData);

  res.status(200).json({ status: 'success', user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, activo: user.activo } });
});

// DELETE /api/users/:id
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return next(new AppError('Usuario no encontrado.', 404));

  await user.destroy();
  res.status(204).json({ status: 'success', data: null });
});
