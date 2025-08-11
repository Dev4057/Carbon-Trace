import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

function LandingPage() {
  return (
    <>
      <Header />
      <div className="page-container">
        <main className="landing-content">
          <h1>Quantify and Neutralize Your Carbon Footprint.</h1>
          <p>
            Carbontrace provides individuals and industries with powerful tools for real-time emissions tracking, data analysis, and a clear path towards sustainability.
          </p>
          <Link to="/register" className="btn-cta">
            Get Started for Free
          </Link>
        </main>
      </div>
    </>
  );
}

export default LandingPage;
