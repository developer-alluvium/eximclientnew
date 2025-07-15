import CustomerModel from "../models/customerModel.js";

// Available modules in the system
const AVAILABLE_MODULES = [
  {
    id: "/importdsr",
    name: "Import DSR",
    description: "View and manage import daily status reports and track shipments",
    category: "core"
  },
  {
    id: "/netpage", 
    name: "CostIQ",
    description: "Calculate shipping costs per kilogram for better pricing decisions",
    category: "core"
  },
  {
    id: "http://snapcheckv1.s3-website.ap-south-1.amazonaws.com/",
    name: "SnapCheck",
    description: "Beta Version - Quality control and inspection management system",
    category: "beta",
    isExternal: true
  },
  {
    id: "http://qrlocker.s3-website.ap-south-1.amazonaws.com/",
    name: "QR Locker", 
    description: "Beta Version - Digital locker management with QR code integration",
    category: "beta",
    isExternal: true
  },
  {
    id: "http://task-flow-ai.s3-website.ap-south-1.amazonaws.com/",
    name: "Task Flow AI",
    description: "Task management system with organizational hierarchy",
    category: "core",
    isExternal: true
  },
  {
    id: "http://localhost:3005/",
    name: "E-Lock",
    description: "Secure electronic document locking and verification",
    category: "core",
    isExternal: true
  }
];

/**
 * Get all available modules
 */
export const getAvailableModules = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Available modules fetched successfully",
      data: AVAILABLE_MODULES,
    });
  } catch (error) {
    console.error("Error fetching available modules:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching available modules",
      error: error.message,
    });
  }
};

/**
 * Get customer module assignments
 */
export const getCustomerModuleAssignments = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await CustomerModel.findById(customerId).select('name ie_code_no assignedModules');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Customer module assignments fetched successfully",
      data: {
        customer: {
          id: customer._id,
          name: customer.name,
          ie_code_no: customer.ie_code_no,
          assignedModules: customer.assignedModules || []
        },
        availableModules: AVAILABLE_MODULES
      },
    });
  } catch (error) {
    console.error("Error fetching customer module assignments:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching customer module assignments",
      error: error.message,
    });
  }
};

/**
 * Update customer module assignments
 */
export const updateCustomerModuleAssignments = async (req, res) => {
  try {
    console.log("=== UPDATE MODULE ASSIGNMENTS ===");
    console.log("Customer ID:", req.params.customerId);
    console.log("Request body:", req.body);
    
    const { customerId } = req.params;
    const { assignedModules } = req.body;

    // Validate input
    if (!Array.isArray(assignedModules)) {
      console.log("Invalid assignedModules type:", typeof assignedModules);
      return res.status(400).json({
        success: false,
        message: "assignedModules must be an array",
      });
    }

    // Validate that all assigned modules exist in available modules
    const validModuleIds = AVAILABLE_MODULES.map(module => module.id);
    const invalidModules = assignedModules.filter(moduleId => !validModuleIds.includes(moduleId));
    
    if (invalidModules.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid module IDs: ${invalidModules.join(', ')}`,
      });
    }

    // Update customer
    const customer = await CustomerModel.findByIdAndUpdate(
      customerId,
      { assignedModules },
      { new: true, runValidators: true }
    ).select('name ie_code_no assignedModules');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.log(`Module assignments updated for customer ${customer.name} (${customer.ie_code_no})`);

    res.status(200).json({
      success: true,
      message: "Customer module assignments updated successfully",
      data: {
        id: customer._id,
        name: customer.name,
        ie_code_no: customer.ie_code_no,
        assignedModules: customer.assignedModules
      },
    });
  } catch (error) {
    console.error("Error updating customer module assignments:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating customer module assignments",
      error: error.message,
    });
  }
};

/**
 * Get all customers with their module assignments (for SuperAdmin dashboard)
 */
export const getAllCustomersWithModules = async (req, res) => {
  try {
    const customers = await CustomerModel.find(
      {},
      {
        _id: 1,
        ie_code_no: 1,
        name: 1,
        assignedModules: 1,
        isActive: 1,
        created_at: 1,
      }
    ).sort({ created_at: -1 }).lean();

    // Add module details to each customer
    const customersWithModuleDetails = customers.map(customer => ({
      ...customer,
      assignedModuleDetails: AVAILABLE_MODULES.filter(module => 
        customer.assignedModules?.includes(module.id)
      )
    }));

    res.status(200).json({
      success: true,
      message: "Customers with module assignments fetched successfully",
      data: customersWithModuleDetails,
    });
  } catch (error) {
    console.error("Error fetching customers with module assignments:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching customers with module assignments",
      error: error.message,
    });
  }
};

/**
 * Bulk assign modules to multiple customers
 */
export const bulkAssignModules = async (req, res) => {
  try {
    const { customerIds, assignedModules } = req.body;

    // Validate input
    if (!Array.isArray(customerIds) || !Array.isArray(assignedModules)) {
      return res.status(400).json({
        success: false,
        message: "customerIds and assignedModules must be arrays",
      });
    }

    // Validate that all assigned modules exist in available modules
    const validModuleIds = AVAILABLE_MODULES.map(module => module.id);
    const invalidModules = assignedModules.filter(moduleId => !validModuleIds.includes(moduleId));
    
    if (invalidModules.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid module IDs: ${invalidModules.join(', ')}`,
      });
    }

    // Update multiple customers
    const result = await CustomerModel.updateMany(
      { _id: { $in: customerIds } },
      { assignedModules },
      { runValidators: true }
    );

    console.log(`Bulk module assignment completed for ${result.modifiedCount} customers`);

    res.status(200).json({
      success: true,
      message: `Module assignments updated for ${result.modifiedCount} customers`,
      data: {
        modifiedCount: result.modifiedCount,
        assignedModules
      },
    });
  } catch (error) {
    console.error("Error in bulk module assignment:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during bulk module assignment",
      error: error.message,
    });
  }
};
