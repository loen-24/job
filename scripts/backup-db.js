const fs = require("fs");
const path = require("path");
const config = require("../src/config");

const backupsDir = config.backupPath || path.join(__dirname, "..", "backups");
fs.mkdirSync(backupsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupsDir, `airindiana-${timestamp}.db`);

if (!fs.existsSync(config.dbPath)) {
  console.error(`Database file not found at ${config.dbPath}`);
  process.exit(1);
}

fs.copyFileSync(config.dbPath, backupPath);
console.log(`Database backup created: ${backupPath}`);
