/**
 * Middleware to check if user has required role
 * @param {String[]} roles - Array of allowed roles
 */
export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to perform this action"
      });
    }
    next();
  };
};

/**
 * Middleware to check if user has permission to manage an IE Code
 */
export const checkIECodePermission = async (req, res, next) => {
  const { ie_code_no } = req.body || req.query;
  const user = req.user;

  // Super admin can manage any IE Code
  if (user.role === 'super_admin') {
    return next();
  }

  // IECode admin can only manage their own IE Code
  if (user.role === 'iecode_admin' && user.ie_code_no === ie_code_no) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "You don't have permission to manage this IE Code"
  });
};
