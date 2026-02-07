import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Send reset password email using Resend via SMTP
 * @param {string} toEmail - user email
 * @param {string} resetToken - raw reset token
 * @param {string} userName - user's name
 */
export const sendResetEmail = async (toEmail, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset_pasword_page/reset_password_page.html?token=${resetToken}`;

  console.log(`Attempting to send email to ${toEmail} using Gmail SMTP...`);

  // Create transporter with Gmail SMTP settings
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL, // Updated to match .env
      pass: process.env.SMTP_PASSWORD // Updated to match .env
    }
  });

  // Load designed template
  let htmlTemplate;
  try {
    // Go up 3 levels: utils -> src -> manel-backend -> root -> frontend
    const templatePath = path.join(__dirname, '../../../frontend/email_template/email_template.html');
    console.log('Loading template from:', templatePath);
    
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
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `;
  }

  // Email message
  const message = {
    from: `"NoveXa Academy" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: 'Reset your NoveXa password',
    html: htmlTemplate
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('Email sent successfully via Gmail SMTP:', info.messageId);
    return info;
  } catch (err) {
    console.error('Email Dispatch Error (Gmail SMTP):', err);
    throw err;
  }
};