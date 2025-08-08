const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs'); // <-- THIS LINE IS THE ONLY CHANGE
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
app.get('/', (req, res) => {
  res.send('Hello from the Carbontrace User & Auth Service!');
});

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const newUser = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [email, password_hash]
    );
    res.status(201).json({
      message: "User registered successfully",
      user: newUser.rows[0]
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json("Invalid credentials");
    }
    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json("Invalid credentials");
    }
    const payload = { user: { id: user.id } };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await pool.query("SELECT id, email, created_at FROM users WHERE id = $1", [
      req.user.id
    ]);
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.post('/calculate', authMiddleware, async (req, res) => {
  try {
    const { activity_type, input_value } = req.body;
    const userId = req.user.id;
    if (!emissionFactors[activity_type]) {
      return res.status(400).json({ msg: 'Invalid activity type' });
    }
    const factor = emissionFactors[activity_type];
    const co2e_kg = input_value * factor;
    const newEmission = await pool.query(
      "INSERT INTO emissions (user_id, activity_type, input_value, co2e_kg) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, activity_type, input_value, co2e_kg]
    );
    res.json(newEmission.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.post('/upload', authMiddleware, upload.single('data_file'), (req, res) => {
    const results = [];
    const userId = req.user.id;
    let totalEmissions = 0;
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
        try {
            for (const row of results) {
                const { activity_type, input_value } = row;
                if (emissionFactors[activity_type]) {
                    const factor = emissionFactors[activity_type];
                    const co2e_kg = parseFloat(input_value) * factor;
                    totalEmissions += co2e_kg;
                    await pool.query(
                    "INSERT INTO emissions (user_id, activity_type, input_value, co2e_kg) VALUES ($1, $2, $3, $4)",
                    [userId, activity_type, parseFloat(input_value), co2e_kg]
                    );
                }
            }
            fs.unlinkSync(req.file.path);
            res.json({ 
                message: "File processed successfully", 
                recordsAdded: results.length,
                totalEmissions: parseFloat(totalEmissions.toFixed(2))
            });
        } catch (err) {
            console.error(err.message);
            fs.unlinkSync(req.file.path);
            res.status(500).send('Server Error during DB insertion');
        }
        });
});

app.get('/api/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { range, groupBy } = req.query;
    let query, queryParams = [userId];
    if (groupBy === 'hour' && range === '1') {
        query = `SELECT DATE_TRUNC('hour', created_at) as date, SUM(co2e_kg) as total_co2e_kg FROM emissions WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours' GROUP BY DATE_TRUNC('hour', created_at) ORDER BY date ASC`;
    } else {
        query = `SELECT DATE(created_at) as date, SUM(co2e_kg) as total_co2e_kg FROM emissions WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${parseInt(range || 30, 10)} days' GROUP BY DATE(created_at) ORDER BY date ASC`;
    }
    const historyData = await pool.query(query, queryParams);
    res.json(historyData.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`User & Auth Service listening on port ${port}`);
});
