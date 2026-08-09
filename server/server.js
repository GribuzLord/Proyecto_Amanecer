require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida.');

    // En desarrollo puedes usar { alter: true } para sincronizar cambios de modelos.
    // En producción, usa migraciones en vez de sync().
    // await sequelize.sync({ alter: true });
  } catch (err) {
    console.error('⚠️ Advertencia: No se pudo conectar a la base de datos (Aiven puede estar apagado):', err.message);
    console.error('⚠️ El servidor seguirá escuchando para poder informar el error 503 a los clientes.');
  }

  // Siempre levantar el servidor express, aunque la DB esté caída, 
  // para que nuestro middleware de errores pueda informar amigablemente al cliente.
  app.listen(PORT, () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
  });
}

start();
