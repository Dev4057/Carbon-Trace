const mqtt = require('mqtt');
const { Pool } = require('pg');
const { WebSocketServer } = require('ws');

console.log("Starting Sensor Ingestion Service...");

// 1. Create WebSocket Server
const wss = new WebSocketServer({ port: 3002 });
console.log('WebSocket server started on port 3002');

wss.on('connection', ws => {
  console.log('Dashboard client connected');
  ws.on('close', () => console.log('Dashboard client disconnected'));
});

// 2. Connect to Postgres
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'postgres-db',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

// 3. Connect to MQTT Broker
const client = mqtt.connect('mqtt://mosquitto');

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('sensors/+/data');
});

// 4. On message, save to DB AND broadcast to WebSocket clients
client.on('message', async (topic, message) => {
  try {
    const sensorId = topic.split('/')[1];
    const data = JSON.parse(message.toString());
    const fullMessage = { ...data, sensor_id: sensorId, timestamp: new Date().toISOString() };

    console.log(`Received message for ${sensorId}:`, fullMessage);

    // Save to DB
    await pool.query(
      "INSERT INTO sensor_readings (sensor_id, co2_ppm, temperature_celsius) VALUES ($1, $2, $3)",
      [sensorId, data.co2_ppm, data.temperature]
    );
    console.log(`Saved data for sensor ${sensorId}`);

    // Broadcast to all connected dashboard clients
    wss.clients.forEach(client => {
      if (client.readyState === require('ws').OPEN) {
        client.send(JSON.stringify(fullMessage));
      }
    });

  } catch (err) {
    console.error("Failed to process message:", err);
  }
});