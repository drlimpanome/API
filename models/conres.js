import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const CONRES = sequelize.define('conres', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    motivo_numero: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    motivo_nome: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    dt_inicio: {
        type: DataTypes.DATE,
        allowNull: true
    },
    dt_fim: {
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
    tableName: 'conres',
    timestamps: false
});

export default CONRES;
