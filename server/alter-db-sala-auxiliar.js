require('dotenv').config();
const { sequelize } = require('./src/models');

async function migrate() {
  try {
    console.log('Iniciando migración...');
    await sequelize.authenticate();
    console.log('Conexión establecida.');

    try {
      await sequelize.query('ALTER TABLE programas ADD COLUMN tiene_sala_auxiliar BOOLEAN NOT NULL DEFAULT TRUE;');
      console.log('✅ Columna tiene_sala_auxiliar añadida a programas.');
    } catch(e) { 
      console.log('tiene_sala_auxiliar ya existe o error:', e.message); 
    }

    console.log('Migración completada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

migrate();
