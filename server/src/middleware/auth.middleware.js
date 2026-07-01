const jwt = require('jsonwebtoken');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// Verifica el JWT y adjunta el usuario autenticado a req.user
exports.protect = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No autenticado. Inicia sesión.', 401));
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findByPk(decoded.id);
  if (!user || !user.activo) {
    return next(new AppError('El usuario ya no existe o está inactivo.', 401));
  }

  req.user = user;
  next();
});

// Restringe el acceso solo a ciertos roles, ej: restrictTo('admin')
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.rol)) {
    return next(new AppError('No tienes permiso para realizar esta acción.', 403));
  }
  next();
};
