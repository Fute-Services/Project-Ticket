const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/hr', require('./routes/hrRoutes'));
app.use('/api/it', require('./routes/itRoutes'));
app.use('/api/founder', require('./routes/founderRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));

app.get('/', (req, res) => res.json({ message: 'Fute Portal API running' }));

const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
