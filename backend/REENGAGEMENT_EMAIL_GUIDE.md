# Re-engagement Email Campaign Guide

## Overview

This guide explains how to send re-engagement emails to users who haven't completed their alumni profile onboarding.

## Target Audience

The emails will be sent to:
1. **Verified users with NO profile** - Created account, verified email, but never started onboarding
2. **Incomplete profiles** - Started onboarding but abandoned (usually due to profile picture requirement)

## Prerequisites

### 1. Email Service Configuration

Ensure your `.env` file has email credentials configured:

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="IIIT NR Alumni Portal <noreply@iiitnr.edu.in>"
FRONTEND_URL=https://your-domain.com
```

**For Gmail:**
- Use an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password)
- Enable 2FA on your Google account first
- Create app password at: myaccount.google.com/apppasswords

**For Production:**
- Consider using SendGrid, AWS SES, or Mailgun for better deliverability
- Update `EMAIL_SERVICE` accordingly

### 2. Test Email Service

```bash
cd backend
node -e "import('./src/services/emailService.js').then(m => m.default.sendReengagementEmail('your-test@email.com', 'TestUser').then(() => console.log('✅ Test sent!')))"
```

## Step-by-Step Process

### Step 1: Identify Incomplete Users

First, see who will receive emails (dry run - no emails sent):

```bash
cd backend
node send-reengagement-emails.js
```

This shows:
- Total number of incomplete users
- Breakdown by category
- List of email addresses
- **No emails sent yet!**

### Step 2: Test with Small Batch

Send to first 5 users as a test:

```bash
node send-reengagement-emails.js --send --limit 5
```

**Verify:**
- Check your sent emails folder
- Verify recipients receive emails
- Check spam folder (if emails go to spam, you need better email reputation)
- Wait 30 minutes and check if any complete onboarding

### Step 3: Send to All Users

Once testing is successful:

```bash
node send-reengagement-emails.js --send
```

This will:
- Send personalized emails to ALL incomplete users
- Show progress in real-time
- Handle errors gracefully
- Add 1-second delay between emails (to avoid rate limits)
- Display summary at the end

### Step 4: Monitor Results

**Immediate checks:**
1. Verify "Success" count matches expected recipients
2. Check for any failed emails and note the errors
3. Look for delivery/bounce notifications in your email service

**Track over next 3-7 days:**
- Run `node identify-incomplete-onboarding.js` to see if numbers decrease
- Check Google Analytics / logs for `/complete-profile` visits
- Monitor new completed profiles in database

## Email Content Preview

The email includes:
- ✨ Personalized greeting with first name (if available)
- 🎯 Clear explanation of what changed (photo/LinkedIn optional)
- 📧 Direct CTA button linking to login page
- 📊 Social proof (number of alumni already connected)
- 💡 Benefits of completing profile

## Command Reference

```bash
# Dry run - see who will receive emails (no emails sent)
node send-reengagement-emails.js

# Test with first 10 users
node send-reengagement-emails.js --send --limit 10

# Send to all incomplete users
node send-reengagement-emails.js --send
```

## Troubleshooting

### "Authentication failed" error
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- For Gmail, ensure you're using App Password, not regular password
- Verify 2FA is enabled on your Google account

### Emails going to spam
- Use a professional email domain (not @gmail.com)
- Set up SPF, DKIM, DMARC records for your domain
- Use dedicated email service (SendGrid, AWS SES)
- Warm up your email account (start with small batches)

### "Rate limit exceeded"
- Increase the delay between emails (edit line 116 in script: `setTimeout(resolve, 2000)` for 2 seconds)
- Send in smaller batches using `--limit`
- Use professional email service with higher limits

### Failed emails
- Check if email addresses are valid
- Some users may have typos in their email
- Temporary email services may have expired

## Best Practices

1. **Test first**: Always test with `--limit 5` before full send
2. **Timing**: Send during business hours, weekdays for better open rates
3. **Monitor**: Check results after 24 hours, 3 days, and 1 week
4. **Follow-up**: Consider sending one more reminder after 1 week to non-respondents
5. **Clean up**: After 30 days, consider deleting accounts that never complete onboarding

## Expected Results

Based on typical re-engagement campaigns:
- **Open rate**: 20-30%
- **Click rate**: 5-10%
- **Completion rate**: 2-5%

So if you have 100 incomplete users:
- 20-30 will open the email
- 5-10 will click the login button
- 2-5 will actually complete their profile

## Alternative Approach: Manual

If you prefer manual email (e.g., through Gmail/Outlook):

1. Get email list:
   ```bash
   cd backend
   node identify-incomplete-onboarding.js > emails.txt
   ```

2. Copy emails from output (bottom of file)

3. Use Mailchimp, SendGrid, or manual BCC

4. Copy email template from the script or use provided HTML

## After Campaign

Run this to verify impact:

```bash
node identify-incomplete-onboarding.js
```

Compare before/after numbers to measure success!
