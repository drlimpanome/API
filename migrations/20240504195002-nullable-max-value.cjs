'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('faixa_financeira', 'max_value', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true // Allowing NULL values
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('faixa_financeira', 'max_value', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false // Reverting back to NOT allowing NULLs
    });
  }
};
