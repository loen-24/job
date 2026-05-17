const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const config = require("./config");

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new sqlite3.Database(config.dbPath);

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function initializeDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      employee_id TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS applicants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      mobile TEXT NOT NULL,
      gender TEXT NOT NULL,
      dob TEXT NOT NULL,
      job_position TEXT NOT NULL,
      address TEXT NOT NULL,
      photo_path TEXT,
      status TEXT NOT NULL DEFAULT 'Submitted',
      submitted_by INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (submitted_by) REFERENCES users(id)
    )
  `);

  let existingAdmin = await get(
    "SELECT id, name, employee_id, password_hash, role, is_active FROM users WHERE employee_id = ?",
    [config.adminId]
  );

  if (!existingAdmin) {
    existingAdmin = await get(
      "SELECT id, name, employee_id, password_hash, role, is_active FROM users WHERE role = 'admin' ORDER BY id LIMIT 1"
    );
  }

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(config.adminPassword, 10);
    await run(
      `INSERT INTO users (name, employee_id, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, 'admin', 1, ?)`,
      [config.adminName, config.adminId, hashedPassword, new Date().toISOString()]
    );
    return;
  }

  const passwordMatches = await bcrypt.compare(config.adminPassword, existingAdmin.password_hash);
  if (
    existingAdmin.role !== "admin" ||
    !existingAdmin.is_active ||
    existingAdmin.name !== config.adminName ||
    existingAdmin.employee_id !== config.adminId ||
    !passwordMatches
  ) {
    const hashedPassword = await bcrypt.hash(config.adminPassword, 10);
    await run(
      "UPDATE users SET name = ?, employee_id = ?, password_hash = ?, role = 'admin', is_active = 1 WHERE id = ?",
      [config.adminName, config.adminId, hashedPassword, existingAdmin.id]
    );
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initializeDb,
};
