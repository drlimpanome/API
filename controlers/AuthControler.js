import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"; // If you're using password hashing
import User from "../models/Users.js";

// Secret key for JWT (store it securely in your environment variables)
const JWT_SECRET = process.env.JWT_SECRET;
async function validateUser(email, password) {
  const user = await User.findOne({
    where: {
      email,
    },
    exclude: ["passwordHash"],
  });
  if (!user) {
    return null;
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    return null;
  }

  return user;
}

export const createUser = async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  // Input validation
  if (!name || !email || !password || !phone || !role) {
    return res
      .status(400)
      .json({ message: "Name, email, password, phone and role are required" });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
      phone,
      role,
    });

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h", // Token expires in 1 hour
    });

    // Return the token to the client
    return res.json({ token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
};

export const signInWithEmailAndPassword = async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Validate user
    const user = await validateUser(email, password);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h", // Token expires in 1 hour
    });

    // Return the token to the client
    return res.json({ token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred" });
  }
};
