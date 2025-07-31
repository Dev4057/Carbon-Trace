const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const cors = require('cors');

const authMiddleware = require('./auth');
const emissionFactors = require('./emissionFactors');

const app = express();
const port = 3001;
const saltRounds = 10;

// --- Middlewares ---
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'postgres-db',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

// --- API Endpoints ---
// ... (GET /, /register, /login, /me, /calculate, /upload endpoints are unchanged) ...
app.get('/', (req, res) => { res.send('Hello from the Carbontrace User & Auth Service!'); });
app.post('/register', async (req, res) => { /* ... existing code ... */ });
app.post('/login', async (req, res) => { /* ... existing code ... */ });
app.get('/me', authMiddleware, async (req, res) => { /* ... existing code ... */ });
app.post('/calculate', authMiddleware, async (req, res) => { /* ... existing code ... */ });
app.post('/upload', authMiddleware, upload.single('data_file'), (req, res) => { /* ... existing code ... */ });


// --- UPGRADED /api/history ENDPOINT ---
app.get('/api/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { range, groupBy } = req.query; // Get filter params from URL

    let selectClause, whereClause, groupByClause, orderByClause;
    let queryParams = [userId];

    whereClause = `WHERE user_id = $1`;

    // --- Date Range Filtering Logic ---
    if (range) {
        const intervalValue = parseInt(range, 10);
        // Special case for 24-hour view
        if (groupBy === 'hour' && range === '1') {
            whereClause += ` AND created_at >= NOW() - INTERVAL '24 hours'`;
        } else {
            whereClause += ` AND created_at >= NOW() - INTERVAL '${intervalValue} days'`;
        }
    }

    // --- Data Aggregation Logic ---
    if (groupBy === 'hour' && range === '1') {
        selectClause = `SELECT DATE_TRUNC('hour', created_at) as date, SUM(co2e_kg) as total_co2e_kg`;
        groupByClause = `GROUP BY DATE_TRUNC('hour', created_at)`;
        orderByClause = `ORDER BY date ASC`;
    } else { // Default to daily aggregation for all other ranges
        selectClause = `SELECT DATE(created_at) as date, SUM(co2e_kg) as total_co2e_kg`;
        groupByClause = `GROUP BY DATE(created_at)`;
        orderByClause = `ORDER BY date ASC`;
    }

    const finalQuery = `${selectClause} FROM emissions ${whereClause} ${groupByClause} ${orderByClause}`;

    const historyData = await pool.query(finalQuery, queryParams);
    res.json(historyData.rows);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// --- Start Server ---
app.listen(port, () => {
  console.log(`User & Auth Service listening on port ${port}`);
});
