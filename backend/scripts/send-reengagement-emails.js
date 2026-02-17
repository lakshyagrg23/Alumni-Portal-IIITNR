/**
 * Send re-engagement emails to users with incomplete onboarding
 *
 * This script sends personalized emails to:
 * 1. Verified users with NO alumni_profiles entry (never started)
 * 2. Users with profiles but onboarding_completed = false (abandoned)
 *
 * Usage:
 *   node send-reengagement-emails.js              # Dry run (no emails sent)
 *   node send-reengagement-emails.js --send       # Actually send emails
 *   node send-reengagement-emails.js --send --limit 10  # Send to first 10 only
 */

// Load environment variables FIRST using dynamic import
import dotenv from "dotenv";
dotenv.config();

// Now import database and email service
const {
  default: pool,
  query,
  closePool,
} = await import("../src/config/database.js");
const { default: emailService } = await import(
  "../src/services/emailService.js"
);

// Parse command line arguments
const args = process.argv.slice(2);
const shouldSend = args.includes("--send");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;

async function sendReengagementEmails() {
  console.log("🔍 Identifying users with incomplete onboarding...\n");

  try {
    // Fetch all incomplete users
    const result = await query(`
      SELECT DISTINCT
        u.id,
        u.email,
        ap.first_name,
        u.created_at,
        CASE WHEN ap.user_id IS NULL THEN 'no_profile' ELSE 'incomplete_profile' END as category
      FROM users u
      LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
      WHERE u.role = 'alumni'
        AND u.email_verified = true
        AND (
          u.onboarding_completed = false
          OR ap.user_id IS NULL
        )
      ORDER BY u.created_at DESC
      ${limit ? `LIMIT ${limit}` : ""}
    `);

    const incompleteUsers = result.rows;

    if (incompleteUsers.length === 0) {
      console.log(
        "✅ No incomplete users found! All verified alumni have completed onboarding.",
      );
      return;
    }

    console.log(
      `📊 Found ${incompleteUsers.length} users with incomplete onboarding:\n`,
    );

    // Categorize users
    const noProfile = incompleteUsers.filter(
      (u) => u.category === "no_profile",
    );
    const incompleteProfile = incompleteUsers.filter(
      (u) => u.category === "incomplete_profile",
    );

    console.log(
      `   • ${noProfile.length} verified but never started onboarding`,
    );
    console.log(
      `   • ${incompleteProfile.length} started but didn't complete\n`,
    );

    // Show sample of who will receive emails
    console.log("📧 Recipients:");
    console.table(
      incompleteUsers.slice(0, 10).map((u) => ({
        Email: u.email,
        Name: u.first_name || "(unknown)",
        Category: u.category === "no_profile" ? "Never Started" : "Incomplete",
        Registered: new Date(u.created_at).toLocaleDateString(),
      })),
    );

    if (incompleteUsers.length > 10) {
      console.log(`   ... and ${incompleteUsers.length - 10} more\n`);
    }

    if (!shouldSend) {
      console.log("\n⚠️  DRY RUN MODE - No emails sent");
      console.log("   To actually send emails, run:");
      console.log("   node send-reengagement-emails.js --send\n");
      console.log("   To test with a small batch first:");
      console.log("   node send-reengagement-emails.js --send --limit 5\n");
      return;
    }

    // Send emails
    console.log("\n🚀 Sending re-engagement emails...\n");

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < incompleteUsers.length; i++) {
      const user = incompleteUsers[i];
      const progress = `[${i + 1}/${incompleteUsers.length}]`;

      try {
        const result = await emailService.sendReengagementEmail(
          user.email,
          user.first_name,
        );

        if (result.success) {
          results.success++;
          console.log(`${progress} ✅ Sent to ${user.email}`);
        } else {
          results.failed++;
          results.errors.push({ email: user.email, error: result.error });
          console.log(
            `${progress} ❌ Failed to send to ${user.email}: ${result.error}`,
          );
        }

        // Small delay to avoid overwhelming email service
        if (i < incompleteUsers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ email: user.email, error: error.message });
        console.log(
          `${progress} ❌ Error sending to ${user.email}: ${error.message}`,
        );
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SENDING SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Successfully sent: ${results.success}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📧 Total attempted: ${incompleteUsers.length}`);

    if (results.errors.length > 0) {
      console.log("\n❌ Failed emails:");
      results.errors.forEach((err) => {
        console.log(`   • ${err.email}: ${err.error}`);
      });
    }

    console.log("\n💡 Next Steps:");
    console.log("   1. Monitor email delivery in your email service dashboard");
    console.log("   2. Check spam/bounce rates");
    console.log("   3. Track onboarding completions over next few days");
    console.log(
      "   4. For failed emails, verify email addresses are correct\n",
    );
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    console.error(error);
  } finally {
    await closePool();
  }
}

// Run the script
console.log("📨 Re-engagement Email Campaign");
console.log("=".repeat(60));
console.log(`Mode: ${shouldSend ? "🔴 LIVE" : "🟡 DRY RUN"}`);
if (limit) {
  console.log(`Limit: First ${limit} users only`);
}
console.log("=".repeat(60) + "\n");

sendReengagementEmails();
