
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../styles/openPoints.scss';

const API_URL = process.env.REACT_APP_API_STRING || 'http://localhost:9006';

const AnalyticsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const res = await axios.get(`${API_URL}/api/open-points/analytics/global`, {
                    headers: { 'user-id': user._id }
                });
                setStats(res.data);
            } catch (error) {
                console.error("Error fetching analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="open-points-container">Loading Analytics...</div>;

    // Transform data for display
    // stats = [{ _id: 'Red', count: 5 }, ...]
    const getCount = (status) => stats?.find(s => s._id === status)?.count || 0;

    return (
        <div className="open-points-container">
            <h2>Department & System Analytics</h2>

            <div className="project-grid" style={{ marginTop: '20px' }}>
                <div className="premium-card" style={{ textAlign: 'center', borderTop: '4px solid #ef4444' }}>
                    <h1 style={{ fontSize: '3rem', color: '#ef4444' }}>{getCount('Red')}</h1>
                    <p>Critical / Overdue</p>
                </div>
                <div className="premium-card" style={{ textAlign: 'center', borderTop: '4px solid #f59e0b' }}>
                    <h1 style={{ fontSize: '3rem', color: '#f59e0b' }}>{getCount('Yellow') + getCount('Orange')}</h1>
                    <p>In Progress / New</p>
                </div>
                <div className="premium-card" style={{ textAlign: 'center', borderTop: '4px solid #10b981' }}>
                    <h1 style={{ fontSize: '3rem', color: '#10b981' }}>{getCount('Green')}</h1>
                    <p>Closed Successfully</p>
                </div>
            </div>

            <div className="premium-card" style={{ marginTop: '24px' }}>
                <h3>Aging Analysis</h3>
                <p>Detailed aging charts would go here (requires chart.js or similar).</p>
                <div style={{ height: '200px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    [Chart Placeholder]
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
