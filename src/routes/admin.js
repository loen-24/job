const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const Joi = require("joi");
const { run, get, all } = require("../db");
const config = require("../config");

const router = express.Router();

const statusValues = [
  "Submitted",
  "Under Review",
  "Selected",
  "Rejected",
  "Pending Documents",
];

const employeeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  employeeId: Joi.string().trim().pattern(/^[a-zA-Z0-9_-]+$/).min(3).max(50).required(),
  password: Joi.string().min(6).max(100).required(),
});

const employeeUpdateSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

const applicantUpdateSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120),
  email: Joi.string().trim().email().max(120),
  mobile: Joi.string().trim().pattern(/^[0-9]{10,15}$/),
  gender: Joi.string().valid("Male", "Female", "Other"),
  dob: Joi.date().iso(),
  jobPosition: Joi.string().trim().min(2).max(100),
  address: Joi.string().trim().min(5).max(300),
  status: Joi.string().valid(...statusValues),
}).min(1);

function safeDeleteUploadedFile(photoPath) {
  if (!photoPath) return;
  const filePath = path.join(config.uploadPath, path.basename(photoPath));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function csvEscape(value) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, "\"\"")}"`;
}

router.get("/dashboard", async (_req, res) => {
  const stats = await get(
    `SELECT
      (SELECT COUNT(*) FROM applicants) AS totalApplicants,
      (SELECT COUNT(*) FROM users WHERE role = 'employee') AS totalEmployees,
      (SELECT COUNT(*) FROM applicants WHERE date(created_at) = date('now', 'localtime')) AS todaysEntries`
  );

  const recentApplications = await all(
    `SELECT a.id, a.reference_no, a.full_name, a.job_position, a.status, a.created_at,
            u.name AS employee_name
     FROM applicants a
     JOIN users u ON u.id = a.submitted_by
     ORDER BY a.created_at DESC
     LIMIT 8`
  );

  res.json({
    ...stats,
    recentApplications,
  });
});

router.post("/employees", async (req, res) => {
  const { error, value } = employeeSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const exists = await get("SELECT id FROM users WHERE employee_id = ?", [value.employeeId]);
  if (exists) {
    res.status(409).json({ message: "Employee ID already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(value.password, 10);
  const now = new Date().toISOString();

  const created = await run(
    `INSERT INTO users (name, employee_id, password_hash, role, is_active, created_at)
     VALUES (?, ?, ?, 'employee', 1, ?)`,
    [value.name, value.employeeId, passwordHash, now]
  );

  const employee = await get(
    "SELECT id, name, employee_id, role, is_active, created_at FROM users WHERE id = ?",
    [created.lastID]
  );

  res.status(201).json({
    id: employee.id,
    name: employee.name,
    employeeId: employee.employee_id,
    role: employee.role,
    isActive: !!employee.is_active,
    createdAt: employee.created_at,
  });
});

router.get("/employees", async (_req, res) => {
  const employees = await all(
    `SELECT id, name, employee_id, role, is_active, created_at
     FROM users
     WHERE role = 'employee'
     ORDER BY created_at DESC`
  );

  res.json(
    employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      employeeId: emp.employee_id,
      role: emp.role,
      isActive: !!emp.is_active,
      createdAt: emp.created_at,
    }))
  );
});

router.patch("/employees/:id", async (req, res) => {
  const { error, value } = employeeUpdateSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const target = await get("SELECT id FROM users WHERE id = ? AND role = 'employee'", [req.params.id]);
  if (!target) {
    res.status(404).json({ message: "Employee not found" });
    return;
  }

  await run("UPDATE users SET is_active = ? WHERE id = ?", [value.isActive ? 1 : 0, req.params.id]);
  res.json({ message: `Employee ${value.isActive ? "enabled" : "disabled"} successfully` });
});

router.delete("/employees/:id", async (req, res) => {
  const target = await get("SELECT id FROM users WHERE id = ? AND role = 'employee'", [req.params.id]);
  if (!target) {
    res.status(404).json({ message: "Employee not found" });
    return;
  }

  const hasApplicants = await get("SELECT id FROM applicants WHERE submitted_by = ? LIMIT 1", [req.params.id]);
  if (hasApplicants) {
    res.status(400).json({ message: "Employee has applicant records. Disable instead of delete." });
    return;
  }

  await run("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.json({ message: "Employee removed successfully" });
});

router.get("/applicants", async (req, res) => {
  const search = (req.query.search || "").trim();

  let sql = `SELECT a.id, a.reference_no, a.full_name, a.email, a.mobile, a.gender, a.dob,
                    a.job_position, a.address, a.photo_path, a.status, a.created_at, a.updated_at,
                    u.name AS employee_name, u.employee_id
             FROM applicants a
             JOIN users u ON u.id = a.submitted_by`;
  const params = [];

  if (search) {
    sql += `
      WHERE a.full_name LIKE ?
      OR a.email LIKE ?
      OR a.mobile LIKE ?
      OR a.reference_no LIKE ?
      OR a.job_position LIKE ?
      OR u.name LIKE ?
      OR u.employee_id LIKE ?`;

    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
  }

  sql += " ORDER BY a.created_at DESC";

  const rows = await all(sql, params);

  res.json(
    rows.map((row) => ({
      id: row.id,
      referenceNo: row.reference_no,
      fullName: row.full_name,
      email: row.email,
      mobile: row.mobile,
      gender: row.gender,
      dob: row.dob,
      jobPosition: row.job_position,
      address: row.address,
      photoPath: row.photo_path,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      employeeName: row.employee_name,
      employeeId: row.employee_id,
    }))
  );
});

router.get("/applicants/export.csv", async (req, res) => {
  const search = (req.query.search || "").trim();

  let sql = `SELECT a.reference_no, a.full_name, a.email, a.mobile, a.gender, a.dob,
                    a.job_position, a.address, a.status, a.created_at, a.updated_at,
                    u.name AS employee_name, u.employee_id
             FROM applicants a
             JOIN users u ON u.id = a.submitted_by`;
  const params = [];

  if (search) {
    sql += `
      WHERE a.full_name LIKE ?
      OR a.email LIKE ?
      OR a.mobile LIKE ?
      OR a.reference_no LIKE ?
      OR a.job_position LIKE ?
      OR u.name LIKE ?
      OR u.employee_id LIKE ?`;
    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword);
  }

  sql += " ORDER BY a.created_at DESC";

  const rows = await all(sql, params);
  const headers = [
    "reference_no",
    "full_name",
    "email",
    "mobile",
    "gender",
    "dob",
    "job_position",
    "address",
    "status",
    "employee_name",
    "employee_id",
    "created_at",
    "updated_at",
  ];

  const csvLines = [headers.join(",")];
  rows.forEach((row) => {
    csvLines.push(
      [
        row.reference_no,
        row.full_name,
        row.email,
        row.mobile,
        row.gender,
        row.dob,
        row.job_position,
        row.address,
        row.status,
        row.employee_name,
        row.employee_id,
        row.created_at,
        row.updated_at,
      ]
        .map(csvEscape)
        .join(",")
    );
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=\"airindiana-applicants-${stamp}.csv\"`);
  res.send(csvLines.join("\n"));
});

router.put("/applicants/:id", async (req, res) => {
  const { error, value } = applicantUpdateSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const applicant = await get("SELECT id FROM applicants WHERE id = ?", [req.params.id]);
  if (!applicant) {
    res.status(404).json({ message: "Applicant not found" });
    return;
  }

  const fieldMap = {
    fullName: "full_name",
    email: "email",
    mobile: "mobile",
    gender: "gender",
    dob: "dob",
    jobPosition: "job_position",
    address: "address",
    status: "status",
  };

  const updates = [];
  const params = [];

  Object.entries(value).forEach(([key, fieldValue]) => {
    updates.push(`${fieldMap[key]} = ?`);
    params.push(key === "dob" ? new Date(fieldValue).toISOString().slice(0, 10) : fieldValue);
  });

  updates.push("updated_at = ?");
  params.push(new Date().toISOString());
  params.push(req.params.id);

  await run(`UPDATE applicants SET ${updates.join(", ")} WHERE id = ?`, params);
  res.json({ message: "Applicant updated successfully" });
});

router.delete("/applicants/:id", async (req, res) => {
  const applicant = await get("SELECT id, photo_path FROM applicants WHERE id = ?", [req.params.id]);
  if (!applicant) {
    res.status(404).json({ message: "Applicant not found" });
    return;
  }

  safeDeleteUploadedFile(applicant.photo_path);
  await run("DELETE FROM applicants WHERE id = ?", [req.params.id]);
  res.json({ message: "Applicant deleted successfully" });
});

module.exports = { router, statusValues };
