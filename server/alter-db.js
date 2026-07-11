const sequelize = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function run() {
  try {
    await sequelize.authenticate();
    await sequelize.query('ALTER TABLE programas ADD COLUMN es_discurso_maestros BOOLEAN DEFAULT false;', { type: QueryTypes.RAW });
    console.log('✅ Columna es_discurso_maestros añadida exitosamente.');
  } catch (err) {
    if (err.message.includes('Duplicate column name')) {
      console.log('La columna ya existe.');
    } else {
      console.error(err);
    }
  } finally {
    process.exit(0);
  }
}
run();
