import dotenv from 'dotenv';
dotenv.config(); // This ensures that environment variables from your .env file are loaded

const sequelizeConfig = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'drlimpanome',
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false, // Set to true if you want to see SQL logs in your console
  },
  test: {
    username: 'root',
    password: 'your_password',
    database: 'database_test',
    host: 'localhost',
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.USER,
    password: process.env.DB_PASSWORD, // It's a good practice to use environment variables for production
    database: 'drlimpanome',
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};

export default sequelizeConfig;
