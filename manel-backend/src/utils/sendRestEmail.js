import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Send reset password email using SMTP
 * @param {string} toEmail - user email
 * @param {string} resetToken - raw reset token
 * @param {string} userName - user's name
 */
export const sendResetEmail = async (toEmail, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset_pasword_page/reset_password_page.html?token=${resetToken}`;
  const smtpUser = process.env.SMTP_EMAIL;
  const smtpPass = process.env.SMTP_PASSWORD;

  console.log(`🚀 Sending email to ${toEmail} using SMTP...`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    family: 4, // Force IPv4
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    debug: true,
    logger: true 
  });

  // Load designed template
  let htmlTemplate;
  try {
    const templatePath = path.join(__dirname, '../../../frontend/email_template/email_template.html');
    htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders
    htmlTemplate = htmlTemplate
      .replace('{{NAME}}', userName)
      .replace('{{RESET_URL}}', resetUrl);
  } catch (err) {
    console.error('Template load failed, using fallback:', err);
    htmlTemplate = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You requested to reset your password. Click the button below to choose a new one:</p>
        <div style="margin: 20px 0;">
          <a href="${resetUrl}" style="display:inline-block; padding:12px 24px; background:#4a90e2; color:#ffffff; text-decoration:none; border-radius:8px; font-weight:bold;">Reset Password</a>
        </div>
        <p>This link will expire in 15 minutes.</p>
      </div>
    `;
  }

  const message = {
    from: `"NoveXa Academy" <${smtpUser}>`,
    to: toEmail,
    subject: 'Reset your NoveXa password',
    html: htmlTemplate
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (err) {
    console.error('❌ SMTP Error:', err.message);
    throw new Error(`Email could not be sent: ${err.message}`);
  }
};