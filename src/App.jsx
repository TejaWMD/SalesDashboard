// src/App.jsx
import React, { useEffect, useState } from 'react';
import SalesDashboard from './sales';
import CollectionDashboard from './collection';
import './styles.css';

function App() {
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Sales & Collection Dashboard</h1>
        <nav className="tab-nav">
          <button className={activeTab === 'sales' ? 'active' : ''} onClick={() => setActiveTab('sales')}>Sales</button>
          <button className={activeTab === 'collection' ? 'active' : ''} onClick={() => setActiveTab('collection')}>Collection</button>
        </nav>
      </header>
      <main className="app-main">
        {activeTab === 'sales' && <SalesDashboard />}
        {activeTab === 'collection' && <CollectionDashboard />}
      </main>
    </div>
  );
}

export default App;
