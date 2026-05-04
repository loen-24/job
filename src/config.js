const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const jwtSecret = process.env.JWT_SECRET || "change-this-secret-in-production";

if (process.env.NODE_ENV === "production" && jwtSecret === "change-this-secret-in-production") {
  throw new Error("JWT_SECRET must be set in production");
}

const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  jwtIssuer: process.env.JWT_ISSUER || "airindiana-crm",
  jwtAudience: process.env.JWT_AUDIENCE || "airindiana-users",
  adminId: process.env.ADMIN_ID || "admin",
  adminName: process.env.ADMIN_NAME || "Super Admin",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@12345",
  dbPath: path.join(__dirname, "..", "data", "airindiana.db"),
  uploadPath: path.join(__dirname, "..", "uploads"),
};

module.exports = config;
