const bcrypt = require('bcryptjs');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Todas estas rutas están protegidas y restringidas a rol 'admin' (ver routes/user.routes.js)

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

  const { nombre, nombreCongregacion, activo } = req.body;
  await user.update({ nombre, nombreCongregacion, activo });

  res.status(200).json({ status: 'success', user });
});

// DELETE /api/users/:id
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return next(new AppError('Usuario no encontrado.', 404));

  await user.destroy();
  res.status(204).json({ status: 'success', data: null });
});
