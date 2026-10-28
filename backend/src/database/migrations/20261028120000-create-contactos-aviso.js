'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contactos_aviso', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nombre: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      puesto: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      // User Key de la cuenta de Pushover de la persona.
      pushover_user: {
        type: Sequelize.STRING(30),
        allowNull: false,
      },
      // Vacío = suena en todos sus dispositivos.
      pushover_device: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      // Vacío = el sonido por omisión (PUSHOVER_SONIDO).
      sonido: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      activo: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contactos_aviso');
  },
};
