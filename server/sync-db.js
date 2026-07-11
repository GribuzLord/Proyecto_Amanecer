require('dotenv').config();
const { sequelize } = require('./src/models');

async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB Connected.');
    await sequelize.sync({ alter: true });
    console.log('✅ DB Synced.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

syncDB();
