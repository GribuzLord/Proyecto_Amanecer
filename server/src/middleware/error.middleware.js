module.exports = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Error interno del servidor';

  // Interceptar errores de conexión a la base de datos (Aiven apagado)
  if (
    err.code === 'ENOTFOUND' || 
    err.code === 'ETIMEDOUT' || 
    err.name === 'SequelizeConnectionError' || 
    err.name === 'SequelizeHostNotFoundError' ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNREFUSED')
  ) {
    statusCode = 503;
    message = 'La base de datos se encuentra apagada por inactividad. Por favor, contacta al administrador del sistema para encenderla.';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    status,
    message,
  });
};
