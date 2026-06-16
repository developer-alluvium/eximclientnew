import React, { useEffect, useState, useContext } from 'react';
import { fetchMyAssignedPoints, updatePointStatus, fetchUserOpenPoints, fetchMyAssignedToOthersPoints } from '../../services/openPointsService';
import { useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import '../../styles/openPoints.scss';

const MyOpenPoints = ({ username: propUsername, viewMode }) => {
    const { username: paramUsername } = useParams();
    const { user } = useContext(UserContext);

    // Determine target username - from prop, URL param, or current user
    const targetUsername = propUsername || paramUsername || user?.username;
    const isOwnPoints = targetUsername === user?.username && viewMode !== 'assigned-by-me';
    const isAssignedByMe = viewMode === 'assigned-by-me';

    const [points, setPoints] = useState([]);
    const [targetUserInfo, setTargetUserInfo] = useState(null); // Store target user's name info
    const [loading, setLoading] = useState(true);
    const [projectFilter, setProjectFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [assignerFilter, setAssignerFilter] = useState('');
    const [responsibleFilter, setResponsibleFilter] = useState(''); // New filter
    const [hideGreen, setHideGreen] = useState(true); // Hide completed points by default
    const [modifiedPoints, setModifiedPoints] = useState(new Set());

    // Dialog State
    const [dialogConfig, setDialogConfig] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null });

    const navigate = useNavigate();

    useEffect(() => {
        loadPoints();
    }, [targetUsername]);

    const loadPoints = async () => {
        try {
            let data;
            if (isAssignedByMe) {
                // Fetch points I assigned to others
                data = await fetchMyAssignedToOthersPoints();
                setPoints(data);
                setTargetUserInfo(null);
            } else if (isOwnPoints) {
                // Fetch own points - returns array directly
                data = await fetchMyAssignedPoints();
                setPoints(data);
                setTargetUserInfo(null);
            } else {
                // Fetch another user's points (admin/profile view) - returns { points, userInfo }
                const response = await fetchUserOpenPoints(targetUsername);
                setPoints(response.points || []);
                setTargetUserInfo(response.userInfo || null);
            }
        } catch (error) {
            console.error("Failed to load assigned points", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to format display name with proper capitalization (FULL UPPERCASE)
    const getDisplayName = () => {
        if (isAssignedByMe) return 'Points I Have Assigned';
        if (isOwnPoints) return 'My Assigned Points';

        if (targetUserInfo && (targetUserInfo.first_name || targetUserInfo.last_name)) {
            const firstName = targetUserInfo.first_name ? targetUserInfo.first_name.toUpperCase() : '';
            const lastName = targetUserInfo.last_name ? targetUserInfo.last_name.toUpperCase() : '';
            return `${firstName} ${lastName}'s Open Points`.trim();
        }

        return `${targetUsername}'s Open Points`;
    };



    const showDialog = (title, message, type = 'info', onConfirm = null) => {
        setDialogConfig({ open: true, title, message, type, onConfirm });
    };

    const closeDialog = () => {
        setDialogConfig({ ...dialogConfig, open: false });
    };

    // Auto-resize textarea
    const autoResize = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handleUpdate = (pointId, field, value) => {
        // Update local state only
        const updatedPoints = points.map(p =>
            p._id === pointId ? { ...p, [field]: value } : p
        );
        setPoints(updatedPoints);
        setModifiedPoints(prev => new Set(prev).add(pointId));
    };

    const handleSaveRow = async (pointId) => {
        const point = points.find(p => p._id === pointId);
        if (!point) return;

        const payload = {
            ...point,
            userId: user._id,
        };

        // Clean up payload
        if (payload.project_id) delete payload.project_id;
        if (payload.project_name) delete payload.project_name;

        try {
            await updatePointStatus(pointId, payload);
            showDialog("Success", "Saved successfully!", "alert");
            setModifiedPoints(prev => {
                const next = new Set(prev);
                next.delete(pointId);
                return next;
            });
        } catch (error) {
            console.error("Save failed", error);
            showDialog("Error", error.response?.data?.error || "Failed to save changes", "alert");
        }
    };

    const handleGoToProject = (projectId) => {
        if (projectId) {
            navigate(`/open-points/project/${projectId}`);
        }
    };

    // Get unique project names for filter dropdown
    const uniqueProjects = [...new Set(points.map(p => p.project_name).filter(Boolean))].sort();

    // Get unique assigner names for filter dropdown
    const uniqueAssigners = [...new Set(points.map(p => {
        if (!p.created_by) return null;
        return p.created_by.first_name ? `${p.created_by.first_name} ${p.created_by.last_name || ''}` : p.created_by.username;
    }).filter(Boolean))].sort();

    // Get unique responsible names for filter dropdown
    const uniqueResponsible = [...new Set(points.map(p => {
        if (!p.responsible_person) return null;
        return p.responsible_person.first_name ? `${p.responsible_person.first_name} ${p.responsible_person.last_name || ''}` : p.responsible_person.username;
    }).filter(Boolean))].sort();

    // Filter points for Table Display
    const filteredPoints = points.filter(p => {
        // Always show points that are currently being edited (modified) so they can be saved
        if (modifiedPoints.has(p._id)) return true;

        if (projectFilter && p.project_name !== projectFilter) return false;
        if (statusFilter && p.status !== statusFilter) return false;
        if (priorityFilter && p.priority !== priorityFilter) return false;

        // Assigner Filter
        if (assignerFilter) {
            const assignerName = p.created_by ? (p.created_by.first_name ? `${p.created_by.first_name} ${p.created_by.last_name || ''}` : p.created_by.username) : null;
            if (assignerName !== assignerFilter) return false;
        }

        // Responsible Filter
        if (responsibleFilter) {
            const respName = p.responsible_person ? (p.responsible_person.first_name ? `${p.responsible_person.first_name} ${p.responsible_person.last_name || ''}` : p.responsible_person.username) : null;
            if (respName !== responsibleFilter) return false;
        }

        // Hide green points by default unless toggle is off or specific status is selected
        if (hideGreen && !statusFilter && p.status === 'Green') return false;
        return true;
    });

    // Summary statistics (Apply filters but IGNORE hideGreen toggle to keep stats visible)
    const summaryPoints = points.filter(p => {
        if (projectFilter && p.project_name !== projectFilter) return false;
        if (statusFilter && p.status !== statusFilter) return false;
        if (priorityFilter && p.priority !== priorityFilter) return false;
        if (assignerFilter) {
            const assignerName = p.created_by ? (p.created_by.first_name ? `${p.created_by.first_name} ${p.created_by.last_name || ''}` : p.created_by.username) : null;
            if (assignerName !== assignerFilter) return false;
        }
        if (responsibleFilter) {
            const respName = p.responsible_person ? (p.responsible_person.first_name ? `${p.responsible_person.first_name} ${p.responsible_person.last_name || ''}` : p.responsible_person.username) : null;
            if (respName !== responsibleFilter) return false;
        }
        return true;
    });

    // Filtered summary for display
    const summary = {
        total: summaryPoints.length,
        red: summaryPoints.filter(p => p.status === 'Red').length,
        yellow: summaryPoints.filter(p => p.status === 'Yellow').length,
        orange: summaryPoints.filter(p => p.status === 'Orange').length,
        green: summaryPoints.filter(p => p.status === 'Green').length,
    };

    return (
        <div className="open-points-page" style={{ width: '100%', minHeight: '100vh', background: '#ffffff', padding: '20px' }}>
            <div style={{ margin: '0 auto', padding: '20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(90deg, #1e40af, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {getDisplayName()}
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '5px' }}>
                            {isAssignedByMe
                                ? 'All open points you have assigned to other team members'
                                : isOwnPoints
                                    ? 'All open points assigned to you across all projects'
                                    : `Viewing all open points assigned to ${targetUserInfo?.first_name || targetUsername}`
                            }
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {!isOwnPoints && !isAssignedByMe && (
                            <button
                                className="btn"
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)',
                                    fontWeight: 600
                                }}
                                onClick={() => navigate(`/profile/${targetUsername}`)}
                            >
                                👤 View Profile
                            </button>
                        )}
                        <button
                            className="btn"
                            style={{
                                background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 6px rgba(100, 116, 139, 0.3)',
                                fontWeight: 600
                            }}
                            onClick={() => navigate(-1)}
                        >
                            ← Back
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                {!loading && points.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '30px' }}>
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e293b' }}>{summary.total}</div>
                            <div style={{ color: '#64748b', fontWeight: 600 }}>Total Points</div>
                        </div>
                        <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #fecaca', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{summary.red}</div>
                            <div style={{ color: '#dc2626', fontWeight: 600 }}>Red (Pending)</div>
                        </div>
                        <div style={{ background: '#fefce8', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #fef08a', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#eab308' }}>{summary.yellow}</div>
                            <div style={{ color: '#ca8a04', fontWeight: 600 }}>Yellow (In Progress)</div>
                        </div>
                        <div style={{ background: '#fff7ed', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #fed7aa', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f97316' }}>{summary.orange}</div>
                            <div style={{ color: '#ea580c', fontWeight: 600 }}>Orange (Change Req)</div>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{summary.green}</div>
                            <div style={{ color: '#16a34a', fontWeight: 600 }}>Green (Closed)</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', background: '#f8fafc', padding: '12px 15px', borderRadius: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Filters:</span>
                    <select
                        className="form-control"
                        style={{ width: '200px', height: '36px', fontSize: '13px' }}
                        value={projectFilter}
                        onChange={e => setProjectFilter(e.target.value)}
                    >
                        <option value="">All Projects</option>
                        {uniqueProjects.map(proj => (
                            <option key={proj} value={proj}>{proj}</option>
                        ))}
                    </select>
                    {!isAssignedByMe && (
                        <select
                            className="form-control"
                            style={{ width: '180px', height: '36px', fontSize: '13px' }}
                            value={assignerFilter}
                            onChange={e => setAssignerFilter(e.target.value)}
                        >
                            <option value="">All Assigners</option>
                            {uniqueAssigners.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    )}
                    {isAssignedByMe && (
                        <select
                            className="form-control"
                            style={{ width: '180px', height: '36px', fontSize: '13px' }}
                            value={responsibleFilter}
                            onChange={e => setResponsibleFilter(e.target.value)}
                        >
                            <option value="">All Assignees</option>
                            {uniqueResponsible.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    )}
                    <select
                        className="form-control"
                        style={{ width: '130px', height: '36px', fontSize: '13px' }}
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="Red">Red</option>
                        <option value="Yellow">Yellow</option>
                        <option value="Orange">Orange</option>
                        <option value="Green">Green</option>
                    </select>
                    <select
                        className="form-control"
                        style={{ width: '130px', height: '36px', fontSize: '13px' }}
                        value={priorityFilter}
                        onChange={e => setPriorityFilter(e.target.value)}
                    >
                        <option value="">All Priority</option>
                        <option value="Emergency">Emergency</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    {/* Toggle for showing/hiding completed points */}
                    <button
                        className={`btn btn-sm ${hideGreen ? 'btn-success' : 'btn-outline-secondary'}`}
                        style={{ padding: '6px 14px', fontWeight: 600 }}
                        onClick={() => setHideGreen(!hideGreen)}
                        title={hideGreen ? 'Click to show completed points' : 'Click to hide completed points'}
                    >
                        {hideGreen ? `✅ Show Closed (${summary.green})` : '✅ Hide Closed'}
                    </button>
                    {(projectFilter || statusFilter || priorityFilter || assignerFilter || responsibleFilter) && (
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            style={{ padding: '6px 12px' }}
                            onClick={() => { setProjectFilter(''); setStatusFilter(''); setPriorityFilter(''); setAssignerFilter(''); setResponsibleFilter(''); }}
                        >
                            ✕ Clear Filters
                        </button>
                    )}
                </div>

                {/* Main Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                        <p>Loading your assigned points...</p>
                    </div>
                ) : points.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>
                        <h3>{isAssignedByMe ? 'No Points Assigned by You' : 'No Points Assigned'}</h3>
                        <p>{isAssignedByMe ? "You haven't assigned any open points to others yet." : "You don't have any open points assigned to you."}</p>
                        <button className="btn btn-primary" onClick={() => navigate('/open-points')}>
                            Go to Projects
                        </button>
                    </div>
                ) : filteredPoints.length === 0 ? (
                    <div style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>
                        <p>No points match your filter criteria.</p>
                    </div>
                ) : (
                    <div className="excel-table-container">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>Sr. No</th>
                                    <th style={{ width: '150px' }}>Project Name</th>
                                    <th style={{ width: '18%' }}>Discussion Points</th>
                                    {!isAssignedByMe && <th style={{ width: '100px' }}>Assigned By</th>}
                                    <th style={{ width: '120px' }}>Assigned To</th>
                                    <th style={{ width: '80px' }}>Approval</th>
                                    <th style={{ width: '18%' }}>Gap / Action Point</th>
                                    <th style={{ width: '100px' }}>Target Date</th>
                                    <th style={{ width: '120px' }}>Status</th>
                                    <th style={{ width: '100px' }}>Review</th>
                                    <th style={{ width: '15%' }}>Remarks</th>
                                    <th style={{ width: '100px' }}>Priority</th>
                                    <th style={{ width: '100px' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPoints.map((point, index) => (
                                    <tr key={point._id}>
                                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', color: '#1e293b' }}>
                                             {point.unique_id || index + 1}
                                        </td>
                                        <td>
                                            <span
                                                style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: 600, textDecoration: 'underline' }}
                                                onClick={() => handleGoToProject(point.project_id?._id || point.project_id)}
                                                title="Go to Project"
                                            >
                                                {point.project_name || 'Unknown'}
                                            </span>
                                        </td>
                                        <td>
                                            <textarea
                                                value={point.title || ''}
                                                onChange={(e) => handleUpdate(point._id, 'title', e.target.value)}
                                                onInput={autoResize}
                                                style={{ fieldSizing: 'content' }}
                                            />
                                        </td>
                                        {!isAssignedByMe && (
                                            <td style={{ fontSize: '12px', color: '#444' }}>
                                                {point.created_by ? (
                                                    <div style={{ fontWeight: 600 }}>
                                                        {point.created_by.first_name ? `${point.created_by.first_name} ${point.created_by.last_name || ''}` : point.created_by.username}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#999', fontStyle: 'italic' }}>-</span>
                                                )}
                                            </td>
                                        )}
                                        <td style={{ fontSize: '12px', color: '#444' }}>
                                            {point.responsible_person ? (
                                                <div style={{ fontWeight: 600 }}>
                                                    {point.responsible_person.first_name ? `${point.responsible_person.first_name} ${point.responsible_person.last_name || ''}` : point.responsible_person.username}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#999', fontStyle: 'italic' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            <select
                                                value={point.level || 'L2'}
                                                onChange={(e) => handleUpdate(point._id, 'level', e.target.value)}
                                            >
                                                <option value="L1">L1</option>
                                                <option value="L2">L2</option>
                                                <option value="L3">L3</option>
                                                <option value="L4">L4</option>
                                                <option value="L5">L5</option>
                                            </select>
                                        </td>
                                        <td>
                                            <textarea
                                                value={point.gap_action || ''}
                                                onChange={(e) => handleUpdate(point._id, 'gap_action', e.target.value)}
                                                onInput={autoResize}
                                                style={{ fieldSizing: 'content' }}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="date"
                                                value={point.target_date ? point.target_date.split('T')[0] : ''}
                                                disabled
                                                title="Target date can only be changed by Project Owner"
                                                style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                                            />
                                        </td>
                                        <td className={`status-cell-${point.status}`}>
                                            <select
                                                value={point.status || 'Red'}
                                                onChange={(e) => handleUpdate(point._id, 'status', e.target.value)}
                                            >
                                                <option value="Red">Red</option>
                                                <option value="Yellow">Yellow</option>
                                                <option value="Green">Green</option>
                                                <option value="Orange">Orange</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="date"
                                                value={point.review_date ? (point.review_date.includes('T') ? point.review_date.split('T')[0] : point.review_date) : ''}
                                                onChange={(e) => handleUpdate(point._id, 'review_date', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <textarea
                                                value={point.remarks || ''}
                                                onChange={(e) => handleUpdate(point._id, 'remarks', e.target.value)}
                                                onInput={autoResize}
                                                style={{ fieldSizing: 'content' }}
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={point.priority || 'Medium'}
                                                onChange={(e) => handleUpdate(point._id, 'priority', e.target.value)}
                                            >
                                                <option value="Emergency">Emergency</option>
                                                <option value="High">High</option>
                                                <option value="Medium">Medium</option>
                                                <option value="Low">Low</option>
                                            </select>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                {modifiedPoints.has(point._id) && (
                                                    <button
                                                        className="btn btn-sm btn-success"
                                                        style={{ padding: '3px 8px', fontSize: '11px' }}
                                                        onClick={() => handleSaveRow(point._id)}
                                                        title="Save Changes"
                                                    >
                                                        ✔️ Save
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    style={{ padding: '3px 8px', fontSize: '11px' }}
                                                    onClick={() => handleGoToProject(point.project_id?._id || point.project_id)}
                                                    title="Open Project"
                                                >
                                                    📂
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Custom Dialog */}
            {dialogConfig.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', minWidth: '350px', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <h4 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '1.25rem' }}>{dialogConfig.title}</h4>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', lineHeight: '1.5' }}>{dialogConfig.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            {dialogConfig.type === 'confirm' && (
                                <button onClick={closeDialog} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'transparent', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                            )}
                            <button onClick={() => {
                                if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                                closeDialog();
                            }} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyOpenPoints;
