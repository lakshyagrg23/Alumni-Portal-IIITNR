import { query } from "./src/config/database.js";

const emailToCheck = process.argv[2];

if (!emailToCheck) {
  console.error("Usage: node diagnose-dual-registration.js <email>");
  process.exit(1);
}

const run = async () => {
  try {
    console.log(`\n🔍 Diagnosing email: ${emailToCheck}\n`);

    // Find all accounts with this email
    const usersResult = await query(
      "SELECT id, email, provider, registration_path, email_verified, is_approved, institute_record_id, created_at FROM users WHERE email = $1 ORDER BY created_at",
      [emailToCheck]
    );

    console.log(`📊 Total accounts found: ${usersResult.rows.length}\n`);

    if (usersResult.rows.length === 0) {
      console.log("❌ No accounts found with this email");
      process.exit(0);
    }

    // Show each account
    usersResult.rows.forEach((user, index) => {
      console.log(`Account #${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Provider: ${user.provider}`);
      console.log(`  Registration Path: ${user.registration_path}`);
      console.log(`  Email Verified: ${user.email_verified}`);
      console.log(`  Is Approved: ${user.is_approved}`);
      console.log(`  Institute Record ID: ${user.institute_record_id || "NULL"}`);
      console.log(`  Created: ${user.created_at}`);
      console.log("");
    });

    // Check for verification tokens
    console.log("🔐 Verification Token Status:\n");
    const tokenResult = await query(
      "SELECT id, email, email_verification_token, email_verification_token_expires FROM users WHERE email = $1 AND email_verification_token IS NOT NULL",
      [emailToCheck]
    );

    if (tokenResult.rows.length === 0) {
      console.log("✓ No pending verification tokens");
    } else {
      tokenResult.rows.forEach((user, index) => {
        const isExpired =
          new Date(user.email_verification_token_expires) < new Date();
        console.log(`Account #${index + 1} (ID: ${user.id}):`);
        console.log(`  Token: ${user.email_verification_token.substring(0, 10)}...`);
        console.log(`  Expires: ${user.email_verification_token_expires}`);
        console.log(`  Status: ${isExpired ? "❌ EXPIRED" : "✓ Valid"}`);
        console.log("");
      });
    }

    // Check for alumni profiles
    console.log("👤 Alumni Profile Status:\n");
    for (const user of usersResult.rows) {
      const profileResult = await query(
        "SELECT id, full_name, is_verified FROM alumni_profiles WHERE user_id = $1",
        [user.id]
      );

      if (profileResult.rows.length === 0) {
        console.log(
          `Account ${user.id} (${user.provider}): ❌ No profile`
        );
      } else {
        profileResult.rows.forEach((profile) => {
          console.log(
            `Account ${user.id} (${user.provider}): ✓ Profile - ${profile.full_name || "No name"} (Verified: ${profile.is_verified})`
          );
        });
      }
    }

    console.log(
      "\n💡 Recommendations:\n"
    );

    if (usersResult.rows.length > 1) {
      console.log(
        "⚠️  Multiple accounts found! This is the issue."
      );
      console.log(
        "   One account was created during email/password registration"
      );
      console.log("   Another account was created during OAuth");
      console.log("");
      console.log("   To fix:");
      console.log("   1. Merge the profiles if both have onboarding data");
      console.log(
        "   2. Keep the OAuth account (it's auto-approved)"
      );
      console.log(
        "   3. Delete the email/password account to avoid confusion"
      );
      console.log("");
    }

    const unverifiedAccounts = usersResult.rows.filter(u => !u.email_verified);
    if (unverifiedAccounts.length > 0) {
      console.log(
        `⚠️  ${unverifiedAccounts.length} unverified account(s) - may cause login issues`
      );
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

run();
