const sequelize = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function run() {
  try {
    await sequelize.authenticate();
    
    try {
      await sequelize.query('ALTER TABLE personas ADD COLUMN apoya_acomodador BOOLEAN DEFAULT false;', { type: QueryTypes.RAW });
      console.log('✅ Columna apoya_acomodador añadida a personas.');
    } catch(e) { console.log('apoya_acomodador ya existe o error:', e.message); }

    try {
      await sequelize.query('ALTER TABLE personas ADD COLUMN ultima_asignacion_acomodador DATE;', { type: QueryTypes.RAW });
      console.log('✅ Columna ultima_asignacion_acomodador añadida a personas.');
    } catch(e) { console.log('ultima_asignacion_acomodador ya existe o error:', e.message); }

    try {
      await sequelize.query('ALTER TABLE users ADD COLUMN dia_entre_semana INTEGER DEFAULT 3;', { type: QueryTypes.RAW });
      console.log('✅ Columna dia_entre_semana añadida a users.');
    } catch(e) { console.log('dia_entre_semana ya existe o error:', e.message); }

    try {
      await sequelize.query('ALTER TABLE users ADD COLUMN dia_fin_semana INTEGER DEFAULT 7;', { type: QueryTypes.RAW });
      console.log('✅ Columna dia_fin_semana añadida a users.');
    } catch(e) { console.log('dia_fin_semana ya existe o error:', e.message); }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
