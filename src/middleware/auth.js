const jwt = require("jsonwebtoken");
const config = require("../config");
const { get } = require("../db");

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  const dbUser = await get(
    "SELECT id, name, employee_id, role, is_active FROM users WHERE id = ?",
    [payload.id]
  );

  if (!dbUser || !dbUser.is_active) {
    res.status(401).json({ message: "Invalid user" });
    return;
  }

  if (dbUser.role !== payload.role || dbUser.employee_id !== payload.employeeId) {
    res.status(401).json({ message: "Session no longer valid" });
    return;
  }

  req.user = {
    id: dbUser.id,
    name: dbUser.name,
    employeeId: dbUser.employee_id,
    role: dbUser.role,
  };

  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
