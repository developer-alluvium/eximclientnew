
/**
 * Get user's assigned modules from localStorage
 * @returns {Array} Array of assigned module IDs
 */
export const getUserAssignedModules = () => {
  try {
    const userData = localStorage.getItem("exim_user");
    
    if (userData) {
      const parsedUser = JSON.parse(userData);
      
      // Handle both old and new user data structures
      // New structure: user data is stored directly
      if (parsedUser.assignedModules) {
        return parsedUser.assignedModules || [];
      }
      
      // Old structure: user data is nested under data.user
      const oldFormatModules = parsedUser?.data?.user?.assignedModules || [];
      return oldFormatModules;
    }
  } catch (error) {
    console.error("Error parsing user data for modules:", error);
  }
  
  return [];
};

/**
 * Check if user has access to a specific module
 * @param {string} moduleId - Module ID to check
 * @returns {boolean} True if user has access
 */
export const hasModuleAccess = (moduleId) => {
  const assignedModules = getUserAssignedModules();
  return assignedModules.includes(moduleId);
};

/**
 * Filter modules based on user's assigned modules
 * @param {Array} allModules - All available modules
 * @returns {Array} Filtered modules with access status
 */
export const filterModulesByAccess = (allModules) => {
  const assignedModules = getUserAssignedModules();
  return allModules.map(module => {
    // Check both path and id for access
    const moduleIds = [module.path, module.id].filter(Boolean);
    const hasAccess = moduleIds.some(id => assignedModules.includes(id));
    return {
      ...module,
      hasAccess,
      isLocked: !hasAccess
    };
  });
};

/**
 * Get locked modules (modules user doesn't have access to)
 * @param {Array} allModules - All available modules
 * @returns {Array} Locked modules
 */
export const getLockedModules = (allModules) => {
  const assignedModules = getUserAssignedModules();
  
  return allModules.filter(module => !assignedModules.includes(module.path));
};
