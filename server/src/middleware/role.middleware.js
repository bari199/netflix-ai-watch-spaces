import WatchSpace from "../models/WatchSpace.js";

// Account-level role authorization
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

// WatchSpace-level Host authorization
const authorizeWatchSpaceHost = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Preserve existing Admin permissions
    if (req.user.role === "admin") {
      return next();
    }

    const watchSpace = await WatchSpace.findById(
      req.params.watchSpaceId,
    ).select("host");

    if (!watchSpace) {
      return res.status(404).json({
        success: false,
        message: "WatchSpace not found",
      });
    }

    const isCurrentHost =
      watchSpace.host.toString() === req.user._id.toString();

    if (!isCurrentHost) {
      return res.status(403).json({
        success: false,
        message: "Only the WatchSpace host can perform this action",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export { authorizeWatchSpaceHost };

export default authorizeRoles;
