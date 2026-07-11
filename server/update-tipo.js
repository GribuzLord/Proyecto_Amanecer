const { TipoParte } = require('./src/models');
const sequelize = require('./src/config/database');

async function run() {
  try {
    await sequelize.authenticate();
    await TipoParte.update(
      { requiereAyudante: true, restriccionGenero: 'ninguna' },
      { where: { codigo: 'discurso_estudiante' } }
    );
    console.log('✅ Actualizado discurso_estudiante');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
