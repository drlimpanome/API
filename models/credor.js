import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const Credor = sequelize.define('credor', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    data_consulta: {
        type: DataTypes.DATE,
        allowNull: true
    },
    hora_consulta: {
        type: DataTypes.TIME,
        allowNull: true
    },
    arquivo_pdf: {
        type: DataTypes.STRING(255),
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
    tableName: 'credor',
    timestamps: false
});

export default Credor;
