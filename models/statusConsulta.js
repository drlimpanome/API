import DataTypes from 'sequelize'
import sequelize from '../database.js' // Ensure this path matches your Sequelize connection setup

const StatusConsulta = sequelize.define('StatusConsulta', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'status_consulta',
    timestamps: false // No automatic timestamp fields
});

export default StatusConsulta;
