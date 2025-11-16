import { Pool } from "pg";

// Database configuration using PostgreSQL connection pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || "username"}:${process.env.DB_PASSWORD || "password"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || "alumni_portal"}`,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 20, // Maximum number of connections in the pool
  min: 2, // Minimum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

// Preserve the original pool.query implementation to avoid accidental recursion
const rawQuery = pool.query.bind(pool);

// Database query function with error handling
export const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const res = await rawQuery(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === "development") {
      console.log("Executed query:", { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    console.error("Database query error:", {
      query: text,
      params,
      error: error.message,
    });
    throw error;
  }
};

// Get a client from the pool for transactions
export const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error("Error getting database client:", error);
    throw error;
  }
};

// Test database connection
export const testConnection = async () => {
  try {
    const result = await query("SELECT NOW() as current_time");
    console.log("Database connection has been established successfully.");
    console.log("Current time from database:", result.rows[0].current_time);
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error;
  }
};

// Graceful shutdown
export const closePool = async () => {
  try {
    await pool.end();
    console.log("Database pool has been closed.");
  } catch (error) {
    console.error("Error closing database pool:", error);
  }
};

// Export the pool instance and attach helper functions for backward compatibility
pool.query = query;
pool.getClient = getClient;
pool.testConnection = testConnection;
pool.closePool = closePool;

export default pool;
