import jwt from "jsonwebtoken";

// Middleware to authenticate the JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }
  console.log(token);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log(err);
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = user; // Attach the user object to the request
    next(); // Pass the control to the next middleware or route handler
  });
};
