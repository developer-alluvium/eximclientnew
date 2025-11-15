// AnalyticsOverview.jsx - Pure JSX + CSS version (no MUI)
import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import axios from "axios";
import { format } from "date-fns";
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
} from "recharts";
import { UserContext } from "../context/UserContext";
import "../styles/analytics-overview.css"; // <-- create this

// ---- Simple “icons” (text-based) ----
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

// ---- Status chip ----
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

const StatusChip = React.memo(({ status, days }) => {
  const info = STATUS_INFO[status] || STATUS_INFO.NOT_SET;
  const dayText = typeof days === "number" ? ` (${days}d)` : "";
  return (
    <span className={`status-chip status-${info.color}`}>
      {info.label}
      {dayText}
    </span>
  );
});

const AnalyticsOverview = () => {
  const { user } = useContext(UserContext);

  const [year, setYear] = useState("25-26");
  const [selectedDate, setSelectedDate] = useState(
    () => new Date() // avoid new Date() each render
  );
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [error, setError] = useState("");
  const [selectedImporter, setSelectedImporter] = useState("");

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
      const url = `${process.env.REACT_APP_API_STRING}/date-validity/${year}?date=${formattedDate}&importer=${encodedImporter}`;

      const response = await axios.get(url, {
        withCredentials: true,
        timeout: 30000,
      });

      setAnalyticsData(response.data);
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

  const statusDistributionData = useMemo(() => {
    const d = analyticsData?.details || [];
    return [
      {
        name: "Valid",
        count: d.filter((x) => x.do_validity.status === "VALID").length,
      },
      {
        name: "Expired",
        count: d.filter((x) => x.do_validity.status === "EXPIRED").length,
      },
      {
        name: "Expiring Soon",
        count: d.filter((x) => x.do_validity.status === "EXPIRES_SOON_3_DAYS")
          .length,
      },
      {
        name: "On Detention",
        count: d.filter((x) => x.detention.status === "ON_DETENTION").length,
      },
    ];
  }, [analyticsData]);

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
    ],
    [analyticsData]
  );

  const todayStatusCards = useMemo(
    () => [
      {
        title: "Rail-Out Completed",
        count: analyticsData?.actionRequired?.rail_out?.completedToday || 0,
        icon: "🚆",
        color: "success",
        subtitle: "Today's completions",
      },
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
          {/* Action Required */}
          <section className="ao-section">
            <div className="ao-section-header">
              <div className="ao-section-title">
                <span className="ao-section-icon ao-section-icon-error">!</span>
                Action Required
              </div>
              <span className="chip chip-error">Critical</span>
            </div>
            <div className="card-grid">
              {actionCards.map((c, idx) => (
                <ActionCard key={idx} {...c} />
              ))}
            </div>
          </section>

          {/* Today Status */}
          <section className="ao-section">
            <div className="ao-section-header">
              <div className="ao-section-title">
                <span className="ao-section-icon">📅</span>
                Status for {format(selectedDate, "dd MMMM yyyy")}
              </div>
            </div>
            <div className="card-grid">
              {todayStatusCards.map((c, idx) => (
                <ActionCard key={idx} {...c} />
              ))}
            </div>
          </section>

          {/* Charts + Table */}
          <section className="ao-grid-2">
            {/* Pie */}
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
                      outerRadius={90}
                      innerRadius={45}
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

            {/* Bar */}
            <div className="ao-panel">
              <div className="ao-panel-header">Status Distribution</div>
              <div className="ao-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="ao-panel ao-table-panel">
            <div className="ao-panel-header">Container Details</div>
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
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.details.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="ao-table-empty">
                        No active containers found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    analyticsData.details.map((c, i) => (
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
                          />
                        </td>
                        <td>
                          <StatusChip
                            status={c.rail_out.status}
                            days={Math.round(c.rail_out.days)}
                          />
                        </td>
                        <td>
                          <StatusChip
                            status={c.do_validity.status}
                            days={Math.round(c.do_validity.days)}
                          />
                        </td>
                        <td>
                          <StatusChip
                            status={c.detention.status}
                            days={Math.round(c.detention.days)}
                          />
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
