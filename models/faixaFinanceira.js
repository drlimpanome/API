import DataTypes  from 'sequelize'
import sequelize from '../database.js' // Ensure this path matches your Sequelize connection setup

const FaixaFinanceira = sequelize.define('FaixaFinanceira', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    min_value: {
        type: DataTypes.DECIMAL(10, 2), // Adjust precision and scale as needed
        allowNull: false
    },
    max_value: {
        type: DataTypes.DECIMAL(10, 2), // Adjust precision and scale as needed
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'faixa_financeira',
    timestamps: false // No automatic timestamp fields
});

export default FaixaFinanceira;
