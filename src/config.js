const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const jwtSecret = process.env.JWT_SECRET || "change-this-secret-in-production";

if (process.env.NODE_ENV === "production" && jwtSecret === "change-this-secret-in-production") {
  throw new Error("JWT_SECRET must be set in production");
}

const projectRoot = path.join(__dirname, "..");
const hasRenderDefaultDisk = fs.existsSync("/var/data");
const configuredStorageRoot = process.env.PERSISTENT_STORAGE_PATH || process.env.RENDER_DISK_MOUNT_PATH || null;
const usingExternalDisk = Boolean(configuredStorageRoot || hasRenderDefaultDisk);
const storageRoot = configuredStorageRoot || (hasRenderDefaultDisk ? "/var/data" : projectRoot);

const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  jwtIssuer: process.env.JWT_ISSUER || "airindiana-crm",
  jwtAudience: process.env.JWT_AUDIENCE || "airindiana-users",
  adminId: process.env.ADMIN_ID || "admin",
  adminName: process.env.ADMIN_NAME || "Super Admin",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@12345",
  storageRoot,
  dbPath:
    process.env.DB_PATH ||
    (usingExternalDisk ? path.join(storageRoot, "airindiana.db") : path.join(projectRoot, "data", "airindiana.db")),
  uploadPath: process.env.UPLOAD_PATH || path.join(storageRoot, "uploads"),
  backupPath: process.env.BACKUP_PATH || path.join(storageRoot, "backups"),
};

module.exports = config;
