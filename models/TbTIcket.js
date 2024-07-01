import DataTypes from 'sequelize';
import sequelize from '../database.js'; // Ensure this path matches your Sequelize connection setup

const Ticket = sequelize.define('tbTickets', {
    id_ticket: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    contact_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    whatsapp_id: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    cpf: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'tbTickets', // Use the table name as per your schema
    timestamps: false // Assuming you're manually handling the `created_at` timestamp
});

export default Ticket;
