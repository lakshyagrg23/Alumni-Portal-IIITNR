import nodemailer from "nodemailer";

// Email Service providing verification and welcome email functionality (ESM version)
class EmailService {
  constructor() {
    const baseConfig = {
      service:
        process.env.EMAIL_SERVICE ||
        (process.env.NODE_ENV === "production" ? undefined : "gmail"),
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
  async sendVerificationEmail(email, verificationToken, firstName = "there") {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || "IIIT Naya Raipur Alumni Portal",
      to: email,
      subject: "Verify Your Email - IIIT Naya Raipur Alumni Portal",
      html: this.getVerificationEmailTemplate(firstName, verificationUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Verification email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending verification email:", error);
      throw new Error("Failed to send verification email");
    }
  }

  /**
   * Send personal email verification link
   * @param {string} email - Personal email to verify
   * @param {string} verificationToken - Unique verification token
   * @param {string} firstName - User's first name
   */
  async sendPersonalEmailVerification(email, verificationToken, firstName = "there") {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-personal-email?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || "IIIT Naya Raipur Alumni Portal",
      to: email,
      subject: "Verify Your Secondary Email - IIIT Naya Raipur Alumni Portal",
      html: this.getPersonalEmailVerificationTemplate(firstName, verificationUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Personal email verification sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending personal email verification:", error);
      throw new Error("Failed to send personal email verification");
    }
  }

  /**
   * HTML template for personal email verification
   */
  getPersonalEmailVerificationTemplate(firstName, verificationUrl) {
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
          .info {
            background: #e7f3ff;
            border-left: 4px solid #1e3a8a;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>IIIT Naya Raipur Alumni Portal</h1>
          </div>
          <div class="content">
            <h2>Verify Your Secondary Email</h2>
            <p>Hello ${firstName},</p>
            
            <p>Thank you for providing your secondary email address. Please verify this email to ensure we can reach you for important updates and account recovery.</p>
            
            <div className="info">
              <strong>Why verify?</strong> Your secondary email serves as a backup contact method for important alumni updates and account recovery.
            </div>
            
            <p>Click the button below to verify your secondary email address:</p>
            
            <center>
              <a href="${verificationUrl}" className="button">Verify Secondary Email</a>
            </center>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px;">
              ${verificationUrl}
            </p>
            
            <div class="warning">
              <strong>Note:</strong> This verification link will expire in 24 hours. Your secondary email will not be displayed on your public profile.
            </div>
            
            <p>If you didn't add this email to your alumni profile, please ignore this message.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} IIIT Naya Raipur Alumni Portal</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
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
            <h1>IIIT Naya Raipur Alumni Portal</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${firstName}</h2>
            <p>Thank you for registering with the IIIT Naya Raipur Alumni Portal. Please confirm your email address to activate your account.</p>
            
            <p>To complete your registration and activate your account, verify your email address by clicking the button below:</p>
            
            <center>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </center>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px;">
              ${verificationUrl}
            </p>
            
            <div class="warning">
              <strong>Important:</strong> This verification link will expire in 24 hours.
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
      subject: "Welcome to IIIT Naya Raipur Alumni Portal",
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
              <h1>Welcome to the IIIT Naya Raipur Alumni Portal</h1>
            </div>
            <div class="content">
              <h2>Hello ${firstName},</h2>
              <p>Your email has been verified successfully. Your alumni account is now active.</p>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Complete your profile with academic and professional details.</li>
                <li>Connect with fellow alumni.</li>
                <li>Explore events and opportunities.</li>
                <li>Share your achievements.</li>
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
      console.log("✅ Welcome email sent to:", email);
    } catch (error) {
      console.error("❌ Error sending welcome email:", error);
      // Don't throw - welcome email is not critical
    }
  }

  /**
   * Send password reset email with token
   * @param {string} email - Recipient email
   * @param {string} resetToken - Unique password reset token
   * @param {string} firstName - User's first name
   * @param {string} frontendBaseUrl - Base URL to build reset link (falls back to env)
   */
  async sendPasswordResetEmail(
    email,
    resetToken,
    firstName = "there",
    frontendBaseUrl
  ) {
    const baseFromEnv = process.env.FRONTEND_URL?.trim();
    const baseUrl =
      (frontendBaseUrl && frontendBaseUrl.trim()) ||
      (baseFromEnv && baseFromEnv.trim()) ||
      "http://localhost:3000";
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    const resetUrl = `${normalizedBaseUrl}/reset-password?token=${encodeURIComponent(
      resetToken
    )}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || "IIIT Naya Raipur Alumni Portal",
      to: email,
      subject: "Password Reset Request - IIIT Naya Raipur Alumni Portal",
      html: this.getPasswordResetEmailTemplate(firstName, resetUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Password reset email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending password reset email:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  /**
   * HTML template for password reset email
   */
  getPasswordResetEmailTemplate(firstName, resetUrl) {
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
          .security-notice {
            background: #fee;
            border-left: 4px solid #dc2626;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>We received a request to reset your password for your IIIT Naya Raipur Alumni Portal account.</p>
            
            <p>To reset your password, please click the button below:</p>
            
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #f8f9fa; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px;">
              ${resetUrl}
            </p>
            
            <div class="warning">
              <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
            </div>
            
            <div class="security-notice">
              <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your account is safe and your password hasn't been changed.
            </div>
            
            <p>For your security, never share this link with anyone.</p>
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
   * Send new message notification email
   * @param {string} recipientEmail - Recipient's email address
   * @param {string} recipientName - Recipient's name
   * @param {string} senderName - Sender's name
   * @param {string} messagePreview - Preview text (if available, otherwise generic text)
   */
  async sendMessageNotification(recipientEmail, recipientName, senderName) {
    const messagesUrl = `${process.env.FRONTEND_URL}/messages`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || "IIIT Naya Raipur Alumni Portal",
      to: recipientEmail,
      subject: `New Message from ${senderName} - IIIT NR Alumni Portal`,
      html: this.getMessageNotificationTemplate(recipientName, senderName, messagesUrl),
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Message notification email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("❌ Error sending message notification email:", error);
      // Don't throw - email notification failure shouldn't block message delivery
      return { success: false, error: error.message };
    }
  }

  /**
   * HTML template for message notification
   */
  getMessageNotificationTemplate(recipientName, senderName, messagesUrl) {
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
          .message-box {
            background: #f8f9fa;
            border-left: 4px solid #1e3a8a;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .sender-name {
            font-weight: 700;
            color: #1e3a8a;
            font-size: 18px;
            margin-bottom: 8px;
          }
          .message-text {
            color: #666;
            font-size: 14px;
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
          .icon {
            font-size: 48px;
            text-align: center;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 New Message</h1>
          </div>
          <div class="content">
            <div class="icon">📨</div>
            <h2 style="color: #1e3a8a; margin-bottom: 10px;">Hi ${recipientName}!</h2>
            <p>You have a new message in your IIIT Naya Raipur Alumni Portal inbox.</p>
            
            <div class="message-box">
              <div class="sender-name">From: ${senderName}</div>
              <div class="message-text">
                🔒 This message is end-to-end encrypted. Log in to view the full message.
              </div>
            </div>

            <p>Click the button below to read your message:</p>
            <center>
              <a href="${messagesUrl}" class="button">View Message</a>
            </center>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              <strong>Privacy Notice:</strong> Your messages are end-to-end encrypted. 
              Only you and the sender can read them.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} IIIT Naya Raipur Alumni Portal</p>
            <p>This is an automated email. Please do not reply to this message.</p>
            <p style="margin-top: 10px; font-size: 12px;">
              To manage your notification preferences, visit your <a href="${process.env.FRONTEND_URL}/profile/settings" style="color: #1e3a8a;">account settings</a>.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

const emailService = new EmailService();
export { EmailService, emailService };
export default emailService;
