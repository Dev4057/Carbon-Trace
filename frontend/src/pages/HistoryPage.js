import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
// --- CORRECTED IMPORT STATEMENT ---
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

// --- Custom Tooltip Component (Unchanged) ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`${label}`}</p>
        <p className="intro">{`${payload[0].name} : ${payload[0].value.toLocaleString()} kg`}</p>
      </div>
    );
  }
  return null;
};

// --- Y-Axis Tick Formatter (Unchanged) ---
const yAxisTickFormatter = (value) => {
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
    }
    return value;
}

function HistoryPage() {
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRange, setActiveRange] = useState('30');
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const groupBy = activeRange === '1' ? 'hour' : 'day';
      const url = `http://localhost:3001/api/history?range=${activeRange}&groupBy=${groupBy}`;
      
      const response = await fetch(url, {
        headers: { 'x-auth-token': token },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data = await response.json();
      
      const processedData = data.map(item => ({
        co2e_kg: parseFloat(item.total_co2e_kg), 
        formatted_date: groupBy === 'hour' 
          ? format(parseISO(item.date), 'ha') 
          : format(parseISO(item.date), 'MMM d'),
      }));

      setHistoryData(processedData);
    } catch (error) {
      console.error("History fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [token, activeRange]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-container">
      <div className="glass-card" style={{ maxWidth: '1000px', width: '100%' }}>
        <div className="dashboard-header">
          <h1>History & Analytics</h1>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
        
        <div className="filter-bar">
          <button onClick={() => setActiveRange('1')} className={`filter-btn ${activeRange === '1' ? 'active' : ''}`}>Last 24 Hours</button>
          <button onClick={() => setActiveRange('7')} className={`filter-btn ${activeRange === '7' ? 'active' : ''}`}>Last 7 Days</button>
          <button onClick={() => setActiveRange('30')} className={`filter-btn ${activeRange === '30' ? 'active' : ''}`}>Last 30 Days</button>
          <button onClick={() => setActiveRange('90')} className={`filter-btn ${activeRange === '90' ? 'active' : ''}`}>Last 90 Days</button>
        </div>

        <div className="chart-container">
          {isLoading ? (
            <p>Loading chart data...</p>
          ) : historyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={historyData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                {/* --- GRADIENT CODE REMOVED --- */}
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="formatted_date" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" tickFormatter={yAxisTickFormatter} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(167, 139, 250, 0.1)' }}
                />
                <Bar 
                  dataKey="co2e_kg" 
                  fill="var(--accent-cyan)" // <-- Reverted to solid color
                  name={activeRange === '1' ? "Total Hourly CO₂e (kg)" : "Total Daily CO₂e (kg)"}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No data available for the selected period. Try adding some entries on the dashboard!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;