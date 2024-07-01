import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const CADIN = sequelize.define('cadin', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    data: {
        type: DataTypes.DATE,
        allowNull: true
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    orgao: {
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
    tableName: 'cadin',
    timestamps: false
});

export default CADIN;
