import 'dotenv/config';
import nodemailer from 'nodemailer';

async function testEmail() {
  console.log('🔧 Testing Email Configuration...\n');
  
  console.log('Environment Variables:');
  console.log('- EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  console.log('- EMAIL_USER:', process.env.EMAIL_USER);
  console.log('- EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'NOT SET');
  console.log('- EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('\n');

  // Create transporter
  console.log('📧 Creating email transporter...');
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // Verify connection
  try {
    console.log('🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
  } catch (error) {
    console.error('❌ SMTP verification failed:', error.message);
    console.error('\n🔍 Possible issues:');
    console.error('1. Gmail App Password is incorrect');
    console.error('2. 2FA is not enabled on your Google account');
    console.error('3. Less secure app access is blocking the connection');
    console.error('4. Your IP is being blocked by Gmail');
    console.error('\n📖 Solution: Generate a new App Password at:');
    console.error('   https://myaccount.google.com/apppasswords\n');
    process.exit(1);
  }

  // Send test email
  try {
    console.log('📤 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: '✅ Test Email - IIIT-NR Alumni Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">🎉 Email Service Working!</h2>
          <p>This is a test email from your IIIT Naya Raipur Alumni Portal.</p>
          <p><strong>Email configuration is working correctly!</strong></p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Sent on: ${new Date().toLocaleString()}<br>
            From: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}
          </p>
        </div>
      `,
      text: 'Email Service Working! Your email configuration is correct.',
    });

    console.log('✅ Test email sent successfully!');
    console.log('📨 Message ID:', info.messageId);
    console.log('\n🎉 Check your inbox:', process.env.EMAIL_USER);
    console.log('   (Also check spam folder if not in inbox)\n');
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('\n🔍 Error details:', error);
    process.exit(1);
  }
}

testEmail();
