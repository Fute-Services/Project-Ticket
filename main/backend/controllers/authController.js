const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Detect role from email pattern
function detectRole(email) {
  if (/hr\.fute/i.test(email)) return 'hr';
  if (/system\.fute/i.test(email) || /system\.futeservice/i.test(email)) return 'it';
  return 'employee'; // founder is set manually in DB
}

// POST /api/auth/register
async function register(req, res) {
  const { email, password, full_name, department } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'email, password and full_name are required' });
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) return res.status(400).json({ error: authError.message });

  const role = detectRole(email);

  // Insert into users table
  const { error: dbError } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    full_name,
    role,
    department: department || null,
  });
  if (dbError) return res.status(400).json({ error: dbError.message });

  const token = jwt.sign(
    { id: authData.user.id, email, role, full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ token, role, full_name, email });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) return res.status(401).json({ error: 'Invalid credentials' });

  // Fetch user profile from users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();
  if (userError) return res.status(400).json({ error: userError.message });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, role: user.role, full_name: user.full_name, email: user.email });
}

module.exports = { register, login };
