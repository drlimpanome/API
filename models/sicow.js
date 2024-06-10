import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const SICOW = sequelize.define('sicow', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    cargo: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    orgao: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    dt_nomeacao: {
        type: DataTypes.DATE,
        allowNull: true
    },
    dt_exoneracao: {
        type: DataTypes.DATE,
        allowNull: true
    },
    cpf: {
        type: DataTypes.STRING(11),
        allowNull: true
    },
    nome: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    tp_vinculo: {
        type: DataTypes.STRING(50),
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
    tableName: 'sicow',
    timestamps: false
});

export default SICOW;
