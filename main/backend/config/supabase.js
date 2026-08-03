const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase client using service role key (full DB access for backend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;
