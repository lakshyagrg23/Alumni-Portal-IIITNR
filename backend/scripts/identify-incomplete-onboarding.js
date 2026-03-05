/**
 * Identify ALL users who haven't completed onboarding
 * Includes:
 * 1. Users with NO alumni_profiles entry (never started)
 * 2. Users with alumni_profiles but onboarding_completed = false (abandoned)
 */

// Load environment variables FIRST
import dotenv from "dotenv";
dotenv.config();

// Now import database using dynamic import
const {
  default: pool,
  query,
  closePool,
} = await import("../src/config/database.js");

async function identifyIncompleteUsers() {
  console.log("🔍 Analyzing incomplete onboarding situations...\n");

  try {
    // Get overall stats
    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE u.role = 'alumni') as total_alumni_users,
        COUNT(*) FILTER (WHERE u.role = 'alumni' AND u.email_verified = true) as verified_alumni,
        COUNT(*) FILTER (WHERE u.role = 'alumni' AND u.email_verified = true AND u.onboarding_completed = true) as completed_onboarding,
        COUNT(*) FILTER (WHERE u.role = 'alumni' AND u.email_verified = true AND u.onboarding_completed = false) as incomplete_onboarding,
        COUNT(DISTINCT ap.user_id) as total_profiles_created
      FROM users u
      LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
    `);

    console.log("📊 Overall Statistics:");
    console.table([
      {
        "Total Alumni Users": statsResult.rows[0].total_alumni_users,
        Verified: statsResult.rows[0].verified_alumni,
        "Completed Onboarding": statsResult.rows[0].completed_onboarding,
        "Incomplete Onboarding": statsResult.rows[0].incomplete_onboarding,
        "Profiles Created": statsResult.rows[0].total_profiles_created,
      },
    ]);

    // Category 1: Users with NO profile entry at all
    console.log("\n🚨 CATEGORY 1: Verified but NO profile entry created");
    const noProfileResult = await query(`
      SELECT 
        u.id,
        u.email,
        u.email_verified,
        u.created_at,
        EXTRACT(DAY FROM NOW() - u.created_at) as days_since_registration
      FROM users u
      WHERE u.role = 'alumni'
        AND u.email_verified = true
        AND NOT EXISTS (
          SELECT 1 FROM alumni_profiles ap WHERE ap.user_id = u.id
        )
      ORDER BY u.created_at DESC
    `);

    console.log(`Found ${noProfileResult.rows.length} users:\n`);
    if (noProfileResult.rows.length > 0) {
      console.table(
        noProfileResult.rows.map((row) => ({
          Email: row.email,
          Registered: new Date(row.created_at).toLocaleDateString(),
          DaysAgo: Math.floor(row.days_since_registration),
        })),
      );
    }

    // Category 2: Users with profile but onboarding not completed
    console.log(
      "\n⚠️  CATEGORY 2: Profile exists but onboarding_completed = false",
    );
    const incompleteProfileResult = await query(`
      SELECT 
        u.id,
        u.email,
        u.created_at,
        ap.first_name,
        ap.last_name,
        ap.profile_picture_url,
        ap.linkedin_url,
        ap.created_at as profile_created_at,
        EXTRACT(DAY FROM NOW() - u.created_at) as days_since_registration
      FROM users u
      INNER JOIN alumni_profiles ap ON u.id = ap.user_id
      WHERE u.role = 'alumni'
        AND u.email_verified = true
        AND u.onboarding_completed = false
      ORDER BY u.created_at DESC
    `);

    console.log(`Found ${incompleteProfileResult.rows.length} users:\n`);
    if (incompleteProfileResult.rows.length > 0) {
      console.table(
        incompleteProfileResult.rows.map((row) => ({
          Email: row.email,
          FirstName: row.first_name || "(empty)",
          LastName: row.last_name || "(empty)",
          HasPhoto: row.profile_picture_url ? "✓" : "✗",
          HasLinkedIn: row.linkedin_url ? "✓" : "✗",
          DaysAgo: Math.floor(row.days_since_registration),
        })),
      );
    }

    // Combined email list for re-engagement
    const totalIncomplete =
      noProfileResult.rows.length + incompleteProfileResult.rows.length;

    if (totalIncomplete === 0) {
      console.log("\n✅ All verified users have completed onboarding!");
      return;
    }

    console.log(`\n📧 RE-ENGAGEMENT EMAIL LIST (${totalIncomplete} total):`);
    console.log("=".repeat(50));

    const allEmails = [
      ...noProfileResult.rows.map((r) => r.email),
      ...incompleteProfileResult.rows.map((r) => r.email),
    ];

    allEmails.forEach((email, idx) => {
      console.log(`${idx + 1}. ${email}`);
    });

    console.log("\n💡 RECOMMENDED ACTIONS:");
    console.log("=".repeat(50));
    console.log("1. Send re-engagement email with subject:");
    console.log(
      '   "Complete Your IIIT NR Alumni Profile - Now Easier Than Ever!"',
    );
    console.log("");
    console.log("2. Highlight in email:");
    console.log("   ✅ Profile photo is now OPTIONAL");
    console.log("   ✅ LinkedIn URL is now OPTIONAL");
    console.log("   ✅ Takes just 2-3 minutes");
    console.log("");
    console.log(
      "3. When they log in, they'll auto-redirect to /complete-profile",
    );
    console.log("");
    console.log(
      "4. Consider: Users inactive for 6+ months = send final reminder",
    );
    console.log("   then delete unverified/incomplete accounts");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await closePool();
  }
}

identifyIncompleteUsers();
