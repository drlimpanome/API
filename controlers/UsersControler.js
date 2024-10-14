import User from "../models/Users.js";
import jwt from "jsonwebtoken";

// GET /users - Get users with pagination

export const getUserByToken = async (req, res) => {
  const { userId } = req.user;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Esse usuario não existe" });
    }
    return res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while fetching user." });
  }
};

export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit) || 5; // Default to 5 results per page if not provided

    const offset = (page - 1) * limit;

    // Fetch users with pagination from the database
    const { rows: customers, count } = await User.findAndCountAll({
      offset,
      limit,
      exclude: ["passwordHash"],
    });

    const totalPages = Math.ceil(count / limit);

    // Return paginated data
    return res.json({
      customers,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while fetching users." });
  }
};

export const updateUsers = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, role } = req.body;
  console.log(req.body);
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Esse usuario não existe" });
    }
    await user.update({ name, email, phone, role });
    return res.json({ message: "User atualizado corretamente" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res
      .status(500)
      .json({ message: "Um erro ocorreu ao atualizar o usuario." });
  }
};

export const updateSaldo = async (req, res) => {
  const { id } = req.params;
  const { saldo } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Esse usuario não existe" });
    }
    // Convert decimal saldo to integer for the database
    const saldoInCents = Math.round(saldo * 100); // Multiply by 100 and round to avoid floating point issues

    // Update the user's saldo in the database (uncomment to update in the actual DB)
    await user.update({ saldo: saldoInCents });
    return res.json({ message: "Saldo atualizado corretamente" });
  } catch (error) {
    console.error("Error updating user:", error);
    return res
      .status(500)
      .json({ message: "Um erro ocorreu ao atualizar o Saldo." });
  }
};
