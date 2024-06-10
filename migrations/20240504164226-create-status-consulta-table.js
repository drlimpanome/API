'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('status_consulta', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING
      },
      message: {
        allowNull: true,
        type: Sequelize.STRING
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('status_consulta');
  }
};
