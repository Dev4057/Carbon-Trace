import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UploadCloud } from 'lucide-react';

function ManualCalculation() {
  const [activeTab, setActiveTab] = useState('single');
  const [activityType, setActivityType] = useState('electricity');
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { token } = useAuth();

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    try {
      const response = await fetch('http://localhost:3001/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ activity_type: activityType, input_value: parseFloat(inputValue) }),
      });
      const data = await response.json();
      if (response.ok) {
        setResult(`Success! Calculated Emissions: ${data.co2e_kg} kg CO₂e`);
      } else {
        throw new Error(data.msg || 'Calculation failed');
      }
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };
  
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setResult(null);
  };

  // --- UPDATED BULK SUBMIT HANDLER ---
  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setResult('Error: Please select a file first.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append('data_file', selectedFile);

    try {
      const response = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        headers: { 'x-auth-token': token },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        // Display the new, more detailed success message
        setResult(`Success! Processed ${data.recordsAdded} records. Total Emissions: ${data.totalEmissions} kg CO₂e`);
      } else {
        throw new Error(data.message || 'File upload failed');
      }
    } catch (error) {
      setResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="calculation-container">
      <div className="tabs">
        <button onClick={() => setActiveTab('single')} className={activeTab === 'single' ? 'active' : ''}>
          Single Entry
        </button>
        <button onClick={() => setActiveTab('bulk')} className={activeTab === 'bulk' ? 'active' : ''}>
          Bulk Upload
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="calc-form">
            <div className="form-group">
              <label>Activity Type</label>
              <select className="form-input" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                <option value="electricity">Electricity (kWh)</option>
                <option value="driving_petrol">Gasoline (Litres)</option>
                <option value="natural_gas">Natural Gas (m³)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Usage Value</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g., 150"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? 'Calculating...' : 'Calculate Emissions'}
            </button>
          </form>
        )}

        {activeTab === 'bulk' && (
          <form onSubmit={handleBulkSubmit} className="calc-form">
            <label className="file-drop-zone">
              <input type="file" accept=".csv" onChange={handleFileChange} />
              <UploadCloud size={48} />
              {selectedFile ? (
                <span>{selectedFile.name}</span>
              ) : (
                <span>Drag & drop a .csv file here, or click to select</span>
              )}
            </label>
            <p className="file-format-note">
              Please ensure your .csv file has two columns: <strong>activity_type</strong> and <strong>input_value</strong>.<br />
              Valid activity types are: <code>electricity</code>, <code>driving_petrol</code>, <code>natural_gas</code>.
            </p>
            <button type="submit" className="btn-submit" disabled={isLoading || !selectedFile}>
              {isLoading ? 'Processing...' : 'Upload & Process File'}
            </button>
          </form>
        )}
        
        {result && <p className="result-message">{result}</p>}
      </div>
    </div>
  );
}

export default ManualCalculation;
