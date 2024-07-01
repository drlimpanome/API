'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adding auto-increment ID column
    await queryInterface.addColumn('faixa_financeira', 'id', {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Removing the ID column
    await queryInterface.removeColumn('faixa_financeira', 'id');
  }
};
