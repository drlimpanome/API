import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config(); // This ensures that environment variables from your .env file are loaded


const sequelize = new Sequelize('positivonacional5', process.env.DB_USER,  process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
  dialect: 'mysql'
});

export default sequelize;
