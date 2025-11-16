import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server as IOServer } from "socket.io";

// Import database connection
import { testConnection, closePool } from "./config/database.js";

// Import routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import alumniRoutes from "./routes/alumni.js";
import newsRoutes from "./routes/news.js";
import eventRoutes from "./routes/events.js";
import connectionRoutes from "./routes/connections.js";
import messageRoutes from "./routes/messages.js";
import adminRoutes from "./routes/admin.js";
import reportsRoutes from "./routes/reports.js";
import exportRoutes from "./routes/export.js";

// Import middleware
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import setupSocket from "./socket.js";

const app = express();
// Allow overriding the port via environment. Default to 5001 to avoid
// common conflicts during local development if 5000 is already used.
const PORT = process.env.PORT || 5001;

// Create HTTP server (for socket.io attachment)
const server = createServer(app);
let io;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting - Adjusted for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 200 : 1000, // More lenient for development
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use("/api/", limiter);

// More restrictive rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 20 : 100, // More restrictive for auth
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply stricter rate limiting to auth routes
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

// CORS configuration
const corsOptions = {
  origin:
    process.env.CORS_ORIGINS?.split(",") ||
    (process.env.NODE_ENV === "production"
      ? ["https://alumni.iiitnr.ac.in", "https://www.iiitnr.ac.in"]
      : [
          `${process.env.FRONTEND_URL || "http://localhost:3000"}`,
          "http://127.0.0.1:3000",
        ]),
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Prevent client-side caching for API routes — avoids 304 responses for dynamic data
app.use("/api", (req, res, next) => {
  // Strong no-cache for API endpoints
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Logging middleware
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Resolve __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static file serving
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "IIIT NR Alumni Portal API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/alumni", alumniRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/reports", reportsRoutes);
app.use("/api/admin/reports/export", exportRoutes);

// Welcome route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to IIIT Naya Raipur Alumni Portal API",
    version: "1.0.0",
    documentation: "/api/docs",
    health: "/health",
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    console.log("✅ Database connection has been established successfully.");

    // Start server (HTTP server used for socket.io)
    await new Promise((resolve) => {
      // Initialize socket.io
      io = new IOServer(server, {
        cors: {
          origin:
            process.env.CORS_ORIGINS?.split(",") ||
            (process.env.NODE_ENV === "production"
              ? ["https://alumni.iiitnr.ac.in"]
              : [process.env.FRONTEND_URL || "http://localhost:3000"]),
          methods: ["GET", "POST"],
        },
      });

      // Attach socket handlers
      setupSocket(io);

      server.listen(PORT, () => {
        const serverUrl =
          process.env.NODE_ENV === "production"
            ? `https://api.alumni.iiitnr.ac.in`
            : `http://localhost:${PORT}`;
        console.log(`🚀 Server is running on port ${PORT}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`📝 API Documentation: ${serverUrl}/api/docs`);
        console.log(`❤️  Health Check: ${serverUrl}/health`);
        resolve();
      });
    });
  } catch (error) {
    console.error("❌ Unable to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.log("Unhandled Promise Rejection:", err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("Uncaught Exception:", err.message);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await closePool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received. Shutting down gracefully...");
  await closePool();
  process.exit(0);
});

// Start the server
startServer();

export default app;

