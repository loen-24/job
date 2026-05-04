const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const { initializeDb } = require("./src/db");
const config = require("./src/config");
const authRoutes = require("./src/routes/auth");
const { router: adminRoutes } = require("./src/routes/admin");
const employeeRoutes = require("./src/routes/employee");
const publicRoutes = require("./src/routes/public");
const { authenticate, requireRole } = require("./src/middleware/auth");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", globalLimiter);
app.use("/api/auth", authLimiter);

app.use(
  "/uploads",
  express.static(config.uploadPath, {
    index: false,
    dotfiles: "deny",
    fallthrough: false,
  })
);
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", authenticate, requireRole("admin"), adminRoutes);
app.use("/api/employee", authenticate, requireRole("employee"), employeeRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/{*any}", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, _req, res, _next) => {
  if (err && err.message && err.message.includes("Only JPG, PNG, and WEBP")) {
    res.status(400).json({ message: err.message });
    return;
  }

  if (err && err.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ message: "Photo size must be under 2MB" });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

initializeDb()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Airindiana CRM server running on http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
