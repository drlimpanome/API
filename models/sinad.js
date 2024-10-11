import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const SINAD = sequelize.define('sinad', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    filial: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    tipo_cliente: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    agencia: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    numero: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    operacao: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    sistema: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    situacao: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    data_inadimplencia: {
        type: DataTypes.DATE,
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
    tableName: 'sinad',
    timestamps: false
});

export default SINAD;
