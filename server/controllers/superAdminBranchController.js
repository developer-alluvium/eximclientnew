import EximclientUser from "../models/eximclientUserModel.js";

/**
 * POST /api/superadmin/users/:userId/branch-access
 * Assigns branches and ICD codes to a user.
 */
export const assignBranchAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { selectedBranches, selectedIcdCodes, selectedPorts } = req.body;

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (selectedBranches !== undefined) {
      user.selected_branches = Array.isArray(selectedBranches) ? selectedBranches : [selectedBranches];
    }
    
    if (selectedIcdCodes !== undefined) {
      user.selected_icd_codes = Array.isArray(selectedIcdCodes) ? selectedIcdCodes : [selectedIcdCodes];
    }
    
    if (selectedPorts !== undefined) {
      user.selected_ports = Array.isArray(selectedPorts) ? selectedPorts : [selectedPorts];
    }

    await user.save();

    res.json({
      success: true,
      message: "Branch and ICD assignments updated successfully",
      data: {
        selected_branches: user.selected_branches,
        selected_icd_codes: user.selected_icd_codes,
        selected_ports: user.selected_ports
      }
    });
  } catch (error) {
    console.error("Assign branch access error:", error);
    res.status(500).json({ success: false, message: "Failed to update branch assignments", error: error.message });
  }
};

/**
 * DELETE /api/superadmin/users/:userId/branch-access
 * Removes branch and ICD assignments.
 */
export const removeBranchAccess = async (req, res) => {
  try {
    const { userId } = req.params;
    const { branchesToRemove, icdCodesToRemove, portsToRemove, removeAll = false } = req.body;

    const user = await EximclientUser.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (removeAll) {
      user.selected_branches = [];
      user.selected_icd_codes = [];
      user.selected_ports = [];
    } else {
      if (branchesToRemove && Array.isArray(branchesToRemove)) {
        user.selected_branches = user.selected_branches.filter(b => !branchesToRemove.includes(b));
      }
      if (icdCodesToRemove && Array.isArray(icdCodesToRemove)) {
        user.selected_icd_codes = user.selected_icd_codes.filter(c => !icdCodesToRemove.includes(c));
      }
      if (portsToRemove && Array.isArray(portsToRemove)) {
        user.selected_ports = user.selected_ports.filter(p => !portsToRemove.includes(p));
      }
    }

    await user.save();

    res.json({
      success: true,
      message: "Assignments removed successfully",
      data: {
        selected_branches: user.selected_branches,
        selected_icd_codes: user.selected_icd_codes,
        selected_ports: user.selected_ports
      }
    });
  } catch (error) {
    console.error("Remove branch access error:", error);
    res.status(500).json({ success: false, message: "Failed to remove assignments", error: error.message });
  }
};
