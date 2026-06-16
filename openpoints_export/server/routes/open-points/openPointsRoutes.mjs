
import express from "express";
import OpenPointProject from "../../model/openPoints/openPointProjectModel.mjs";
import OpenPoint from "../../model/openPoints/openPointModel.mjs";
import UserModel from "../../model/userModel.mjs";
import TeamModel from "../../model/teamModel.mjs";
import mongoose from "mongoose";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";

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
            // console.log("Debug Auth: Missing User ID");
            return res.status(401).json({ error: "Unauthorized" });
        }

        const project = await OpenPointProject.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        const isOwner = project.owner.toString() === userId;
        const isMember = project.team_members.some(m => m.user.toString() === userId);

        if (!isOwner && !isMember) {
            return res.status(403).json({ error: "Access Denied: You are not part of this project" });
        }

        req.project = project;
        req.userRole = isOwner ? 'L4' : project.team_members.find(m => m.user.toString() === userId)?.role;
        next();
    } catch (error) {
        console.error("Access Verify Error", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// --- Projects ---

// Create Project (L3/L4 Only - simplified to anyone for now, restrict in UI or added middleware)

// Create Project (L3/L4 Only - simplified to anyone for now, restrict in UI or added middleware)
router.post("/api/open-points/projects", authMiddleware, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        // console.log("Create Project Request Body:", req.body);
        const { name, description, ownerUsername, team_members } = req.body;

        if (!ownerUsername) {
            console.error("Missing ownerUsername in request");
            return res.status(400).json({ error: "Owner username is required." });
        }

        // Look up user by username
        const owner = await UserModel.findOne({ username: ownerUsername });
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
router.put("/api/open-points/projects/:projectId", authMiddleware, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description } = req.body;
        const requesterId = req.user._id;

        if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

        const project = await OpenPointProject.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Only owner can update project details
        if (project.owner.toString() !== requesterId) {
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
router.delete("/api/open-points/projects/:projectId", authMiddleware, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const project = await OpenPointProject.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Check ownership
        if (project.owner.toString() !== userId) {
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
router.post("/api/open-points/project/:projectId/add-member", authMiddleware, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { username, role } = req.body;
        const project = await OpenPointProject.findById(req.params.projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        const user = await UserModel.findOne({ username });
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

        // Auto-assign "Open Points" module if not present
        if (!user.access_modules) user.access_modules = [];
        if (!user.access_modules.includes('Open Points')) {
            user.access_modules.push('Open Points');
            await user.save();
        }

        res.json({ message: "Member added and module assigned", project });
    } catch (error) {
        console.error("Add Member Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Remove Member from Project (Owner only)
router.post("/api/open-points/project/:projectId/remove-member", authMiddleware, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { username, userId } = req.body;
        const project = await OpenPointProject.findById(req.params.projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        // requester must be owner
        const requesterId = req.user._id;
        if (!requesterId) return res.status(401).json({ error: "Unauthorized" });
        if (project.owner.toString() !== requesterId) return res.status(403).json({ error: "Only project owner can remove members" });

        // find user by username or id
        let user = null;
        if (username) user = await UserModel.findOne({ username });
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
router.get("/api/open-points/my-projects", authMiddleware, async (req, res) => {
    try {
        const username = req.user.username;

        if (!username) {
            return res.status(401).json({ error: "Username not provided in headers" });
        }

        // Look up user by username
        const user = await UserModel.findOne({ username });



        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const projects = await OpenPointProject.find({
            $or: [
                { owner: user._id },
                { "team_members.user": user._id }
            ]
        }).populate('owner', 'username').populate('team_members.user', 'username employee_photo first_name last_name');


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
router.get("/api/open-points/project/:projectId", authMiddleware, verifyProjectAccess, async (req, res) => {
    try {
        const project = await OpenPointProject.findById(req.params.projectId)
            .populate('owner', 'username first_name last_name')
            .populate('team_members.user', 'username email first_name last_name');

        if (!project) return res.status(404).json({ error: "Project not found" });
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Points for Project
router.get("/api/open-points/project/:projectId/points", authMiddleware, verifyProjectAccess, async (req, res) => {
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
            .populate('responsible_person', 'username first_name last_name')
            .populate('reviewer', 'username first_name last_name')
            .populate('created_by', 'username first_name last_name')
            .populate({
                path: 'project_id',
                select: 'owner',
                populate: { path: 'owner', select: 'username first_name last_name' }
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
router.post("/api/open-points/points", authMiddleware, auditMiddleware("OpenPoint"), async (req, res) => {
    try {
        const pointData = { ...req.body };

        // Server-side fallback: If responsibility text is missing but ID is present, fetch it.
        if (!pointData.responsibility && pointData.responsible_person) {
            try {
                const user = await UserModel.findById(pointData.responsible_person);
                if (user) {
                    pointData.responsibility = user.username;
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
        savedPoint = await OpenPoint.findById(savedPoint._id).populate('created_by', 'username first_name last_name');

        res.status(201).json(savedPoint);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Point (Generic)
router.put("/api/open-points/points/:pointId", authMiddleware, auditMiddleware("OpenPoint"), async (req, res) => {
    try {
        const { status, remarks, evidence, userId: bodyUserId, ...otherFields } = req.body;
        const userId = req.user._id;
        const point = await OpenPoint.findById(req.params.pointId).populate('project_id');

        if (!point) return res.status(404).json({ error: "Point not found" });

        // Permission Check for Target Date
        if (otherFields.target_date) {
            const project = point.project_id;
            if (project) { // Check if project exists (defensive)
                if (project.owner.toString() !== userId) {
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
        // Explicit allowed fields list to prevent overwriting with garbage
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

        // Return updated point
        res.json(point);

    } catch (error) {
        console.error("Update Point Error", error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Point
router.delete("/api/open-points/points/:pointId", authMiddleware, auditMiddleware("OpenPoint"), async (req, res) => {
    try {
        const point = await OpenPoint.findByIdAndDelete(req.params.pointId);
        if (!point) return res.status(404).json({ error: "Point not found" });
        res.json({ message: "Point deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analytics Endpoint
router.get("/api/open-points/analytics/global", authMiddleware, async (req, res) => {
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
        const user = await UserModel.findOne({ username: req.params.username });
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
router.post("/api/open-points/user/:username/assign-projects", authMiddleware, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { projectNames } = req.body; // Array of strings
        const user = await UserModel.findOne({ username: req.params.username });
        if (!user) return res.status(404).json({ error: "User not found" });

        // 1. Remove user from ALL projects first (to handle unassignment)
        // only remove from team_members, do NOT touch owner field
        await OpenPointProject.updateMany(
            { "team_members.user": user._id },
            { $pull: { team_members: { user: user._id } } }
        );

        // 2. Add user to the projects in the list
        if (projectNames && projectNames.length > 0) {
            await OpenPointProject.updateMany(
                { name: { $in: projectNames } },
                {
                    $addToSet: {
                        team_members: {
                            user: user._id,
                            role: 'L2', // Default role for assigned members
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
router.get("/api/open-points/my-assigned-points", authMiddleware, async (req, res) => {
    try {
        const username = req.user.username;
        const userId = req.user._id;

        if (!username && !userId) {
            return res.status(401).json({ error: "User identification not provided" });
        }

        // Find user
        let user = null;
        if (userId) {
            user = await UserModel.findById(userId);
        }
        if (!user && username) {
            user = await UserModel.findOne({ username });
        }

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Auto-update overdue points (target_date BEFORE today's date)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
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
                populate: { path: 'owner', select: 'username first_name last_name' }
            })
            .populate('responsible_person', 'username first_name last_name')
            .populate('reviewer', 'username first_name last_name')
            .populate('created_by', 'username first_name last_name')
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
router.get("/api/open-points/my-pending-count", authMiddleware, async (req, res) => {
    try {
        const { userId, username } = req.headers;
        const authUserId = req.user ? req.user._id : null;
        
        // Find user using same logic as my-assigned-points
        let user = null;
        if (authUserId) {
            user = await UserModel.findById(authUserId);
        } else if (userId) {
            user = await UserModel.findById(userId);
        }
        
        if (!user && username) {
            user = await UserModel.findOne({ username });
        }

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Run same auto-update logic to ensure status consistency
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await OpenPoint.updateMany({
            responsible_person: user._id,
            status: { $nin: ['Green', 'Yellow', 'Orange'] },
            target_date: { $lt: today }
        }, {
            $set: { status: 'Red' }
        });

        // Count pending points assigned to this user (excluding Green and Orange)
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
router.get("/api/open-points/my-assigned-to-others-points", authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({ error: "User identification not provided" });
        }

        // Find all projects owned by this user to use as fallback for historical tasks
        const myOwnedProjectIds = await OpenPointProject.find({ owner: userId }).distinct('_id');

        // Find all open points: 
        // 1. Created by me
        // 2. OR (Created By is null AND belongs to a project I own - fallback for historical data)
        // AND always excluding points assigned TO me (responsible_person === userId)
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
            responsible_person: { $ne: userId } // Exclude self-assignments
        })
            .populate({
                path: 'project_id',
                select: 'name owner',
                populate: { path: 'owner', select: 'username first_name last_name' }
            })
            .populate('responsible_person', 'username first_name last_name')
            .populate('reviewer', 'username first_name last_name')
            .populate('created_by', 'username first_name last_name')
            .sort({ status: 1, target_date: 1 });

        // Transform to include project name and fallback for created_by label
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
router.get("/api/open-points/user/:username/points", async (req, res) => {
    try {
        const { username } = req.params;

        // Find the target user
        const targetUser = await UserModel.findOne({ username });
        if (!targetUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Auto-update overdue points (target_date BEFORE today's date)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        await OpenPoint.updateMany({
            responsible_person: targetUser._id,
            status: { $nin: ['Green', 'Yellow', 'Orange'] },
            target_date: { $lt: today }
        }, {
            $set: { status: 'Red' }
        });

        // Find all open points assigned to this user
        const points = await OpenPoint.find({ responsible_person: targetUser._id })
            .populate({
                path: 'project_id',
                select: 'name owner',
                populate: { path: 'owner', select: 'username first_name last_name' }
            })
            .populate('responsible_person', 'username first_name last_name')
            .populate('reviewer', 'username first_name last_name')
            .populate('created_by', 'username first_name last_name')
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

        // Return points along with user info for proper name display
        res.json({
            points: transformedPoints,
            userInfo: {
                username: targetUser.username,
                first_name: targetUser.first_name,
                last_name: targetUser.last_name
            }
        });
    } catch (error) {
        console.error("Get User Open Points Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Change Project Owner
router.put("/api/open-points/projects/:projectId/change-owner", authMiddleware, auditMiddleware("OpenPointProject"), async (req, res) => {
    try {
        const { projectId } = req.params;
        const { newOwnerId } = req.body;
        const requesterId = req.user._id;

        if (!requesterId) return res.status(401).json({ error: "Unauthorized" });

        const project = await OpenPointProject.findById(projectId);
        if (!project) return res.status(404).json({ error: "Project not found" });

        // Only current owner can transfer ownership
        if (project.owner.toString() !== requesterId) {
            return res.status(403).json({ error: "Access Denied: Only the current project owner can transfer ownership" });
        }

        const newOwner = await UserModel.findById(newOwnerId);
        if (!newOwner) return res.status(404).json({ error: "New owner not found" });

        if (project.owner.toString() === newOwnerId.toString()) {
            return res.status(400).json({ error: "User is already the owner" });
        }

        const oldOwnerId = project.owner;

        // Add old owner to team members if not present
        if (!project.team_members.some(m => m.user.toString() === oldOwnerId.toString())) {
            project.team_members.push({
                user: oldOwnerId,
                role: 'L4', // Previous owner likely has high privileges
                added_at: new Date()
            });
        }

        // Remove new owner from team members if present
        project.team_members = project.team_members.filter(m => m.user.toString() !== newOwnerId.toString());

        // Set New Owner
        project.owner = newOwner._id;

        await project.save();

        res.json({ message: "Project ownership transferred successfully", project });

    } catch (error) {
        console.error("Change Owner Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Get Open Points counts grouped by teams and members for the Pulse Dashboard
router.get("/api/open-points/pulse/teams", authMiddleware, async (req, res) => {
    try {
        // Fetch all active teams
        const teams = await TeamModel.find({ isActive: { $ne: false } }).sort({ name: 1 });
        
        // Auto-add HOD to members if not already present (fixes old teams)
        for (const team of teams) {
            const hodInMembers = team.members.some(m => m.username === team.hodUsername);
            if (!hodInMembers && team.hodUsername) {
                const hodUser = await UserModel.findOne({ username: team.hodUsername });
                if (hodUser) {
                    team.members.unshift({
                        userId: hodUser._id,
                        username: team.hodUsername,
                        addedAt: team.createdAt || new Date()
                    });
                    await team.save();
                }
            }
        }

        const teamsLean = teams.map(t => t.toObject());

        // Fetch HOD details for each team
        const hodIds = [...new Set(teamsLean.map(t => t.hodId?.toString()).filter(Boolean))];
        const hods = await UserModel.find({ _id: { $in: hodIds } })
            .select('_id first_name last_name username employee_photo')
            .lean();

        const hodMap = {};
        hods.forEach(h => { hodMap[h._id.toString()] = h; });

        // Fetch member details
        const allMemberUsernames = new Set();
        teamsLean.forEach(t => t.members.forEach(m => allMemberUsernames.add(m.username)));

        const members = await UserModel.find({ username: { $in: [...allMemberUsernames] } })
            .select('_id username first_name last_name department employee_photo role')
            .lean();

        const memberMap = {};
        members.forEach(m => { memberMap[m.username] = m; });

        // Gather all user IDs that are part of any team
        const allUserIds = members.map(m => m._id);

        // Fetch all pending points count (status !== 'Green') for all these users
        const pendingCounts = await OpenPoint.aggregate([
            {
                $match: {
                    responsible_person: { $in: allUserIds },
                    status: { $ne: 'Green' }
                }
            },
            {
                $group: {
                    _id: "$responsible_person",
                    count: { $sum: 1 }
                }
            }
        ]);

        const countsMap = {};
        pendingCounts.forEach(c => {
            if (c._id) {
                countsMap[c._id.toString()] = c.count;
            }
        });

        // Enrich teams with HOD, member details and pending counts
        const enrichedTeams = enrichedTeamsArray(teamsLean, hodMap, memberMap, countsMap);

        res.json({ success: true, teams: enrichedTeams });
    } catch (error) {
        console.error("Error fetching open points pulse teams:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper function to enrich teams
function enrichedTeamsArray(teamsLean, hodMap, memberMap, countsMap) {
    return teamsLean.map(team => {
        const hodDetails = hodMap[team.hodId?.toString()] || null;
        
        // Map members details and get their pending count
        const membersDetails = team.members.map(m => {
            const uDetails = memberMap[m.username] || {};
            const uId = uDetails._id ? uDetails._id.toString() : null;
            const count = uId ? (countsMap[uId] || 0) : 0;
            return {
                ...m,
                ...uDetails,
                pendingCount: count
            };
        });

        // Calculate total team pending points
        const totalPendingCount = membersDetails.reduce((sum, m) => sum + (m.pendingCount || 0), 0);

        // Severity calculation
        let severity = 'green';
        if (totalPendingCount > 10) {
            severity = 'red';
        } else if (totalPendingCount > 0) {
            severity = 'amber';
        }

        return {
            _id: team._id,
            name: team.name,
            description: team.description,
            department: team.department,
            hodDetails,
            members: membersDetails,
            totalPendingCount,
            severity
        };
    });
}

// Get search suggestions for unique IDs or titles
router.get("/api/open-points/suggestions", authMiddleware, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) {
            return res.json([]);
        }
        
        // Find matching projects user has access to (respect permissions)
        const userId = req.user._id;
        const projects = await OpenPointProject.distinct('_id', {
            $or: [
                { owner: userId },
                { "team_members.user": userId }
            ]
        });

        // Find up to 10 points matching unique_id or title
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
router.get("/api/open-points/search/:uniqueId", authMiddleware, async (req, res) => {
    try {
        const { uniqueId } = req.params;
        if (!uniqueId) {
            return res.status(400).json({ error: "Unique ID is required" });
        }
        
        // Case-insensitive search on unique_id
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
