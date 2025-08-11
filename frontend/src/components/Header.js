import React, { useState, useEffect } from 'react';
import ManualCalculation from '../components/ManualCalculation';
import Header from '../components/Header'; // The header now handles all navigation

function DashboardPage() {
  const [latestReading, setLatestReading] = useState(null);
  const [allReadings, setAllReadings] = useState([]);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:3002');
    socket.onopen = () => console.log('WebSocket Connected');
    socket.onmessage = (event) => {
      const newReading = JSON.parse(event.data);
      setLatestReading(newReading);
      setAllReadings(prev => [newReading, ...prev.slice(0, 4)]);
    };
    socket.onclose = () => console.log('WebSocket Disconnected');
    return () => socket.close();
  }, []);

  return (
    <>
      <Header />
      <div className="page-container">
        <div className="glass-card" style={{ maxWidth: '800px', display: 'flex', gap: '2rem' }}>
          
          {/* Left Column: Real-time Data */}
          <div style={{ flex: 1 }}>
            <div className="dashboard-header">
              <h1>Live Feed</h1>
              {/* The local logout button has been removed from here */}
            </div>
            
            <div className="data-card latest-reading">
              <h2>Latest Sensor Reading</h2>
              {latestReading ? (
                <div>
                  <p><strong>Sensor ID:</strong> {latestReading.sensor_id}</p>
                  <p><strong>CO₂ Level:</strong> {latestReading.co2_ppm} ppm</p>
                  <p><strong>Temperature:</strong> {latestReading.temperature} °C</p>
                  <p><strong>Timestamp:</strong> {new Date(latestReading.timestamp).toLocaleTimeString()}</p>
                </div>
              ) : (
                <p>Waiting for sensor data...</p>
              )}
            </div>
            
            <div style={{marginTop: '2rem'}}>
                <h3>Recent Readings</h3>
                <ul style={{listStyle: 'none', padding: 0}}>
                    {allReadings.map((reading, index) => (
                        <li key={index} className="recent-reading-item">
                            {`[${new Date(reading.timestamp).toLocaleTimeString()}] ${reading.sensor_id} - CO₂: ${reading.co2_ppm} ppm`}
                        </li>
                    ))}
                </ul>
            </div>
          </div>

          {/* Right Column: Manual Calculations */}
          <div style={{ flex: 1, borderLeft: '1px solid var(--card-border)', paddingLeft: '2rem' }}>
              <h1 style={{marginBottom: '2rem'}}>Manual Entry</h1>
              <ManualCalculation />
          </div>

        </div>
      </div>
    </>
  );
}

export default DashboardPage;