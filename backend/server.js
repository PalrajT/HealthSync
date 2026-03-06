
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

// server.js
// ========================================
// HealthSync Backend - Consolidated Version
// Includes: All APIs, DB connection, models,
// middleware, Cloudinary integration,
// Admin panel, reminders, and security.
// ========================================

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import nodemailer from "nodemailer";
import crypto from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Load .env variables
dotenv.config();

// Initialize express app
const app = express();

// ================================
// Security Middleware
// ================================
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Rate limiting — 100 requests per 15 min per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many login attempts, please try again later." },
});

// ================================
// Middleware
// ================================
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173").split(",");
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" })); // JSON body parser with size limit
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ================================
// Cloudinary & Multer Configuration
// ================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "healthsync_uploads", // Folder name on Cloudinary
    allowed_formats: ["jpg", "png", "jpeg", "pdf"], // Allowed file formats
  },
});

const upload = multer({ storage: storage });

// ================================
// MongoDB Connection
// ================================
const connectWithRetry = (retries = 5, delay = 5000) => {
  mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
    })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
      if (retries > 0) {
        console.log(`🔄 Retrying in ${delay / 1000}s... (${retries} attempts left)`);
        setTimeout(() => connectWithRetry(retries - 1, delay), delay);
      } else {
        console.error("💀 All MongoDB connection attempts failed.");
      }
    });
};
connectWithRetry();

// ================================
// Models
// ================================
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    phone: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Invalid phone number"],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    age: { type: Number, min: 0 },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    chronicConditions: { type: String, default: "" },
    photo: { type: String, default: "" }, // Will store Cloudinary URL for patient
    isActive: { type: Boolean, default: true },
    role: { type: String, default: "patient" },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  { timestamps: true }
);
const User = mongoose.model("User", userSchema);

const doctorSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    phone: { type: String, required: true, match: [/^[0-9]{10}$/] },
    specialization: { type: String, required: true },
    licenseNumber: { type: String, required: true, unique: true, uppercase: true },
    experience: { type: Number, default: 0 },
    consultationFee: { type: Number, default: 0 },
    clinicAddress: { type: String, default: "" },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    profileImage: { type: String, default: null }, // Cloudinary URL
    isActive: { type: Boolean, default: true },
    role: { type: String, default: "doctor" },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  { timestamps: true }
);

// Hash password before saving a doctor
doctorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
doctorSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
const Doctor = mongoose.model("Doctor", doctorSchema);

// License schema (holds all valid UIDs)
const licenseSchema = new mongoose.Schema({
  licenseNumber: { type: String, required: true, unique: true },
  isUsed: { type: Boolean, default: false },
});
const License = mongoose.model("License", licenseSchema, "License");

// Medical Record schema
const medicalRecordSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userRole: { type: String, enum: ["patient", "doctor"], required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    filePublicId: { type: String, required: true },
    recordType: {
      type: String,
      enum: ["Lab Report", "Prescription", "Scan / X-Ray", "Discharge Summary", "Insurance", "Other"],
      default: "Other",
    },
  },
  { timestamps: true }
);
const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);

// Appointment schema
const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    slot: { type: String, required: true },
    date: { type: String, default: "" }, // e.g. "2026-03-15"
    status: { type: String, enum: ["pending", "accepted", "rejected", "cancelled", "completed", "no-show"], default: "pending" },
    notes: { type: String, default: "" }, // doctor notes after completion
    completedAt: { type: Date },
  },
  { timestamps: true }
);
const Appointment = mongoose.model("Appointment", appointmentSchema);

// Admin schema
const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, default: "admin" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
const Admin = mongoose.model("Admin", adminSchema);

// Cloudinary storage for medical records
const recordStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "healthsync_records",
    allowed_formats: ["jpg", "png", "jpeg", "pdf"],
    resource_type: "auto",
  },
});
const uploadRecord = multer({ storage: recordStorage });

// ================================
// Utilities
// ================================
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// ================================
// Auth Middleware
// ================================
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// ================================
// Routes / APIs
// ================================

// ================================
// Role-based Auth Middleware
// ================================
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Access denied. Insufficient permissions." });
  }
  next();
};

// @desc    Backend test / health check
// @route   GET /
// @access  Public
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "HealthSync API",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// @desc    Health check endpoint
// @route   GET /api/health
// @access  Public
app.get("/api/health", async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.status(dbState === 1 ? 200 : 503).json({
    success: dbState === 1,
    database: dbStatus[dbState] || "unknown",
    uptime: process.uptime(),
  });
});

// ---------------- Patient APIs ----------------

// @desc    Register new patient
// @route   POST /api/auth/register
// @access  Public
app.post("/api/auth/register", authLimiter, upload.single("photo"), async (req, res) => {
  try {
    const { name, email, phone, password, age, gender, bloodGroup, chronicConditions } = req.body;

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      password: hashed,
      age,
      gender,
      bloodGroup,
      chronicConditions,
      photo: req.file ? req.file.path : "", // Cloudinary URL
    });

    const token = generateToken(user._id, "patient");
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: { user: userResponse, token },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Login patient
// @route   POST /api/auth/login
// @access  Public
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ success: false, message: "Email/phone and password are required." });
    }

    const normalised = emailOrPhone.trim().toLowerCase();

    const user = await User.findOne({
      $or: [{ email: normalised }, { phone: emailOrPhone.trim() }],
    }).select("+password");

    if (!user) {
      return res.status(401).json({ success: false, message: "No account found with that email or phone." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    const token = generateToken(user._id, "patient");
    res.status(200).json({ success: true, data: { user, token } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- Doctor APIs ----------------

// @desc    Register new doctor with license validation
// @route   POST /api/doctor-auth/register
// @access  Public
app.post("/api/doctor-auth/register", authLimiter, upload.single("profileImage"), async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, specialization, licenseNumber, experience, consultationFee, clinicAddress, gender } = req.body;

    // Validate license number
    if (!licenseNumber || typeof licenseNumber !== "string") {
      return res.status(400).json({ success: false, message: "License number is required." });
    }
    const cleanedLicenseNumber = licenseNumber.trim().toUpperCase();

    // Check in License collection
    const licenseExists = await License.findOne({ licenseNumber: cleanedLicenseNumber });
    if (!licenseExists) {
      return res.status(404).json({
        success: false,
        message: "Registration failed. The provided UID cannot be found.",
      });
    }
    if (licenseExists.isUsed) {
      return res.status(400).json({
        success: false,
        message: "This UID has already been used for another registration.",
      });
    }

    // Check duplicate doctors
    const doctorExists = await Doctor.findOne({ $or: [{ email }, { licenseNumber: cleanedLicenseNumber }] });
    if (doctorExists) {
      return res.status(400).json({
        success: false,
        message: "A doctor with this email or license number already exists.",
      });
    }

    // Create doctor
    const doctor = await Doctor.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      specialization,
      licenseNumber: cleanedLicenseNumber,
      experience: experience ? Number(experience) : 0,
      consultationFee: consultationFee ? Number(consultationFee) : 0,
      clinicAddress: clinicAddress || "",
      gender: gender || undefined,
      profileImage: req.file ? req.file.path : null,
    });

    // Mark the license as used
    await License.findOneAndUpdate({ licenseNumber: cleanedLicenseNumber }, { isUsed: true });

    res.status(201).json({
      success: true,
      message: "Registration successful! You can now login using your license UID.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "An internal server error occurred." });
  }
});

// @desc    Login doctor with license validation (no admin verification)
// @route   POST /api/doctor-auth/login
// @access  Public
app.post("/api/doctor-auth/login", authLimiter, async (req, res) => {
  try {
    const { emailOrPhone, password, licenseNumber } = req.body;
    const cleanedLicenseNumber = licenseNumber ? licenseNumber.trim().toUpperCase() : null;

    if (!cleanedLicenseNumber) {
      return res.status(400).json({ success: false, message: "License number is required for login." });
    }

    const doctor = await Doctor.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
      licenseNumber: cleanedLicenseNumber,
    }).select("+password");

    if (!doctor || !(await doctor.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid credentials or license number" });
    }

    // ✅ No admin verification required

    const token = generateToken(doctor._id, "doctor");
    const doctorResponse = doctor.toObject();
    delete doctorResponse.password;

    res.status(200).json({ success: true, data: { doctor: doctorResponse, token } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- Medical Records APIs ----------------

// @desc    Upload a medical record/prescription
// @route   POST /api/records/upload
// @access  Protected (patient or doctor)
app.post("/api/records/upload", protect, uploadRecord.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const validTypes = ["Lab Report", "Prescription", "Scan / X-Ray", "Discharge Summary", "Insurance", "Other"];
    const recordType = validTypes.includes(req.body.recordType) ? req.body.recordType : "Other";

    const record = await MedicalRecord.create({
      userId: req.user.id,
      userRole: req.user.role,
      fileName: req.file.originalname,
      fileUrl: req.file.path,
      filePublicId: req.file.filename,
      recordType,
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get all medical records for the logged-in user
// @route   GET /api/records
// @access  Protected (patient or doctor)
app.get("/api/records", protect, async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    if (req.query.type && req.query.type !== "All") filter.recordType = req.query.type;

    const sortField = req.query.sort === "name" ? "fileName" : "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;

    const records = await MedicalRecord.find(filter).sort({ [sortField]: sortOrder });
    res.status(200).json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Delete a medical record
// @route   DELETE /api/records/:id
// @access  Protected (owner only)
app.delete("/api/records/:id", protect, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    if (record.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(record.filePublicId, { resource_type: "auto" });

    await record.deleteOne();
    res.status(200).json({ success: true, message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- Forgot / Reset Password APIs ----------------

// Email transporter — Gmail SMTP with App Password
// If credentials are missing or wrong, logs the reset link to console instead of crashing.
const sendResetEmail = async (toEmail, resetUrl) => {
  // Google App Passwords may be copied with spaces — strip them
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, "");

  if (!emailUser || !emailPass) {
    console.warn(`[HealthSync] EMAIL_USER/EMAIL_PASS not set. Reset link:\n${resetUrl}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: emailUser, pass: emailPass },
    tls: { rejectUnauthorized: false },
  });

  try {
    await transporter.sendMail({
      from: `"HealthSync" <${emailUser}>`,
      to: toEmail,
      subject: "HealthSync — Password Reset",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:16px;">
          <h2 style="color:#027346;margin:0 0 12px;">HealthSync Password Reset</h2>
          <p style="color:#374151;margin:0 0 8px;">You requested a password reset for your HealthSync account.</p>
          <p style="color:#374151;margin:0 0 24px;">Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#027346;color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:600;font-size:0.95rem;">
            Reset Password
          </a>
          <p style="color:#9ca3af;font-size:0.8rem;margin:24px 0 0;">If you did not request this, you can safely ignore this email.</p>
        </div>`,
    });
    console.log(`[HealthSync] Reset email sent to ${toEmail}`);
  } catch (emailErr) {
    // Email failed — log the link so dev can still test the flow
    console.error(`[HealthSync] Failed to send email to ${toEmail}: ${emailErr.message}`);
    console.warn(`[HealthSync] Use this link manually to reset:\n${resetUrl}`);
    // Re-throw so the calling route knows email didn't go out
    throw emailErr;
  }
};

// @desc    Patient — request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      // Respond success to avoid user enumeration
      return res.status(200).json({ success: true, message: "If that email exists, a reset link has been sent." });
    }
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = rawToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${rawToken}&role=patient`;
    let emailSent = false;
    try {
      await sendResetEmail(user.email, resetUrl);
      emailSent = true;
    } catch (_emailErr) {
      // Email delivery failed — token is saved, expose URL in dev so flow can still be tested
    }
    const isDev = process.env.NODE_ENV !== "production";
    res.status(200).json({
      success: true,
      message: emailSent
        ? "A reset link has been sent to your email."
        : isDev
          ? "Email delivery failed. Use the link below to reset your password."
          : "If that email exists, a reset link has been sent.",
      ...((!emailSent && isDev) && { devResetUrl: resetUrl }),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Patient — reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Valid token and password (min 6 chars) required." });
    }
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(200).json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Doctor — request password reset
// @route   POST /api/doctor-auth/forgot-password
// @access  Public
app.post("/api/doctor-auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const doctor = await Doctor.findOne({ email: email?.toLowerCase() }).select("+resetPasswordToken +resetPasswordExpire");
    if (!doctor) {
      return res.status(200).json({ success: true, message: "If that email exists, a reset link has been sent." });
    }
    const rawToken = crypto.randomBytes(32).toString("hex");
    doctor.resetPasswordToken = rawToken;
    doctor.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await doctor.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${rawToken}&role=doctor`;
    let emailSent = false;
    try {
      await sendResetEmail(doctor.email, resetUrl);
      emailSent = true;
    } catch (_emailErr) {
      // Email delivery failed — token is saved, expose URL in dev so flow can still be tested
    }
    const isDev = process.env.NODE_ENV !== "production";
    res.status(200).json({
      success: true,
      message: emailSent
        ? "A reset link has been sent to your email."
        : isDev
          ? "Email delivery failed. Use the link below to reset your password."
          : "If that email exists, a reset link has been sent.",
      ...((!emailSent && isDev) && { devResetUrl: resetUrl }),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Doctor — reset password with token
// @route   POST /api/doctor-auth/reset-password
// @access  Public
app.post("/api/doctor-auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Valid token and password (min 6 chars) required." });
    }
    const doctor = await Doctor.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+password +resetPasswordToken +resetPasswordExpire");
    if (!doctor) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
    }
    doctor.password = await bcrypt.hash(newPassword, 10);
    doctor.resetPasswordToken = undefined;
    doctor.resetPasswordExpire = undefined;
    await doctor.save();
    res.status(200).json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- Profile APIs ----------------

// @desc    Get logged-in patient's profile
// @route   GET /api/auth/me
// @access  Protected (patient)
app.get("/api/auth/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get logged-in doctor's profile
// @route   GET /api/doctor-auth/me
// @access  Protected (doctor)
app.get("/api/doctor-auth/me", protect, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user.id).select("-password");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    res.status(200).json({ success: true, data: doctor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Update logged-in patient's profile
// @route   PUT /api/auth/me
// @access  Protected (patient)
app.put("/api/auth/me", protect, upload.single("photo"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { name, phone, age, gender, bloodGroup, chronicConditions } = req.body;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (age !== undefined) user.age = Number(age);
    if (gender) user.gender = gender;
    if (bloodGroup) user.bloodGroup = bloodGroup;
    if (chronicConditions !== undefined) user.chronicConditions = chronicConditions;
    if (req.file) user.photo = req.file.path;

    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    res.status(200).json({ success: true, message: "Profile updated", data: userObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Update logged-in doctor's profile
// @route   PUT /api/doctor-auth/me
// @access  Protected (doctor)
app.put("/api/doctor-auth/me", protect, upload.single("profileImage"), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user.id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

    const { firstName, lastName, phone, specialization, experience, consultationFee, clinicAddress, gender } = req.body;
    if (firstName) doctor.firstName = firstName;
    if (lastName) doctor.lastName = lastName;
    if (phone) doctor.phone = phone;
    if (specialization) doctor.specialization = specialization;
    if (experience !== undefined) doctor.experience = Number(experience);
    if (consultationFee !== undefined) doctor.consultationFee = Number(consultationFee);
    if (clinicAddress !== undefined) doctor.clinicAddress = clinicAddress;
    if (gender) doctor.gender = gender;
    if (req.file) doctor.profileImage = req.file.path;

    await doctor.save();
    const doctorObj = doctor.toObject();
    delete doctorObj.password;
    res.status(200).json({ success: true, message: "Profile updated", data: doctorObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- Doctor List API ----------------

// @desc    Get all doctors (with optional specialty filter)
// @route   GET /api/doctors
// @access  Protected
app.get("/api/doctors", protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.specialty) filter.specialization = req.query.specialty;
    if (req.query.gender) filter.gender = req.query.gender;
    const doctors = await Doctor.find(filter).select("-password");
    res.status(200).json({ success: true, data: doctors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------------- Appointment APIs ----------------

// @desc    Patient books an appointment
// @route   POST /api/appointments
// @access  Protected (patient)
app.post("/api/appointments", protect, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({ success: false, message: "Only patients can book appointments" });
    }
    const { doctorId, slot, date } = req.body;
    if (!doctorId || !slot) {
      return res.status(400).json({ success: false, message: "doctorId and slot are required" });
    }

    // Prevent duplicate pending/accepted bookings for same doctor+slot+date
    const conflictQuery = { doctorId, slot, status: { $in: ["pending", "accepted"] } };
    if (date) conflictQuery.date = date;
    const conflict = await Appointment.findOne(conflictQuery);
    if (conflict) {
      return res.status(400).json({ success: false, message: "This slot is already booked for the selected date" });
    }

    const appointment = await Appointment.create({
      patientId: req.user.id,
      doctorId,
      slot,
      date: date || "",
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get logged-in patient's appointments
// @route   GET /api/appointments/patient
// @access  Protected (patient)
app.get("/api/appointments/patient", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user.id })
      .populate("doctorId", "firstName lastName specialization profileImage")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get pending + accepted appointments for logged-in doctor
// @route   GET /api/appointments/doctor
// @access  Protected (doctor)
app.get("/api/appointments/doctor", protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.user.id })
      .populate("patientId", "name phone")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Doctor accepts an appointment
// @route   PUT /api/appointments/:id/accept
// @access  Protected (doctor)
app.put("/api/appointments/:id/accept", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    appointment.status = "accepted";
    await appointment.save();
    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Doctor rejects an appointment
// @route   PUT /api/appointments/:id/reject
// @access  Protected (doctor)
app.put("/api/appointments/:id/reject", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    appointment.status = "rejected";
    await appointment.save();
    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Patient cancels a pending appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Protected (patient)
app.put("/api/appointments/:id/cancel", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (appointment.patientId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (appointment.status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending appointments can be cancelled" });
    }
    appointment.status = "cancelled";
    await appointment.save();
    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Doctor marks an accepted appointment as completed
// @route   PUT /api/appointments/:id/complete
// @access  Protected (doctor)
app.put("/api/appointments/:id/complete", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (appointment.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Only accepted appointments can be completed" });
    }
    appointment.status = "completed";
    appointment.completedAt = new Date();
    if (req.body.notes) appointment.notes = req.body.notes;
    await appointment.save();
    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Doctor marks an accepted appointment as no-show
// @route   PUT /api/appointments/:id/noshow
// @access  Protected (doctor)
app.put("/api/appointments/:id/noshow", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    if (appointment.doctorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    if (appointment.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Only accepted appointments can be marked no-show" });
    }
    appointment.status = "no-show";
    await appointment.save();
    res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get appointment statistics for logged-in doctor
// @route   GET /api/appointments/doctor/stats
// @access  Protected (doctor)
app.get("/api/appointments/doctor/stats", protect, async (req, res) => {
  try {
    const all = await Appointment.find({ doctorId: req.user.id });
    const stats = {
      total: all.length,
      pending: all.filter(a => a.status === "pending").length,
      accepted: all.filter(a => a.status === "accepted").length,
      completed: all.filter(a => a.status === "completed").length,
      rejected: all.filter(a => a.status === "rejected").length,
      cancelled: all.filter(a => a.status === "cancelled").length,
      noShow: all.filter(a => a.status === "no-show").length,
    };
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get appointment statistics for logged-in patient
// @route   GET /api/appointments/patient/stats
// @access  Protected (patient)
app.get("/api/appointments/patient/stats", protect, async (req, res) => {
  try {
    const all = await Appointment.find({ patientId: req.user.id });
    const stats = {
      total: all.length,
      pending: all.filter(a => a.status === "pending").length,
      accepted: all.filter(a => a.status === "accepted").length,
      completed: all.filter(a => a.status === "completed").length,
      cancelled: all.filter(a => a.status === "cancelled").length,
      rejected: all.filter(a => a.status === "rejected").length,
    };
    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================================
// AI Chatbot API (GitHub Models-powered)
// ================================

// ── GitHub Models AI helper ──
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_MODEL = "gpt-4o-mini";
const GITHUB_API_URL = "https://models.inference.ai.azure.com/chat/completions";

const MEDICAL_SYSTEM_PROMPT = `You are HealthBot AI, a friendly and knowledgeable medical health assistant integrated into the HealthSync healthcare platform.

Your role:
- Answer general health and medical questions in a clear, empathetic, and accurate way.
- Provide information about symptoms, conditions, medications, first aid, nutrition, exercise, mental health, and wellness.
- Always include a disclaimer when giving medical advice: remind users that your information is for educational purposes and they should consult a licensed healthcare professional for diagnosis and treatment.
- If a question is about a medical emergency, immediately advise the user to call emergency services (e.g., 108/112 in India, 911 in the US).
- Keep responses concise (under 200 words) and well-structured using markdown bold (**text**) for emphasis.
- Do NOT diagnose conditions definitively. Use phrases like "this could be", "you may want to check", "common causes include".
- Be warm, supportive, and non-judgmental.
- If the user asks about the HealthSync app (appointments, doctors, records), mention that they can use the chatbot commands like "Book an appointment" or "Find a doctor" for app-specific help.
- Never provide information about illegal drugs, self-harm, or dangerous activities.
- You can suggest home remedies and lifestyle changes alongside professional medical advice.`;

// Conversation history per session (in-memory, keyed by token or IP)
const chatSessions = new Map();
const MAX_HISTORY = 10;
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

function getSessionKey(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      return `user_${decoded.id}`;
    } catch (_) { /* fall through */ }
  }
  return `ip_${req.ip}`;
}

function getSession(key) {
  const session = chatSessions.get(key);
  if (session && Date.now() - session.lastActive < SESSION_TTL) {
    session.lastActive = Date.now();
    return session;
  }
  const newSession = { history: [], lastActive: Date.now() };
  chatSessions.set(key, newSession);
  return newSession;
}

// Cleanup stale sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of chatSessions) {
    if (now - session.lastActive > SESSION_TTL) chatSessions.delete(key);
  }
}, 10 * 60 * 1000);

async function askAI(userMessage, sessionKey) {
  if (!GITHUB_TOKEN) {
    return {
      reply: "AI features are not configured yet. Please ask the administrator to set up the **GITHUB_TOKEN** environment variable.\n\nIn the meantime, I can still help with appointments — try *\"Book an appointment\"* or *\"Find a doctor\"*.",
      suggestions: ["Book an appointment", "Find a doctor", "Show my appointments"],
    };
  }

  const session = getSession(sessionKey);

  // Build messages array for OpenAI-compatible chat completions API
  const messages = [
    { role: "system", content: MEDICAL_SYSTEM_PROMPT },
  ];

  // Add conversation history
  for (const turn of session.history) {
    messages.push({ role: "user", content: turn.user });
    messages.push({ role: "assistant", content: turn.model });
  }

  // Add current message
  messages.push({ role: "user", content: userMessage });

  try {
    // Retry with exponential backoff for rate limiting
    let response;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
      try {
        response = await fetch(GITHUB_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
          },
          body: JSON.stringify({
            model: GITHUB_MODEL,
            messages,
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 512,
          }),
        });
        if (response.ok) break;
        if (response.status === 429) {
          console.warn(`GitHub Models rate limited (attempt ${attempt + 1}/3), retrying...`);
          lastError = new Error("Rate limited (429)");
          continue;
        }
        const errText = await response.text();
        console.error("GitHub Models API error:", response.status, errText);
        throw new Error(`GitHub Models API returned ${response.status}`);
      } catch (fetchErr) {
        lastError = fetchErr;
        if (fetchErr.message.includes("Rate limited")) continue;
        throw fetchErr;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error("GitHub Models API failed after retries");
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message?.content || "";

    if (!aiReply) {
      throw new Error("Empty response from GitHub Models");
    }

    // Store in session history
    session.history.push({ user: userMessage, model: aiReply });
    if (session.history.length > MAX_HISTORY) session.history.shift();

    return {
      reply: aiReply,
      suggestions: ["Ask another health question", "Book an appointment", "Find a doctor"],
    };
  } catch (err) {
    console.error("AI call failed:", err.message);
    const isRateLimit = err.message.includes("429") || err.message.includes("Rate limited");
    return {
      reply: isRateLimit
        ? "I'm getting a lot of questions right now and need a brief pause. ⏳\n\nPlease try again in **30 seconds** — I'll be ready!\n\nIn the meantime, I can help with:\n• Booking appointments\n• Finding doctors\n• Tracking appointment status"
        : "I'm having trouble connecting to my AI brain right now. Let me help with what I know!\n\nI can still assist with:\n• Booking appointments\n• Finding doctors\n• Tracking appointment status\n\nTry again in a moment for health questions.",
      suggestions: ["Book an appointment", "Find a doctor", "Show my appointments"],
    };
  }
}

// Intent matchers
const INTENTS = [
  { name: "greeting",         pattern: /^(hi|hello|hey|good (morning|evening|afternoon)|howdy|sup|yo)\b/i },
  { name: "book",             pattern: /\b(book|schedule|make|create|new|set up|fix)\b.{0,20}\b(appointment|appt|slot|visit|consult)/i },
  { name: "cancel",           pattern: /\b(cancel|remove|delete|withdraw)\b.{0,20}\b(appointment|appt|booking)/i },
  { name: "my_appointments",  pattern: /\b(my appointment|my appt|show.*appt|list.*appt|upcoming|view.*appt|see.*appt|all appt)/i },
  { name: "pending",          pattern: /\b(pending|waiting|not yet|awaiting|unconfirmed)\b/i },
  { name: "confirmed",        pattern: /\b(confirmed|accepted|approved|upcoming visit)\b/i },
  { name: "completed",        pattern: /\b(completed|done|finished|past|previous)\b.{0,20}\b(appointment|appt|visit)/i },
  { name: "find_doctor",      pattern: /\b(find|search|look for|show|who|list)\b.{0,20}\b(doctor|dr\.|specialist|physician|cardiolog|dermato|neuro|orthoped|pediatr|gynec|ophthal|psychiatr|gastro|pulmo)/i },
  { name: "doctor_fee",       pattern: /\b(fee|cost|price|charge|pay|consultation fee)\b/i },
  { name: "doctor_fee",       pattern: /\bhow much\b.{0,20}\b(fee|cost|charge|doctor|consult|appointment|appt|visit)\b/i },
  { name: "profile",          pattern: /\b(profile|my info|personal info|my details|account|update info)\b/i },
  { name: "records",          pattern: /\b(record|prescription|file|document|upload|medical history|report)\b/i },
  { name: "status",           pattern: /\b(status|track|what.*happen|progress|where.*appointment)\b/i },
  { name: "help",             pattern: /\b(help|guide|what can you|explain|instructions|what do you|walk me|assist)\b/i },
  { name: "navigate_patient", pattern: /\b(go to|take me|open|navigate|show me)\b.{0,20}\b(dashboard|home|appointment page|booking page)\b/i },
  { name: "thanks",           pattern: /\b(thank|thanks|thx|ty|great|perfect|awesome|got it|ok|okay|nice|cool)\b/i },
  { name: "doctor_portal",    pattern: /\b(manage|patient list|incoming request|approve|accept|reject|no.show|complete)\b/i },
];

function detectIntent(msg) {
  for (const intent of INTENTS) {
    if (intent.pattern.test(msg)) return intent.name;
  }
  return "unknown";
}

function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// @route   POST /api/chatbot
// @access  Public (enhanced when authenticated)
app.post("/api/chatbot", async (req, res) => {
  try {
    const { message, role: clientRole } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message required" });

    // Try to identify user from token (optional auth)
    let userId = null, userRole = clientRole || null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        userId = decoded.id;
        userRole = decoded.role;
      } catch (_) { /* no-op — unauthenticated is fine */ }
    }

    const intent = detectIntent(message);
    let reply = "", suggestions = [], action = null;

    // ── Intent handlers ──────────────────────────────────────
    if (intent === "greeting") {
      const greets = ["Hello! 👋", "Hey there! 👋", "Hi! 👋"];
      reply = `${greets[Math.floor(Math.random() * greets.length)]} I'm **HealthBot**, your appointment assistant.\n\nI can help you book appointments, check status, find doctors, and more. What would you like to do?`;
      suggestions = ["Book an appointment", "Show my appointments", "Find a doctor", "How does this work?"];
    }

    else if (intent === "book") {
      if (!userId) {
        reply = "To book an appointment, you need to be logged in first. Once logged in:\n\n1. Go to **Appointments** from your dashboard\n2. Search for a doctor by name or specialty\n3. Click **Book Now** on any doctor card\n4. Choose a date and time slot\n5. Confirm — your request is sent instantly!";
        suggestions = ["Find a doctor", "What happens after booking?", "How much does it cost?"];
      } else if (userRole === "doctor") {
        reply = "As a doctor, you don't book appointments — patients send you requests.\n\nYou can **Accept** or **Reject** requests from your Appointments page.";
        suggestions = ["Show pending requests", "How do I accept?"];
        action = { type: "navigate", path: "/doctor-appointment" };
      } else {
        reply = "Ready to book! Here's how:\n\n1. Go to **Appointments → Find Doctors** tab\n2. Filter by specialty or search by name\n3. Click **Book Now**\n4. Pick a date and time slot\n5. Confirm — doctor will review your request\n\nShall I take you to the Appointments page?";
        suggestions = ["Yes, take me there", "Find a cardiologist", "What are the consultation fees?"];
        action = { type: "navigate", path: "/patient-appointment" };
      }
    }

    else if (intent === "cancel") {
      if (userRole === "doctor") {
        reply = "As a doctor, you can **Reject** pending appointment requests from your Appointments page. Accepted appointments can't be cancelled by you — patients cancel those.";
        suggestions = ["Show my appointments"];
        action = { type: "navigate", path: "/doctor-appointment" };
      } else {
        reply = "To cancel an appointment:\n\n1. Go to **Appointments → My Appointments** tab\n2. Find the appointment you want to cancel\n3. Click **Cancel Request** (only available for **Pending** appointments)\n\n⚠️ Note: Once a doctor has accepted your appointment, contact them directly to reschedule.";
        suggestions = ["Show my appointments", "Will I get a refund?"];
        action = { type: "navigate", path: "/patient-appointment" };
      }
    }

    else if (intent === "my_appointments" || intent === "status") {
      if (!userId) {
        reply = "You need to be logged in to view your appointments. Please sign in to your patient account.";
        suggestions = ["How do I log in?", "Book an appointment"];
      } else if (userRole === "patient") {
        try {
          const appts = await Appointment.find({ patientId: userId })
            .populate("doctorId", "firstName lastName specialization")
            .sort({ createdAt: -1 })
            .limit(5);
          if (appts.length === 0) {
            reply = "You don't have any appointments yet. Book your first appointment now!";
            suggestions = ["Book an appointment", "Find a doctor"];
            action = { type: "navigate", path: "/patient-appointment" };
          } else {
            const lines = appts.map(a => {
              const doc = a.doctorId ? `Dr. ${a.doctorId.firstName} ${a.doctorId.lastName} (${a.doctorId.specialization})` : "Doctor";
              const dateStr = a.date ? ` on ${fmtDate(a.date)}` : "";
              const statusEmoji = { pending: "⏳", accepted: "✅", completed: "🏥", rejected: "❌", cancelled: "🚫", "no-show": "👻" }[a.status] || "•";
              return `${statusEmoji} **${doc}**${dateStr} at ${a.slot} — ${a.status.charAt(0).toUpperCase() + a.status.slice(1)}`;
            });
            reply = `Here are your recent appointments:\n\n${lines.join("\n")}\n\nClick below to view all with full details.`;
            suggestions = ["Book new appointment", "How do I cancel?", "View all appointments"];
            action = { type: "navigate", path: "/patient-appointment" };
          }
        } catch (_) {
          reply = "I couldn't fetch your appointments right now. Please visit the Appointments page directly.";
          action = { type: "navigate", path: "/patient-appointment" };
        }
      } else if (userRole === "doctor") {
        try {
          const appts = await Appointment.find({ doctorId: userId })
            .populate("patientId", "name")
            .sort({ createdAt: -1 })
            .limit(5);
          const pending = appts.filter(a => a.status === "pending").length;
          const accepted = appts.filter(a => a.status === "accepted").length;
          const completed = appts.filter(a => a.status === "completed").length;
          reply = `Here's a quick summary of your appointments:\n\n⏳ **${pending}** pending requests\n✅ **${accepted}** confirmed upcoming\n🏥 **${completed}** completed\n\nTotal: **${appts.length}** (showing last 5)`;
          suggestions = ["Show pending requests", "How do I complete an appointment?"];
          action = { type: "navigate", path: "/doctor-appointment" };
        } catch (_) {
          reply = "I couldn't fetch your appointments. Please check the Appointments page.";
          action = { type: "navigate", path: "/doctor-appointment" };
        }
      }
    }

    else if (intent === "pending") {
      if (!userId) {
        reply = "Log in to see your pending appointments. Pending means you've sent a request but the doctor hasn't responded yet.";
        suggestions = ["How do I book?"];
      } else if (userRole === "patient") {
        try {
          const appts = await Appointment.find({ patientId: userId, status: "pending" })
            .populate("doctorId", "firstName lastName specialization");
          if (appts.length === 0) {
            reply = "You have no pending appointments right now. All your requests have been responded to.";
            suggestions = ["Book new appointment", "Show all appointments"];
          } else {
            const lines = appts.map(a => {
              const doc = a.doctorId ? `Dr. ${a.doctorId.firstName} ${a.doctorId.lastName}` : "Doctor";
              return `⏳ **${doc}** at ${a.slot}${a.date ? ` on ${fmtDate(a.date)}` : ""}`;
            });
            reply = `You have **${appts.length}** pending appointment${appts.length > 1 ? "s" : ""}:\n\n${lines.join("\n")}\n\nPending appointments are waiting for the doctor to accept. You can cancel them if needed.`;
            suggestions = ["How do I cancel?", "Book another appointment"];
            action = { type: "navigate", path: "/patient-appointment" };
          }
        } catch (_) {
          reply = "Couldn't load pending appointments. Please check the Appointments page.";
        }
      } else if (userRole === "doctor") {
        try {
          const appts = await Appointment.find({ doctorId: userId, status: "pending" })
            .populate("patientId", "name");
          if (appts.length === 0) {
            reply = "No pending requests right now. You're all caught up! 🎉";
            suggestions = ["Show all appointments"];
          } else {
            const lines = appts.map(a => `⏳ **${a.patientId?.name || "Patient"}** at ${a.slot}${a.date ? ` on ${fmtDate(a.date)}` : ""}`);
            reply = `You have **${appts.length}** pending request${appts.length > 1 ? "s" : ""} to review:\n\n${lines.join("\n")}\n\nGo to Appointments to Accept or Reject each request.`;
            suggestions = ["How do I accept requests?"];
            action = { type: "navigate", path: "/doctor-appointment" };
          }
        } catch (_) {
          reply = "Couldn't load pending requests. Please check the Appointments page.";
        }
      } else {
        // admin or other roles
        reply = "As an administrator, you can view and manage all pending appointments from the **Admin Dashboard** under the **Appointments** tab.";
        suggestions = ["Go to dashboard"];
        action = { type: "navigate", path: "/admin-dashboard" };
      }
    }

    else if (intent === "confirmed") {
      if (userRole === "patient") {
        try {
          const appts = await Appointment.find({ patientId: userId, status: "accepted" })
            .populate("doctorId", "firstName lastName specialization clinicAddress");
          if (!appts.length) {
            reply = "You have no confirmed upcoming appointments.";
            suggestions = ["Book an appointment"];
          } else {
            const lines = appts.map(a => {
              const doc = a.doctorId ? `Dr. ${a.doctorId.firstName} ${a.doctorId.lastName} (${a.doctorId.specialization})` : "Doctor";
              const clinic = a.doctorId?.clinicAddress ? ` at ${a.doctorId.clinicAddress}` : "";
              return `✅ **${doc}**${a.date ? ` — ${fmtDate(a.date)}` : ""} at ${a.slot}${clinic}`;
            });
            reply = `Your **${appts.length}** confirmed appointment${appts.length > 1 ? "s" : ""}:\n\n${lines.join("\n")}\n\nThese are locked in — don't miss them!`;
            suggestions = ["How do I cancel?", "Book another appointment"];
          }
        } catch (_) {
          reply = "Couldn't load confirmed appointments. Check the Appointments page.";
        }
      } else {
        reply = "As a doctor, confirmed appointments are ones you've already accepted. Check them on your Appointments page under the **Confirmed** tab.";
        action = { type: "navigate", path: "/doctor-appointment" };
      }
    }

    else if (intent === "completed") {
      if (userRole === "doctor") {
        reply = "To mark an appointment as complete:\n\n1. Go to **Appointments**\n2. Filter by **Confirmed** tab\n3. Click **✅ Complete** on the appointment\n4. Add consultation notes (optional)\n5. Confirm\n\nCompleted appointments are stored in the patient's history.";
        suggestions = ["How do I add notes?", "What is No-Show?"];
        action = { type: "navigate", path: "/doctor-appointment" };
      } else {
        try {
          const count = userId ? await Appointment.countDocuments({ patientId: userId, status: "completed" }) : 0;
          reply = count > 0
            ? `You have **${count}** completed appointment${count > 1 ? "s" : ""}. You can view them along with any doctor notes on your Appointments page under the **Completed** tab.`
            : "No completed appointments yet. After your first visit, the doctor will mark it complete and add any notes.";
          suggestions = ["Book an appointment", "Show all appointments"];
          action = { type: "navigate", path: "/patient-appointment" };
        } catch (_) {
          reply = "Check the Appointments page for completed visits.";
        }
      }
    }

    else if (intent === "find_doctor") {
      try {
        const specialtyMatch = message.match(/\b(cardiolog|dermato|dentist|neuro|orthoped|pediatr|gynec|ophthal|psychiatr|gastro|pulmo|general)\w*/i);
        let doctors;
        if (specialtyMatch) {
          const spec = specialtyMatch[0];
          doctors = await Doctor.find({ specialization: new RegExp(spec, "i"), isActive: true })
            .select("firstName lastName specialization experience consultationFee clinicAddress")
            .limit(4);
        } else {
          doctors = await Doctor.find({ isActive: true })
            .select("firstName lastName specialization experience consultationFee")
            .limit(5);
        }
        if (!doctors.length) {
          reply = "No doctors found for that search. Try browsing all available doctors on the Appointments page.";
          action = { type: "navigate", path: "/patient-appointment" };
        } else {
          const lines = doctors.map(d => {
            const fee = d.consultationFee > 0 ? ` — ₹${d.consultationFee}` : "";
            const exp = d.experience > 0 ? ` · ${d.experience} yrs exp` : "";
            return `👨‍⚕️ **Dr. ${d.firstName} ${d.lastName}** — ${d.specialization}${exp}${fee}`;
          });
          reply = `Here are some available doctors:\n\n${lines.join("\n")}\n\nBook any of them on the Appointments page!`;
          suggestions = ["Book an appointment", "Filter by specialty", "What are consultation fees?"];
          action = { type: "navigate", path: "/patient-appointment" };
        }
      } catch (_) {
        reply = "Browse all available doctors on the Appointments page.";
        action = { type: "navigate", path: "/patient-appointment" };
      }
    }

    else if (intent === "doctor_fee") {
      try {
        const doctors = await Doctor.find({ isActive: true, consultationFee: { $gt: 0 } })
          .select("firstName lastName specialization consultationFee")
          .sort({ consultationFee: 1 })
          .limit(5);
        if (!doctors.length) {
          reply = "Consultation fees vary by doctor. Check individual doctor cards on the Appointments page for exact fees.";
        } else {
          const lines = doctors.map(d => `💰 **Dr. ${d.firstName} ${d.lastName}** (${d.specialization}) — ₹${d.consultationFee}`);
          reply = `Here are some doctor consultation fees:\n\n${lines.join("\n")}\n\nFees are shown on each doctor card when you search.`;
        }
        suggestions = ["Book an appointment", "Find a doctor"];
        action = { type: "navigate", path: "/patient-appointment" };
      } catch (_) {
        reply = "Consultation fees are listed on each doctor's card on the Appointments page.";
      }
    }

    else if (intent === "profile") {
      if (userRole === "doctor") {
        reply = "Your profile shows your professional details — name, specialization, license number, experience, and consultation fee.\n\nYou can view it from the **My Profile** link in the sidebar or nav.";
        suggestions = ["Go to my profile"];
        action = { type: "navigate", path: "/doctor-profile" };
      } else {
        reply = "Your profile shows your personal details — name, age, blood group, and contact info.\n\nVisit your profile from the dashboard or the **My Profile** nav option.";
        suggestions = ["Go to my profile", "Update my info"];
        action = { type: "navigate", path: "/patient_profile" };
      }
    }

    else if (intent === "records") {
      if (userRole === "doctor") {
        reply = "As a doctor, you can upload and manage your professional documents.\n\nAccess **Medical Records** from your dashboard — click the tile or the nav link.";
        action = { type: "navigate", path: "/doctor-dashboard" };
      } else {
        reply = "You can upload and access your medical records (lab reports, prescriptions, scans):\n\n1. Go to your **Dashboard**\n2. Click **Medical Records**\n3. Upload PDF or image files\n\nYour records are securely stored on the cloud.";
        suggestions = ["Go to dashboard", "How are records stored?"];
        action = { type: "navigate", path: "/patient-dashboard" };
      }
    }

    else if (intent === "doctor_portal") {
      reply = "As a doctor, here's how to manage appointments:\n\n• **Pending** — Review and Accept or Reject patient requests\n• **Confirmed** — Mark visits as ✅ Complete (add notes) or 👻 No-Show\n• **No-Show** — Patient didn't arrive for a confirmed appointment\n\nAll changes update instantly in the patient's view.";
      suggestions = ["Show pending requests", "How do I add notes?"];
      action = { type: "navigate", path: "/doctor-appointment" };
    }

    else if (intent === "help") {
      if (userRole === "doctor") {
        reply = "Here's what I can help you with:\n\n📅 **Appointments** — View, accept, reject, complete requests\n👤 **Profile** — View your professional details\n📄 **Medical Records** — Upload/manage documents\n📊 **Dashboard** — Overview of your stats\n\nWhat would you like to do?";
        suggestions = ["Show pending requests", "How do I complete an appointment?", "Go to dashboard"];
      } else {
        reply = "Here's what I can help you with:\n\n📅 **Book appointments** — Find doctors and book\n🔍 **Find doctors** — Search by specialty or name\n📊 **Track status** — Pending, confirmed, completed\n❌ **Cancel** — Cancel pending requests\n📄 **Medical records** — Upload your documents\n\nWhat would you like to do?";
        suggestions = ["Book an appointment", "Show my appointments", "Find a cardiologist", "Upload a record"];
      }
    }

    else if (intent === "navigate_patient") {
      const path = (userRole === "doctor") ? "/doctor-dashboard" : "/patient-dashboard";
      reply = "Taking you to your dashboard!";
      action = { type: "navigate", path };
    }

    else if (intent === "thanks") {
      const replies = [
        "Happy to help! 😊 Is there anything else you need?",
        "You're welcome! Let me know if you need anything else.",
        "Glad I could assist! 🏥 Feel free to ask anytime.",
      ];
      reply = replies[Math.floor(Math.random() * replies.length)];
      suggestions = ["Book an appointment", "Show my appointments", "Find a doctor"];
    }

    else {
      // Fallback — use GitHub Models AI for medical/general questions
      const sessionKey = getSessionKey(req);
      const aiResult = await askAI(message, sessionKey);
      reply = aiResult.reply;
      suggestions = aiResult.suggestions || [];
    }

    // Safety net: if reply is still empty after all handlers, use AI
    if (!reply) {
      const sessionKey = getSessionKey(req);
      const aiResult = await askAI(message, sessionKey);
      reply = aiResult.reply;
      suggestions = aiResult.suggestions || [];
    }

    res.status(200).json({ success: true, data: { reply, suggestions, action } });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ success: false, message: "Chatbot error", data: { reply: "Sorry, I ran into an error. Please try again!", suggestions: [], action: null } });
  }
});

// ================================
// Admin APIs
// ================================

// @desc    Register a new admin (seed or internal use)
// @route   POST /api/admin/register
// @access  Public (should be restricted in production)
app.post("/api/admin/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }
    const exists = await Admin.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: "Admin with this email already exists." });
    }
    const admin = await Admin.create({ name, email: email.toLowerCase(), password });
    const token = generateToken(admin._id, "admin");
    const adminObj = admin.toObject();
    delete adminObj.password;
    res.status(201).json({ success: true, message: "Admin registered successfully", data: { admin: adminObj, token } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Login admin
// @route   POST /api/admin/login
// @access  Public
app.post("/api/admin/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select("+password");
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const token = generateToken(admin._id, "admin");
    const adminObj = admin.toObject();
    delete adminObj.password;
    res.status(200).json({ success: true, data: { admin: adminObj, token } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Protected (admin)
app.get("/api/admin/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const [totalPatients, totalDoctors, totalAppointments, totalRecords] = await Promise.all([
      User.countDocuments(),
      Doctor.countDocuments(),
      Appointment.countDocuments(),
      MedicalRecord.countDocuments(),
    ]);

    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const recentPatients = await User.find().sort({ createdAt: -1 }).limit(5).select("name email createdAt");
    const recentDoctors = await Doctor.find().sort({ createdAt: -1 }).limit(5).select("firstName lastName email specialization createdAt");
    const recentAppointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("patientId", "name email")
      .populate("doctorId", "firstName lastName specialization");

    res.status(200).json({
      success: true,
      data: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        totalRecords,
        appointmentsByStatus: appointmentsByStatus.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
        recentPatients,
        recentDoctors,
        recentAppointments,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — list all patients
// @route   GET /api/admin/patients
// @access  Protected (admin)
app.get("/api/admin/patients", protect, authorize("admin"), async (req, res) => {
  try {
    const patients = await User.find().sort({ createdAt: -1 }).select("-password");
    res.status(200).json({ success: true, data: patients });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — list all doctors
// @route   GET /api/admin/doctors
// @access  Protected (admin)
app.get("/api/admin/doctors", protect, authorize("admin"), async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 }).select("-password");
    res.status(200).json({ success: true, data: doctors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — list all appointments
// @route   GET /api/admin/appointments
// @access  Protected (admin)
app.get("/api/admin/appointments", protect, authorize("admin"), async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .sort({ createdAt: -1 })
      .populate("patientId", "name email phone")
      .populate("doctorId", "firstName lastName specialization");
    res.status(200).json({ success: true, data: appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — list all medical records
// @route   GET /api/admin/records
// @access  Protected (admin)
app.get("/api/admin/records", protect, authorize("admin"), async (req, res) => {
  try {
    const records = await MedicalRecord.find().sort({ createdAt: -1 });

    // Gather user IDs and their roles, then populate owner names
    const populated = await Promise.all(
      records.map(async (r) => {
        const rec = r.toObject();
        try {
          if (rec.userRole === "patient") {
            const u = await User.findById(rec.userId).select("name email");
            rec.ownerName = u?.name || "Unknown Patient";
            rec.ownerEmail = u?.email || "";
          } else if (rec.userRole === "doctor") {
            const d = await Doctor.findById(rec.userId).select("firstName lastName email");
            rec.ownerName = d ? `Dr. ${d.firstName} ${d.lastName}` : "Unknown Doctor";
            rec.ownerEmail = d?.email || "";
          }
        } catch {
          rec.ownerName = "Unknown";
          rec.ownerEmail = "";
        }
        return rec;
      })
    );

    res.status(200).json({ success: true, data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — delete any medical record
// @route   DELETE /api/admin/records/:id
// @access  Protected (admin)
app.delete("/api/admin/records/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Record not found" });
    await cloudinary.uploader.destroy(record.filePublicId, { resource_type: "auto" });
    await record.deleteOne();
    res.status(200).json({ success: true, message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — deactivate a patient
// @route   PUT /api/admin/patients/:id/deactivate
// @access  Protected (admin)
app.put("/api/admin/patients/:id/deactivate", protect, authorize("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Patient not found" });
    user.isActive = false;
    await user.save();
    res.status(200).json({ success: true, message: "Patient deactivated", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — deactivate a doctor
// @route   PUT /api/admin/doctors/:id/deactivate
// @access  Protected (admin)
app.put("/api/admin/doctors/:id/deactivate", protect, authorize("admin"), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    doctor.isActive = false;
    await doctor.save();
    res.status(200).json({ success: true, message: "Doctor deactivated", data: doctor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — reactivate a patient
// @route   PUT /api/admin/patients/:id/activate
// @access  Protected (admin)
app.put("/api/admin/patients/:id/activate", protect, authorize("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Patient not found" });
    user.isActive = true;
    await user.save();
    res.status(200).json({ success: true, message: "Patient activated", data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — reactivate a doctor
// @route   PUT /api/admin/doctors/:id/activate
// @access  Protected (admin)
app.put("/api/admin/doctors/:id/activate", protect, authorize("admin"), async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    doctor.isActive = true;
    await doctor.save();
    res.status(200).json({ success: true, message: "Doctor activated", data: doctor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — delete a patient
// @route   DELETE /api/admin/patients/:id
// @access  Protected (admin)
app.delete("/api/admin/patients/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "Patient not found" });
    // Also remove their appointments and medical records
    await Appointment.deleteMany({ patientId: req.params.id });
    await MedicalRecord.deleteMany({ userId: req.params.id });
    res.status(200).json({ success: true, message: "Patient and related data deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — delete a doctor
// @route   DELETE /api/admin/doctors/:id
// @access  Protected (admin)
app.delete("/api/admin/doctors/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });
    await Appointment.deleteMany({ doctorId: req.params.id });
    res.status(200).json({ success: true, message: "Doctor and related data deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — update appointment status
// @route   PUT /api/admin/appointments/:id/status
// @access  Protected (admin)
app.put("/api/admin/appointments/:id/status", protect, authorize("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "accepted", "rejected", "cancelled", "completed", "no-show"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
    appointment.status = status;
    if (status === "completed") appointment.completedAt = new Date();
    await appointment.save();
    const updated = await Appointment.findById(req.params.id)
      .populate("patientId", "name email phone")
      .populate("doctorId", "firstName lastName specialization");
    res.status(200).json({ success: true, message: "Appointment status updated", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Admin — delete an appointment
// @route   DELETE /api/admin/appointments/:id
// @access  Protected (admin)
app.delete("/api/admin/appointments/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found" });
    res.status(200).json({ success: true, message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================================
// Doctor — Patient Medical Records Access
// ================================

// @desc    Doctor views a patient's medical records (via appointment relationship)
// @route   GET /api/records/patient/:patientId
// @access  Protected (doctor)
app.get("/api/records/patient/:patientId", protect, authorize("doctor"), async (req, res) => {
  try {
    // Verify doctor has an appointment relationship with this patient
    const hasRelationship = await Appointment.findOne({
      doctorId: req.user.id,
      patientId: req.params.patientId,
      status: { $in: ["accepted", "completed"] },
    });
    if (!hasRelationship) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view records for patients with an active or completed appointment.",
      });
    }

    const filter = { userId: req.params.patientId, userRole: "patient" };
    if (req.query.type && req.query.type !== "All") filter.recordType = req.query.type;

    const sortField = req.query.sort === "name" ? "fileName" : "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;

    const records = await MedicalRecord.find(filter).sort({ [sortField]: sortOrder });
    const patient = await User.findById(req.params.patientId).select("name email phone age gender bloodGroup chronicConditions");

    res.status(200).json({ success: true, data: { patient, records } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @desc    Doctor gets list of their patients (from appointments)
// @route   GET /api/doctor/patients
// @access  Protected (doctor)
app.get("/api/doctor/patients", protect, authorize("doctor"), async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctorId: req.user.id,
      status: { $in: ["accepted", "completed"] },
    }).populate("patientId", "name email phone age gender bloodGroup photo");

    // De-duplicate patients
    const patientMap = new Map();
    for (const appt of appointments) {
      if (appt.patientId && !patientMap.has(appt.patientId._id.toString())) {
        patientMap.set(appt.patientId._id.toString(), appt.patientId);
      }
    }

    res.status(200).json({ success: true, data: Array.from(patientMap.values()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================================
// Appointment Reminders
// ================================

// @desc    Send email reminders for upcoming appointments (tomorrow)
// @route   POST /api/appointments/send-reminders
// @access  Protected (admin) or can be called by a cron job
app.post("/api/appointments/send-reminders", protect, authorize("admin"), async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const upcomingAppts = await Appointment.find({
      date: tomorrowStr,
      status: "accepted",
    })
      .populate("patientId", "name email")
      .populate("doctorId", "firstName lastName specialization clinicAddress");

    let sentCount = 0;
    for (const appt of upcomingAppts) {
      if (!appt.patientId?.email) continue;
      const doc = appt.doctorId
        ? `Dr. ${appt.doctorId.firstName} ${appt.doctorId.lastName} (${appt.doctorId.specialization})`
        : "your doctor";
      const clinic = appt.doctorId?.clinicAddress ? ` at ${appt.doctorId.clinicAddress}` : "";

      try {
        const emailUser = process.env.EMAIL_USER?.trim();
        const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, "");
        if (!emailUser || !emailPass) continue;

        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: { user: emailUser, pass: emailPass },
          tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
          from: `"HealthSync" <${emailUser}>`,
          to: appt.patientId.email,
          subject: "HealthSync — Appointment Reminder for Tomorrow",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:16px;">
              <h2 style="color:#027346;margin:0 0 12px;">Appointment Reminder</h2>
              <p style="color:#374151;">Hi <strong>${appt.patientId.name}</strong>,</p>
              <p style="color:#374151;">You have an upcoming appointment <strong>tomorrow (${tomorrowStr})</strong> at <strong>${appt.slot}</strong> with <strong>${doc}</strong>${clinic}.</p>
              <p style="color:#374151;">Please arrive on time and bring any relevant medical documents.</p>
              <p style="color:#9ca3af;font-size:0.8rem;margin:24px 0 0;">— HealthSync Team</p>
            </div>`,
        });
        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send reminder to ${appt.patientId.email}: ${emailErr.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Sent ${sentCount} reminder(s) for ${upcomingAppts.length} appointment(s) tomorrow.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================================
// Global Error Handler
// ================================
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ================================
// Start Server
// ================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));