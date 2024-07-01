'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Adding a new column 'url' to 'tbconsultas'
    await queryInterface.addColumn('tbconsultas', 'url', {
      type: Sequelize.STRING,
      allowNull: true, // Assuming the URL is not mandatory for all records
      after: 'documento' // Optional: specifies where to place the new column in the table
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Removing the column 'url' from 'tbconsultas'
    await queryInterface.removeColumn('tbconsultas', 'url');
  }
};
