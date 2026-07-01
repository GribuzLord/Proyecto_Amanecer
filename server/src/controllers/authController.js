const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/login
// Nota: no hay auto-registro. Las cuentas las crea el admin (ver userController).
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Proporciona correo y contraseña.', 400));
  }

  const user = await User.findOne({ where: { email } });
  if (!user || !user.activo || !(await bcrypt.compare(password, user.passwordHash))) {
    return next(new AppError('Correo o contraseña incorrectos.', 401));
  }

  const token = signToken(user.id);
  res.status(200).json({
    status: 'success',
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      nombreCongregacion: user.nombreCongregacion,
    },
  });
});

// GET /api/auth/me
exports.getMe = catchAsync(async (req, res) => {
  const { id, nombre, email, rol, nombreCongregacion } = req.user;
  res.status(200).json({ status: 'success', user: { id, nombre, email, rol, nombreCongregacion } });
});
