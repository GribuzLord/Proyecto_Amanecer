const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Programa = sequelize.define('Programa', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  semanaInicio: { type: DataTypes.DATEONLY, allowNull: false, field: 'semana_inicio' },
  semanaFin: { type: DataTypes.DATEONLY, allowNull: false, field: 'semana_fin' },
  estado: { type: DataTypes.ENUM('borrador', 'finalizado'), defaultValue: 'borrador' },
  grupoAseo: { type: DataTypes.STRING(255), field: 'grupo_aseo' },
  pdfPath: { type: DataTypes.STRING(255), field: 'pdf_path' },
  esDiscursoMaestros: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'es_discurso_maestros' },
}, {
  tableName: 'programas',
});

module.exports = Programa;
