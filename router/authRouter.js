import express from "express";
import {
  createUser,
  signInWithEmailAndPassword,
} from "../controlers/AuthControler.js";

const authRouter = express.Router();

authRouter.post("/login", signInWithEmailAndPassword);
authRouter.post("/create", createUser);

export default authRouter;
