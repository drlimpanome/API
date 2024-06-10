import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const SCPC = sequelize.define('scpc', {
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
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    contrato: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    origem: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    cidade: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    uf: {
        type: DataTypes.STRING(2),
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
    tableName: 'scpc',
    timestamps: false
});

export default SCPC;
