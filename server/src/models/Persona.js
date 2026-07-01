const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Persona = sequelize.define('Persona', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  genero: { type: DataTypes.ENUM('M', 'F'), allowNull: false },
  privilegio: {
    type: DataTypes.ENUM('anciano', 'siervo_ministerial', 'publicador_bautizado', 'publicador_no_bautizado'),
    defaultValue: 'publicador_bautizado',
  },
  // Array de códigos de tipos_parte que puede realizar, ej: ["presidente","discurso_estudiante"]
  habilitaciones: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  ultimaAsignacion: { type: DataTypes.DATEONLY, field: 'ultima_asignacion' },
}, {
  tableName: 'personas',
});

module.exports = Persona;
