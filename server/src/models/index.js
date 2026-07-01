const sequelize = require('../config/database');
const User = require('./User');
const Persona = require('./Persona');
const TipoParte = require('./TipoParte');
const Programa = require('./Programa');
const PartePrograma = require('./PartePrograma');

// -------- Asociaciones --------
User.hasMany(Persona, { foreignKey: 'userId', onDelete: 'CASCADE' });
Persona.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Programa, { foreignKey: 'userId', onDelete: 'CASCADE' });
Programa.belongsTo(User, { foreignKey: 'userId' });

Programa.hasMany(PartePrograma, { foreignKey: 'programaId', onDelete: 'CASCADE', as: 'partes' });
PartePrograma.belongsTo(Programa, { foreignKey: 'programaId' });

TipoParte.hasMany(PartePrograma, { foreignKey: 'tipoParteId' });
PartePrograma.belongsTo(TipoParte, { foreignKey: 'tipoParteId', as: 'tipoParte' });

Persona.hasMany(PartePrograma, { foreignKey: 'personaId' });
PartePrograma.belongsTo(Persona, { foreignKey: 'personaId', as: 'persona' });

module.exports = { sequelize, User, Persona, TipoParte, Programa, PartePrograma };
