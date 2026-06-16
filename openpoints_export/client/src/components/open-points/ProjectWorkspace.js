import React, { useEffect, useState, useContext } from 'react';
import { fetchProjectPoints, updatePointStatus, createOpenPoint, fetchProjectDetails, addProjectMember, fetchAllUsers, deleteOpenPoint, removeProjectMember, deleteProject, changeProjectOwner } from '../../services/openPointsService';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import '../../styles/openPoints.scss';

const ProjectWorkspace = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useContext(UserContext);
    const [points, setPoints] = useState([]);
    const [projectTeam, setProjectTeam] = useState([]); // Array of {user: {_id, username}, role}
    const [loading, setLoading] = useState(true);
    const [highlightedPointId, setHighlightedPointId] = useState(null);

    // Add Member State
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [allUsers, setAllUsers] = useState([]); // For autocomplete
    const [newMemberRole, setNewMemberRole] = useState('L1');
    const [accessDenied, setAccessDenied] = useState(false);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [showMemberSuggestions, setShowMemberSuggestions] = useState(false);

    // Summary Stats
    const [summary, setSummary] = useState([]);
    const [modifiedPoints, setModifiedPoints] = useState(new Set());
    const [projectName, setProjectName] = useState('');
    const [projectOwnerId, setProjectOwnerId] = useState(null);
    const [showLegend, setShowLegend] = useState(false);
    const [filters, setFilters] = useState({ status: '', priority: '', responsibility: '' });
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
    const [hideGreen, setHideGreen] = useState(true); // Hide completed points by default

    // Quick Add State (Row at bottom)
    const [newPoint, setNewPoint] = useState({
        title: '',
        responsibility: '',
        level: 'L2',
        gap_action: '',
        target_date: '',
        status: 'Red',
        review_date: '',
        remarks: '',
        priority: 'Low'
    });

    // Member Context Menu State
    const [memberMenu, setMemberMenu] = useState({ open: false, member: null, position: { x: 0, y: 0 } });

    // Custom Dialog State
    const [dialogConfig, setDialogConfig] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null });

    const showDialog = (title, message, type = 'info', onConfirm = null) => {
        setDialogConfig({ open: true, title, message, type, onConfirm });
    };

    const closeDialog = () => {
        setDialogConfig({ ...dialogConfig, open: false });
    };

    useEffect(() => {
        loadData();
    }, [projectId]);

    // Scroll to and highlight point if query param exists
    useEffect(() => {
        if (points.length > 0) {
            const queryParams = new URLSearchParams(location.search);
            const searchPointId = queryParams.get('searchPointId');
            if (searchPointId) {
                // Find point in the list
                const foundPoint = points.find(p => p._id === searchPointId);
                if (foundPoint) {
                    setHighlightedPointId(searchPointId);
                    
                    // Scroll to it after a short delay so the DOM has fully rendered
                    setTimeout(() => {
                        const rowElement = document.getElementById(`point-row-${searchPointId}`);
                        if (rowElement) {
                            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 500);

                    // Clear highlight after 5 seconds
                    setTimeout(() => {
                        setHighlightedPointId(null);
                    }, 5000);
                }
            }
        }
    }, [points, location.search]);

    // Re-calculate summary when team or points change to ensure names are up to date
    useEffect(() => {
        if (points.length > 0) {
            calculateSummary(points);
        }
    }, [projectTeam]);

    // Auto-resize textarea
    const autoResize = (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };



    const loadData = async () => {
        setLoading(true);

        // 1. Fetch Users (Critical for UI)
        try {
            const allUsersData = await fetchAllUsers();
            setAllUsers(allUsersData || []);
        } catch (err) {
            console.error('Failed to fetch all users', err);
            setAllUsers([]);
        }

        // 2. Fetch Project Data & Points
        try {
            // We use Promise.allSettled to allow partial failure
            const [pointsResult, projectResult] = await Promise.allSettled([
                fetchProjectPoints(projectId),
                fetchProjectDetails(projectId)
            ]);

            let deniedFlag = false;

            // Handle Points
            if (pointsResult.status === 'fulfilled') {
                // Sync responsibility from responsible_person object if available
                const processedPoints = pointsResult.value.map(p => {
                    const mapped = { ...p };
                    if (mapped.responsible_person && mapped.responsible_person.username) {
                        mapped.responsibility = mapped.responsible_person.username;
                    }
                    return mapped;
                });
                setPoints(processedPoints);
                calculateSummary(processedPoints);
            } else {
                console.error('Failed to fetch points', pointsResult.reason);
                if (pointsResult.reason?.response?.status === 403) {
                    deniedFlag = true;
                    setAccessDenied(true);
                }
            }

            // Handle Project Details
            if (projectResult.status === 'fulfilled') {
                const projectData = projectResult.value;
                setProjectName(projectData.name || '');
                setProjectOwnerId(projectData.owner._id || projectData.owner);

                // Build Team List
                const teamList = [];
                if (projectData.owner) {
                    const ownerName = projectData.owner.username || `User_${projectData.owner.toString().substring(0, 6)}`;
                    const ownerObj = projectData.owner;
                    const fName = ownerObj.first_name || '';
                    const lName = ownerObj.last_name || '';
                    const dName = (fName || lName) ? `${fName} ${lName}`.trim() : ownerName;

                    teamList.push({
                        _id: projectData.owner._id || projectData.owner,
                        username: ownerName,
                        displayName: dName,
                        role: 'Owner'
                    });
                }

                if (projectData.team_members && Array.isArray(projectData.team_members)) {
                    const members = projectData.team_members
                        .map(tm => {
                            if (!tm || !tm.user) return null;
                            const userObj = tm.user;

                            let userId = null;
                            let userName = null;

                            if (typeof userObj === 'string') {
                                userId = userObj;
                                userName = userObj;
                            } else if (userObj._id) {
                                userId = userObj._id;
                                userName = userObj.username || String(userObj._id).substring(0, 6);
                            } else if (userObj.$oid) {
                                userId = userObj.$oid;
                                userName = userObj.username || userObj.$oid;
                            } else if (typeof userObj.toString === 'function') {
                                userId = userObj.toString();
                                userName = userObj.username || userId;
                            } else {
                                userId = JSON.stringify(userObj);
                                userName = userObj.username || userId;
                            }

                            // Construct Display Name
                            const fName = userObj.first_name || '';
                            const lName = userObj.last_name || '';
                            const dName = (fName || lName) ? `${fName} ${lName}`.trim() : userName;

                            return {
                                _id: userId,
                                username: userName,
                                displayName: dName,
                                role: tm.role || 'L2'
                            };
                        })
                        .filter(m => m !== null);

                    teamList.push(...members);
                }
                setProjectTeam(teamList);

            } else {
                console.error('Failed to fetch project details', projectResult.reason);
                if (projectResult.reason?.response?.status === 403) {
                    deniedFlag = true;
                    setAccessDenied(true);
                }
            }

            // If access was denied and no team info is available, show current user as the owner in the team list
            if (deniedFlag && (!projectTeam || projectTeam.length === 0) && user) {
                setProjectTeam([{ _id: user._id, username: user.username, role: 'Owner' }]);
            }

        } catch (error) {
            console.error("Unexpected error in loadData", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateSummary = (data) => {
        const stats = {};
        data.forEach(p => {
            const rawPerson = p.responsibility || 'Unassigned';
            // lookup display name
            const member = projectTeam.find(m => m.username === rawPerson);
            const person = member ? (member.displayName || member.username) : rawPerson;

            if (!stats[person]) stats[person] = { total: 0, green: 0, yellow: 0, red: 0, orange: 0 };

            stats[person].total++;
            const status = p.status || 'Red';
            if (status === 'Green') stats[person].green++;
            else if (status === 'Yellow') stats[person].yellow++;
            else if (status === 'Red') stats[person].red++;
            else if (status === 'Orange') stats[person].orange++;
        });
        setSummary(Object.entries(stats).map(([name, stat]) => ({ name, ...stat })));
    };

    const handleUpdate = (pointId, field, value) => {
        // Update local state only
        const updatedPoints = points.map(p =>
            p._id === pointId ? { ...p, [field]: value } : p
        );
        setPoints(updatedPoints);
        calculateSummary(updatedPoints);

        // Track modification
        setModifiedPoints(prev => new Set(prev).add(pointId));
    };

    const handleDeleteRow = (pointId) => {
        showDialog("Confirm Delete", "Are you sure you want to delete this point?", "confirm", async () => {
            try {
                await deleteOpenPoint(pointId);
                const filteredPoints = points.filter(p => p._id !== pointId);
                setPoints(filteredPoints);
                calculateSummary(filteredPoints);
            } catch (error) {
                console.error("Delete failed", error);
                showDialog("Error", "Failed to delete point", "alert");
            }
        });
    };

    const validateFields = (data) => {
        const missing = [];
        if (!data.title || !data.title.trim()) missing.push("Discussion Points");
        if (!data.responsibility) missing.push("Responsibility");
        if (!data.level) missing.push("Approval Level");
        if (!data.target_date) missing.push("Target Date");
        if (!data.priority) missing.push("Priority");
        return missing;
    };

    const handleSaveRow = async (pointId) => {
        const point = points.find(p => p._id === pointId);
        if (!point) return;

        const missingFields = validateFields(point);
        if (missingFields.length > 0) {
            showDialog("Action Required", `Please explicitly provide the following details to proceed:\n\n• ${missingFields.join('\n• ')}`, "alert");
            return;
        }

        // Sync responsible_person ID if needed
        let responsibleId = point.responsible_person?._id || point.responsible_person;
        if (projectTeam) {
            if (!point.responsibility) {
                responsibleId = null;
            } else {
                const found = projectTeam.find(m => m.username === point.responsibility);
                if (found && found._id) responsibleId = found._id;
            }
        }

        const payload = {
            ...point, // Send all fields
            userId: user._id,
            responsible_person: responsibleId
        };

        // Clean up payload (remove populated objects if simple IDs needed, handled by backend usually, but let's be safe)
        if (payload.owner) delete payload.owner;

        try {
            await updatePointStatus(pointId, payload);
            showDialog("Success", "Saved successfully!", "alert");
            // Remove from modified set
            setModifiedPoints(prev => {
                const next = new Set(prev);
                next.delete(pointId);
                return next;
            });
        } catch (error) {
            console.error("Save failed", error);
            showDialog("Error", "Failed to save row", "alert");
        }
    };

    const handleQuickAdd = async (e) => {
        if (e.key === 'Enter') {
            createPoint();
        }
    };

    const createPoint = async () => {
        const missingFields = validateFields(newPoint);
        if (missingFields.length > 0) {
            showDialog("Action Required", `Please explicitly provide the following details before adding:\n\n• ${missingFields.join('\n• ')}`, "alert");
            return;
        }

        if (!newPoint.title) return; // Redundant but kept for safety

        try {
            // Build payload carefully: avoid sending empty date strings and map responsibility to user id
            const payload = {
                title: newPoint.title,
                project_id: projectId,
                level: newPoint.level,
                gap_action: newPoint.gap_action || '',
                status: newPoint.status || 'Red',
                remarks: newPoint.remarks || '',
                priority: newPoint.priority || 'Low',
                review_date: newPoint.review_date || ''
            };

            if (newPoint.target_date) {
                // ensure valid date
                payload.target_date = new Date(newPoint.target_date);
            }

            // Map responsibility username to member id if available
            if (newPoint.responsibility) {
                // ALWAYS send the text responsibility for immediate UI consistency
                payload.responsibility = newPoint.responsibility;

                const found = projectTeam.find(m => m.username === newPoint.responsibility);
                if (found && found._id) {
                    payload.responsible_person = found._id;
                }
            }

            console.log("Create Point Payload:", payload);

            // set reviewer to current user id when available
            if (user && (user._id || user.id || user.username)) {
                payload.reviewer = user._id || user.id || user.username;
            }

            await createOpenPoint(payload);
            // Reset and Reload
            setNewPoint({
                title: '', responsibility: '', level: 'L2', gap_action: '',
                target_date: '', status: 'Red', review_date: '', remarks: '', priority: 'Medium'
            });
            // Reload specific data to keep UI snappy
            const data = await fetchProjectPoints(projectId);
            // Sync responsibility from responsible_person object immediately
            const processedPoints = data.map(p => {
                const mapped = { ...p };
                if (mapped.responsible_person && mapped.responsible_person.username) {
                    mapped.responsibility = mapped.responsible_person.username;
                }
                return mapped;
            });
            setPoints(processedPoints);
            calculateSummary(processedPoints);
        } catch (error) {
            console.error(error);
            showDialog("Error", error.response?.data?.error || error.message || "Error creating point", "alert");
        }
    }

    const handleAddMember = async () => {
        try {
            await addProjectMember(projectId, newMemberName, newMemberRole);
            showDialog("Success", "Member added successfully!", "alert");
            showDialog("Success", "Member added successfully!", "alert");
            setNewMemberName('');
            setMemberSearchQuery('');
            setNewMemberRole('L1');
            setShowAddMember(false);
            loadData(); // Reload to update team list
        } catch (error) {
            showDialog("Error", error.response?.data?.error || "Failed to add member", "alert");
        }
    }

    const handleChangeOwner = () => {
        const { member } = memberMenu;
        if (!member) return;

        showDialog("Confirm Change Owner", `Are you sure you want to transfer ownership of this project to ${member.username}? You will become a regular team member.`, "confirm", async () => {
            try {
                await changeProjectOwner(projectId, member._id);
                showDialog("Success", "Project ownership transferred successfully", "alert");
                setMemberMenu({ ...memberMenu, open: false });
                loadData(); // reload to reflect changes
            } catch (error) {
                console.error("Change Owner Failed", error);
                showDialog("Error", error.response?.data?.error || "Failed to transfer ownership", "alert");
            }
        });
    };

    const handleRemoveMember = () => {
        const { member } = memberMenu;
        if (!member) return;

        showDialog(
            'Remove Member',
            `Are you sure you want to remove ${member.username} from the project?`,
            'confirm',
            async () => {
                try {
                    await removeProjectMember(projectId, member.username, member._id);
                    showDialog('Success', 'Member removed', 'alert');
                    setMemberMenu({ ...memberMenu, open: false });
                    setProjectTeam(prev => prev.filter(p => p._id !== member._id));
                } catch (err) {
                    console.error('Remove member failed', err);
                    showDialog('Error', err.response?.data?.error || 'Failed to remove member', 'alert');
                }
            }
        );
    };

    const handleDeleteProject = () => {
        showDialog("Confirm Delete", "Are you sure you want to delete this ENTIRE project? This cannot be undone.", "confirm", async () => {
            try {
                await deleteProject(projectId);
                showDialog("Success", "Project deleted successfully", "alert", () => {
                    navigate('/open-points');
                });
            } catch (error) {
                console.error("Delete Project Failed", error);
                showDialog("Error", error.response?.data?.error || "Failed to delete project", "alert");
            }
        });
    };

    if (loading) return <div>Loading Workspace...</div>;

    return (
        <div className="open-points-container" style={{ padding: '10px' }}>

            {/* Unified Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', background: '#f8fafc', padding: '10px 15px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: 0, fontWeight: '700', color: '#334155', fontSize: '1.25rem' }}>
                    <span style={{ fontWeight: '400', color: '#64748b', fontSize: '1rem', marginRight: '8px' }}>Project Title:</span>
                    {projectName || 'Project Workspace'}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Filters Group */}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Filters:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select className="form-control" style={{ width: '110px', height: '32px', fontSize: '12px', padding: '0 8px' }} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
                            <option value="">Status</option>
                            <option value="Red">Red</option>
                            <option value="Yellow">Yellow</option>
                            <option value="Green">Green</option>
                            <option value="Orange">Orange</option>
                        </select>
                        <select className="form-control" style={{ width: '110px', height: '32px', fontSize: '12px', padding: '0 8px' }} value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })}>
                            <option value="">Priority</option>
                            <option value="Emergency">Emergency</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <select className="form-control" style={{ width: '140px', height: '32px', fontSize: '12px', padding: '0 8px' }} value={filters.responsibility} onChange={e => setFilters({ ...filters, responsibility: e.target.value })}>
                            <option value="">Members</option>
                            {projectTeam.map(m => (
                                <option key={m._id} value={m.username}>{m.displayName || m.username}</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid #cbd5e1', paddingLeft: '8px', marginLeft: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Finished:</span>
                            <select 
                                className="form-control" 
                                style={{ width: '100px', height: '32px', fontSize: '12px', padding: '0 8px' }} 
                                value={monthFilter} 
                                onChange={e => {
                                    setMonthFilter(e.target.value);
                                    if (e.target.value) setHideGreen(false); // Auto show green if filtering by month
                                }}
                            >
                                <option value="">Any Month</option>
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                            <select 
                                className="form-control" 
                                style={{ width: '80px', height: '32px', fontSize: '12px', padding: '0 8px' }} 
                                value={yearFilter} 
                                onChange={e => setYearFilter(Number(e.target.value))}
                            >
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        {/* Toggle for showing/hiding completed points */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                className={`btn btn-sm ${hideGreen ? 'btn-success' : 'btn-secondary'}`}
                                style={{ fontSize: '12px', padding: '5px 12px', fontWeight: '500' }}
                                onClick={() => setHideGreen(!hideGreen)}
                                title={hideGreen ? 'Click to show completed points' : 'Click to hide completed points'}
                            >
                                {hideGreen ? `✅ Show Closed (${points.filter(p => p.status === 'Green').length})` : '✅ Hide Closed'}
                            </button>
                            {monthFilter && (
                                <span style={{ 
                                    fontSize: '12px', 
                                    fontWeight: 'bold', 
                                    background: '#dcfce7', 
                                    color: '#166534', 
                                    padding: '4px 10px', 
                                    borderRadius: '15px',
                                    border: '1px solid #bbf7d0'
                                }}>
                                    Completed: {
                                        points.filter(p => {
                                            if (p.status !== 'Green' || !p.completion_date) return false;
                                            const compDate = new Date(p.completion_date);
                                            return compDate.getMonth() + 1 === Number(monthFilter) && compDate.getFullYear() === Number(yearFilter);
                                        }).length
                                    }
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions Group */}
                    <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid #cbd5e1', paddingLeft: '15px', marginLeft: '5px' }}>
                        <button className="btn btn-sm btn-info" onClick={() => setShowLegend(true)} style={{ fontSize: '12px', padding: '5px 12px', fontWeight: '500' }}>
                            ℹ Legend
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={() => setShowAddMember(true)} style={{ fontSize: '12px', padding: '5px 12px', fontWeight: '500' }}>
                            + Add Member
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={handleDeleteProject} style={{ fontSize: '12px', padding: '5px 12px', fontWeight: '500' }}>
                            🗑️ Delete Project
                        </button>
                    </div>
                </div>
            </div>

            {/* Legend Modal */}
            {
                showLegend && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', maxWidth: '90%', maxHeight: '90%', overflow: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <h3>Status Legend</h3>
                                <button className="btn btn-sm btn-secondary" onClick={() => setShowLegend(false)}>Close</button>
                            </div>
                            <div style={{ display: 'grid', gap: '12px', minWidth: '300px' }}>
                                {/* Levels */}
                                <h5 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Levels</h5>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '40px', height: '24px', background: '#bef264', borderRadius: '4px', border: '1px solid #ddd' }}></div>
                                    <span><strong>L1</strong> - Employee</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '40px', height: '24px', background: '#22c55e', borderRadius: '4px', border: '1px solid #ddd' }}></div>
                                    <span><strong>L2</strong> - HoD</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '40px', height: '24px', background: '#0ea5e9', borderRadius: '4px', border: '1px solid #ddd' }}></div>
                                    <span><strong>L3</strong> - Stakeholder HoD</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '40px', height: '24px', background: '#94a3b8', borderRadius: '4px', border: '1px solid #ddd' }}></div>
                                    <span><strong>L4</strong> - MD/Chairman</span>
                                </div>

                                {/* Status */}
                                <h5 style={{ margin: '15px 0 5px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Status</h5>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '40px', height: '24px', background: '#ef4444', borderRadius: '4px', border: '1px solid #ddd' }}></div>
                                    <span><strong>Red</strong> - Not yet started</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '40px', height: '24px', background: '#eab308', borderRadius: '4px', border: '1px solid #ddd' }}></div>
                                    <span><strong>Yellow</strong> - In Progress</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '40px', height: '24px', background: '#f97316', borderRadius: '4px', border: '1px solid #ddd' }}></div>
                                    <span><strong>Orange</strong> - Change Request</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ width: '40px', height: '24px', background: '#22c55e', borderRadius: '4px', border: '1px solid #ddd' }}></div>
                                    <span><strong>Green</strong> - Completed</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showAddMember && (
                    <div style={{ marginBottom: '10px', padding: '10px', background: '#e0f2fe', borderRadius: '4px', display: 'flex', gap: '10px', alignItems: 'center', overflow: 'visible' }}>
                        <div style={{ position: 'relative', width: '250px' }}>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search user..."
                                value={memberSearchQuery}
                                onChange={(e) => {
                                    setMemberSearchQuery(e.target.value);
                                    setShowMemberSuggestions(true);
                                    setNewMemberName(''); // Reset selected if typing
                                }}
                                onFocus={() => setShowMemberSuggestions(true)}
                                style={{ width: '100%' }}
                            />
                            {showMemberSuggestions && memberSearchQuery && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: 'white', border: '1px solid #ddd', borderRadius: '4px',
                                    maxHeight: '200px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}>
                                    {allUsers.filter(u => {
                                        const search = memberSearchQuery.toLowerCase();
                                        const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
                                        const username = (u.username || '').toLowerCase();
                                        return name.includes(search) || username.includes(search);
                                    }).map((u, i) => {
                                        const displayName = (u.first_name || u.last_name) ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username;
                                        return (
                                            <div
                                                key={i}
                                                style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                                                className="hover:bg-gray-100"
                                                onClick={() => {
                                                    setNewMemberName(u.username);
                                                    setMemberSearchQuery(displayName);
                                                    setShowMemberSuggestions(false);
                                                }}
                                            >
                                                {displayName} <small style={{ color: '#666' }}>({u.username})</small>
                                            </div>
                                        );
                                    })}
                                    {allUsers.filter(u => {
                                        const search = memberSearchQuery.toLowerCase();
                                        const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
                                        const username = (u.username || '').toLowerCase();
                                        return name.includes(search) || username.includes(search);
                                    }).length === 0 && (
                                            <div style={{ padding: '8px', color: '#666', fontStyle: 'italic' }}>No users found</div>
                                        )}
                                </div>
                            )}
                        </div>
                        <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} className="form-control" style={{ maxWidth: '140px' }}>
                            <option value="L1">L1</option>
                            <option value="L2">L2</option>
                            <option value="L3">L3</option>
                            <option value="L4">L4</option>
                        </select>
                        <button className="btn btn-sm btn-primary" onClick={handleAddMember}>Add to Project</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => setShowAddMember(false)}>Cancel</button>
                    </div>
                )
            }

            {
                accessDenied && (
                    <div style={{ marginTop: 10, color: '#a00' }}>
                        Limited access: you cannot view full project details or points. If you created this project and still see this, try refreshing or re-logging. You can still add members below.
                    </div>
                )
            }

            {/* If access was denied but no team info is available, show current user as member so the UI reflects project ownership for the creator */}
            {
                accessDenied && projectTeam.length === 0 && user && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: '#f3f4f6', borderRadius: 8, display: 'inline-block' }}>
                        <strong>{user.username}</strong> <span style={{ color: '#666' }}>(You)</span>
                    </div>
                )
            }

            <div className="excel-table-container">
                <table className="excel-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>Sr. No</th>
                            <th style={{ width: '18%' }}>Discussion Points</th>
                            <th style={{ width: '100px' }}>Assigned By</th>
                            <th style={{ width: '120px' }}>Responsibility</th>
                            <th style={{ width: '80px' }}>Approval</th>
                            <th style={{ width: '20%' }}>Gap / Action Point</th>
                            <th style={{ width: '100px' }}>Target Date</th>
                            <th style={{ width: '140px' }}>Status</th>
                            <th style={{ width: '100px' }}>Review</th>
                            <th style={{ width: '15%' }}>Remarks</th>
                            <th style={{ width: '110px' }}>Priority</th>
                            <th style={{ width: '80px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {points.filter(p => {
                            // Always show points that are currently being edited (modified) so they can be saved
                            if (modifiedPoints.has(p._id)) return true;

                            if (filters.status && p.status !== filters.status) return false;
                            if (filters.priority && p.priority !== filters.priority) return false;
                            if (filters.responsibility && p.responsibility !== filters.responsibility) return false;

                            // Month/Year Filter (Applies to Green items only)
                            if (monthFilter) {
                                if (p.status !== 'Green') return false;
                                if (!p.completion_date) return false;
                                const compDate = new Date(p.completion_date);
                                if (compDate.getMonth() + 1 !== Number(monthFilter) || compDate.getFullYear() !== Number(yearFilter)) {
                                    return false;
                                }
                            }

                            // Hide green points by default unless toggle is off, specific status is selected, or month filter is on
                            if (hideGreen && !filters.status && !monthFilter && p.status === 'Green') return false;
                            return true;
                        }).map((point, index) => (
                            <tr 
                                key={point._id} 
                                id={`point-row-${point._id}`}
                                style={highlightedPointId === point._id ? { backgroundColor: '#fef08a', transition: 'background-color 0.5s ease', boxShadow: 'inset 0 0 10px rgba(234, 179, 8, 0.4)' } : {}}
                            >
                                <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '12px', color: '#1e293b' }}>
                                    {point.unique_id || index + 1}
                                </td>
                                <td>
                                    <textarea
                                        value={point.title || ''}
                                        onChange={(e) => handleUpdate(point._id, 'title', e.target.value)}
                                        onInput={autoResize}
                                        style={{ fieldSizing: 'content' }}
                                    />
                                </td>
                                <td style={{ fontSize: '12px', color: '#444' }}>
                                    {point.created_by ? (
                                        <div style={{ fontWeight: 600 }}>
                                            {point.created_by.first_name ? `${point.created_by.first_name} ${point.created_by.last_name || ''}` : point.created_by.username}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#999', fontStyle: 'italic' }}>-</span>
                                    )}
                                </td>
                                <td>
                                    <select
                                        value={point.responsibility || ''}
                                        onChange={(e) => handleUpdate(point._id, 'responsibility', e.target.value)}
                                    >
                                        <option value="">Select</option>
                                        {projectTeam.map(m => (
                                            <option key={m._id} value={m.username}>{m.displayName || m.username}</option>
                                        ))}
                                    </select>
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
                                        onChange={(e) => handleUpdate(point._id, 'target_date', e.target.value)}
                                        disabled={!user || !projectOwnerId || (user._id !== projectOwnerId && user._id !== projectOwnerId.toString())}
                                        title={(!user || !projectOwnerId || (user._id !== projectOwnerId && user._id !== projectOwnerId.toString())) ? "Only Project Owner can set Target Date" : ""}
                                    />
                                </td>

                                {/* Color Coded Status Cell */}
                                <td className={`status-cell-${point.status}`} style={{ position: 'relative', textAlign: 'center' }}>
                                    <select
                                        value={point.status || 'Red'}
                                        onChange={(e) => handleUpdate(point._id, 'status', e.target.value)}
                                        style={{ marginBottom: point.status === 'Green' ? '2px' : '0' }}
                                    >
                                        <option value="Red">Red</option>
                                        <option value="Yellow">Yellow</option>
                                        <option value="Green">Green</option>
                                        <option value="Orange">Orange</option>
                                    </select>
                                    {!point.completion_date && (
                                        <div style={{ 
                                            position: 'absolute', 
                                            top: '50%', 
                                            left: '50%', 
                                            transform: 'translate(-50%, -50%)',
                                            fontSize: '10px', 
                                            color: point.status === 'Red' ? 'white' : 'black', 
                                            pointerEvents: 'none',
                                            opacity: 0.7
                                        }}>
                                            ▼
                                        </div>
                                    )}
                                    {point.status === 'Green' && point.completion_date && (
                                        <div style={{ 
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            fontSize: '9px', 
                                            fontWeight: 'bold', 
                                            color: '#166534',
                                            lineHeight: '1',
                                            pointerEvents: 'none',
                                            width: '100%',
                                            textAlign: 'center'
                                        }}>
                                            {new Date(point.completion_date).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                        </div>
                                    )}
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
                                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                        {modifiedPoints.has(point._id) && (
                                            <button
                                                className="btn btn-sm btn-success"
                                                style={{ padding: '2px 6px', fontSize: '11px' }}
                                                onClick={() => handleSaveRow(point._id)}
                                                title="Save Changes"
                                            >
                                                ✔️
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-sm btn-danger"
                                            style={{ padding: '2px 6px', fontSize: '11px' }}
                                            onClick={() => handleDeleteRow(point._id)}
                                            title="Delete Point"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {/* Quick Add Row */}
                        <tr style={{ backgroundColor: '#f0f9ff' }}>
                            <td style={{ textAlign: 'center' }}>
                                <button className="btn btn-sm btn-primary" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={createPoint}>Add</button>
                            </td>
                            <td>
                                <textarea
                                    placeholder="Add new point..."
                                    value={newPoint.title}
                                    onChange={(e) => setNewPoint({ ...newPoint, title: e.target.value })}
                                    onInput={autoResize}
                                    style={{ fieldSizing: 'content' }}
                                />
                            </td>
                            <td></td>
                            <td>
                                <select
                                    value={newPoint.responsibility}
                                    onChange={(e) => setNewPoint({ ...newPoint, responsibility: e.target.value })}
                                >
                                    <option value="">Select</option>
                                    {projectTeam.map(m => (
                                        <option key={m._id} value={m.username}>{m.displayName || m.username}</option>
                                    ))}
                                </select>
                            </td>
                            <td>
                                <select
                                    value={newPoint.level}
                                    onChange={(e) => setNewPoint({ ...newPoint, level: e.target.value })}
                                >
                                    <option value="L2">L2</option>
                                    <option value="L3">L3</option>
                                    <option value="L4">L4</option>
                                    <option value="L5">L5</option>
                                </select>
                            </td>
                            <td>
                                <textarea
                                    placeholder="Gap / Action"
                                    value={newPoint.gap_action}
                                    onChange={(e) => setNewPoint({ ...newPoint, gap_action: e.target.value })}
                                    onInput={autoResize}
                                    style={{ fieldSizing: 'content' }}
                                />
                            </td>
                            <td>
                                <input
                                    type="date"
                                    value={newPoint.target_date}
                                    onChange={(e) => setNewPoint({ ...newPoint, target_date: e.target.value })}
                                />
                            </td>
                            <td>
                                <select
                                    value={newPoint.status}
                                    onChange={(e) => setNewPoint({ ...newPoint, status: e.target.value })}
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
                                    value={newPoint.review_date}
                                    onChange={(e) => setNewPoint({ ...newPoint, review_date: e.target.value })}
                                />
                            </td>
                            <td>
                                <textarea
                                    placeholder="Remarks"
                                    value={newPoint.remarks}
                                    onChange={(e) => setNewPoint({ ...newPoint, remarks: e.target.value })}
                                    onInput={autoResize}
                                    style={{ fieldSizing: 'content' }}
                                />
                            </td>
                            <td>
                                <select
                                    value={newPoint.priority}
                                    onChange={(e) => setNewPoint({ ...newPoint, priority: e.target.value })}
                                >
                                    <option value="Emergency">Emergency</option>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Summary Section */}
            <div className="summary-section">
                <div className="summary-header">Summary</div>
                <table className="summary-table">
                    <thead>
                        <tr style={{ backgroundColor: '#fff' }}>
                            <th>S.No</th>
                            <th>Responsible Person</th>
                            <th>Total Open Points</th>
                            <th className="header-green">Total Green Points [ Completed ]</th>
                            <th className="header-yellow">Total Yellow Points [ In Progress ]</th>
                            <th className="header-red">Total Red Points [ Not Started - Pending ]</th>
                            <th className="header-orange">Total Orange Points [ New Update ]</th>
                            <th>Total Yellow + Red Points + Orange</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map((stat, index) => (
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{stat.name}</td>
                                <td>{stat.total}</td>
                                <td>{stat.green}</td>
                                <td>{stat.yellow}</td>
                                <td>{stat.red}</td>
                                <td>{stat.orange}</td>
                                <td>{stat.yellow + stat.red + stat.orange}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Team Members Section */}
            <div className="summary-section" style={{ marginTop: '20px' }}>
                <div className="summary-header">Team Members</div>
                <div style={{ padding: '10px', border: '1px solid #ccc', background: 'white' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {projectTeam.map((member, index) => (
                            <div key={index} style={{
                                padding: '5px 10px',
                                background: member.role === 'Owner' ? '#e0f2fe' : '#f3f4f6',
                                borderRadius: '15px',
                                border: '1px solid #ddd',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <div>
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Open Context Menu
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setMemberMenu({
                                                open: true,
                                                member: member,
                                                position: { x: rect.left, bottom: window.innerHeight - rect.top + 5 }
                                            });
                                        }}
                                        style={{ cursor: 'pointer', textDecoration: 'underline', color: '#1e40af' }}
                                    >
                                        <strong>{member.displayName || member.username}</strong>
                                    </span>
                                    <span style={{ color: '#666', marginLeft: 6 }}>({member.role || 'Member'})</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom Dialog */}
            {dialogConfig.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', minWidth: '300px', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>{dialogConfig.title}</h4>
                        <p style={{ margin: '0 0 20px 0', color: '#475569' }}>{dialogConfig.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            {dialogConfig.type === 'confirm' && (
                                <button className="btn btn-secondary btn-sm" onClick={closeDialog}>Cancel</button>
                            )}
                            <button className="btn btn-primary btn-sm" onClick={() => {
                                if (dialogConfig.onConfirm) dialogConfig.onConfirm();
                                closeDialog();
                            }}>OK</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Action Menu */}
            {memberMenu.open && memberMenu.member && (
                <>
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100 }}
                        onClick={() => setMemberMenu({ ...memberMenu, open: false })}
                    />
                    <div style={{
                        position: 'fixed',
                        bottom: memberMenu.position.bottom,
                        left: memberMenu.position.x,
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        zIndex: 1200,
                        minWidth: '150px',
                        padding: '5px 0'
                    }}>
                        <div style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #eee', color: '#666' }}>
                            Action for <strong>{memberMenu.member.username}</strong>
                        </div>

                        {(projectTeam.find(m => m.username === memberMenu.member.username)?.role !== 'Owner') && (
                            <button
                                className="menu-item"
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#dc2626' }}
                                onClick={() => {
                                    handleRemoveMember();
                                    setMemberMenu({ ...memberMenu, open: false });
                                }}
                            >
                                🗑️ Remove Member
                            </button>
                        )}

                        <button
                            className="menu-item"
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', color: '#2563eb' }}
                            onClick={() => {
                                handleChangeOwner();
                                setMemberMenu({ ...memberMenu, open: false });
                            }}
                        >
                            👑 Make Owner
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProjectWorkspace;
