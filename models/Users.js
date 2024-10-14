import { DataTypes } from "sequelize";
import sequelize from "../database.js"; // Ensure this path matches your Sequelize connection setup

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    document: {
      type: DataTypes.STRING,
      allowNull: true, // Optional field
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false, // Storing hashed passwords
    },
    saldo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true, // Optional field
    },
    role: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "users", // Explicitly specify the table name
    timestamps: true, // Includes 'createdAt' and 'updatedAt'
  }
);

export default User;
