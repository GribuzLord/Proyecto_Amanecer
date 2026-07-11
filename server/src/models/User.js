const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  rol: { type: DataTypes.ENUM('admin', 'usuario'), allowNull: false, defaultValue: 'usuario' },
  nombreCongregacion: { type: DataTypes.STRING(150), field: 'nombre_congregacion' },
  diaEntreSemana: { type: DataTypes.INTEGER, defaultValue: 3, field: 'dia_entre_semana' }, // 3 = Miércoles
  diaFinSemana: { type: DataTypes.INTEGER, defaultValue: 7, field: 'dia_fin_semana' }, // 7 = Domingo
  activo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  tableName: 'users',
});

module.exports = User;
