import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const INFOSEG = sequelize.define('infoseg', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    data: {
        type: DataTypes.DATE,
        allowNull: true
    },
    tipo: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    resultado: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'infoseg',
    timestamps: false
});

export default INFOSEG;
