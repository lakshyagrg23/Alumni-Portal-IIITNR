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
import moderationRoutes from "./routes/moderation.js";

// Import middleware
import errorHandler from "./models/middleware/errorHandler.js";
import notFound from "./models/middleware/notFound.js";
import setupSocket from "./socket.js";

const app = express();
// Allow overriding the port via environment. Default to 5000 (original project expectation).
// Set PORT in .env if you need a different value.
const PORT = process.env.PORT || 5001;
// Respect X-Forwarded-* headers when behind a proxy/load balancer
app.set("trust proxy", 1);

// Create HTTP server (for socket.io attachment)
const server = createServer(app);
let io;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limit configuration (env-overridable)
const RATE_LIMIT_WINDOW_MS =
  Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_GENERAL_MAX =
  Number(process.env.RATE_LIMIT_GENERAL_MAX ?? process.env.RATE_LIMIT_MAX_REQUESTS) ||
  (process.env.NODE_ENV === "production" ? 200 : 1000);
const RATE_LIMIT_AUTH_MAX =
  Number(process.env.RATE_LIMIT_AUTH_MAX) ||
  (process.env.NODE_ENV === "production" ? 20 : 100);

// Rate limiting - Adjusted for development
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_GENERAL_MAX, // More lenient for development
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all API routes
app.use("/api/", limiter);

// More restrictive rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_AUTH_MAX, // More restrictive for auth
  message: "Too many authentication attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply stricter rate limiting to auth routes
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);

// CORS configuration
const devOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://127.0.0.1:3000",
  // Common Vite ports
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
];

const corsOptions = {
  origin:
    process.env.CORS_ORIGINS?.split(",").map(o => o.trim()) ||
    (process.env.NODE_ENV === "production"
      ? ["https://alumni.iiitnr.ac.in", "https://www.iiitnr.ac.in"]
      : devOrigins),
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

// Static file serving with CORS headers
app.use("/uploads", (req, res, next) => {
  // Set CORS headers for static files
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, "../uploads")));

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
app.use("/api/moderation", moderationRoutes);

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
            process.env.CORS_ORIGINS?.split(",").map(o => o.trim()) ||
            (process.env.NODE_ENV === "production"
              ? ["https://alumni.iiitnr.ac.in"]
              : devOrigins),
          methods: ["GET", "POST"],
          credentials: true,
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

