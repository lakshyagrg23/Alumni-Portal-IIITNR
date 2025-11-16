/**
 * Database Cleanup Script
 * Removes duplicate alumni profiles and fixes user roles
 * Run this script ONCE to clean up the database
 */

require("dotenv").config();
const { query, testConnection, closePool } = require("./src/config/database");

async function cleanupDatabase() {
  try {
    console.log("🔄 Starting database cleanup...");

    // Test connection first
    await testConnection();

    // Step 1: Identify duplicate profiles (multiple profiles for same user_id)
    console.log("\n📊 Finding duplicate alumni profiles...");

    const duplicatesQuery = `
      SELECT 
        user_id,
        COUNT(*) as profile_count,
        string_agg(first_name || ' ' || last_name, ', ') as names,
        string_agg(id::text, ', ') as profile_ids
      FROM alumni_profiles 
      GROUP BY user_id 
      HAVING COUNT(*) > 1
    `;

    const duplicatesResult = await query(duplicatesQuery);

    if (duplicatesResult.rows.length === 0) {
      console.log("✅ No duplicate profiles found!");
    } else {
      console.log(
        `⚠️  Found ${duplicatesResult.rows.length} users with duplicate profiles:`
      );

      for (const duplicate of duplicatesResult.rows) {
        console.log(`   User ID: ${duplicate.user_id}`);
        console.log(
          `   Profiles (${duplicate.profile_count}): ${duplicate.names}`
        );
        console.log(`   Profile IDs: ${duplicate.profile_ids}`);
        console.log("");

        // Get detailed info about each duplicate profile
        const profileDetailsQuery = `
          SELECT id, first_name, last_name, created_at, updated_at, is_profile_public
          FROM alumni_profiles 
          WHERE user_id = $1 
          ORDER BY created_at ASC
        `;

        const profileDetails = await query(profileDetailsQuery, [
          duplicate.user_id,
        ]);

        // Keep the FIRST created profile, delete the rest
        const keepProfile = profileDetails.rows[0];
        const deleteProfiles = profileDetails.rows.slice(1);

        console.log(
          `   📌 Keeping: ${keepProfile.first_name} ${keepProfile.last_name} (ID: ${keepProfile.id}, Created: ${keepProfile.created_at})`
        );

        for (const deleteProfile of deleteProfiles) {
          console.log(
            `   🗑️  Deleting: ${deleteProfile.first_name} ${deleteProfile.last_name} (ID: ${deleteProfile.id}, Created: ${deleteProfile.created_at})`
          );

          // Delete the duplicate profile
          await query("DELETE FROM alumni_profiles WHERE id = $1", [
            deleteProfile.id,
          ]);
        }

        console.log("   ✅ Cleanup completed for this user\n");
      }
    }

    // Step 2: Check user roles and fix if needed
    console.log("👤 Checking user roles...");

    const userRolesQuery = `
      SELECT 
        u.id,
        u.email,
        u.role,
        COUNT(ap.id) as profile_count
      FROM users u
      LEFT JOIN alumni_profiles ap ON u.id = ap.user_id
      GROUP BY u.id, u.email, u.role
      HAVING COUNT(ap.id) > 0
      ORDER BY u.email
    `;

    const userRoles = await query(userRolesQuery);

    console.log("Current user roles with alumni profiles:");
    for (const user of userRoles.rows) {
      const shouldBeAlumni = user.profile_count > 0;
      const needsRoleUpdate = shouldBeAlumni && user.role !== "alumni";

      console.log(
        `   ${user.email} - Role: ${user.role}, Profiles: ${user.profile_count} ${needsRoleUpdate ? "(NEEDS UPDATE)" : "✅"}`
      );

      if (needsRoleUpdate) {
        console.log(
          `   🔄 Updating ${user.email} role from '${user.role}' to 'alumni'`
        );
        await query("UPDATE users SET role = $1 WHERE id = $2", [
          "alumni",
          user.id,
        ]);
      }
    }

    // Step 3: Add constraint to prevent future duplicates
    console.log(
      "\n🔒 Adding database constraint to prevent duplicate profiles..."
    );

    try {
      // Check if constraint already exists
      const constraintCheckQuery = `
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'alumni_profiles' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name = 'unique_user_profile'
      `;

      const existingConstraint = await query(constraintCheckQuery);

      if (existingConstraint.rows.length === 0) {
        // Add unique constraint on user_id
        await query(`
          ALTER TABLE alumni_profiles 
          ADD CONSTRAINT unique_user_profile 
          UNIQUE (user_id)
        `);
        console.log("✅ Added unique constraint on alumni_profiles.user_id");
      } else {
        console.log("✅ Unique constraint already exists");
      }
    } catch (error) {
      console.log(
        "⚠️  Could not add constraint (might already exist):",
        error.message
      );
    }

    // Step 4: Final verification
    console.log("\n🔍 Final verification...");

    const finalCountQuery = `
      SELECT 
        COUNT(*) as total_profiles,
        COUNT(DISTINCT user_id) as unique_users
      FROM alumni_profiles
    `;

    const finalCount = await query(finalCountQuery);
    const { total_profiles, unique_users } = finalCount.rows[0];

    console.log(`   Total alumni profiles: ${total_profiles}`);
    console.log(`   Unique users: ${unique_users}`);

    if (total_profiles === unique_users) {
      console.log("✅ Perfect! One profile per user.");
    } else {
      console.log("⚠️  Still have duplicate profiles!");
    }

    // Show final alumni count by role
    const roleCountQuery = `
      SELECT 
        u.role,
        COUNT(ap.id) as profile_count
      FROM users u
      JOIN alumni_profiles ap ON u.id = ap.user_id
      GROUP BY u.role
    `;

    const roleCounts = await query(roleCountQuery);
    console.log("\nAlumni profiles by user role:");
    for (const roleCount of roleCounts.rows) {
      console.log(`   ${roleCount.role}: ${roleCount.profile_count} profiles`);
    }

    console.log("\n🎉 Database cleanup completed successfully!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await closePool();
    console.log("👋 Database connection closed.");
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupDatabase();
}

module.exports = { cleanupDatabase };
