require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida.');

    // Auto-migraciones para la actualización de Plantillas Personalizadas
    await sequelize.query('ALTER TABLE programas ADD COLUMN plantilla_personalizada_maestros BOOLEAN NOT NULL DEFAULT FALSE').catch(() => {});
    await sequelize.query('ALTER TABLE programas ADD COLUMN plantilla_personalizada_vida BOOLEAN NOT NULL DEFAULT FALSE').catch(() => {});
    await sequelize.query('ALTER TABLE partes_programa ADD COLUMN grupo_custom VARCHAR(60) NULL').catch(() => {});
    
    await sequelize.query(`INSERT IGNORE INTO tipos_parte (codigo, seccion, nombre, requiere_sala, requiere_ayudante, restriccion_genero, orden) VALUES ('custom_maestros', 'maestros', 'Asignación Dinámica', TRUE, TRUE, 'ninguna', 8);`).catch(() => {});
    await sequelize.query(`INSERT IGNORE INTO tipos_parte (codigo, seccion, nombre, requiere_sala, requiere_ayudante, restriccion_genero, orden) VALUES ('custom_vida_cristiana', 'vida_cristiana', 'Participación Dinámica', FALSE, FALSE, 'ninguna', 13);`).catch(() => {});

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
