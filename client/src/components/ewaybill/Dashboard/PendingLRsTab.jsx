
import React from 'react';

const PendingLRsTab = ({ 
  pendingLRs, 
  loading, 
  page, 
  setPage, 
  totalPages,
  onGenerate 
}) => {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        <div style={{ marginBottom: '10px', fontSize: '1.2rem' }}>⏳</div>
        Loading pending LRs...
      </div>
    );
  }

  if (pendingLRs.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '40px',
        background: '#e8f5e9', borderRadius: '10px', color: '#2e7d32'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎉</div>
        <strong>All caught up!</strong>
        <p style={{ margin: '6px 0 0', color: '#4caf50' }}>All LRs have E-Way Bills generated.</p>
      </div>
    );
  }

  return (
    <div className="form-section">
      <h3 className="blue-dot">LRs Requiring E-Way Bill Generation</h3>
      <div className="section-body" style={{ padding: 0 }}>
      
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <table className="ewb-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>LR No</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Consignor</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Consignee</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Route</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Vehicle</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#666' }}>Date</th>
              <th style={{ padding: '12px', textAlign: 'center', color: '#666' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingLRs.map((lr, idx) => (
              <tr key={`${lr._id}-${lr.containerIndex}`} style={{ borderBottom: '1px solid #eee', transition: 'background 0.2s' }}>
                <td style={{ padding: '12px', fontWeight: '600', color: '#333' }}>
                  {lr.pr_no || lr.tr_no || '-'}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{lr.consignorName || '-'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#777' }}>{lr.consignorGstin || ''}</div>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{lr.consigneeName || '-'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#777' }}>{lr.consigneeGstin || ''}</div>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ fontSize: '0.85rem', background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                    {lr.fromCity || lr.fromState || '-'} ➝ {lr.toCity || lr.toState || '-'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  {lr.vehicleNo ? (
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{lr.vehicleNo}</span>
                  ) : (
                    <span style={{ color: '#aaa' }}>-</span>
                  )}
                </td>
                <td style={{ padding: '12px', fontSize: '0.85rem', color: '#555' }}>
                  {lr.pr_date ? new Date(lr.pr_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    className="btn btn-sm"
                    style={{
                      background: '#1976d2', color: 'white', border: 'none',
                      padding: '8px 16px', borderRadius: '6px', fontWeight: '600',
                      fontSize: '0.8rem', cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)',
                      transition: 'transform 0.1s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onClick={() => onGenerate(lr)}
                  >
                    Generate EWB
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ opacity: page === 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.9rem', color: '#666', background: 'white', padding: '4px 12px', borderRadius: '20px', border: '1px solid #e0e0e0' }}>
            Page <b>{page}</b> of <b>{totalPages}</b>
          </span>
          <button 
            className="btn btn-secondary btn-sm" 
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default PendingLRsTab;
