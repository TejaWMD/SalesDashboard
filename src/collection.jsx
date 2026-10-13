// src/collection.jsx
import React, { useEffect, useState } from 'react';
import { fetchSheetData } from './utils/fetchSheet';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function CollectionDashboard() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchSheetData()
      .then((rows) => {
        // Assume rows have a column "Section" indicating "Collection"
        const collectionRows = rows.filter((r) => r.Section?.toLowerCase() === 'collection');
        setData(collectionRows);
        computeSummary(collectionRows);
      })
      .catch(console.error);
  }, []);

  function computeSummary(rows) {
    // Expect columns: Person, Outlet, Target, Received
    let totalTarget = 0;
    let totalReceived = 0;
    const persons = {};
    rows.forEach((row) => {
      const target = parseFloat(row.Target) || 0;
      const received = parseFloat(row.Received) || 0;
      totalTarget += target;
      totalReceived += received;
      const person = row.Person || 'Unknown';
      if (!persons[person]) persons[person] = { target: 0, received: 0 };
      persons[person].target += target;
      persons[person].received += received;
    });
    const percent = totalTarget ? (totalReceived / totalTarget) * 100 : 0;
    const remaining = totalTarget - totalReceived;
    setSummary({ totalTarget, totalReceived, percent, remaining, persons });
  }

  const chartData = summary
    ? {
        labels: Object.keys(summary.persons),
        datasets: [
          {
            label: 'Target',
            data: Object.values(summary.persons).map((p) => p.target),
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
          },
          {
            label: 'Received',
            data: Object.values(summary.persons).map((p) => p.received),
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
          },
        ],
      }
    : null;

  return (
    <div className="dashboard-section">
      <h2>Collection Overview</h2>
      {summary ? (
        <div className="summary-cards">
          <div className="card">Total Target: {summary.totalTarget}</div>
          <div className="card">Total Received: {summary.totalReceived}</div>
          <div className="card">% Achieved: {summary.percent.toFixed(1)}%</div>
          <div className="card">Remaining: {summary.remaining}</div>
        </div>
      ) : (
        <p>Loading...</p>
      )}
      {chartData && (
        <div className="chart-wrapper">
          <Bar data={chartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
        </div>
      )}
      <h3>Details</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Person</th>
            <th>Outlet</th>
            <th>Target</th>
            <th>Received</th>
            <th>% Achieved</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const target = parseFloat(row.Target) || 0;
            const received = parseFloat(row.Received) || 0;
            const pct = target ? ((received / target) * 100).toFixed(1) : '0';
            return (
              <tr key={idx}>
                <td>{row.Person}</td>
                <td>{row.Outlet}</td>
                <td>{target}</td>
                <td>{received}</td>
                <td>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CollectionDashboard;
