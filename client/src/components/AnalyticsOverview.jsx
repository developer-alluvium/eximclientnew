// AnalyticsOverview.jsx - Updated with Enhanced Features
import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import { format, subDays, parseISO } from "date-fns";
import { debounce } from "lodash";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { UserContext } from "../context/UserContext";
import "../styles/analytics-overview.css";

// ---- Simple "icons" (text-based) ----
const Icon = ({ children }) => <span className="icon-circle">{children}</span>;

// ---- Action card ----
const ActionCard = React.memo(({ title, count, icon, color, subtitle }) => {
  return (
    <div className={`card card-action card-${color}`}>
      <div className="card-icon">
        <Icon>{icon}</Icon>
      </div>
      <div className="card-body">
        <div className="card-title">{title}</div>
        <div className="card-count">{count}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
});

// ---- Status chip with Hover Tooltip ----
const STATUS_INFO = {
  EXPIRED: { label: "Expired", color: "error" },
  EXPIRES_TODAY: { label: "Expires Today", color: "error" },
  EXPIRES_SOON_3_DAYS: { label: "Expires Soon", color: "warning" },
  VALID: { label: "Valid", color: "success" },
  ON_DETENTION: { label: "On Detention", color: "error" },
  STARTS_TODAY: { label: "Starts Today", color: "error" },
  STARTS_SOON_3_DAYS: { label: "Starts Soon", color: "warning" },
  SAFE: { label: "Safe", color: "success" },
  ARRIVED: { label: "Arrived", color: "success" },
  ARRIVING_TODAY: { label: "Arriving Today", color: "primary" },
  ARRIVING_SOON_3_DAYS: { label: "Arriving Soon", color: "info" },
  PENDING_ARRIVAL: { label: "Pending", color: "neutral" },
  COMPLETED: { label: "Completed", color: "success" },
  SCHEDULED: { label: "Scheduled", color: "info" },
  OVERDUE: { label: "Overdue", color: "error" },
  NOT_SET: { label: "Not Set", color: "neutral" },
};

const StatusChip = React.memo(({ status, days, date, eventType }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const info = STATUS_INFO[status] || STATUS_INFO.NOT_SET;
  const dayText = typeof days === "number" ? ` (${days}d)` : "";

  const formatDate = (dateString) => {
    if (!dateString) return "Date not available";
    try {
      return format(parseISO(dateString), "dd MMM yyyy");
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className="status-chip-wrapper"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{ position: "relative", display: "inline-block" }}
    >
      <span className={`status-chip status-${info.color}`}>
        {info.label}
        {dayText}
      </span>

      {showTooltip && date && (
        <div className="status-hover-tooltip">
          <div className="status-hover-date">{formatDate(date)}</div>
          <div className="status-hover-info">{eventType || status}</div>
        </div>
      )}
    </div>
  );
});

// ---- Enhanced Line Chart Tooltip ----
const EnhancedLineTooltip = ({ active, payload, label, eventType }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    // Calculate if we need scrollable sections
    const totalItems =
      (data.jobNumbers?.length || 0) + (data.containerNumbers?.length || 0);
    const needsScrollable = totalItems > 15;

    return (
      <div
        className={`enhanced-tooltip ${
          needsScrollable ? "enhanced-tooltip-auto" : ""
        }`}
      >
        <div className="enhanced-tooltip-header">
          <strong>{eventType}</strong>
          <div className="enhanced-tooltip-date">{label}</div>
        </div>

        <div className="enhanced-tooltip-content">
          <div className="enhanced-tooltip-metric">
            <span className="enhanced-metric-label">Containers:</span>
            <span className="enhanced-metric-value">{data.count}</span>
          </div>

          {data.jobNumbers && data.jobNumbers.length > 0 && (
            <div className="enhanced-tooltip-section">
              <div className="enhanced-section-label">
                Job Numbers
                <span className="enhanced-section-count">
                  {data.jobNumbers.length}
                </span>
              </div>
              <div
                className={`enhanced-items-list ${
                  needsScrollable && data.jobNumbers.length > 8
                    ? "enhanced-items-list-scrollable"
                    : ""
                }`}
              >
                {data.jobNumbers.map((jobNo, index) => (
                  <div key={index} className="enhanced-item">
                    {jobNo}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.containerNumbers && data.containerNumbers.length > 0 && (
            <div className="enhanced-tooltip-section">
              <div className="enhanced-section-label">
                Container Numbers
                <span className="enhanced-section-count">
                  {data.containerNumbers.length}
                </span>
              </div>
              <div
                className={`enhanced-items-list ${
                  needsScrollable && data.containerNumbers.length > 12
                    ? "enhanced-items-list-scrollable"
                    : ""
                }`}
              >
                {data.containerNumbers.map((containerNo, index) => (
                  <div key={index} className="enhanced-item">
                    {containerNo}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// ---- Status Distribution Component ----
const StatusDistribution = React.memo(({ distributionData }) => {
  const statusColors = {
    "Billing Pending": "#ff6b6b",
    "ETA Date Pending": "#4ecdc4",
    "Estimated Time of Arrival": "#45b7d1",
    "Gateway IGM Filed": "#96ceb4",
    Discharged: "#feca57",
    "Rail Out": "#ff9ff3",
    "BE Noted, Arrival Pending": "#54a0ff",
    "BE Noted, Clearance Pending": "#5f27cd",
    "PCV Done, Duty Payment Pending": "#ff9f43",
    "Custom Clearance Completed": "#1dd1a1",
  };

  // Define the desired order of statuses
  const statusOrder = [
    "Billing Pending",
    "ETA Date Pending",
    "Estimated Time of Arrival",
    "Gateway IGM Filed",
    "Discharged",
    "Rail Out",
    "BE Noted, Arrival Pending",
    "BE Noted, Clearance Pending",
    "PCV Done, Duty Payment Pending",
    "Custom Clearance Completed",
  ];

  // Sort the entries based on the predefined order
  const sortedEntries = Object.entries(distributionData)
    .filter(([status]) => statusOrder.includes(status))
    .sort(([statusA], [statusB]) => {
      return statusOrder.indexOf(statusA) - statusOrder.indexOf(statusB);
    });

  return (
    <div className="status-distribution-grid">
      {sortedEntries.map(([status, count]) => (
        <div
          key={status}
          className="status-distribution-item"
          style={{ borderLeftColor: statusColors[status] || "#1976d2" }}
        >
          <span className="status-distribution-name">{status}</span>
          <span className="status-distribution-count">{count}</span>
        </div>
      ))}
    </div>
  );
});

// ---- Examination Badge ----
const ExaminationBadge = React.memo(({ rmsStatus }) => {
  const isUnderExamination = rmsStatus?.toLowerCase() === "no";
  return (
    <span
      className={`examination-badge ${
        isUnderExamination ? "examination-under" : "examination-clear"
      }`}
    >
      {isUnderExamination ? "Under Exam" : "Clear"}
    </span>
  );
});

// ---- Global Search Component ----
const GlobalSearch = ({
  searchTerm,
  onSearchChange,
  placeholder = "Search containers, job numbers...",
}) => {
  return (
    <div className="ao-global-search">
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
};

const AnalyticsOverview = () => {
  const { user } = useContext(UserContext);

  const [year, setYear] = useState("25-26");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [eventTimelineData, setEventTimelineData] = useState(null);
  const [statusDistribution, setStatusDistribution] = useState({});
  const [error, setError] = useState("");
  const [selectedImporter, setSelectedImporter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const debouncedFetchRef = useRef(null);

  const importerList = useMemo(() => {
    const list =
      user?.ie_code_assignments?.map((item) => item.importer_name) || [];
    return list;
  }, [user?.ie_code_assignments]);

  // initial importer - set to first one by default
  useEffect(() => {
    if (user?.ie_code_assignments?.length > 0) {
      setSelectedImporter(user.ie_code_assignments[0].importer_name);
    }
  }, [user]);

  const fetchAnalyticsData = useCallback(async () => {
    if (!year || !selectedDate || !selectedImporter) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      const encodedImporter = encodeURIComponent(selectedImporter);

      // Fetch main analytics data
      const analyticsUrl = `${process.env.REACT_APP_API_STRING}/date-validity/${year}?date=${formattedDate}&importer=${encodedImporter}`;
      const analyticsResponse = await axios.get(analyticsUrl, {
        withCredentials: true,
        timeout: 30000,
      });

      // Fetch event timeline data
      const timelineUrl = `${process.env.REACT_APP_API_STRING}/event-timeline/${year}?importer=${encodedImporter}`;
      const timelineResponse = await axios.get(timelineUrl, {
        withCredentials: true,
        timeout: 30000,
      });

      // Fetch status distribution data
      const statusUrl = `${process.env.REACT_APP_API_STRING}/status-distribution/${year}?importer=${encodedImporter}`;
      const statusResponse = await axios.get(statusUrl, {
        withCredentials: true,
        timeout: 30000,
      });

      setAnalyticsData(analyticsResponse.data);
      setEventTimelineData(timelineResponse.data);
      setStatusDistribution(statusResponse.data.distribution || {});
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      if (err.code === "ECONNABORTED") {
        setError("Request timeout. Please try again.");
      } else {
        setError(
          "Failed to fetch personalized analytics data. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [year, selectedDate, selectedImporter]);

  // debounce once
  useEffect(() => {
    debouncedFetchRef.current = debounce(() => {
      fetchAnalyticsData();
    }, 400);

    return () => {
      debouncedFetchRef.current && debouncedFetchRef.current.cancel();
    };
  }, [fetchAnalyticsData]);

  // trigger fetch
  useEffect(() => {
    if (debouncedFetchRef.current) {
      debouncedFetchRef.current();
    }
  }, [year, selectedDate, selectedImporter]);

  // ----- Derived data for charts -----
  const criticalIssuesData = useMemo(() => {
    const a = analyticsData;
    return [
      {
        name: "On Detention",
        value: a?.actionRequired?.detention?.onDetention || 0,
        color: "#f44336",
      },
      {
        name: "DO Expired",
        value: a?.actionRequired?.do_validity?.expired || 0,
        color: "#b71c1c",
      },
      {
        name: "DO Expires Today",
        value: a?.actionRequired?.do_validity?.expiresToday || 0,
        color: "#ffc107",
      },
    ];
  }, [analyticsData]);

  // Filtered table data based on search term
  const filteredTableData = useMemo(() => {
    if (!analyticsData?.details) return [];

    const searchLower = searchTerm.toLowerCase();
    return analyticsData.details.filter(
      (item) =>
        item.job_no?.toLowerCase().includes(searchLower) ||
        item.container_number?.toLowerCase().includes(searchLower) ||
        item.arrival?.status?.toLowerCase().includes(searchLower) ||
        item.rail_out?.status?.toLowerCase().includes(searchLower) ||
        item.do_validity?.status?.toLowerCase().includes(searchLower) ||
        item.detention?.status?.toLowerCase().includes(searchLower) ||
        item.rms_status?.toLowerCase().includes(searchLower)
    );
  }, [analyticsData?.details, searchTerm]);

  const actionCards = useMemo(
    () => [
      {
        title: "On Detention",
        count: analyticsData?.actionRequired?.detention?.onDetention || 0,
        icon: "!",
        color: "error",
        subtitle: "Immediate action needed",
      },
      {
        title: "DO Expired",
        count: analyticsData?.actionRequired?.do_validity?.expired || 0,
        icon: "⏰",
        color: "error",
        subtitle: "Documents require update",
      },
      {
        title: "DO Expires Today",
        count: analyticsData?.actionRequired?.do_validity?.expiresToday || 0,
        icon: "⚠",
        color: "warning",
        subtitle: "Urgent attention required",
      },
      {
        title: "Billing Pending",
        count: analyticsData?.summary?.billingPendingCount || 0,
        icon: "💰",
        color: "billing",
        subtitle: "Awaiting billing completion",
      },
    ],
    [analyticsData]
  );

  const todayStatusCards = useMemo(
    () => [
      {
        title: "Arrivals Today",
        count: analyticsData?.actionRequired?.arrivals?.arrivingToday || 0,
        icon: "🚢",
        color: "primary",
        subtitle: "Containers arriving",
      },
      {
        title: "Detention Starts Today",
        count: analyticsData?.actionRequired?.detention?.startsToday || 0,
        icon: "📅",
        color: "warning",
        subtitle: "Monitor closely",
      },
      {
        title: "Under Examination",
        count: analyticsData?.summary?.underExaminationCount || 0,
        icon: "🔍",
        color: "warning",
        subtitle: "Containers in examination",
      },
      {
        title: "Total Active Containers",
        count: analyticsData?.summary?.totalActiveContainers || 0,
        icon: "⏱",
        color: "info",
        subtitle: "Overall active count",
      },
    ],
    [analyticsData]
  );

  // ---- RENDER ----
  return (
    <div className="ao-root">
      {/* Header */}
      <header className="ao-header">
        <h1 className="ao-title">Jobs Overview</h1>
        <div className="ao-subtitle">
          <span className="ao-subtitle-icon">📈</span>
          Personalized container tracking and management overview
        </div>
      </header>

      {/* Filters */}
      <section className="ao-filters">
        <div className="filter-group">
          <label className="filter-label">Financial Year</label>
          <select
            className="filter-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {["25-26", "26-27", "24-25"].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Analysis Date</label>
          <input
            type="date"
            className="filter-input"
            value={format(selectedDate, "yyyy-MM-dd")}
            onChange={(e) => {
              const d = e.target.value ? new Date(e.target.value) : new Date();
              setSelectedDate(d);
            }}
          />
        </div>

        {importerList.length > 0 && (
          <div className="filter-group filter-group-wide">
            <label className="filter-label">Importer</label>
            <select
              className="filter-select"
              value={selectedImporter}
              onChange={(e) => setSelectedImporter(e.target.value)}
            >
              {importerList.map((imp) => (
                <option key={imp} value={imp}>
                  {imp}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {error && <div className="ao-alert ao-alert-error">{error}</div>}

      {loading && (
        <div className="ao-loading">
          <div className="spinner" />
        </div>
      )}

      {analyticsData && !loading && (
        <>
          {/* Status Distribution */}
          <section className="ao-section">
            <div className="ao-section-header">
              <div className="ao-section-title">
                <span className="ao-section-icon">📊</span>
                Detailed Status Distribution
              </div>
            </div>
            <StatusDistribution distributionData={statusDistribution} />
          </section>

          {/* Event Timeline Charts */}
          {eventTimelineData && (
            <section className="ao-section">
              <div className="ao-section-header">
                <div className="ao-section-title">
                  <span className="ao-section-icon">📈</span>
                  Container Events Timeline (Last 30 Days)
                </div>
              </div>
              <div className="ao-grid-4">
                {/* Out of Charge Chart */}
                <div className="ao-panel ao-line-chart-panel">
                  <div className="ao-panel-header">
                    Out of Charge
                    <span className="chart-period">30 days</span>
                  </div>
                  <div className="ao-line-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={eventTimelineData?.oocTimeline || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" fontSize={10} />
                        <YAxis allowDecimals={false} fontSize={10} />
                        <Tooltip
                          content={
                            <EnhancedLineTooltip eventType="Out of Charge" />
                          }
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={{ fill: "#8884d8", strokeWidth: 2, r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Arrival Chart */}
                <div className="ao-panel ao-line-chart-panel">
                  <div className="ao-panel-header">
                    Arrivals
                    <span className="chart-period">30 days</span>
                  </div>
                  <div className="ao-line-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={eventTimelineData?.arrivalTimeline || []}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" fontSize={10} />
                        <YAxis allowDecimals={false} fontSize={10} />
                        <Tooltip
                          content={<EnhancedLineTooltip eventType="Arrival" />}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#82ca9d"
                          strokeWidth={2}
                          dot={{ fill: "#82ca9d", strokeWidth: 2, r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Rail-out Chart */}
                <div className="ao-panel ao-line-chart-panel">
                  <div className="ao-panel-header">
                    Rail-out
                    <span className="chart-period">30 days</span>
                  </div>
                  <div className="ao-line-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={eventTimelineData?.railOutTimeline || []}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" fontSize={10} />
                        <YAxis allowDecimals={false} fontSize={10} />
                        <Tooltip
                          content={<EnhancedLineTooltip eventType="Rail-out" />}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#ffc658"
                          strokeWidth={2}
                          dot={{ fill: "#ffc658", strokeWidth: 2, r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Delivery Chart */}
                <div className="ao-panel ao-line-chart-panel">
                  <div className="ao-panel-header">
                    Delivery
                    <span className="chart-period">30 days</span>
                  </div>
                  <div className="ao-line-chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={eventTimelineData?.deliveryTimeline || []}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="date" fontSize={10} />
                        <YAxis allowDecimals={false} fontSize={10} />
                        <Tooltip
                          content={<EnhancedLineTooltip eventType="Delivery" />}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#ff8042"
                          strokeWidth={2}
                          dot={{ fill: "#ff8042", strokeWidth: 2, r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Charts */}
          <section className="ao-grid-2">
            {/* Pie Chart */}
            <div className="ao-panel">
              <div className="ao-panel-header">
                Critical Issues Distribution
              </div>
              <div className="ao-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={criticalIssuesData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={35}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {criticalIssuesData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution Bar Chart - Removed as we have detailed distribution now */}
            <div className="ao-panel">
              <div className="ao-panel-header">Operational Status Overview</div>
              <div className="ao-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Active",
                        count:
                          analyticsData?.summary?.totalActiveContainers || 0,
                      },
                      {
                        name: "On Detention",
                        count:
                          analyticsData?.actionRequired?.detention
                            ?.onDetention || 0,
                      },
                      {
                        name: "Under Exam",
                        count:
                          analyticsData?.summary?.underExaminationCount || 0,
                      },
                    ]}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1976d2" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Table with Global Search */}
          <section className="ao-panel ao-table-panel">
            <div className="ao-panel-header">
              Container Details
              {searchTerm && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#666",
                    marginLeft: "8px",
                  }}
                >
                  ({filteredTableData.length} of {analyticsData.details.length}{" "}
                  results)
                </span>
              )}
            </div>

            <GlobalSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search containers, job numbers, status..."
            />

            <div className="ao-table-container">
              <table className="ao-table">
                <thead>
                  <tr>
                    <th>Job Number</th>
                    <th>Container</th>
                    <th>Arrival Status</th>
                    <th>Rail-Out Status</th>
                    <th>DO Validity</th>
                    <th>Detention Status</th>
                    <th>Examination</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="ao-table-empty">
                        {searchTerm
                          ? "No containers match your search."
                          : "No active containers found for the selected criteria."}
                      </td>
                    </tr>
                  ) : (
                    filteredTableData.map((c, i) => (
                      <tr key={i}>
                        <td className="ao-table-job">
                          <span>{c.job_no}</span>
                        </td>
                        <td className="ao-table-container-number">
                          <span>{c.container_number}</span>
                        </td>
                        <td>
                          <StatusChip
                            status={c.arrival.status}
                            days={Math.round(c.arrival.days)}
                            date={c.arrival.actualDate}
                            eventType="Arrival"
                          />
                        </td>
                        <td>
                          <StatusChip
                            status={c.rail_out.status}
                            days={Math.round(c.rail_out.days)}
                            date={c.rail_out.actualDate}
                            eventType="Rail Out"
                          />
                        </td>
                        <td>
                          <StatusChip
                            status={c.do_validity.status}
                            days={Math.round(c.do_validity.days)}
                            date={c.do_validity.actualDate}
                            eventType="DO Validity"
                          />
                        </td>
                        <td>
                          <StatusChip
                            status={c.detention.status}
                            days={Math.round(c.detention.days)}
                            date={c.detention.actualDate}
                            eventType="Detention"
                          />
                        </td>
                        <td className="examination-cell">
                          <ExaminationBadge rmsStatus={c.rms_status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AnalyticsOverview;
