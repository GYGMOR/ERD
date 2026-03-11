import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test DB connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database', err.stack);
  } else {
    console.log('Connected to Database successfully at:', res.rows[0].now);
  }
});

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'NexusService API is running' });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT current_database()');
    res.status(200).json({ success: true, database: result.rows[0].current_database });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
