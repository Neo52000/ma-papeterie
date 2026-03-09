require('dotenv').config();
const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, subject, html, text, attachments = [], from }) {
  const transporter = createTransport();

  const mailOptions = {
    from: from || `"${process.env.SMTP_FROM_NAME || 'ma-papeterie.fr'}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;
}

async function testConnection() {
  const transporter = createTransport();
  await transporter.verify();
  return true;
}

module.exports = { sendEmail, testConnection };
