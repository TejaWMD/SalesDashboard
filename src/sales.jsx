// src/sales.jsx
import React, { useEffect, useState } from 'react';
import { fetchSheetData } from './utils/fetchSheet';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function SalesDashboard() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchSheetData()
      .then((rows) => {
        setData(rows);
        computeSummary(rows);
      })
      .catch(console.error);
  }, []);

  function computeSummary(rows) {
    // Expect columns: Person, Outlet, Target, Actual
    let totalTarget = 0;
    let totalActual = 0;
    const persons = {};
    rows.forEach((row) => {
      const target = parseFloat(row.Target) || 0;
      const actual = parseFloat(row.Actual) || 0;
      totalTarget += target;
      totalActual += actual;
      const person = row.Person || 'Unknown';
      if (!persons[person]) {
        persons[person] = { target: 0, actual: 0 };
      }
      persons[person].target += target;
      persons[person].actual += actual;
    });
    const percent = totalTarget ? (totalActual / totalTarget) * 100 : 0;
    const remaining = totalTarget - totalActual;
    setSummary({ totalTarget, totalActual, percent, remaining, persons });
  }

  const chartData = summary
    ? {
        labels: Object.keys(summary.persons),
        datasets: [
          {
            label: 'Target',
            data: Object.values(summary.persons).map((p) => p.target),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
          },
          {
            label: 'Actual',
            data: Object.values(summary.persons).map((p) => p.actual),
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
          },
        ],
      }
    : null;

  return (
    <div className="dashboard-section">
      <h2>Sales Overview</h2>
      {summary ? (
        <div className="summary-cards">
          <div className="card">Total Target: {summary.totalTarget}</div>
          <div className="card">Total Actual: {summary.totalActual}</div>
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
            <th>Actual</th>
            <th>% Achieved</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const target = parseFloat(row.Target) || 0;
            const actual = parseFloat(row.Actual) || 0;
            const pct = target ? ((actual / target) * 100).toFixed(1) : '0';
            return (
              <tr key={idx}>
                <td>{row.Person}</td>
                <td>{row.Outlet}</td>
                <td>{target}</td>
                <td>{actual}</td>
                <td>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default SalesDashboard;
