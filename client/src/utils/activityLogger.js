import axios from "axios";

/**
 * Client-side activity logger
 */
class ActivityLogger {
  constructor() {
    this.apiUrl = process.env.REACT_APP_API_STRING;
    this.user = null;
    this.sessionId = this.generateSessionId();
  }

  // Initialize with user data
  setUser(userData) {
    this.user = userData;
  }

  // Generate a session ID for tracking
  generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // Get user ID from context or localStorage
  getUserId() {
    // Check if user ID is available in context
    if (this.user?.id) {
      return this.user.id;
    }
    if (this.user?.data?.user?.id) {
      return this.user.data.user.id;
    }

    try {
      // Read from cookies (migrated from localStorage)
      const { getJsonCookie } = require("./cookies");
      const parsed = getJsonCookie("exim_user");
      if (parsed) return parsed?.id || parsed?.data?.user?.id;
    } catch (error) {
      console.error("Error getting user ID:", error);
    }

    return null;
  }

  /**
   * Log an activity
   * @param {Object} activity - Activity details
   */
  async logActivity(activity) {
    try {
      const userId = this.getUserId();
      if (!userId) {
        console.warn("No user ID available for activity logging");
        return;
      }

      const activityData = {
        user_id: userId,
        activity_type: activity.type,
        description: activity.description,
        severity: activity.severity || "low",
        details: {
          ...activity.details,
          session_id: this.sessionId,
          timestamp: new Date().toISOString(),
          page_url: window.location.href,
          referrer: document.referrer,
        },
        related_job_id: activity.jobId,
        related_job_no: activity.jobNo,
      };

      await axios.post(`${this.apiUrl}/activity/log`, activityData);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }

  // Pre-defined activity methods
  async logPageView(page) {
    await this.logActivity({
      type: "page_view",
      description: `Viewed ${page} page`,
      details: { page },
    });
  }

  async logJobView(jobNo, jobId) {
    await this.logActivity({
      type: "job_view",
      description: `Viewed job ${jobNo}`,
      jobId,
      jobNo,
      details: { action: "view" },
    });
  }

  async logSearch(query, searchType, resultsCount) {
    await this.logActivity({
      type: "search",
      description: `Searched for "${query}" in ${searchType}`,
      details: {
        search_query: query,
        search_type: searchType,
        results_count: resultsCount,
      },
    });
  }

  async logExport(exportType, recordCount) {
    await this.logActivity({
      type: "export_data",
      description: `Exported ${recordCount} records as ${exportType}`,
      details: {
        export_type: exportType,
        record_count: recordCount,
      },
    });
  }

  async logFilterApply(filters) {
    await this.logActivity({
      type: "filter_applied",
      description: `Applied filters: ${Object.keys(filters).join(", ")}`,
      details: {
        filters: filters,
        filter_count: Object.keys(filters).length,
      },
    });
  }

  async logDocumentDownload(filename, documentType) {
    await this.logActivity({
      type: "document_download",
      description: `Downloaded document: ${filename}`,
      details: {
        filename,
        document_type: documentType,
      },
    });
  }

  async logError(error, context) {
    await this.logActivity({
      type: "error",
      description: `Error occurred: ${error.message}`,
      severity: "high",
      details: {
        error_message: error.message,
        error_stack: error.stack,
        context,
      },
    });
  }
}

// Create a singleton instance
const activityLogger = new ActivityLogger();

// Export the logActivity function for easier usage
export const logActivity = (activity) => activityLogger.logActivity(activity);

// Export other methods if needed
export const setUser = (userData) => activityLogger.setUser(userData);
export const logError = (error, context) =>
  activityLogger.logError(error, context);

export default activityLogger;
