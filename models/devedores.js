import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const Devedores = sequelize.define('devedores', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    credor: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    data_primeira_ocorrencia: {
        type: DataTypes.DATE,
        allowNull: true
    },
    data_ultima_ocorrencia: {
        type: DataTypes.DATE,
        allowNull: true
    },
    quantidade: {
        type: DataTypes.INTEGER,
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
    tableName: 'devedores',
    timestamps: false
});

export default Devedores;
