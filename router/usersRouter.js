import express from "express";
import { createUser } from "../controlers/AuthControler.js";
import {
  getUserByToken,
  getUsers,
  updateSaldo,
  updateUsers,
} from "../controlers/UsersControler.js";
import { authenticateToken } from "../middleware/index.js";

const usersRouter = express.Router();

usersRouter.get("/all", getUsers);
usersRouter.get("/profile", authenticateToken, getUserByToken);

usersRouter.put("/:id", updateUsers);
usersRouter.put("/saldo/:id", updateSaldo);
usersRouter.post("/create", createUser);

export default usersRouter;
