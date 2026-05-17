const express = require("express");
const fs = require("fs");
const path = require("path");
const Joi = require("joi");
const upload = require("../middleware/upload");
const { run, all, get } = require("../db");
const config = require("../config");

const router = express.Router();

const createApplicantSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().email().max(120).required(),
  mobile: Joi.string().trim().pattern(/^[0-9]{10,15}$/).required(),
  gender: Joi.string().valid("Male", "Female", "Other").required(),
  dob: Joi.date().iso().required(),
  jobPosition: Joi.string().trim().min(2).max(100).required(),
  address: Joi.string().trim().min(5).max(300).required(),
});

function buildReferenceNo() {
  const randomDigits = (length) =>
    Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
  const randomLetters = (length) =>
    Array.from({ length }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");

  return `Air-${randomDigits(4)}${randomLetters(2)}${randomDigits(3)}${randomLetters(2)}${randomDigits(3)}`;
}

function safeDeleteUploadedFile(photoPath) {
  if (!photoPath) return;
  const filePath = path.join(config.uploadPath, path.basename(photoPath));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function hasSignature(buffer, signature) {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}

function isValidImageSignature(filePath) {
  const header = fs.readFileSync(filePath, { encoding: null }).subarray(0, 12);

  const isJpeg = hasSignature(header, [0xff, 0xd8, 0xff]);
  const isPng = hasSignature(header, [0x89, 0x50, 0x4e, 0x47]);
  const isWebp =
    hasSignature(header, [0x52, 0x49, 0x46, 0x46]) &&
    hasSignature(header.subarray(8), [0x57, 0x45, 0x42, 0x50]);

  return isJpeg || isPng || isWebp;
}

router.post("/applicants", upload.single("photo"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "Photo upload is required" });
    return;
  }

  const uploadedPhotoPath = `/uploads/${req.file.filename}`;
  const absolutePhotoPath = path.join(config.uploadPath, req.file.filename);

  if (!isValidImageSignature(absolutePhotoPath)) {
    safeDeleteUploadedFile(uploadedPhotoPath);
    res.status(400).json({ message: "Invalid image content. Upload a valid JPG, PNG, or WEBP file." });
    return;
  }

  const { error, value } = createApplicantSchema.validate(req.body);
  if (error) {
    safeDeleteUploadedFile(uploadedPhotoPath);
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const now = new Date().toISOString();
  const dob = new Date(value.dob).toISOString().slice(0, 10);
  const photoPath = uploadedPhotoPath;

  const inserted = await run(
    `INSERT INTO applicants
      (full_name, email, mobile, gender, dob, job_position, address, photo_path, status, submitted_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', ?, ?, ?)`,
    [
      value.fullName,
      value.email,
      value.mobile,
      value.gender,
      dob,
      value.jobPosition,
      value.address,
      photoPath,
      req.user.id,
      now,
      now,
    ]
  );

  let referenceNo = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = buildReferenceNo();
    try {
      await run("UPDATE applicants SET reference_no = ? WHERE id = ?", [candidate, inserted.lastID]);
      referenceNo = candidate;
      break;
    } catch (error) {
      if (!String(error?.message || "").includes("UNIQUE constraint failed")) {
        throw error;
      }
    }
  }

  if (!referenceNo) {
    throw new Error("Unable to generate a unique reference number");
  }

  const applicant = await get(
    `SELECT id, reference_no, full_name, email, mobile, gender, dob, job_position, address,
            photo_path, status, created_at
     FROM applicants
     WHERE id = ?`,
    [inserted.lastID]
  );

  res.status(201).json({
    id: applicant.id,
    referenceNo: applicant.reference_no,
    fullName: applicant.full_name,
    email: applicant.email,
    mobile: applicant.mobile,
    gender: applicant.gender,
    dob: applicant.dob,
    jobPosition: applicant.job_position,
    address: applicant.address,
    photoPath: applicant.photo_path,
    status: applicant.status,
    createdAt: applicant.created_at,
  });
});

router.get("/applicants", async (req, res) => {
  const rows = await all(
    `SELECT id, reference_no, full_name, email, mobile, gender, dob,
            job_position, address, photo_path, status, created_at, updated_at
     FROM applicants
     WHERE submitted_by = ?
     ORDER BY created_at DESC`,
    [req.user.id]
  );

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
    }))
  );
});

module.exports = router;
