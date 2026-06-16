import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../styles/openPoints.scss';

const API_URL = process.env.REACT_APP_API_STRING || 'http://localhost:9003/api';

const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
};

const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
    const userId = user._id || user.id || user.username || '';
    const token = getCookie('access_token') || user.auth?.accessToken || '';

    return {
        headers: {
            'Content-Type': 'application/json',
            'user-id': userId,
            'username': user.username || userId,
            'user-role': user.role || '',
            'x-requested-with': 'XMLHttpRequest',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        withCredentials: true
    };
};

const AnalyticsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await axios.get(`${API_URL}/open-points/analytics/global`, getHeaders());
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
