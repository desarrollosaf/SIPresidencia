'use strict';

// Equipos de la vista "Llamar": cada persona pertenece a un encargado y cada equipo tiene
// su propia tableta (/tableta/<slug>). Las personas que ya existían quedan en "presidente".
const EQUIPOS = [
  {
    slug: 'presidente',
    nombre: 'Presidente',
    encargado: 'Francisco Vázquez',
    orden: 1,
  },
  { slug: 'omar', nombre: 'Omar', encargado: 'Omar', orden: 2 },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('equipos_aviso', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      // Parte de la dirección de su tableta: /tableta/<slug>
      slug: {
        type: Sequelize.STRING(40),
        allowNull: false,
        unique: true,
      },
      nombre: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      // Quién llama; firma las alertas ("— Francisco Vázquez").
      encargado: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      orden: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    const now = new Date();
    await queryInterface.bulkInsert(
      'equipos_aviso',
      EQUIPOS.map((e) => ({ ...e, created_at: now, updated_at: now })),
    );

    await queryInterface.addColumn('contactos_aviso', 'equipo_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'equipos_aviso', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.sequelize.query(
      `UPDATE contactos_aviso
          SET equipo_id = (SELECT id FROM equipos_aviso WHERE slug = 'presidente')
        WHERE equipo_id IS NULL`,
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('contactos_aviso', 'equipo_id');
    await queryInterface.dropTable('equipos_aviso');
  },
};
