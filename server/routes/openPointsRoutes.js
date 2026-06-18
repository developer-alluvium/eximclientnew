import express from "express";
import OpenPointProject from "../models/openPoints/openPointProjectModel.js";
import OpenPoint from "../models/openPoints/openPointModel.js";
import UserModel from "../models/eximclientUserModel.js";
import mongoose from "mongoose";
import { authenticateUser } from "../middlewares/authMiddleware.js";

// Dummy audit trail middleware since it is not present in the main project
const auditMiddleware = (documentType) => (req, res, next) => next();

const router = express.Router();

// Helper to generate initials from a name
function generateInitials(name) {
    if (!name) return "OP";
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, ""); // Keep alphanumeric and spaces
    const words = cleanName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 1) {
        return words[0].substring(0, 3).toUpperCase();
    }
    // Take first letter of each word
    let initials = words.map(w => w[0]).join("").toUpperCase();
    if (initials.length < 2) {
        initials = words[0].substring(0, 3).toUpperCase();
    }
    return initials;
}

// Helper to get a unique initials string across all projects
async function getUniqueInitials(projectName, projectId = null) {
    let baseInitials = generateInitials(projectName);
    let initials = baseInitials;
    let counter = 1;
    while (true) {
        const query = { initials };
        if (projectId) {
            query._id = { $ne: projectId };
        }
        const existing = await OpenPointProject.findOne(query);
        if (!existing) {
            return initials;
        }
        counter++;
        initials = `${baseInitials}${counter}`;
    }
}

// Middleware to verify if user is part of the project
const verifyProjectAccess = async (req, res, next) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const project = await OpenPointProject.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        const isOwner = project.owner.toString() === userId.toString();
        const isMember = project.team_members.some(m => m.user.toString() === userId.toString());

        if (!isOwner && !isMember) {
            return res.status(403).json({ error: "Access Denied: You are not part of this project" });
        }

        req.project = project;
        req.userRole = isOwner ? 'L4' : project.team_members.find(m => m.user.toString() === userId.toString())?.role;
        next();
    } catch (error) {
        console.error("Access Verify Error", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// --- Custom Endpoint to Fetch All Users for Autocompletion ---
router.get("/api/get-all-users", authenticateUser, async (req, res) => {
    try {
        let query = { isActive: true };

        // If the logged-in user is an admin, only return users assigned to them
        if (req.user.role === 'admin') {
            query.adminId = req.user._id;
        } 
        // If the logged-in user is a standard user, only return users assigned to their admin
        else if (req.user.role === 'user') {
            const adminId = req.user.adminId?._id || req.user.adminId;
            if (adminId) {
                query.adminId = adminId;
            } else {
                // If standard user has no admin, restrict them to seeing nobody (or just themselves?)
                query.adminId = new mongoose.Types.ObjectId();
            }
        }

        const users = await UserModel.find(query).select('name email role adminId');
        const mappedUsers = users.map(user => ({
            _id: user._id,
            username: user.email, // map email to username
            first_name: user.name ? user.name.split(" ")[0] : "",
            last_name: user.name ? user.name.split(" ").slice(1).join(" ") : "",
            email: user.email,
            role: user.role
        }));
        res.json(mappedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Projects ---

// Create Project
router.post("/api/open-points/projects", authenticateUser, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { name, description, ownerUsername, team_members } = req.body;

        if (!ownerUsername) {
            console.error("Missing ownerUsername in request");
            return res.status(400).json({ error: "Owner username is required." });
        }

        // Look up user by email (mapped to ownerUsername)
        const owner = await UserModel.findOne({ email: ownerUsername });
        if (!owner) {
            return res.status(404).json({ error: "Owner user not found" });
        }

        const initials = await getUniqueInitials(name);
        const project = new OpenPointProject({
            name,
            initials,
            description,
            owner: owner._id,
            team_members
        });
        await project.save();
        res.status(201).json(project);
    } catch (error) {
        console.error("Create Project Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Update Project Details (Name, Description) - Owner Only
router.put("/api/open-points/projects/:projectId", authenticateUser, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description } = req.body;
        const requesterId = req.user._id;

        if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

        const project = await OpenPointProject.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Only owner can update project details
        if (project.owner.toString() !== requesterId.toString()) {
            return res.status(403).json({ error: "Access Denied: Only the project owner can update project details" });
        }

        if (name) project.name = name;
        if (description !== undefined) project.description = description;

        await project.save();
        res.json(project);
    } catch (error) {
        console.error("Update Project Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Project (Owner Only)
router.delete("/api/open-points/projects/:projectId", authenticateUser, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const project = await OpenPointProject.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Check ownership
        if (project.owner.toString() !== userId.toString()) {
            return res.status(403).json({ error: "Access Denied: Only the project owner can delete this project" });
        }

        // Delete associated points first
        await OpenPoint.deleteMany({ project_id: projectId });

        // Delete the project
        await OpenPointProject.findByIdAndDelete(projectId);

        res.json({ message: "Project and all associated points deleted successfully" });
    } catch (error) {
        console.error("Delete Project Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Add Member to Project (and auto-assign Open Points module)
router.post("/api/open-points/project/:projectId/add-member", authenticateUser, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { username, role } = req.body;
        const project = await OpenPointProject.findById(req.params.projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Search by email because username is mapped to email in headers
        const user = await UserModel.findOne({ email: username });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Check if already member
        const isMember = project.team_members.some(m => m.user.toString() === user._id.toString());
        if (isMember) return res.status(400).json({ error: "User is already a member" });

        // Add to Project
        project.team_members.push({
            user: user._id,
            role: role || 'L2',
            added_at: new Date()
        });
        await project.save();

        // Auto-assign "/open-points" module if not present
        if (!user.assignedModules) user.assignedModules = [];
        if (!user.assignedModules.includes('/open-points')) {
            user.assignedModules.push('/open-points');
            await user.save();
        }

        res.json({ message: "Member added and module assigned", project });
    } catch (error) {
        console.error("Add Member Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Remove Member from Project (Owner only)
router.post("/api/open-points/project/:projectId/remove-member", authenticateUser, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { username, userId } = req.body;
        const project = await OpenPointProject.findById(req.params.projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        // requester must be owner
        const requesterId = req.user._id;
        if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
        if (project.owner.toString() !== requesterId.toString()) return res.status(403).json({ error: "Only project owner can remove members" });

        // find user by email (mapped to username) or id
        let user = null;
        if (username) user = await UserModel.findOne({ email: username });
        else if (userId) user = await UserModel.findById(userId);

        if (!user) return res.status(404).json({ error: "User not found" });

        // Prevent removing owner
        if (project.owner.toString() === user._id.toString()) return res.status(400).json({ error: "Cannot remove project owner" });

        // Remove from team_members
        const before = project.team_members.length;
        project.team_members = project.team_members.filter(m => m.user.toString() !== user._id.toString());
        if (project.team_members.length === before) return res.status(400).json({ error: "User is not a member" });

        await project.save();
        res.json({ message: "Member removed", project });
    } catch (error) {
        console.error("Remove Member Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get My Projects
router.get("/api/open-points/my-projects", authenticateUser, async (req, res) => {
    try {
        const username = req.user.email; // Map user email as username

        if (!username) {
            return res.status(401).json({ error: "Email not found in session" });
        }

        // Look up user by email
        const user = await UserModel.findOne({ email: username });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const projects = await OpenPointProject.find({
            $or: [
                { owner: user._id },
                { "team_members.user": user._id }
            ]
        }).populate('owner', 'email username').populate('team_members.user', 'email username name first_name last_name');

        // Calculate health stats for each project
        const projectStats = await Promise.all(projects.map(async (p) => {
            const points = await OpenPoint.find({ project_id: p._id });

            // Project Stats
            const red = points.filter(pt => pt.status === 'Red').length;
            const yellow = points.filter(pt => pt.status === 'Yellow').length;
            const orange = points.filter(pt => pt.status === 'Orange').length;
            const green = points.filter(pt => pt.status === 'Green').length;

            // My Stats (Assigned to me)
            const myPoints = points.filter(pt => pt.responsible_person && pt.responsible_person.toString() === user._id.toString());
            const myRed = myPoints.filter(pt => pt.status === 'Red').length;
            const myYellow = myPoints.filter(pt => pt.status === 'Yellow').length;
            const myOrange = myPoints.filter(pt => pt.status === 'Orange').length;
            const myGreen = myPoints.filter(pt => pt.status === 'Green').length;

            return {
                ...p.toObject(),
                stats: { red, yellow, orange, green, total: points.length },
                myStats: { red: myRed, yellow: myYellow, orange: myOrange, green: myGreen, total: myPoints.length }
            };
        }));

        res.json(projectStats);
    } catch (error) {
        console.error("Get My Projects Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Points ---

// Get Project Details (including team members)
router.get("/api/open-points/project/:projectId", authenticateUser, verifyProjectAccess, async (req, res) => {
    try {
        const project = await OpenPointProject.findById(req.params.projectId)
            .populate('owner', 'email username name first_name last_name')
            .populate('team_members.user', 'email username name first_name last_name');

        if (!project) return res.status(404).json({ error: "Project not found" });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Points for Project
router.get("/api/open-points/project/:projectId/points", authenticateUser, verifyProjectAccess, async (req, res) => {
    try {
        // Auto-update overdue points (target_date BEFORE today's date)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        await OpenPoint.updateMany({
            project_id: req.params.projectId,
            status: { $nin: ['Green', 'Yellow', 'Orange'] },
            target_date: { $lt: today }
        }, {
            $set: { status: 'Red' }
        });

        const points = await OpenPoint.find({ project_id: req.params.projectId })
            .populate('responsible_person', 'email username name first_name last_name')
            .populate('reviewer', 'email username name first_name last_name')
            .populate('created_by', 'email username name first_name last_name')
            .populate({
                path: 'project_id',
                select: 'owner',
                populate: { path: 'owner', select: 'email username name first_name last_name' }
            })
            .sort({ status: 1, target_date: 1 });

        // Transform to apply fallback for created_by
        const transformedPoints = points.map(p => {
            const pointObj = p.toObject();
            if (!pointObj.created_by && pointObj.project_id?.owner) {
                pointObj.created_by = pointObj.project_id.owner;
            }
            return pointObj;
        });

        res.json(transformedPoints);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Point
router.post("/api/open-points/points", authenticateUser, auditMiddleware("OpenPoint"), async (req, res) => {
    try {
        const pointData = { ...req.body };

        // Server-side fallback: If responsibility text is missing but ID is present, fetch it.
        if (!pointData.responsibility && pointData.responsible_person) {
            try {
                const user = await UserModel.findById(pointData.responsible_person);
                if (user) {
                    pointData.responsibility = user.email; // Use email as username/responsibility
                }
            } catch (err) {
                console.error("Failed to auto-fill responsibility", err);
            }
        }

        pointData.created_by = req.user._id;

        // Fetch project and generate initials if missing
        const project = await OpenPointProject.findById(pointData.project_id);
        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.initials) {
            project.initials = await getUniqueInitials(project.name);
            await project.save();
        }

        // Find highest seq_id inside this project to calculate next sequence ID
        const lastPoint = await OpenPoint.findOne({ project_id: project._id }).sort({ seq_id: -1 });
        const nextSeqId = lastPoint && lastPoint.seq_id ? lastPoint.seq_id + 1 : 1;

        pointData.seq_id = nextSeqId;
        pointData.unique_id = `${project.initials}-${nextSeqId}`;

        const point = new OpenPoint(pointData);
        let savedPoint = await point.save();

        // Populate created_by to return user details immediately
        savedPoint = await OpenPoint.findById(savedPoint._id).populate('created_by', 'email username name first_name last_name');

        res.status(201).json(savedPoint);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Point (Generic)
router.put("/api/open-points/points/:pointId", authenticateUser, auditMiddleware("OpenPoint"), async (req, res) => {
    try {
        const { status, remarks, evidence, userId: bodyUserId, ...otherFields } = req.body;
        const userId = req.user._id;
        const point = await OpenPoint.findById(req.params.pointId).populate('project_id');

        if (!point) return res.status(404).json({ error: "Point not found" });

        // Permission Check for Target Date
        if (otherFields.target_date) {
            const project = point.project_id;
            if (project) { // Check if project exists (defensive)
                if (project.owner.toString() !== userId.toString()) {
                    const oldDate = point.target_date ? new Date(point.target_date).toISOString().split('T')[0] : '';
                    const newDate = new Date(otherFields.target_date).toISOString().split('T')[0];
                    if (oldDate !== newDate) {
                        return res.status(403).json({ error: "Access Denied: Only the project owner can modify target dates." });
                    }
                }
            }
        }

        // 1. Handle Status Change Logic
        if (status && status !== point.status) {
            point.status = status;
            if (status === 'Green') {
                point.completion_date = new Date();
            } else {
                point.completion_date = null;
            }

            point.history.push({
                action: `Status changed to ${status}`,
                changed_by: userId || null, // Ensure not undefined
                remarks: remarks || "",
                timestamp: new Date()
            });
        }

        // Handle Remarks persistence
        if (remarks !== undefined) {
            point.remarks = remarks;
        }

        // 2. Handle Evidence Update
        if (evidence && evidence.length > 0) {
            point.evidence = [...point.evidence, ...evidence];
        }

        // 3. Handle Other Fields (Excel Inline Edits)
        const allowedUpdates = ['title', 'responsibility', 'level', 'gap_action', 'review_date', 'priority', 'target_date', 'department', 'responsible_person', 'reviewer'];

        Object.keys(otherFields).forEach(key => {
            if (allowedUpdates.includes(key)) {
                // Special handling for empty strings on ObjectId fields to avoid CastError
                if ((key === 'responsible_person' || key === 'reviewer') && otherFields[key] === "") {
                    point[key] = null;
                } else {
                    point[key] = otherFields[key];
                }
            }
        });

        await point.save();
        res.json(point);
    } catch (error) {
        console.error("Update Point Error", error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Point
router.delete("/api/open-points/points/:pointId", authenticateUser, auditMiddleware("OpenPoint"), async (req, res) => {
    try {
        const point = await OpenPoint.findByIdAndDelete(req.params.pointId);
        if (!point) return res.status(404).json({ error: "Point not found" });
        res.json({ message: "Point deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analytics Endpoint
router.get("/api/open-points/analytics/global", authenticateUser, async (req, res) => {
    try {
        const userId = req.user._id;

        // Find projects user has access to
        const projects = await OpenPointProject.distinct('_id', {
            $or: [
                { owner: userId },
                { "team_members.user": userId }
            ]
        });

        const stats = await OpenPoint.aggregate([
            { $match: { project_id: { $in: projects } } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Assignment Endpoints ---

// Get All Project Names (for Assignment UI)
router.get("/api/open-points/all-project-names", async (req, res) => {
    try {
        const projects = await OpenPointProject.find({}, 'name');
        res.json(projects.map(p => p.name).sort());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get User's Assigned Project Names
router.get("/api/open-points/user/:username/assigned-projects", async (req, res) => {
    try {
        const user = await UserModel.findOne({ email: req.params.username });
        if (!user) return res.status(404).json({ error: "User not found" });

        const projects = await OpenPointProject.find({
            $or: [
                { owner: user._id },
                { "team_members.user": user._id }
            ]
        }, 'name');
        res.json(projects.map(p => p.name).sort());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Assign Projects to User (Bulk Update)
router.post("/api/open-points/user/:username/assign-projects", authenticateUser, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { projectNames } = req.body; // Array of strings
        const user = await UserModel.findOne({ email: req.params.username });
        if (!user) return res.status(404).json({ error: "User not found" });

        // Remove user from ALL projects first (only from team_members)
        await OpenPointProject.updateMany(
            { "team_members.user": user._id },
            { $pull: { team_members: { user: user._id } } }
        );

        // Add user to the projects in the list
        if (projectNames && projectNames.length > 0) {
            await OpenPointProject.updateMany(
                { name: { $in: projectNames } },
                {
                    $addToSet: {
                        team_members: {
                            user: user._id,
                            role: 'L2', // Default role
                            added_at: new Date()
                        }
                    }
                }
            );
        }

        res.json({ message: "Projects assigned successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Open Points Assigned to Me (Across All Projects)
router.get("/api/open-points/my-assigned-points", authenticateUser, async (req, res) => {
    try {
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({ error: "User identification not provided" });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Auto-update overdue points
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await OpenPoint.updateMany({
            responsible_person: user._id,
            status: { $nin: ['Green', 'Yellow', 'Orange'] },
            target_date: { $lt: today }
        }, {
            $set: { status: 'Red' }
        });

        // Find all open points assigned to this user
        const points = await OpenPoint.find({ responsible_person: user._id })
            .populate({
                path: 'project_id',
                select: 'name owner',
                populate: { path: 'owner', select: 'email username name first_name last_name' }
            })
            .populate('responsible_person', 'email username name first_name last_name')
            .populate('reviewer', 'email username name first_name last_name')
            .populate('created_by', 'email username name first_name last_name')
            .sort({ status: 1, target_date: 1 });

        // Transform to include project name and fallback for created_by
        const transformedPoints = points.map(p => {
            const pointObj = p.toObject();
            if (!pointObj.created_by && pointObj.project_id?.owner) {
                pointObj.created_by = pointObj.project_id.owner;
            }
            return {
                ...pointObj,
                project_name: p.project_id?.name || 'Unknown Project'
            };
        });

        res.json(transformedPoints);
    } catch (error) {
        console.error("Get My Assigned Points Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get pending points count for current user (Red, Yellow, Orange)
router.get("/api/open-points/my-pending-count", authenticateUser, async (req, res) => {
    try {
        const authUserId = req.user._id;

        if (!authUserId) {
            return res.status(401).json({ error: "User identification not provided" });
        }

        const user = await UserModel.findById(authUserId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Run same auto-update logic
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await OpenPoint.updateMany({
            responsible_person: user._id,
            status: { $nin: ['Green', 'Yellow', 'Orange'] },
            target_date: { $lt: today }
        }, {
            $set: { status: 'Red' }
        });

        // Count pending points
        const count = await OpenPoint.countDocuments({
            responsible_person: user._id,
            status: { $nin: ['Green', 'Orange'] }
        });

        res.json({ count });
    } catch (error) {
        console.error("Get Pending Count Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get points I assigned to others
router.get("/api/open-points/my-assigned-to-others-points", authenticateUser, async (req, res) => {
    try {
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({ error: "User identification not provided" });
        }

        const myOwnedProjectIds = await OpenPointProject.find({ owner: userId }).distinct('_id');

        const points = await OpenPoint.find({
            $or: [
                { created_by: userId },
                {
                    $and: [
                        { created_by: { $exists: false } },
                        { project_id: { $in: myOwnedProjectIds } }
                    ]
                },
                {
                    $and: [
                        { created_by: null },
                        { project_id: { $in: myOwnedProjectIds } }
                    ]
                }
            ],
            responsible_person: { $ne: userId }
        })
            .populate({
                path: 'project_id',
                select: 'name owner',
                populate: { path: 'owner', select: 'email username name first_name last_name' }
            })
            .populate('responsible_person', 'email username name first_name last_name')
            .populate('reviewer', 'email username name first_name last_name')
            .populate('created_by', 'email username name first_name last_name')
            .sort({ status: 1, target_date: 1 });

        const transformedPoints = points.map(p => {
            const pointObj = p.toObject();
            if (!pointObj.created_by && pointObj.project_id?.owner) {
                pointObj.created_by = pointObj.project_id.owner;
            }
            return {
                ...pointObj,
                project_name: p.project_id?.name || 'Unknown Project'
            };
        });

        res.json(transformedPoints);
    } catch (error) {
        console.error("Get Points I Assigned Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get Open Points for a Specific User by Username (for profile/admin view)
router.get("/api/open-points/user/:username/points", authenticateUser, async (req, res) => {
    try {
        const { username } = req.params;

        const targetUser = await UserModel.findOne({ email: username });
        if (!targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await OpenPoint.updateMany({
            responsible_person: targetUser._id,
            status: { $nin: ['Green', 'Yellow', 'Orange'] },
            target_date: { $lt: today }
        }, {
            $set: { status: 'Red' }
        });

        const points = await OpenPoint.find({ responsible_person: targetUser._id })
            .populate({
                path: 'project_id',
                select: 'name owner',
                populate: { path: 'owner', select: 'email username name first_name last_name' }
            })
            .populate('responsible_person', 'email username name first_name last_name')
            .populate('reviewer', 'email username name first_name last_name')
            .populate('created_by', 'email username name first_name last_name')
            .sort({ status: 1, target_date: 1 });

        res.json({
            points: points.map(p => {
                const pointObj = p.toObject();
                if (!pointObj.created_by && pointObj.project_id?.owner) {
                    pointObj.created_by = pointObj.project_id.owner;
                }
                return {
                    ...pointObj,
                    project_name: p.project_id?.name || 'Unknown Project'
                };
            }),
            userInfo: {
                _id: targetUser._id,
                username: targetUser.email,
                first_name: targetUser.name ? targetUser.name.split(" ")[0] : "",
                last_name: targetUser.name ? targetUser.name.split(" ").slice(1).join(" ") : ""
            }
        });
    } catch (error) {
        console.error("Get User Open Points Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Stubbed/Bypassed Pulse Teams Route
router.get("/api/open-points/pulse/teams", authenticateUser, async (req, res) => {
    res.json({ success: true, teams: [] });
});

// Get search suggestions for unique IDs or titles
router.get("/api/open-points/suggestions", authenticateUser, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) {
            return res.json([]);
        }

        const userId = req.user._id;
        const projects = await OpenPointProject.distinct('_id', {
            $or: [
                { owner: userId },
                { "team_members.user": userId }
            ]
        });

        const points = await OpenPoint.find({
            project_id: { $in: projects },
            $or: [
                { unique_id: { $regex: new RegExp(q.trim(), "i") } },
                { title: { $regex: new RegExp(q.trim(), "i") } }
            ]
        })
        .select('unique_id title project_id')
        .limit(10);

        res.json(points);
    } catch (error) {
        console.error("Suggestions error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Search open point by unique ID globally
router.get("/api/open-points/search/:uniqueId", authenticateUser, async (req, res) => {
    try {
        const { uniqueId } = req.params;
        if (!uniqueId) {
            return res.status(400).json({ error: "Unique ID is required" });
        }

        const point = await OpenPoint.findOne({
            unique_id: { $regex: new RegExp(`^${uniqueId.trim()}$`, "i") }
        });

        if (!point) {
            return res.status(404).json({ error: `Open Point with ID "${uniqueId}" not found.` });
        }

        res.json({
            found: true,
            pointId: point._id,
            projectId: point.project_id
        });
    } catch (error) {
        console.error("Global search error:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
