const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PartePrograma = sequelize.define('PartePrograma', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  programaId: { type: DataTypes.INTEGER, allowNull: false, field: 'programa_id' },
  tipoParteId: { type: DataTypes.INTEGER, allowNull: false, field: 'tipo_parte_id' },
  titulo: { type: DataTypes.STRING(255) },
  sala: { type: DataTypes.ENUM('principal', 'auxiliar', 'unica'), defaultValue: 'unica' },
  rolSlot: { type: DataTypes.STRING(40), defaultValue: 'titular', field: 'rol_slot' },
  personaId: { type: DataTypes.INTEGER, field: 'persona_id' },
  textoLibre: { type: DataTypes.STRING(150), field: 'texto_libre' },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'partes_programa',
  timestamps: false,
});

module.exports = PartePrograma;
