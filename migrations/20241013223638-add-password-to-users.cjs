"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add 'passwordHash' column to 'users' table
    await queryInterface.addColumn("users", "passwordHash", {
      type: Sequelize.STRING,
      allowNull: false, // Password is required for all users
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove 'passwordHash' column from 'users' table
    await queryInterface.removeColumn("users", "passwordHash");
  },
};
