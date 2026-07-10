require('dotenv').config();
const { Sequelize } = require('sequelize');

// Aiven (y la mayoría de proveedores de MySQL gestionado) exigen conexión SSL.
// En desarrollo local normalmente NO la necesitas, así que se activa solo si
// DB_SSL=true está definido en tu .env (ver .env.example).
const dialectOptions = process.env.DB_SSL === 'true'
  ? { ssl: { require: true, rejectUnauthorized: false } }
  : {};

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    dialectOptions,
    logging: false,
    define: {
      underscored: true, // usa snake_case en la BD (created_at, user_id, etc.)
    },
  }
);

module.exports = sequelize;
