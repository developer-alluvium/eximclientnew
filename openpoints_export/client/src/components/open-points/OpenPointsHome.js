
import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { fetchMyProjects, createProject, updateProject } from '../../services/openPointsService';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../contexts/UserContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import '../../styles/openPoints.scss';

const ITEMS_PER_PAGE = 12;
const LOAD_MORE_COUNT = 12;
const COLORS = {
    Red: '#ef4444',
    Yellow: '#eab308',
    Orange: '#f97316',
    Green: '#10b981'
};

const OpenPointsHome = () => {
    const { user } = useContext(UserContext);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
    const sentinelRef = useRef(null);

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '' });

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProject, setEditingProject] = useState({ id: '', name: '', description: '' });

    // Dialog State
    const [dialogConfig, setDialogConfig] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null });

    const navigate = useNavigate();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await fetchMyProjects();
            setProjects(data);
        } catch (error) {
            console.error("Failed to load projects", error);
        } finally {
            setLoading(false);
        }
    };

    const showDialog = (title, message, type = 'info', onConfirm = null) => {
        setDialogConfig({ open: true, title, message, type, onConfirm });
    };

    const closeDialog = () => {
        setDialogConfig({ ...dialogConfig, open: false });
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();

        if (!user?.username) {
            showDialog("Error", "User session not found. Please log in again.", "alert");
            return;
        }

        try {
            await createProject({
                ...newProject,
                ownerUsername: user.username,
                team_members: []
            });
            setShowCreateModal(false);
            setNewProject({ name: '', description: '' });
            loadProjects();
            showDialog("Success", "Project created successfully!", "alert");
        } catch (error) {
            console.error("Error creating project", error);
            showDialog("Error", "Failed to create project: " + (error.response?.data?.error || error.message), "alert");
        }
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        try {
            await updateProject(editingProject.id, {
                name: editingProject.name,
                description: editingProject.description
            });
            setShowEditModal(false);
            setEditingProject({ id: '', name: '', description: '' });
            loadProjects();
            showDialog("Success", "Project updated successfully!", "alert");
        } catch (error) {
            console.error("Error updating project", error);
            showDialog("Error", "Failed to update project: " + (error.response?.data?.error || error.message), "alert");
        }
    };

    // Filter & Infinite Scroll Logic
    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const visibleProjects = filteredProjects.slice(0, visibleCount);
    const hasMore = visibleCount < filteredProjects.length;

    // Reset visible count when search changes
    useEffect(() => {
        setVisibleCount(ITEMS_PER_PAGE);
    }, [searchTerm]);

    // IntersectionObserver sentinel callback
    const handleSentinel = useCallback((entries) => {
        if (entries[0].isIntersecting && hasMore) {
            setVisibleCount(prev => prev + LOAD_MORE_COUNT);
        }
    }, [hasMore]);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(handleSentinel, { threshold: 0.1 });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [handleSentinel]);

    const openEditModal = (e, project) => {
        e.stopPropagation();
        setEditingProject({ id: project._id, name: project.name, description: project.description });
        setShowEditModal(true);
    };

    const isAdmin = user?.role === 'Admin';

    const getInitials = (name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    // Analytics Data Calculation
    const getChartData = (type) => { // type = 'stats' | 'myStats'
        const red = projects.reduce((acc, p) => acc + (p[type]?.red || 0), 0);
        const yellow = projects.reduce((acc, p) => acc + (p[type]?.yellow || 0), 0);
        const orange = projects.reduce((acc, p) => acc + (p[type]?.orange || 0), 0);
        const green = projects.reduce((acc, p) => acc + (p[type]?.green || 0), 0);

        // Filter out zero values for cleaner chart
        const data = [
            { name: 'Overdue', value: red, color: COLORS.Red },
            { name: 'On Track', value: yellow, color: COLORS.Yellow },
            { name: 'Change Req', value: orange, color: COLORS.Orange },
            { name: 'Closed', value: green, color: COLORS.Green }
        ];
        return data.filter(d => d.value > 0);
    };

    const myTasksData = getChartData('myStats');
    const projectHealthData = getChartData('stats');

    const totalMyTasks = projects.reduce((acc, p) => acc + (p.myStats?.total || 0), 0);
    const totalMyPending = projects.reduce((acc, p) => acc + (p.myStats?.red || 0) + (p.myStats?.yellow || 0), 0);

    return (
        <div className="open-points-page" style={{
            width: '100%',
            minHeight: '100vh',
            background: '#ffffff',
            padding: '20px'
        }}>
            {/* Header Area */}
            <div style={{
                margin: '0 auto',
                padding: '20px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #1e40af, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            OpenPoints
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '5px' }}>Welcome back, {user?.username}!</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className="btn"
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)',
                                fontWeight: 600
                            }}
                            onClick={() => navigate('/open-points/my-points')}
                        >
                            📋 My Assigned Points
                        </button>
                        <button
                            className="btn"
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)',
                                fontWeight: 600
                            }}
                            onClick={() => navigate('/open-points/assigned-by-me')}
                        >
                            📤 Tasks I Assigned
                        </button>
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
                            onClick={() => setShowCreateModal(true)}
                        >
                            + Create New Project
                        </button>
                    </div>
                </div>

                {/* Analytics Section */}
                {!loading && projects.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                        {/* My Tasks Chart */}
                        <div className="glass-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '20px' }}>My Tasks Overview</h3>
                            {myTasksData.length > 0 ? (
                                <div style={{ height: '180px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={myTasksData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={40} outerRadius={60} paddingAngle={5}>
                                                {myTasksData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No assigned tasks yet</div>
                            )}
                        </div>

                        {/* Project Health Chart */}
                        <div className="glass-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '20px' }}>Projects Health</h3>
                            {projectHealthData.length > 0 ? (
                                <div style={{ height: '180px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={projectHealthData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={40} outerRadius={60} paddingAngle={5}>
                                                {projectHealthData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No data available</div>
                            )}
                        </div>

                        {/* Summary Stats */}
                        <div className="glass-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <h3 style={{ fontSize: '1.2rem', color: '#334155', marginBottom: '20px' }}>Quick Stats</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Total Projects</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{projects.length}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Assigned to Me</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{totalMyTasks}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>My Pending</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{totalMyPending}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <input
                        type="text"
                        placeholder="Search your projects..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); }}
                        style={{
                            width: '100%',
                            maxWidth: '300px',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            outline: 'none',
                            fontSize: '0.9rem',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                            background: '#ffffff'
                        }}
                    />
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                        <button
                            onClick={() => setViewMode('card')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'card' ? '#ffffff' : 'transparent',
                                color: viewMode === 'card' ? '#1e40af' : '#64748b',
                                cursor: 'pointer',
                                fontWeight: 600,
                                boxShadow: viewMode === 'card' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            🔲 Card
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                                color: viewMode === 'list' ? '#1e40af' : '#64748b',
                                cursor: 'pointer',
                                fontWeight: 600,
                                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            📜 List
                        </button>
                    </div>
                </div>

                {/* Projects Grid */}
                {loading ? <p style={{ textAlign: 'center', color: '#64748b' }}>Loading projects...</p> : (
                    <>
                        {projects.length === 0 ? (
                            <div style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>
                                <h3>No Projects Found</h3>
                                <p>You are not assigned to any project yet.</p>
                                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Create Your First Project</button>
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div style={{ textAlign: 'center', marginTop: '50px', color: '#64748b' }}>
                                <p>No projects match your search.</p>
                            </div>
                        ) : (
                            <>
                                {viewMode === 'card' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                                        {visibleProjects.map(project => (
                                            <div
                                                key={project._id}
                                                className="glass-card"
                                                onClick={() => navigate(`/open-points/project/${project._id}`)}
                                                style={{
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    background: 'rgba(255, 255, 255, 0.7)',
                                                    backdropFilter: 'blur(10px)',
                                                    borderRadius: '20px',
                                                    padding: '24px',
                                                    border: '1px solid rgba(255, 255, 255, 0.5)',
                                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.02)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                                    e.currentTarget.style.boxShadow = '0 20px 40px rgba(59, 130, 246, 0.15)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.02)';
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b', fontWeight: 700 }}>{project.name}</h3>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.75rem', background: project.owner?.username === user?.username ? '#dbeafe' : '#f1f5f9', color: project.owner?.username === user?.username ? '#1e40af' : '#64748b', padding: '6px 10px', borderRadius: '20px', fontWeight: 600 }}>
                                                            {project.owner?.username === user?.username ? 'Owner' : 'Member'}
                                                        </span>
                                                        {(project.owner?.username === user?.username || isAdmin) && (
                                                            <button
                                                                onClick={(e) => openEditModal(e, project)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    fontSize: '1.2rem',
                                                                    padding: '0 5px',
                                                                    color: '#64748b',
                                                                    transition: 'color 0.2s'
                                                                }}
                                                                title="Edit Project"
                                                                onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                                                                onMouseLeave={(e) => e.target.style.color = '#64748b'}
                                                            >
                                                                ✎
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '24px', flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: '40px' }}>
                                                    {project.description || 'No description provided.'}
                                                </p>

                                                {/* Progress Bar */}
                                                <div style={{ marginBottom: '24px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px', fontWeight: 600 }}>
                                                        <span style={{ color: '#64748b' }}>Completion</span>
                                                        <span style={{ color: '#3b82f6' }}>{Math.round((project.stats?.green / (project.stats?.total || 1)) * 100)}%</span>
                                                    </div>
                                                    <div style={{ height: '10px', width: '100%', background: '#f1f5f9', borderRadius: '5px', display: 'flex', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(project.stats?.green / project.stats?.total) * 100}%`, background: COLORS.Green }} />
                                                        <div style={{ width: `${(project.stats?.yellow / project.stats?.total) * 100}%`, background: COLORS.Yellow }} />
                                                        <div style={{ width: `${(project.stats?.orange / project.stats?.total) * 100}%`, background: COLORS.Orange }} />
                                                        <div style={{ width: `${(project.stats?.red / project.stats?.total) * 100}%`, background: COLORS.Red }} />
                                                    </div>
                                                </div>

                                                {/* Footer: Avatars & Badges */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                                    <div style={{ display: 'flex', marginLeft: '10px' }}>
                                                        {project.owner && (
                                                            <div
                                                                title={`Owner: ${project.owner.username}`}
                                                                style={{
                                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                                    background: '#3b82f6', color: 'white',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: '12px', fontWeight: 600, border: '2px solid white', marginLeft: '-10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                                }}>
                                                                {getInitials(project.owner.username)}
                                                            </div>
                                                        )}
                                                        {project.team_members && project.team_members.slice(0, 3).map((m, i) => (
                                                            <div
                                                                key={i}
                                                                title={`Member: ${m.user?.username}`}
                                                                style={{
                                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                                    background: '#94a3b8', color: 'white',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: '12px', fontWeight: 600, border: '2px solid white', marginLeft: '-10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                                }}>
                                                                {getInitials(m.user?.username)}
                                                            </div>
                                                        ))}
                                                        {project.team_members && project.team_members.length > 3 && (
                                                            <div
                                                                style={{
                                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                                    background: '#e2e8f0', color: '#64748b',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: '10px', fontWeight: 600, border: '2px solid white', marginLeft: '-10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                                }}>
                                                                +{project.team_members.length - 3}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* My Pending Badge */}
                                                    {(project.myStats?.red > 0 || project.myStats?.yellow > 0) && (
                                                        <span style={{
                                                            background: '#fee2e2', color: '#ef4444',
                                                            fontSize: '0.75rem', fontWeight: 700,
                                                            padding: '4px 12px', borderRadius: '12px'
                                                        }}>
                                                            {project.myStats.red + project.myStats.yellow} Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                <tr>
                                                    <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Project Name</th>
                                                    <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Owner</th>
                                                    <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Progress</th>
                                                    <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>My Tasks</th>
                                                    <th style={{ padding: '16px', textAlign: 'right', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visibleProjects.map(project => (
                                                    <tr 
                                                        key={project._id} 
                                                        onClick={() => navigate(`/open-points/project/${project._id}`)}
                                                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <td style={{ padding: '16px' }}>
                                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{project.name}</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.description}</div>
                                                        </td>
                                                        <td style={{ padding: '16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>
                                                                    {getInitials(project.owner?.username)}
                                                                </div>
                                                                <span style={{ fontSize: '0.9rem', color: '#475569' }}>{project.owner?.username}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px', width: '200px' }}>
                                                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                                                                {Math.round((project.stats?.green / (project.stats?.total || 1)) * 100)}%
                                                            </div>
                                                            <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                                                <div style={{ width: `${(project.stats?.green / project.stats?.total) * 100}%`, background: COLORS.Green }} />
                                                                <div style={{ width: `${(project.stats?.yellow / project.stats?.total) * 100}%`, background: COLORS.Yellow }} />
                                                                <div style={{ width: `${(project.stats?.orange / project.stats?.total) * 100}%`, background: COLORS.Orange }} />
                                                                <div style={{ width: `${(project.stats?.red / project.stats?.total) * 100}%`, background: COLORS.Red }} />
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px' }}>
                                                            {project.myStats?.total > 0 ? (
                                                                <span style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: '6px', background: (project.myStats.red + project.myStats.yellow > 0) ? '#fee2e2' : '#dcfce7', color: (project.myStats.red + project.myStats.yellow > 0) ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                                                    {project.myStats.red + project.myStats.yellow} / {project.myStats.total} Pending
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>-</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                                            {(project.owner?.username === user?.username || isAdmin) && (
                                                                <button
                                                                    onClick={(e) => openEditModal(e, project)}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: '1.1rem' }}
                                                                >
                                                                    ✎
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Infinite Scroll Sentinel */}
                                <div ref={sentinelRef} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>
                                    {hasMore && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                            <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                                            Loading more...
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Create Project Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ width: '450px', background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Create New Project</h3>
                        </div>
                        <div style={{ padding: '30px' }}>
                            <form onSubmit={handleCreateProject}>
                                <div className="mb-4">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Project Name</label>
                                    <input value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border 0.2s', fontSize: '1rem' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
                                </div>
                                <div className="mb-4">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Description</label>
                                    <textarea value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '120px', outline: 'none', transition: 'border 0.2s', fontSize: '1rem', resize: 'vertical' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', color: '#64748b', padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                    <button type="submit" style={{ background: '#3b82f6', color: 'white', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)' }}>Create Project</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Project Modal */}
            {showEditModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ width: '450px', background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Edit Project</h3>
                        </div>
                        <div style={{ padding: '30px' }}>
                            <form onSubmit={handleUpdateProject}>
                                <div className="mb-4">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Project Name</label>
                                    <input value={editingProject.name} onChange={e => setEditingProject({ ...editingProject, name: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', transition: 'border 0.2s', fontSize: '1rem' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
                                </div>
                                <div className="mb-4">
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>Description</label>
                                    <textarea value={editingProject.description} onChange={e => setEditingProject({ ...editingProject, description: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '120px', outline: 'none', transition: 'border 0.2s', fontSize: '1rem', resize: 'vertical' }} onFocus={(e) => e.target.style.borderColor = '#3b82f6'} onBlur={(e) => e.target.style.borderColor = '#cbd5e1'} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button type="button" onClick={() => setShowEditModal(false)} style={{ background: 'transparent', color: '#64748b', padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                    <button type="submit" style={{ background: '#3b82f6', color: 'white', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)' }}>Update Project</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
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

export default OpenPointsHome;
