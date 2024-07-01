import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const SICCF = sequelize.define('siccf', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    banco: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    agencia: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    tp_conta: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    alinea: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    qtd: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    data: {
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
    tableName: 'siccf',
    timestamps: false
});

export default SICCF;
