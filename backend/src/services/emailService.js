import nodemailer from 'nodemailer';

// Email Service providing verification and welcome email functionality (ESM version)
class EmailService {
  constructor() {
    const baseConfig = {
      service: process.env.EMAIL_SERVICE || (process.env.NODE_ENV === 'production' ? undefined : 'gmail'),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    };
    this.transporter = nodemailer.createTransport(baseConfig);
  }

  /**
   * Send email verification link
   * @param {string} email - Recipient email
   * @param {string} verificationToken - Unique verification token
   * @param {string} firstName - User's first name
   */
  async sendVerificationEmail(email, verificationToken, firstName = 'there') {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'IIIT Naya Raipur Alumni Portal',
      to: email,
      subject: 'Verify Your Email - IIIT Naya Raipur Alumni Portal',
      html: this.getVerificationEmailTemplate(firstName, verificationUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * HTML template for verification email
   */
  getVerificationEmailTemplate(firstName, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
            color: #333;
            line-height: 1.6;
          }
          .button {
            display: inline-block;
            padding: 14px 40px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 IIIT Naya Raipur Alumni Portal</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${firstName}! 👋</h2>
            <p>Thank you for registering with the IIIT Naya Raipur Alumni Portal. We're excited to have you join our community!</p>
            
            <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
            
            <center>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </center>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px;">
              ${verificationUrl}
            </p>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This verification link will expire in 24 hours.
            </div>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} IIIT Naya Raipur Alumni Portal</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(email, firstName) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to IIIT Naya Raipur Alumni Portal! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; color: #333; line-height: 1.6; }
            .button { display: inline-block; padding: 12px 30px; background: #f97316; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to the Family!</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              <p>Your email has been verified successfully. Welcome to the IIIT Naya Raipur Alumni Portal!</p>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Complete your profile with academic and professional details</li>
                <li>Connect with fellow alumni</li>
                <li>Explore events and opportunities</li>
                <li>Share your achievements</li>
              </ul>
              
              <center>
                <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
              </center>
              
              <p>We're thrilled to have you in our community!</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('✅ Welcome email sent to:', email);
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      // Don't throw - welcome email is not critical
    }
  }

  /**
   * Send password reset email with token link
   * @param {string} email - Recipient email
   * @param {string} resetToken - Unique reset token
   * @param {string} name - Optional display name
   */
  async sendPasswordResetEmail(email, resetToken, name = 'there') {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'IIIT Naya Raipur Alumni Portal',
      to: email,
      subject: 'Reset Your Password - IIIT Naya Raipur Alumni Portal',
      html: this.getPasswordResetTemplate(name, resetUrl),
    };
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  getPasswordResetTemplate(name, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 26px; text-align: center; }
          .content { padding: 30px; color: #333; line-height: 1.6; }
          .button { display: inline-block; padding: 12px 30px; background: #f97316; color: white !important; text-decoration: none; border-radius: 6px; margin: 16px 0; font-weight: 600; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 16px 0; border-radius: 4px; }
          .footer { background: #f8f9fa; padding: 18px 26px; text-align: center; color: #666; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h2>Password Reset Request</h2></div>
          <div class="content">
            <p>Hi ${name},</p>
            <p>We received a request to reset your password for the IIIT Naya Raipur Alumni Portal.</p>
            <p>Click the button below to set a new password:</p>
            <center><a href="${resetUrl}" class="button">Reset Password</a></center>
            <p>If the button doesn’t work, copy this link into your browser:</p>
            <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px;">${resetUrl}</p>
            <div class="warning"><strong>⏰ Note:</strong> This link expires in 1 hour and can be used once.</div>
            <p>If you didn’t request a password reset, you can safely ignore this email.</p>
          </div>
          <div class="footer">© ${new Date().getFullYear()} IIIT Naya Raipur Alumni Portal</div>
        </div>
      </body>
      </html>
    `;
  }
}

const emailService = new EmailService();
export { EmailService, emailService };
export default emailService;
