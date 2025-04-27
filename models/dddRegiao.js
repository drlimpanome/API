// models/dddRegiao.js
import { DataTypes } from 'sequelize';
import sequelize from '../database.js';

const DddRegiao = sequelize.define('DddRegiao', {
  ddd: {
    type: DataTypes.SMALLINT,
    primaryKey: true,
    allowNull: false
  },
  uf: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  regiao: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  sigla_regiao: {
    type: DataTypes.STRING(10),
    allowNull: false
  }
}, {
  tableName: 'ddd_regioes',
  timestamps: false
});

export default DddRegiao;
