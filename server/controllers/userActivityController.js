import UserSession from "../models/userSessionModel.js";
import UserClickEvent from "../models/userClickEventModel.js";
import EximclientUser from "../models/eximclientUserModel.js";
import Customer from "../models/customerModel.js";

/**
 * Handle active session heartbeat from client tracker
 */
export const sendHeartbeat = async (req, res) => {
  try {
    const { sessionId, isActiveTab = true, currentPath = "/", secondsIncrement = 30 } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const userId = req.user?.id || req.user?._id || req.headers["user-id"] || "anonymous";
    const userName = req.user?.name || "Unknown User";
    const userEmail = req.user?.email || "";
    const userRole = req.user?.role || "user";
    const ieCode = req.user?.primary_ie_code || req.user?.ie_code_no || "";

    const now = new Date();
    const activeSecs = isActiveTab ? Number(secondsIncrement) || 30 : 0;

    let session = await UserSession.findOne({ sessionId });

    if (session) {
      session.lastHeartbeat = now;
      session.isOnline = true;
      if (isActiveTab) {
        session.totalActiveSeconds = (session.totalActiveSeconds || 0) + activeSecs;
      }
      await session.save();
    } else {
      session = await UserSession.create({
        userId,
        userName,
        userEmail,
        userRole,
        ieCode,
        sessionId,
        startTime: now,
        lastHeartbeat: now,
        totalActiveSeconds: activeSecs,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
        userAgent: req.headers["user-agent"] || "",
        isOnline: true,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        totalActiveSeconds: session.totalActiveSeconds,
        isOnline: true,
      },
    });
  } catch (error) {
    console.error("Error processing user activity heartbeat:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Log click and navigation events batch from client
 */
export const logActivityEvents = async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(200).json({ success: true, message: "No events provided" });
    }

    const userId = req.user?.id || req.user?._id || req.headers["user-id"] || "anonymous";
    const userName = req.user?.name || "Unknown User";
    const userEmail = req.user?.email || "";
    const userRole = req.user?.role || "user";

    const formattedEvents = events.map((evt) => ({
      userId,
      userName,
      userEmail,
      userRole,
      sessionId: evt.sessionId || "unknown_session",
      eventType: evt.eventType || "click",
      path: evt.path || "/",
      elementId: evt.elementId || "",
      elementText: evt.elementText ? String(evt.elementText).substring(0, 200) : "",
      componentName: evt.componentName || "",
      metadata: evt.metadata || {},
      timestamp: evt.timestamp ? new Date(evt.timestamp) : new Date(),
    }));

    await UserClickEvent.insertMany(formattedEvents);

    return res.status(200).json({
      success: true,
      count: formattedEvents.length,
    });
  } catch (error) {
    console.error("Error logging activity events:", error);
    return res.status(500).json({ success: false, message: "Failed to log activity events" });
  }
};

/**
 * Super Admin: Get overall activity metrics
 */
export const getMonitoringAnalytics = async (req, res) => {
  try {
    const { timeRange = "7d" } = req.query;

    const now = new Date();
    let startDate = new Date();
    if (timeRange === "1d") startDate.setDate(now.getDate() - 1);
    else if (timeRange === "7d") startDate.setDate(now.getDate() - 7);
    else if (timeRange === "30d") startDate.setDate(now.getDate() - 30);
    else startDate.setDate(now.getDate() - 90);

    const onlineCutoff = new Date(Date.now() - 2.5 * 60 * 1000); // 2.5 minutes ago

    const [
      onlineSessions,
      sessionStats,
      clickCount,
      topPages,
      topElements,
    ] = await Promise.all([
      // Live online sessions
      UserSession.distinct("userId", { lastHeartbeat: { $gte: onlineCutoff } }),

      // Total time spent in date range
      UserSession.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalSeconds: { $sum: "$totalActiveSeconds" },
            sessionCount: { $sum: 1 },
          },
        },
      ]),

      // Total click events in date range
      UserClickEvent.countDocuments({ timestamp: { $gte: startDate } }),

      // Top Visited Pages
      UserClickEvent.aggregate([
        { $match: { timestamp: { $gte: startDate }, eventType: "page_view" } },
        { $group: { _id: "$path", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),

      // Top Clicked Elements
      UserClickEvent.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate },
            eventType: "click",
            elementText: { $ne: "" },
          },
        },
        { $group: { _id: "$elementText", count: { $sum: 1 }, path: { $first: "$path" } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const totalSeconds = sessionStats[0]?.totalSeconds || 0;
    const totalSessions = sessionStats[0]?.sessionCount || 0;

    return res.json({
      success: true,
      data: {
        onlineUsersCount: onlineSessions.length,
        totalActiveTimeSeconds: totalSeconds,
        totalActiveHours: (totalSeconds / 3600).toFixed(1),
        totalSessions,
        totalClicks: clickCount,
        topPages: topPages.map((p) => ({ path: p._id, views: p.count })),
        topElements: topElements.map((e) => ({ text: e._id, clicks: e.count, path: e.path })),
      },
    });
  } catch (error) {
    console.error("Error fetching monitoring analytics:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch monitoring analytics" });
  }
};

/**
 * Super Admin: Get user activity summary list with total time spent & last active status
 */
export const getUserActivitySummary = async (req, res) => {
  try {
    const { search = "", dateRange = "30d", page = 1, limit = 20 } = req.query;

    const now = new Date();
    let startDate = new Date(0); // All time by default
    if (dateRange === "1d") startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (dateRange === "7d") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (dateRange === "30d") startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const onlineCutoff = new Date(Date.now() - 2.5 * 60 * 1000);

    // Aggregate user sessions grouped by userId
    const userSessionStats = await UserSession.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$userId",
          userName: { $first: "$userName" },
          userEmail: { $first: "$userEmail" },
          userRole: { $first: "$userRole" },
          ieCode: { $first: "$ieCode" },
          totalActiveSeconds: { $sum: "$totalActiveSeconds" },
          sessionCount: { $sum: 1 },
          lastHeartbeat: { $max: "$lastHeartbeat" },
          firstSession: { $min: "$startTime" },
        },
      },
      { $sort: { lastHeartbeat: -1 } },
    ]);

    // Also fetch click counts per user
    const clickCounts = await UserClickEvent.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: "$userId",
          totalClicks: { $sum: 1 },
        },
      },
    ]);

    const clickMap = {};
    clickCounts.forEach((c) => {
      clickMap[c._id] = c.totalClicks;
    });

    // Combine session stats & clicks
    let combinedUsers = userSessionStats.map((u) => {
      const isOnline = u.lastHeartbeat && new Date(u.lastHeartbeat) >= onlineCutoff;
      return {
        userId: u._id,
        userName: u.userName || "Unknown User",
        userEmail: u.userEmail || "",
        userRole: u.userRole || "user",
        ieCode: u.ieCode || "",
        totalActiveSeconds: u.totalActiveSeconds || 0,
        totalActiveMinutes: Math.round((u.totalActiveSeconds || 0) / 60),
        totalActiveHours: ((u.totalActiveSeconds || 0) / 3600).toFixed(1),
        sessionCount: u.sessionCount || 0,
        totalClicks: clickMap[u._id] || 0,
        lastHeartbeat: u.lastHeartbeat,
        isOnline,
      };
    });

    // Filter by search query if provided
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      combinedUsers = combinedUsers.filter(
        (u) =>
          u.userName.toLowerCase().includes(q) ||
          u.userEmail.toLowerCase().includes(q) ||
          u.ieCode.toLowerCase().includes(q)
      );
    }

    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedUsers = combinedUsers.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      totalCount: combinedUsers.length,
      page: pageNum,
      totalPages: Math.ceil(combinedUsers.length / limitNum),
      data: paginatedUsers,
    });
  } catch (error) {
    console.error("Error fetching user activity summary:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user activity summary" });
  }
};

/**
 * Super Admin: Get detailed timeline & click stream for a specific user
 */
export const getUserDetailedTimeline = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId parameter is required" });
    }

    const [sessions, clickEvents] = await Promise.all([
      UserSession.find({ userId }).sort({ lastHeartbeat: -1 }).limit(20),
      UserClickEvent.find({ userId }).sort({ timestamp: -1 }).limit(100),
    ]);

    // Calculate total time spent for this user
    const totalSecs = sessions.reduce((acc, s) => acc + (s.totalActiveSeconds || 0), 0);
    const lastActive = sessions.length > 0 ? sessions[0].lastHeartbeat : null;
    const isOnline = lastActive && new Date(lastActive) >= new Date(Date.now() - 2.5 * 60 * 1000);

    return res.json({
      success: true,
      data: {
        userId,
        userName: sessions[0]?.userName || clickEvents[0]?.userName || "User",
        userEmail: sessions[0]?.userEmail || clickEvents[0]?.userEmail || "",
        userRole: sessions[0]?.userRole || clickEvents[0]?.userRole || "user",
        totalActiveSeconds: totalSecs,
        totalActiveMinutes: Math.round(totalSecs / 60),
        totalActiveHours: (totalSecs / 3600).toFixed(1),
        isOnline,
        lastActive,
        sessionsCount: sessions.length,
        sessions,
        events: clickEvents,
      },
    });
  } catch (error) {
    console.error("Error fetching user detailed timeline:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user detailed timeline" });
  }
};

/**
 * Super Admin: Get recent click stream log with filtering
 */
export const getLiveClickStream = async (req, res) => {
  try {
    const { userId, eventType, search, limit = 50 } = req.query;

    const query = {};
    if (userId) query.userId = userId;
    if (eventType) query.eventType = eventType;
    if (search) {
      query.$or = [
        { path: { $regex: search, $options: "i" } },
        { elementText: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
      ];
    }

    const events = await UserClickEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit) || 50);

    return res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching click stream:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch click stream" });
  }
};
