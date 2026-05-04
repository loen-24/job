const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { get } = require("../db");
const config = require("../config");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

const loginSchema = Joi.object({
  employeeId: Joi.string().trim().min(3).max(50).required(),
  password: Joi.string().min(6).max(100).required(),
});

router.post("/login", async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const normalizedEmployeeId = value.employeeId.trim();

  const user = await get(
    "SELECT id, name, employee_id, password_hash, role, is_active FROM users WHERE employee_id = ?",
    [normalizedEmployeeId]
  );

  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({ message: "User is disabled. Contact admin." });
    return;
  }

  const matches = await bcrypt.compare(value.password, user.password_hash);
  if (!matches) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      employeeId: user.employee_id,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      algorithm: "HS256",
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      employeeId: user.employee_id,
      role: user.role,
    },
  });
});

router.get("/me", authenticate, async (req, res) => {
  const user = await get(
    "SELECT id, name, employee_id, role, is_active FROM users WHERE id = ?",
    [req.user.id]
  );

  if (!user || !user.is_active) {
    res.status(401).json({ message: "Invalid user" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    employeeId: user.employee_id,
    role: user.role,
  });
});

module.exports = router;
