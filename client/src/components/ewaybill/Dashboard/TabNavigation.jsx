
import React from 'react';
import './TabNavigation.scss';

const TabNavigation = ({ activeTab, onTabChange, metrics }) => {
  const tabs = [
    {
      id: 'pending-lrs',
      label: 'Pending LRs',
      badge: metrics?.pendingLRs || 0,
      badgeColor: 'blue',
      description: 'LRs requiring E-Way Bill generation'
    },
    {
      id: 'active',
      label: 'Active E-Way Bills',
      badge: metrics?.activeEWBs || 0,
      badgeColor: 'green',
      description: 'Currently valid E-Way Bills'
    },
    {
      id: 'expiring',
      label: 'Expiring Soon',
      badge: metrics?.expiringSoon || 0,
      badgeColor: 'orange',
      urgent: (metrics?.expiringSoon || 0) > 0,
      description: 'E-Way Bills expiring within 24 hours'
    },
    {
      id: 'bulk',
      label: 'Bulk Operations',
      description: 'Generate multiple E-Way Bills at once'
    },
    {
      id: 'reports',
      label: 'Reports',
      description: 'Analytics and government portal reports'
    }
  ];
  return (
    <div className="form-section" style={{ marginBottom: '20px' }}>
      <div className="section-body" style={{ padding: '0 8px' }}>
        <div className="ewb-tabs" style={{ marginBottom: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`ewb-tab ${activeTab === tab.id ? 'active' : ''} ${tab.urgent ? 'tab-urgent' : ''}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.description}
            >
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`tab-badge tab-badge-${tab.badgeColor} ${tab.urgent ? 'tab-badge-pulse' : ''}`} style={{
                  marginLeft: '8px',
                  background: tab.badgeColor === 'green' ? '#16a34a' : tab.badgeColor === 'orange' ? '#ea580c' : '#2563eb',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 600
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TabNavigation;
