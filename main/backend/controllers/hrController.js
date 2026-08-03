const supabase = require('../config/supabase');
const { sendMail, newComplaintEmail, statusUpdateEmail } = require('../utils/mailer');
require('dotenv').config();

// Generate token: FT-HR-XXXXXX
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return `FT-HR-${result}`;
}

// Calculate duration string from complaint_date to now
function calcDuration(complaintDate) {
  const diff = Date.now() - new Date(complaintDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minute(s)`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour(s)`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day(s)`;
  return `${Math.floor(days / 7)} week(s)`;
}

// POST /api/hr/complaints — submit new HR complaint
async function createComplaint(req, res) {
  const { name, department, description, complaint_date, priority } = req.body;
  if (!name || !department || !description || !complaint_date || !priority) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const token = generateToken();
  const duration = calcDuration(complaint_date);

  const { data, error } = await supabase.from('hr_complaints').insert({
    token,
    user_id: req.user.id,
    name,
    department,
    description,
    complaint_date,
    duration,
    priority,
    status: 'Pending',
  }).select().single();

  if (error) return res.status(400).json({ error: error.message });

  // Notify HR staff
  try {
    await sendMail(
      process.env.HR_EMAIL,
      `New HR Complaint — ${token}`,
      newComplaintEmail(token, name, department, priority)
    );
  } catch (e) {
    console.error('Mail error:', e.message);
  }

  res.status(201).json({ complaint: data, token });
}

// GET /api/hr/complaints — HR staff / founder sees all
async function getAllComplaints(req, res) {
  const { data, error } = await supabase
    .from('hr_complaints')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
}

// GET /api/hr/complaints/my — employee sees own complaints
async function getMyComplaints(req, res) {
  const { data, error } = await supabase
    .from('hr_complaints')
    .select('*')
    .eq('user_id', req.user.id)
    .order('submitted_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
}

// GET /api/hr/complaints/search?token=FT-HR-XXXXX
async function searchByToken(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token query param required' });
  const { data, error } = await supabase
    .from('hr_complaints')
    .select('*')
    .eq('token', token.toUpperCase())
    .single();
  if (error) return res.status(404).json({ error: 'Complaint not found' });
  res.json(data);
}

// PATCH /api/hr/complaints/:id/status — HR staff / founder updates status
async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['Pending', 'In Progress', 'Completed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { data, error } = await supabase
    .from('hr_complaints')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  // Notify the employee who submitted
  try {
    const { data: submitter } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', data.user_id)
      .single();
    if (submitter) {
      await sendMail(
        submitter.email,
        `Your Complaint ${data.token} has been updated`,
        statusUpdateEmail(data.token, status, req.user.full_name)
      );
    }
  } catch (e) {
    console.error('Mail error:', e.message);
  }

  res.json(data);
}

module.exports = { createComplaint, getAllComplaints, getMyComplaints, searchByToken, updateStatus };
