import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Send reset password email using Resend HTTP API (Bypasses Render SMTP block)
 * @param {string} toEmail - user email
 * @param {string} resetToken - raw reset token
 * @param {string} userName - user's name
 */
export const sendResetEmail = async (toEmail, resetToken, userName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset_pasword_page/reset_password_page.html?token=${resetToken}`;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is missing in .env!');
    throw new Error('Email service configuration missing (RESEND_API_KEY)');
  }

  console.log(`🚀 Sending email to ${toEmail} using Resend HTTP API...`);

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

  try {
    const response = await axios.post('https://api.resend.com/emails', {
      from: 'NoveXa Academy <onboarding@resend.dev>',
      to: [toEmail],
      subject: 'Reset your NoveXa password',
      html: htmlTemplate
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Email sent successfully via Resend:', response.data.id);
    return response.data;
  } catch (err) {
    const errorMsg = err.response?.data?.message || err.message;
    console.error('❌ Resend API Error:', errorMsg);
    throw new Error(`Email could not be sent: ${errorMsg}`);
  }
};