import React from 'react';
import './MetricCards.scss';

const MetricCards = ({ metrics, onTabChange, loading }) => {
  const data = metrics || {
    pendingLRs: 0,
    activeEWBs: 0,
    expiringSoon: 0,
    cancelledTotal: 0,
    expiredTotal: 0,
    pendingTrend: 0
  };

  if (loading) return (
    <div className="metrics-grid">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="metric-card metric-skeleton" />
      ))}
    </div>
  );

  return (
    <div className="metrics-grid">
      <MetricCard
        label="Pending LRs"
        value={data.pendingLRs}
        subtitle="Awaiting EWB"
        color="blue"
        trend={data.pendingTrend}
        onClick={() => onTabChange && onTabChange('pending-lrs')}
        urgent={data.pendingLRs > 10}
      />
      <MetricCard
        label="Active EWBs"
        value={data.activeEWBs}
        subtitle="Currently Valid"
        color="green"
        onClick={() => onTabChange && onTabChange('ewbs')}
      />
      <MetricCard
        label="Expiring Soon"
        value={data.expiringSoon}
        subtitle="Within 24 Hours"
        color="orange"
        pulse={data.expiringSoon > 0}
        urgent={data.expiringSoon > 0}
        onClick={() => onTabChange && onTabChange('ewbs')}
      />
      <MetricCard
        label="Cancelled"
        value={data.cancelledTotal}
        subtitle="Total Cancelled"
        color="red"
        onClick={() => onTabChange && onTabChange('ewbs')}
      />
      <MetricCard
        label="Expired"
        value={data.expiredTotal}
        subtitle="Total Expired"
        color="gray"
        onClick={() => onTabChange && onTabChange('ewbs')}
      />
    </div>
  );
};

const MetricCard = ({ label, value, subtitle, color, onClick, urgent, pulse, trend }) => {
  return (
    <div
      className={`metric-card metric-card-${color}${urgent ? ' metric-urgent' : ''}${pulse ? ' metric-pulse' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="metric-content">
        <div className="metric-label">{label}</div>
        <div className="metric-value">
          {value}
          {trend !== undefined && trend !== 0 && (
            <span className={`metric-trend ${trend > 0 ? 'trend-up' : 'trend-down'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        <div className="metric-subtitle">{subtitle}</div>
      </div>
      {urgent && <div className="metric-badge">!</div>}
    </div>
  );
};

export default MetricCards;
