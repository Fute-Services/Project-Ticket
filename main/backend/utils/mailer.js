const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Ticket/complaint fields (submitterName, department, etc.) are user-supplied
// and get interpolated straight into HTML emails below — escape so a crafted
// value can't inject markup/links into the notification.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Send an email
 * @param {string} to - recipient email
 * @param {string} subject
 * @param {string} html - HTML body
 */
async function sendMail(to, subject, html) {
  await transporter.sendMail({
    from: `"Fute Portal" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

// Email sent to HR/IT when a new complaint is submitted
function newComplaintEmail(token, submitterName, dept, priority) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#6366f1">New Complaint Received</h2>
      <p>A new complaint has been submitted.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#6b7280">Token</td><td><strong>${escapeHtml(token)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Submitted By</td><td>${escapeHtml(submitterName)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Department</td><td>${escapeHtml(dept)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Priority</td><td>${escapeHtml(priority)}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:13px;color:#9ca3af">Login to the Fute Portal to view and manage this complaint.</p>
    </div>`;
}

// Email sent to employee when status is updated
function statusUpdateEmail(token, newStatus, updatedBy) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#6366f1">Complaint Status Updated</h2>
      <p>Your complaint status has been updated.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#6b7280">Token</td><td><strong>${escapeHtml(token)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">New Status</td><td><strong style="color:#6366f1">${escapeHtml(newStatus)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Updated By</td><td>${escapeHtml(updatedBy)}</td></tr>
      </table>
      <p style="margin-top:20px;font-size:13px;color:#9ca3af">Login to the Fute Portal to track your complaint using your token.</p>
    </div>`;
}

module.exports = { sendMail, newComplaintEmail, statusUpdateEmail, escapeHtml };
