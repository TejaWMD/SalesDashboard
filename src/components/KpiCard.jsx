// src/components/KpiCard.jsx
import React from 'react';
import './KpiCard.css';

function KpiCard({ title, value, subtitle, badge, status = 'default', icon }) {
  return (
    <div className={`kpi-card kpi-card--${status}`}>
      <div className="kpi-card__header">
        <span className="kpi-card__title">{title}</span>
        {icon && <span className="kpi-card__icon">{icon}</span>}
      </div>
      <div className="kpi-card__body">
        <div className="kpi-card__value">{value}</div>
        {(badge || subtitle) && (
          <div className="kpi-card__footer">
            {badge && (
              <span className={`kpi-card__badge kpi-card__badge--${status}`}>
                {badge}
              </span>
            )}
            {subtitle && <span className="kpi-card__subtitle">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default KpiCard;
