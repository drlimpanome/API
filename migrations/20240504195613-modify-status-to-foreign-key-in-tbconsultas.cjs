'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('tbconsultas', 'status', 'status_id');
    await queryInterface.changeColumn('tbconsultas', 'status_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'status_consulta', // name of the target table
        key: 'id', // key in the target table
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('tbconsultas', 'status_id');
    await queryInterface.addColumn('tbconsultas', 'status', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
  }
};
