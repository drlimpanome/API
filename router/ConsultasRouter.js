import express from "express";
import { getConsultas } from "../controlers/tbConsultas.js";

const consultasRouter = express.Router();

consultasRouter.get("/", getConsultas);

export default consultasRouter;
