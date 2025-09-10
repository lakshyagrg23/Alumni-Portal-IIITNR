require('dotenv').config();
const { query } = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function makeUserAdmin() {
  try {
    const email = 'ashutosh23101@iiitnr.in';
    
    // Check if user exists
    console.log(`🔍 Checking if user ${email} exists...`);
    const checkUser = await query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (checkUser.rows.length === 0) {
      console.log(`❌ User ${email} not found`);
      console.log('📝 Creating new admin user...');
      
      // Create new admin user with default password
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const insertResult = await query(`
        INSERT INTO users (email, password_hash, role, is_approved, is_active, email_verified, provider)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [email, hashedPassword, 'admin', true, true, true, 'local']);
      
      console.log('✅ Created new admin user');
      console.log('📧 Email:', insertResult.rows[0].email);
      console.log('🔑 Role:', insertResult.rows[0].role);
      console.log('🔐 Default Password: admin123');
    } else {
      console.log('👤 User found! Updating to admin...');
      
      // Update existing user to admin
      const updateResult = await query(`
        UPDATE users 
        SET role = $1, is_approved = $2, is_active = $3 
        WHERE email = $4 
        RETURNING *
      `, ['admin', true, true, email]);
      
      console.log('✅ Updated user to admin');
      console.log('📧 Email:', updateResult.rows[0].email);
      console.log('🔑 Role:', updateResult.rows[0].role);
    }
    
    // Verify the change
    console.log('\n🔍 Final verification:');
    const verifyResult = await query(
      'SELECT email, role, is_approved, is_active, created_at FROM users WHERE email = $1', 
      [email]
    );
    
    const user = verifyResult.rows[0];
    console.log('📧 Email:', user.email);
    console.log('🔑 Role:', user.role);
    console.log('✅ Approved:', user.is_approved);
    console.log('🟢 Active:', user.is_active);
    console.log('📅 Created:', user.created_at);
    
    console.log('\n🎉 Success! You can now login as admin with:');
    console.log('📧 Email: ashutosh23101@iiitnr.in');
    console.log('🔐 Password: admin123 (if newly created) or your existing password');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

makeUserAdmin();
