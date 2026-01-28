import { Router } from "express";
const router = Router();
import ElockDetail from "../models/ElockDetail.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";

// Apply authentication to all routes
router.use(authenticateUser);

// @desc    Get all e-lock details with pagination and filters
// @route   GET /api/elock-details
// @access  Private
router.get("/", async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status = "",
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const user = req.user;
        const userId = user._id; // Using mongoose ID

        // Determine IE codes based on user structure
        let ieCodes = [];
        if (user.ie_code_assignments && user.ie_code_assignments.length > 0) {
            ieCodes = user.ie_code_assignments.map(a => a.ie_code_no);
        } else if (user.ie_code_no) {
            ieCodes = [user.ie_code_no];
        }

        // Build query using userData
        let query = {
            $or: [{ ie_code: { $in: ieCodes } }, { created_by: userId }],
        };

        // Search filter
        if (search) {
            const searchRegex = new RegExp(search, "i");
            query.$and = [
                {
                    $or: [
                        { elock_number: searchRegex },
                        { consignor: searchRegex },
                        { consignee: searchRegex },
                        { vehicle_number: searchRegex },
                        { driver_name: searchRegex },
                    ],
                },
            ];
        }

        // Status filter
        if (status) {
            query.status = status;
        }

        // Sort configuration
        const sortConfig = {};
        sortConfig[sortBy] = sortOrder === "desc" ? -1 : 1;

        // Execute query with pagination
        const elocks = await ElockDetail.find(query)
            .sort(sortConfig)
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select("-__v");

        // Get total count for pagination
        const totalCount = await ElockDetail.countDocuments(query);
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: elocks,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
        });
    } catch (error) {
        console.error("Error fetching e-lock details:", error);
        res.status(500).json({
            success: false,
            error: "Server error while fetching e-lock details",
        });
    }
});

// @desc    Get single e-lock detail
// @route   GET /api/elock-details/:id
// @access  Private
router.get("/:id", async (req, res) => {
    try {
        const user = req.user;
        const userId = user._id;
        let ieCodes = [];
        if (user.ie_code_assignments && user.ie_code_assignments.length > 0) {
            ieCodes = user.ie_code_assignments.map(a => a.ie_code_no);
        } else if (user.ie_code_no) {
            ieCodes = [user.ie_code_no];
        }

        const elock = await ElockDetail.findOne({
            _id: req.params.id,
            $or: [{ ie_code: { $in: ieCodes } }, { created_by: userId }],
        });

        if (!elock) {
            return res.status(404).json({
                success: false,
                error: "E-lock detail not found",
            });
        }

        res.json({
            success: true,
            data: elock,
        });
    } catch (error) {
        console.error("Error fetching e-lock detail:", error);
        res.status(500).json({
            success: false,
            error: "Server error while fetching e-lock detail",
        });
    }
});

// @desc    Create new e-lock detail
// @route   POST /api/elock-details
// @access  Private
router.post("/", async (req, res) => {
    try {
        const {
            elock_number,
            status,
            consignor,
            consignee,
            vehicle_number,
            driver_name,
            driver_phone,
        } = req.body;

        // Validation
        if (!elock_number) {
            return res.status(400).json({
                success: false,
                error: "E-lock number is required",
            });
        }

        // Check if e-lock number already exists
        const existingElock = await ElockDetail.findOne({ elock_number });
        if (existingElock) {
            return res.status(400).json({
                success: false,
                error: "E-lock number already exists",
            });
        }

        const user = req.user;

        // Determine appropriate IE Code to associate
        // If user has multiple assignments, ideally UI should send which one, 
        // but for now default to first one or the only one available
        let ieCode = user.ie_code_no;
        if (!ieCode && user.ie_code_assignments?.length > 0) {
            ieCode = user.ie_code_assignments[0].ie_code_no;
        }

        if (!ieCode) {
            return res.status(400).json({
                success: false,
                error: "User IE code not found",
            });
        }

        const userId = user._id;

        // Create new e-lock detail
        const elockDetail = new ElockDetail({
            elock_number: elock_number.trim(),
            status: status || "UNASSIGNED",
            consignor: consignor || "",
            consignee: consignee || "",
            vehicle_number: vehicle_number || "",
            driver_name: driver_name || "",
            driver_phone: driver_phone || "",
            created_by: userId,
            ie_code: ieCode,
        });

        const savedElock = await elockDetail.save();

        res.status(201).json({
            success: true,
            data: savedElock,
            message: "E-lock detail created successfully",
        });
    } catch (error) {
        console.error("Error creating e-lock detail:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                error: Object.values(error.errors)
                    .map((err) => err.message)
                    .join(", "),
            });
        }
        res.status(500).json({
            success: false,
            error: "Server error while creating e-lock detail",
        });
    }
});

// @desc    Update e-lock detail
// @route   PUT /api/elock-details/:id
// @access  Private
router.put("/:id", async (req, res) => {
    try {
        const {
            status,
            consignor,
            consignee,
            vehicle_number,
            driver_name,
            driver_phone,
        } = req.body;

        const user = req.user;
        const userId = user._id;
        let ieCodes = [];
        if (user.ie_code_assignments && user.ie_code_assignments.length > 0) {
            ieCodes = user.ie_code_assignments.map(a => a.ie_code_no);
        } else if (user.ie_code_no) {
            ieCodes = [user.ie_code_no];
        }

        // Find e-lock detail and verify ownership/access
        const elock = await ElockDetail.findOne({
            _id: req.params.id,
            $or: [{ ie_code: { $in: ieCodes } }, { created_by: userId }],
        });

        if (!elock) {
            return res.status(404).json({
                success: false,
                error: "E-lock detail not found",
            });
        }

        // Update fields
        if (status) elock.status = status;
        if (consignor !== undefined) elock.consignor = consignor;
        if (consignee !== undefined) elock.consignee = consignee;
        if (vehicle_number !== undefined) elock.vehicle_number = vehicle_number;
        if (driver_name !== undefined) elock.driver_name = driver_name;
        if (driver_phone !== undefined) elock.driver_phone = driver_phone;

        const updatedElock = await elock.save();

        res.json({
            success: true,
            data: updatedElock,
            message: "E-lock detail updated successfully",
        });
    } catch (error) {
        console.error("Error updating e-lock detail:", error);
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                error: Object.values(error.errors)
                    .map((err) => err.message)
                    .join(", "),
            });
        }
        res.status(500).json({
            success: false,
            error: "Server error while updating e-lock detail",
        });
    }
});

// @desc    Delete e-lock detail
// @route   DELETE /api/elock-details/:id
// @access  Private
router.delete("/:id", async (req, res) => {
    try {
        const user = req.user;
        const userId = user._id;
        let ieCodes = [];
        if (user.ie_code_assignments && user.ie_code_assignments.length > 0) {
            ieCodes = user.ie_code_assignments.map(a => a.ie_code_no);
        } else if (user.ie_code_no) {
            ieCodes = [user.ie_code_no];
        }

        const elock = await ElockDetail.findOneAndDelete({
            _id: req.params.id,
            $or: [{ ie_code: { $in: ieCodes } }, { created_by: userId }],
        });

        if (!elock) {
            return res.status(404).json({
                success: false,
                error: "E-lock detail not found",
            });
        }

        res.json({
            success: true,
            message: "E-lock detail deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting e-lock detail:", error);
        res.status(500).json({
            success: false,
            error: "Server error while deleting e-lock detail",
        });
    }
});

// @desc    Bulk update e-lock status
// @route   PATCH /api/elock-details/bulk/status
// @access  Private
router.patch("/bulk/status", async (req, res) => {
    try {
        const { elock_ids, status } = req.body;

        if (!elock_ids || !Array.isArray(elock_ids) || elock_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: "E-lock IDs array is required",
            });
        }

        if (!status || !["ASSIGNED", "UNASSIGNED", "RETURNED"].includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Valid status is required",
            });
        }

        const user = req.user;
        const userId = user._id;
        let ieCodes = [];
        if (user.ie_code_assignments && user.ie_code_assignments.length > 0) {
            ieCodes = user.ie_code_assignments.map(a => a.ie_code_no);
        } else if (user.ie_code_no) {
            ieCodes = [user.ie_code_no];
        }

        const result = await ElockDetail.updateMany(
            {
                _id: { $in: elock_ids },
                $or: [{ ie_code: { $in: ieCodes } }, { created_by: userId }],
            },
            { status }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: "No e-lock details found or access denied",
            });
        }

        res.json({
            success: true,
            message: `Status updated for ${result.modifiedCount} e-lock(s)`,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("Error in bulk status update:", error);
        res.status(500).json({
            success: false,
            error: "Server error during bulk status update",
        });
    }
});

export default router;
