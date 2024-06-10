'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('faixa_financeira', {
      min_value: {
        allowNull: false,
        type: Sequelize.DECIMAL(10, 2) // Adjust precision and scale according to your needs
      },
      max_value: {
        allowNull: false,
        type: Sequelize.DECIMAL(10, 2) // Adjust precision and scale according to your needs
      },
      name: {
        allowNull: false,
        type: Sequelize.STRING
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('faixa_financeira');
  }
};
