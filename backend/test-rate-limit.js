#!/usr/bin/env node

/**
 * Rate Limit Testing Script
 *
 * This script tests the rate limiting configuration and shows current limits.
 * Run this to verify rate limiting is working properly.
 */

const axios = require("axios");

const API_BASE = process.env.API_URL || "http://localhost:5000/api";

async function testRateLimit() {
  console.log("🔍 Testing Rate Limit Configuration...\n");

  try {
    // Test general API endpoint
    const response = await axios.get(`${API_BASE}/../health`);

    console.log("📊 Rate Limit Headers:");
    console.log(
      `Rate Limit: ${response.headers["ratelimit-limit"] || "Not set"}`
    );
    console.log(
      `Remaining: ${response.headers["ratelimit-remaining"] || "Not set"}`
    );
    console.log(`Reset: ${response.headers["ratelimit-reset"] || "Not set"}`);
    console.log(
      `Window: ${response.headers["ratelimit-window"] || "Not set"}\n`
    );

    // Test auth endpoint rate limit
    try {
      const authResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: "test@example.com",
        password: "invalid",
      });
    } catch (authError) {
      if (authError.response) {
        console.log("🔐 Auth Endpoint Rate Limit Headers:");
        console.log(
          `Rate Limit: ${authError.response.headers["ratelimit-limit"] || "Not set"}`
        );
        console.log(
          `Remaining: ${authError.response.headers["ratelimit-remaining"] || "Not set"}`
        );
        console.log(
          `Reset: ${authError.response.headers["ratelimit-reset"] || "Not set"}\n`
        );
      }
    }

    console.log("✅ Rate limit test completed successfully!");
  } catch (error) {
    console.error("❌ Error testing rate limits:", error.message);
    if (error.response?.status === 429) {
      console.log("\n🚨 Rate limit exceeded! Wait before testing again.");
      console.log("Rate limit headers:", error.response.headers);
    }
  }
}

// Show current configuration
function showConfiguration() {
  console.log("⚙️  Current Rate Limit Configuration:\n");
  console.log("General API Endpoints:");
  console.log(
    `- Limit: ${process.env.NODE_ENV === "production" ? "200" : "1000"} requests per 15 minutes`
  );
  console.log(`- Environment: ${process.env.NODE_ENV || "development"}\n`);

  console.log("Authentication Endpoints:");
  console.log(
    `- Limit: ${process.env.NODE_ENV === "production" ? "20" : "100"} requests per 15 minutes`
  );
  console.log("- Applies to: /login, /register, /forgot-password\n");
}

if (require.main === module) {
  showConfiguration();
  testRateLimit();
}

module.exports = { testRateLimit, showConfiguration };
