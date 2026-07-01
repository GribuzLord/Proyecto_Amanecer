const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TipoParte = sequelize.define('TipoParte', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  seccion: {
    type: DataTypes.ENUM('encabezado', 'tesoros', 'maestros', 'vida_cristiana', 'atalaya'),
    allowNull: false,
  },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  requiereSala: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'requiere_sala' },
  requiereAyudante: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'requiere_ayudante' },
  restriccionGenero: {
    type: DataTypes.ENUM('M', 'F', 'ninguna'),
    defaultValue: 'ninguna',
    field: 'restriccion_genero',
  },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'tipos_parte',
  timestamps: false,
});

module.exports = TipoParte;
