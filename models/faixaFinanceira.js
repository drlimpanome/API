// models/faixaDivida.js
import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const FaixaDivida = sequelize.define('FaixaDivida', {
  faixa: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    allowNull: false
  },
  divida: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false
  },
  entrada: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false
  },
  parcelas: {
    type: DataTypes.TINYINT,
    allowNull: false
  },
  parcela: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false
  }
}, {
  tableName: 'faixa_divida',
  timestamps: false
});

export default FaixaDivida;
