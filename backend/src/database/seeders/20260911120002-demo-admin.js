'use strict';

const bcrypt = require('bcryptjs');

// Usuario inicial para poder entrar por primera vez. Cambia la contraseña
// desde la base de datos (o agrega una pantalla de "cambiar contraseña")
// en cuanto tengas acceso.
const EMAIL = 'admin@sipresidencia.local';
const PASSWORD_INICIAL = 'Presidencia2026!';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash(PASSWORD_INICIAL, 10);
    await queryInterface.bulkInsert('usuarios', [
      {
        nombre: 'Administrador',
        email: EMAIL,
        password_hash: passwordHash,
        rol: 'administrador',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuarios', { email: EMAIL });
  },
};
