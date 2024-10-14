"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'saldo' column to 'users' table
    await queryInterface.addColumn("users", "saldo", {
      type: Sequelize.STRING,
      allowNull: false, // Password is required for all users
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove 'saldo' column from 'users' table
    await queryInterface.removeColumn("users", "saldo");
  },
};
