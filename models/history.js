import DataTypes  from 'sequelize'
import sequelize from '../database'

const History = sequelize.define('History', {
  nome: DataTypes.STRING,
  telefone: DataTypes.STRING,
  mensagem: DataTypes.TEXT
});

export default History;
