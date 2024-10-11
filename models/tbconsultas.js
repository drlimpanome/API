import DataTypes from "sequelize";
import sequelize from "../database.js";
import StatusConsulta from "./statusConsulta.js"; // Make sure this path is correct

const Consultas = sequelize.define(
  "tbconsultas",
  {
    id_consulta: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    contact_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    locked_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    locked: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    divida: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    documento: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    unidade: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    id_ticket: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status_id: {
      // Rename the field to reflect that it's a foreign key
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: StatusConsulta,
        key: "id",
      },
    },
    url: {
      type: DataTypes.STRING(255), // Assuming URLs will not be longer than 255 characters
      allowNull: true, // Assuming the URL is not mandatory
    },
  },
  {
    tableName: "tbconsultas",
    timestamps: false,
  }
);

// Define the association
Consultas.belongsTo(StatusConsulta, { foreignKey: "status_id" });

export default Consultas;
