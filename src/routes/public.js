const express = require("express");
const Joi = require("joi");
const { get } = require("../db");

const router = express.Router();

const tokenSchema = Joi.object({
  referenceNo: Joi.string().trim().pattern(/^AIR-[0-9]{4}-[0-9]{6}$/).required(),
});

router.post("/track", async (req, res) => {
  const normalizedRef = String(req.body.referenceNo || "").trim().toUpperCase();
  const { error, value } = tokenSchema.validate({ referenceNo: normalizedRef });
  if (error) {
    res.status(400).json({ message: "Enter a valid reference number (e.g., AIR-2026-000001)" });
    return;
  }

  const applicant = await get(
    `SELECT reference_no, full_name, email, mobile, gender, dob, job_position, address, photo_path, status
     FROM applicants
     WHERE reference_no = ?`,
    [value.referenceNo]
  );

  if (!applicant) {
    res.status(404).json({ message: "Application not found for this reference number" });
    return;
  }

  res.json({
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
  });
});

module.exports = router;
