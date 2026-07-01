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

    app.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ No se pudo conectar a la base de datos:', err.message);
    process.exit(1);
  }
}

start();
