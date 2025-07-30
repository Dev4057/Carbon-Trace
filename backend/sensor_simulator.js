// FILE: backend/sensor_simulator.js
// This new version sends a new reading every 5 seconds.

const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost');

client.on('connect', () => {
    console.log('Simulator connected. Sending new data every 5 seconds...');
    console.log('Press Ctrl+C to stop.');

    // Send data immediately on connect, then every 5 seconds
    setInterval(() => {
        // Create slightly randomized data to see changes
        const randomCO2 = 415 + (Math.random() * 5 - 2.5); // 415 ppm +/- 2.5
        const randomTemp = 28 + (Math.random() * 2 - 1);   // 28°C +/- 1

        const sensorData = {
            co2_ppm: parseFloat(randomCO2.toFixed(2)),
            temperature: parseFloat(randomTemp.toFixed(2)),
        };

        const topic = 'sensors/INDUSTRY-001/data';
        
        client.publish(topic, JSON.stringify(sensorData), () => {
            console.log(`Published message to ${topic}:`, sensorData);
        });
    }, 5000); // 5000 milliseconds = 5 seconds
});

client.on('error', (error) => {
    console.error('Connection error:', error);
    client.end();
});
