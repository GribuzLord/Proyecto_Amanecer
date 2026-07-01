require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models');

async function seed() {
  await sequelize.authenticate();

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE || 'Administrador';

  const existente = await User.findOne({ where: { email } });
  if (existente) {
    console.log('El admin ya existe:', email);
    return process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ nombre, email, passwordHash, rol: 'admin', activo: true });

  console.log('✅ Admin creado:', email);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
