const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("AUTH HEADER:", req.headers.authorization);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Provide both `id` and `_id` for compatibility across code
    const userId = decoded.userId || decoded.id || decoded._id;
    req.user = {
      id: userId,
      _id: userId,
      role: decoded.role,
      name: decoded.name || decoded.name
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
