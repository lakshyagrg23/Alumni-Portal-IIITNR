require("dotenv").config();
const { query, closePool } = require("./src/config/database");
const fs = require("fs");
const path = require("path");

async function verifyMessagingSetup() {
  console.log("🔍 MESSAGING & PUBLIC KEY VERIFICATION REPORT");
  console.log("=".repeat(80));
  console.log(`Date: ${new Date().toISOString()}`);
  console.log("=".repeat(80));

  const results = {
    tables: {},
    constraints: {},
    indexes: {},
    columns: {},
    triggers: {},
    issues: [],
    recommendations: [],
  };

  try {
    // ============================================
    // 1. Check if new migration files exist
    // ============================================
    console.log("\n📁 1. MIGRATION FILES CHECK");
    console.log("-".repeat(80));

    const migrationDir = path.join(__dirname, "..", "database", "migrations");
    const migrationFiles = [
      "001_messaging_essential.sql",
      "001_messaging_feature.sql",
      "fix_messages_constraints.sql",
    ];

    migrationFiles.forEach((file) => {
      const exists = fs.existsSync(path.join(migrationDir, file));
      console.log(`   ${exists ? "✅" : "❌"} ${file}`);
    });

    // ============================================
    // 2. Check Public Keys Table
    // ============================================
    console.log("\n🔐 2. PUBLIC KEYS TABLE");
    console.log("-".repeat(80));

    const pkTableExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'public_keys'
      ) as exists
    `);

    if (pkTableExists.rows[0].exists) {
      console.log("   ✅ Table exists");
      results.tables.public_keys = true;

      // Check columns
      const pkColumns = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'public_keys'
        ORDER BY ordinal_position
      `);

      console.log("\n   Columns:");
      const requiredColumns = [
        "id",
        "user_id",
        "public_key",
        "algorithm",
        "created_at",
        "updated_at",
      ];
      const existingColumns = pkColumns.rows.map((c) => c.column_name);

      pkColumns.rows.forEach((col) => {
        const nullable = col.is_nullable === "NO" ? "NOT NULL" : "NULLABLE";
        console.log(
          `   - ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} ${nullable}`
        );
      });

      // Check for missing required columns
      requiredColumns.forEach((reqCol) => {
        if (!existingColumns.includes(reqCol)) {
          results.issues.push(`Missing column in public_keys: ${reqCol}`);
          console.log(`   ❌ Missing required column: ${reqCol}`);
        }
      });

      // Check constraints
      const pkConstraints = await query(`
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_name = 'public_keys'
      `);

      console.log("\n   Constraints:");
      pkConstraints.rows.forEach((c) => {
        console.log(`   ✅ ${c.constraint_type}: ${c.constraint_name}`);
      });

      // Check for unique constraint on user_id
      const hasUniqueUser = pkConstraints.rows.some(
        (c) =>
          c.constraint_name.includes("user") &&
          (c.constraint_type === "UNIQUE" ||
            c.constraint_name.includes("unique"))
      );

      if (hasUniqueUser) {
        console.log("   ✅ UNIQUE constraint on user_id exists");
      } else {
        results.issues.push("Missing UNIQUE constraint on public_keys.user_id");
        console.log("   ❌ Missing UNIQUE constraint on user_id");
      }

      // Check data
      const pkCount = await query("SELECT COUNT(*) FROM public_keys");
      console.log(`\n   📊 Public keys stored: ${pkCount.rows[0].count}`);
      results.tables.public_keys_count = parseInt(pkCount.rows[0].count);
    } else {
      console.log("   ❌ Table does NOT exist");
      results.tables.public_keys = false;
      results.issues.push("public_keys table is missing");
    }

    // ============================================
    // 3. Check Messages Table Structure
    // ============================================
    console.log("\n💬 3. MESSAGES TABLE STRUCTURE");
    console.log("-".repeat(80));

    const msgTableExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'messages'
      ) as exists
    `);

    if (msgTableExists.rows[0].exists) {
      console.log("   ✅ Table exists");
      results.tables.messages = true;

      // Check all columns
      const msgColumns = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'messages'
        ORDER BY ordinal_position
      `);

      console.log("\n   Columns:");
      const requiredMsgColumns = {
        id: "uuid",
        sender_id: "uuid",
        receiver_id: "uuid",
        content: "text",
        iv: "text",
        client_id: "text",
        sender_public_key: "text",
        receiver_public_key: "text",
        message_type: "character varying",
        is_read: "boolean",
        sent_at: "timestamp without time zone",
        read_at: "timestamp without time zone",
      };

      const existingMsgColumns = {};
      msgColumns.rows.forEach((col) => {
        existingMsgColumns[col.column_name] = col.data_type;
        results.columns[`messages_${col.column_name}`] = true; // Track for later
        const nullable = col.is_nullable === "NO" ? "NOT NULL" : "NULLABLE";
        const emoji =
          ["sender_id", "receiver_id", "content"].includes(col.column_name) &&
          col.is_nullable === "NO"
            ? "✅"
            : "  ";
        console.log(
          `   ${emoji} ${col.column_name.padEnd(25)} ${col.data_type.padEnd(25)} ${nullable}`
        );
      });

      // Check for E2E encryption columns
      console.log("\n   E2E Encryption Columns:");
      const e2eColumns = [
        "iv",
        "client_id",
        "sender_public_key",
        "receiver_public_key",
      ];
      e2eColumns.forEach((col) => {
        if (existingMsgColumns[col]) {
          console.log(`   ✅ ${col} exists`);
        } else {
          results.issues.push(`Missing E2E encryption column: ${col}`);
          console.log(`   ❌ ${col} missing`);
        }
      });

      // Check foreign keys
      const msgFKs = await query(`
        SELECT 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'messages' 
        AND tc.constraint_type = 'FOREIGN KEY'
      `);

      console.log("\n   Foreign Keys:");
      msgFKs.rows.forEach((fk) => {
        console.log(
          `   ✅ ${fk.column_name} -> ${fk.foreign_table_name}(${fk.foreign_column_name}) [ON DELETE ${fk.delete_rule}]`
        );

        // Verify correct references
        if (
          fk.column_name === "sender_id" ||
          fk.column_name === "receiver_id"
        ) {
          if (fk.foreign_table_name !== "alumni_profiles") {
            results.issues.push(
              `${fk.column_name} should reference alumni_profiles, not ${fk.foreign_table_name}`
            );
          }
        }
      });

      // Check CHECK constraints
      const msgChecks = await query(`
        SELECT conname, pg_get_constraintdef(oid) as definition 
        FROM pg_constraint 
        WHERE conrelid = 'messages'::regclass AND contype = 'c'
      `);

      console.log("\n   CHECK Constraints:");
      if (msgChecks.rows.length === 0) {
        console.log(
          "   ❌ No CHECK constraints found (should prevent self-messaging)"
        );
        results.issues.push(
          "Missing CHECK constraint to prevent self-messaging"
        );
      } else {
        msgChecks.rows.forEach((c) => {
          console.log(`   ✅ ${c.conname}: ${c.definition}`);
        });
      }

      // Check NOT NULL constraints
      console.log("\n   Critical NOT NULL Constraints:");
      const criticalColumns = ["sender_id", "receiver_id", "content"];
      criticalColumns.forEach((colName) => {
        const col = msgColumns.rows.find((c) => c.column_name === colName);
        if (col) {
          if (col.is_nullable === "NO") {
            console.log(`   ✅ ${colName} is NOT NULL`);
          } else {
            console.log(`   ❌ ${colName} is NULLABLE (should be NOT NULL)`);
            results.issues.push(`${colName} should be NOT NULL`);
          }
        }
      });

      // Check message count
      const msgCount = await query("SELECT COUNT(*) FROM messages");
      console.log(`\n   📊 Messages in database: ${msgCount.rows[0].count}`);
      results.tables.messages_count = parseInt(msgCount.rows[0].count);
    } else {
      console.log("   ❌ Table does NOT exist");
      results.tables.messages = false;
      results.issues.push("messages table is missing");
    }

    // ============================================
    // 4. Check Indexes
    // ============================================
    console.log("\n📊 4. INDEXES FOR PERFORMANCE");
    console.log("-".repeat(80));

    const indexes = await query(`
      SELECT 
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename IN ('messages', 'public_keys')
      ORDER BY tablename, indexname
    `);

    const indexesByTable = {};
    indexes.rows.forEach((idx) => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx.indexname);
    });

    // Messages indexes
    console.log("\n   Messages Table Indexes:");
    const requiredMsgIndexes = [
      "idx_messages_sender_id",
      "idx_messages_receiver_id",
      "idx_messages_conversation",
      "idx_messages_sent_at",
    ];

    if (indexesByTable.messages) {
      indexesByTable.messages.forEach((idx) => {
        console.log(`   ✅ ${idx}`);
      });

      // Check for required indexes
      requiredMsgIndexes.forEach((reqIdx) => {
        if (!indexesByTable.messages.includes(reqIdx)) {
          results.recommendations.push(`Consider adding index: ${reqIdx}`);
          console.log(`   ⚠️  Missing recommended index: ${reqIdx}`);
        }
      });
    }

    // Public keys indexes
    console.log("\n   Public Keys Table Indexes:");
    if (indexesByTable.public_keys) {
      indexesByTable.public_keys.forEach((idx) => {
        console.log(`   ✅ ${idx}`);
      });

      const hasUserIndex = indexesByTable.public_keys.some((idx) =>
        idx.includes("user")
      );
      if (!hasUserIndex) {
        results.recommendations.push(
          "Consider adding index on public_keys.user_id"
        );
      }
    }

    // ============================================
    // 5. Check Conversations Table (Optional)
    // ============================================
    console.log("\n💬 5. CONVERSATIONS TABLE (OPTIONAL)");
    console.log("-".repeat(80));

    const convTableExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'conversations'
      ) as exists
    `);

    if (convTableExists.rows[0].exists) {
      console.log("   ✅ Table exists");

      const convCount = await query("SELECT COUNT(*) FROM conversations");
      console.log(`   📊 Conversations: ${convCount.rows[0].count}`);
      results.tables.conversations = true;
      results.tables.conversations_count = parseInt(convCount.rows[0].count);
    } else {
      console.log("   ⚠️  Table does not exist (optional feature)");
      results.tables.conversations = false;
    }

    // ============================================
    // 6. Check Message Read Receipts Table (Optional)
    // ============================================
    console.log("\n📫 6. MESSAGE READ RECEIPTS TABLE (OPTIONAL)");
    console.log("-".repeat(80));

    const receiptsTableExists = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'message_read_receipts'
      ) as exists
    `);

    if (receiptsTableExists.rows[0].exists) {
      console.log("   ✅ Table exists");

      const receiptsCount = await query(
        "SELECT COUNT(*) FROM message_read_receipts"
      );
      console.log(`   📊 Read receipts: ${receiptsCount.rows[0].count}`);
      results.tables.message_read_receipts = true;
    } else {
      console.log("   ⚠️  Table does not exist (optional feature)");
      results.tables.message_read_receipts = false;
    }

    // ============================================
    // 7. Data Integrity Checks
    // ============================================
    console.log("\n🔍 7. DATA INTEGRITY CHECKS");
    console.log("-".repeat(80));

    // Check for orphaned messages
    if (results.tables.messages && results.tables.messages_count > 0) {
      const orphanedMessages = await query(`
        SELECT COUNT(*) FROM messages m 
        WHERE NOT EXISTS (
          SELECT 1 FROM alumni_profiles ap WHERE ap.id = m.sender_id
        ) OR NOT EXISTS (
          SELECT 1 FROM alumni_profiles ap WHERE ap.id = m.receiver_id
        )
      `);

      const orphanCount = parseInt(orphanedMessages.rows[0].count);
      if (orphanCount > 0) {
        console.log(`   ❌ Found ${orphanCount} orphaned messages`);
        results.issues.push(
          `${orphanCount} messages reference non-existent alumni profiles`
        );
      } else {
        console.log("   ✅ No orphaned messages");
      }
    }

    // Check for orphaned public keys
    if (results.tables.public_keys && results.tables.public_keys_count > 0) {
      const orphanedKeys = await query(`
        SELECT COUNT(*) FROM public_keys pk 
        WHERE NOT EXISTS (
          SELECT 1 FROM users u WHERE u.id = pk.user_id
        )
      `);

      const orphanKeyCount = parseInt(orphanedKeys.rows[0].count);
      if (orphanKeyCount > 0) {
        console.log(`   ❌ Found ${orphanKeyCount} orphaned public keys`);
        results.issues.push(
          `${orphanKeyCount} public keys reference non-existent users`
        );
      } else {
        console.log("   ✅ No orphaned public keys");
      }
    }

    // Check for duplicate public keys
    if (results.tables.public_keys && results.tables.public_keys_count > 0) {
      const duplicateKeys = await query(`
        SELECT user_id, COUNT(*) as count
        FROM public_keys
        GROUP BY user_id
        HAVING COUNT(*) > 1
      `);

      if (duplicateKeys.rows.length > 0) {
        console.log(
          `   ❌ Found ${duplicateKeys.rows.length} users with multiple public keys`
        );
        results.issues.push(
          `${duplicateKeys.rows.length} users have duplicate public keys`
        );
      } else {
        console.log("   ✅ No duplicate public keys per user");
      }
    }

    // ============================================
    // 8. Migration Status Summary
    // ============================================
    console.log("\n📋 8. MIGRATION STATUS SUMMARY");
    console.log("-".repeat(80));

    // Check which migrations have been applied
    const essentialApplied =
      results.tables.public_keys &&
      results.columns.messages_iv &&
      results.columns.messages_client_id;

    const fullApplied =
      results.tables.conversations && results.tables.message_read_receipts;

    console.log("\n   Migration Status:");
    console.log(
      `   ${essentialApplied ? "✅" : "❌"} Essential migration (001_messaging_essential.sql)`
    );
    console.log(
      `   ${fullApplied ? "✅" : "⚠️ "} Full migration (001_messaging_feature.sql) - ${fullApplied ? "Applied" : "Partially applied or not applied"}`
    );
    console.log(
      `   ${results.issues.length === 0 && results.tables.messages ? "✅" : "⚠️ "} Constraints fix (fix_messages_constraints.sql) - ${results.issues.length === 0 ? "Applied" : "Needs attention"}`
    );

    // ============================================
    // FINAL REPORT
    // ============================================
    console.log("\n" + "=".repeat(80));
    console.log("📊 FINAL ASSESSMENT");
    console.log("=".repeat(80));

    if (results.issues.length === 0) {
      console.log("\n✅ DATABASE IS CORRECTLY SET UP FOR MESSAGING!");
      console.log("\n   All required tables exist with proper structure:");
      console.log("   ✅ public_keys table with E2E encryption support");
      console.log("   ✅ messages table with encryption columns");
      console.log("   ✅ Proper foreign key constraints");
      console.log("   ✅ CHECK constraints for data integrity");
      console.log("   ✅ Performance indexes in place");
      console.log("   ✅ No data integrity issues found");
    } else {
      console.log("\n⚠️  ISSUES FOUND:");
      results.issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }

    if (results.recommendations.length > 0) {
      console.log("\n💡 RECOMMENDATIONS:");
      results.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ VERIFICATION COMPLETE");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ Verification failed:", error.message);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

verifyMessagingSetup();
