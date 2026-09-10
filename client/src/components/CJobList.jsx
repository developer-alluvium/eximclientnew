import React, { useState, useEffect, useRef } from "react";
import "../styles/job-list.scss";
import useCustomerJobList from "../customHooks/useCustomerJobList";
import useFetchJobsData from "../customHooks/useFetchJobsData";
import { detailedStatusOptions } from "../assets/data/detailedStatusOptions";
import CJobListTable from "./CJobListTable";
import {
    Select,
    Input,
    Button,
    Typography,
    message,
    Pagination
} from "antd";
import { SearchOutlined, DownloadOutlined, SaveOutlined, SettingOutlined } from "@ant-design/icons";
import axios from "axios";
import { getJsonCookie, getCookie } from "../utils/cookies";
import { useImportersContext } from "../context/importersContext";
import { useNavigate } from "react-router-dom";
import ContainerModal from "./ContainerModal";
import ColumnSettingsModal from './Transport/ColumnSettingsModal';
import {
    FormControl,
    Select as MuiSelect,
    MenuItem,
    Checkbox,
    ListItemText,
    Box
} from "@mui/material";
import { downloadAllReport } from "../utils/downloadAllReport.jsx";

const { Option } = Select;
const { Title, Text } = Typography;

function CJobList(props) {
    const [years, setYears] = useState([]);
    const [selectedYear, setSelectedYear] = useState("");
    const [selectedDetailedStatus, setSelectedDetailedStatus] = useState([]);
    const detailedStatus = "all";
    const [custom_house, setCustomHouse] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [selectedExporter, setSelectedExporter] = useState("all");
    const [exporters, setExporters] = useState([]);
    const [downloadLoading, setDownloadLoading] = useState(false);

    const { importers, selectedImporter, setSelectedImporter } = useImportersContext();
    const [username, setUsername] = useState(null);
    const [userImporterName, setUserImporterName] = useState(null);
    const [ieCodeAssignments, setIeCodeAssignments] = useState([]);

    const [currentUserId, setCurrentUserId] = useState(null);
    const [userRole, setUserRole] = useState("user");

    const [columnOrder, setColumnOrder] = useState([]);
    const [allowedColumns, setAllowedColumns] = useState([]);
    const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
    const [isColumnOrderLoaded, setIsColumnOrderLoaded] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);

    const icdCodeOptions = ["ICD SACHANA", "ICD SANAND", "ICD KHODIYAR"];
    const navigate = useNavigate();

    // Use hook to fetch data
    const {
        rows,
        total,
        loading,
        handlePageChange,
        currentPage,
        fetchJobsData
    } = useFetchJobsData(
        detailedStatus,
        selectedYear,
        props.status,
        debouncedSearchQuery,
        selectedImporter,
        selectedExporter,
        custom_house,
        props.gandhidham,
        props.branch
    );

    // Custom hook for columns
    const {
        columns,
        containerModalOpen,
        handleModalClose,
        selectedContainer,
        selectedJob,
        modalInitialTab,
        renderQueryModals,
        fetchQueryStatusForJobs,
        sortJobsByQueryPriority,
    } = useCustomerJobList(detailedStatus, () => fetchJobsData(currentPage));

    // Premium status themes — inspired by ExportJobsTable
    const statusThemes = {
        "ETA Date Pending": { bg: "#f8fafc", border: "#94a3b8" },
        "Estimated Time of Arrival": { bg: "#ffffe0", border: "#facc15" },
        "Custom Clearance Completed": { bg: "#e6f3ff", border: "#0ea5e9" },
        "PCV Done, Duty Payment Pending": { bg: "#fff8e1", border: "#f59e0b" },
        "Discharged": { bg: "#ffe0b3", border: "#fb923c" },
        "BE Noted, Arrival Pending": { bg: "#f0e6ff", border: "#8b5cf6" },
        "BE Noted, Clearance Pending": { bg: "#f0e6ff", border: "#8b5cf6" },
        "Gateway IGM Filed": { bg: "#ffe0b3", border: "#fb923c" },
        "Rail Out": { bg: "#f0fdf4", border: "#22c55e" },
        "Billing Pending": { bg: "#fff7ed", border: "#f59e0b" },
        "Completed": { bg: "#f0fdfa", border: "#14b8a6" },
        "In Progress": { bg: "#fff3e0", border: "#fb923c" },
        "default": { bg: "transparent", border: "#e2e8f0" },
    };

    const getStatusTheme = (statusValue) =>
        statusThemes[statusValue] || statusThemes["default"];

    // Keep a simple bg-only helper for the status dot in the select
    const getStatusColor = (statusValue) => getStatusTheme(statusValue).bg;

    // Calculate job counts for each detailed status stage
    const detailedStatusCounts = React.useMemo(() => {
        if (!rows || rows.length === 0) return {};
        const counts = {};
        detailedStatusOptions.forEach(opt => {
            if (opt.value !== "all") counts[opt.value] = 0;
        });
        rows.forEach(row => {
            const st = (row.detailed_status || row.status || "").trim();
            detailedStatusOptions.forEach(opt => {
                if (opt.value === "all") return;
                const matches =
                    st === opt.value ||
                    st.toLowerCase() === opt.name.toLowerCase() ||
                    st.toLowerCase() === opt.value.toLowerCase() ||
                    (opt.value === "Custom Clearance Completed" && (st.includes("Clearance Completed") || st.includes("Custom Clearance")));
                if (matches) {
                    counts[opt.value] = (counts[opt.value] || 0) + 1;
                }
            });
        });
        return counts;
    }, [rows]);

    // Filter rows based on selected multi-select detailed statuses
    const filteredDisplayRows = React.useMemo(() => {
        if (!rows) return [];
        if (!selectedDetailedStatus || selectedDetailedStatus.length === 0 || selectedDetailedStatus.includes("all")) {
            return rows;
        }
        return rows.filter(row => {
            const st = (row.detailed_status || row.status || "").trim();
            return selectedDetailedStatus.some(selVal =>
                st === selVal ||
                st.toLowerCase() === selVal.toLowerCase() ||
                (selVal === "Custom Clearance Completed" && (st.includes("Clearance Completed") || st.includes("Custom Clearance")))
            );
        });
    }, [rows, selectedDetailedStatus]);

    // Download DSR Report in Excel format using ExcelJS helper
    const handleDownloadDSRReport = async () => {
        if (!filteredDisplayRows || filteredDisplayRows.length === 0) {
            message.warning("No jobs available to export");
            return;
        }
        setDownloadLoading(true);
        try {
            const statusLabel = props.status || "Pending";
            const stageLabel = selectedDetailedStatus.length > 0 && !selectedDetailedStatus.includes("all")
                ? selectedDetailedStatus.join(", ")
                : "All Stages";
            await downloadAllReport(filteredDisplayRows, statusLabel, stageLabel);
            message.success("Excel report downloaded successfully!");
        } catch (err) {
            console.error("Error downloading DSR report:", err);
            message.error("Failed to download DSR report");
        } finally {
            setDownloadLoading(false);
        }
    };

    // Initialize User from Cookie
    useEffect(() => {
        const userDataFromStorage = getJsonCookie("exim_user");
        if (userDataFromStorage) {
            try {
                const parsedUser = userDataFromStorage;
                const userId = parsedUser?._id;
                const role = parsedUser?.role || "customer";
                let importerName = parsedUser?.assignedImporterName;

                setCurrentUserId(userId);
                setUserRole(role);

                if (importerName || parsedUser?.ie_code_assignments?.length === 1) {
                    const nameToSet = importerName || parsedUser.ie_code_assignments[0].importer_name;
                    setUsername(nameToSet);
                    setUserImporterName(nameToSet);
                    setSelectedImporter(nameToSet);
                }
                setIeCodeAssignments(parsedUser?.ie_code_assignments || []);
            } catch (e) {
                console.error("Error parsing user data:", e);
            }
        }
    }, [setSelectedImporter]);

    // Fetch Exporters
    useEffect(() => {
        async function fetchExporters() {
            try {
                const baseApiUrl = process.env.REACT_APP_API_STRING || "";
                const exportersUrl = props.gandhidham
                    ? `${baseApiUrl}/gandhidham/get-exporters`
                    : `${baseApiUrl}/get-exporters`;

                const res = await axios.get(exportersUrl, {
                    params: {
                        importer: (selectedImporter && selectedImporter !== "All Importers") ? selectedImporter : undefined,
                        year: selectedYear,
                        status: props.status || "all",
                        branch: props.branch,
                    },
                });

                const uniqueExporters = [...new Set(res.data.exporters || [])].filter(
                    (exp) => exp && exp.trim() !== ""
                );
                setExporters(uniqueExporters);
            } catch (error) {
                console.error("Error fetching exporters:", error);
                setExporters([]);
            }
        }
        fetchExporters();
    }, [selectedImporter, selectedYear, props.status, props.gandhidham, props.branch]);

    // Reset Exporter on change
    useEffect(() => {
        setSelectedExporter("all");
    }, [selectedImporter, selectedYear]);

    // Fetch Column Order
    useEffect(() => {
        if (hasAttemptedFetch || !currentUserId) return;

        const fetchColumnOrder = async () => {
            setHasAttemptedFetch(true);
            const token = getCookie("access_token");
            if (!token) {
                setIsColumnOrderLoaded(true);
                return;
            }

            try {
                // In a real refactor, we would use the same endpoint but for now we reuse existing logic
                const res = await axios.get(
                    `${process.env.REACT_APP_API_STRING}/column-order`,
                    {
                        params: { userId: currentUserId },
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                // Set allowed columns logic (simplified from original)
                const backendAllowed = res.data.allowedColumns || [];
                const finalAllowed = userRole === "superadmin" || backendAllowed.length === 0
                    ? columns.map(c => c.accessorKey)
                    : backendAllowed;

                setAllowedColumns(finalAllowed);

                if (res.data.columnOrder?.length) {
                    setColumnOrder(res.data.columnOrder);
                } else {
                    setColumnOrder(finalAllowed);
                }
            } catch (err) {
                console.error("Failed to fetch column order", err);
                setColumnOrder(columns.map(c => c.accessorKey));
            } finally {
                setIsColumnOrderLoaded(true);
            }
        };

        fetchColumnOrder();
    }, [currentUserId, hasAttemptedFetch, userRole, columns]);


    const saveColumnOrderToBackend = async () => {
        const token = getCookie("access_token");
        if (!token || !currentUserId) return;

        try {
            await axios.post(
                `${process.env.REACT_APP_API_STRING}/user-management/users/columns/order`,
                { columnOrder },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUnsavedChanges(false);
            message.success("Layout saved successfully");
        } catch (err) {
            console.error("Failed to save layout", err);
            message.error("Failed to save layout");
        }
    };

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Hook calls moved to the top of the component to avoid temporal dead zone (TDZ) for columns.

    // Fetch Years
    useEffect(() => {
        async function getYears() {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-years`);
                const filteredYears = res.data.filter(y => y !== null);
                setYears(filteredYears);

                if (selectedYear === "" && filteredYears.length > 0) {
                    const currentYear = new Date().getFullYear();
                    const currentTwoDigits = String(currentYear).slice(-2);
                    const prevTwoDigits = String(currentYear - 1).slice(-2);
                    const nextTwoDigits = String(currentYear + 1).slice(-2);
                    const currentMonth = new Date().getMonth() + 1;

                    // Simple heuristic for default financial year
                    const defaultYearPair = currentMonth >= 4
                        ? `${currentTwoDigits}-${nextTwoDigits}` // e.g. 24-25
                        : `${prevTwoDigits}-${currentTwoDigits}`; // e.g. 23-24

                    // Match heuristic or fallback to first
                    // Note: The years from API might be in YYYY-YYYY or YY-YY format. 
                    // Assuming existing logic was correct for the data format.
                    const yearToSet = filteredYears.includes(defaultYearPair) ? defaultYearPair : filteredYears[0];
                    setSelectedYear(yearToSet);
                }
            } catch (e) {
                console.error("Error fetching years", e);
            }
        }
        getYears();
    }, []); // Run once

    // Fetch client query statuses for loaded jobs
    useEffect(() => {
        if (rows && rows.length > 0) {
            const jobNos = rows.map(r => r.job_no).filter(Boolean);
            fetchQueryStatusForJobs(jobNos);
        }
    }, [rows, fetchQueryStatusForJobs]);

    // Handle column order change from table
    const handleColumnOrderChange = (newOrder) => {
        setColumnOrder(newOrder);
        setUnsavedChanges(true);
    };

    return (
        <div className="jobs-list-layout">
            {/* Toolbar */}
            <div className="jobs-list-header">
                <div className="header-left">
                    <Text strong style={{ fontSize: '13px', color: '#1e293b', marginRight: '4px', fontFamily: "'Inter', sans-serif" }}>
                        {props.status} Jobs
                    </Text>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 26, height: 20, padding: '0 6px',
                        borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                        backgroundColor: '#eff6ff', color: '#2563eb',
                        border: '1px solid #bfdbfe', lineHeight: 1
                    }}>
                        {total}
                    </span>

                    {/* Years Select */}
                    {years.length > 0 && (
                        <Select
                            value={selectedYear}
                            onChange={setSelectedYear}
                            style={{ width: 100 }}
                            size="small"
                            placeholder="Year"
                        >
                            {years.map(y => <Option key={y} value={y}>{y}</Option>)}
                        </Select>
                    )}

                    {/* Download DSR Report Button */}
                    <Button
                        icon={<DownloadOutlined />}
                        loading={downloadLoading}
                        onClick={handleDownloadDSRReport}
                        size="small"
                        style={{
                            borderRadius: "6px",
                            borderColor: "#cbd5e1",
                            color: "#475569",
                            fontWeight: 600,
                            fontSize: "12px"
                        }}
                    >
                        {downloadLoading ? "Downloading..." : "Download DSR Report"}
                    </Button>

                    {/* Columns and Save Layout Buttons */}
                    <Button
                        icon={<SettingOutlined />}
                        onClick={() => setSettingsModalOpen(true)}
                        size="small"
                    >
                        Columns
                    </Button>

                    {unsavedChanges && (
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            size="small"
                            onClick={saveColumnOrderToBackend}
                        >
                            Save Layout
                        </Button>
                    )}
                </div>

                <div className="header-filters">
                    {/* Importer Select */}
                    {ieCodeAssignments && ieCodeAssignments.length > 1 && (
                        <Select
                            showSearch
                            value={selectedImporter || "All Importers"}
                            onChange={(val) => setSelectedImporter(val === "All Importers" ? null : val)}
                            style={{ width: 220 }}
                            size="small"
                            placeholder="Select Importer"
                            optionFilterProp="children"
                        >
                            <Option value="All Importers">All Importers</Option>
                            {ieCodeAssignments.map(a => (
                                <Option key={a.importer_name} value={a.importer_name}>{a.importer_name}</Option>
                            ))}
                        </Select>
                    )}

                    {/* ICD/Port Select */}
                    <Select
                        value={custom_house}
                        onChange={setCustomHouse}
                        style={{ width: 140 }}
                        size="small"
                    >
                        <Option value="all">Select ICD</Option>
                        {icdCodeOptions.map(p => <Option key={p} value={p}>{p}</Option>)}
                    </Select>

                    {/* Detailed Status Select (Multi-Select Stage Dropdown with Checkboxes and Counts) */}
                    <FormControl size="small" sx={{ width: 180, minWidth: 160 }}>
                        <MuiSelect
                            multiple
                            value={selectedDetailedStatus}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSelectedDetailedStatus(typeof value === 'string' ? value.split(',') : value);
                            }}
                            displayEmpty
                            renderValue={(selected) => {
                                if (!selected || selected.length === 0 || selected.includes("all")) {
                                    return <em style={{ fontSize: "12px", color: "#64748b", fontStyle: "normal" }}>All Detailed Status</em>;
                                }
                                return <span style={{ fontSize: "12px", fontWeight: 600 }}>{selected.join(", ")}</span>;
                            }}
                            sx={{
                                height: 28,
                                bgcolor: selectedDetailedStatus.length > 0 && !selectedDetailedStatus.includes("all") ? "#eff6ff" : "#fff",
                                fontSize: "12px",
                                borderRadius: "6px",
                                "& .MuiSelect-select": {
                                    py: 0.5,
                                    px: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    color: selectedDetailedStatus.length > 0 && !selectedDetailedStatus.includes("all") ? "#1d4ed8" : "#1e293b"
                                },
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: selectedDetailedStatus.length > 0 && !selectedDetailedStatus.includes("all") ? "#3b82f6" : "#cbd5e1"
                                }
                            }}
                        >
                            {detailedStatusOptions.map((opt) => {
                                if (opt.value === "all") return null;
                                const statusValue = opt.value;
                                const statusName = opt.name;
                                const count = detailedStatusCounts[statusValue] !== undefined ? detailedStatusCounts[statusValue] : 0;
                                const theme = getStatusTheme(statusValue);
                                const isChecked = selectedDetailedStatus.indexOf(statusValue) > -1;

                                return (
                                    <MenuItem key={statusValue} value={statusValue} sx={{ py: 0.5, fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <Box sx={{ display: "flex", alignItems: "center" }}>
                                            <Checkbox size="small" checked={isChecked} sx={{ p: 0.5 }} />
                                            <span style={{
                                                display: "inline-block",
                                                width: 8,
                                                height: 8,
                                                borderRadius: "50%",
                                                backgroundColor: theme.border || "#3b82f6",
                                                marginRight: 8,
                                                marginLeft: 2
                                            }} />
                                            <ListItemText primary={statusName} primaryTypographyProps={{ fontSize: "12px", fontWeight: 500 }} />
                                        </Box>
                                        <span style={{
                                            fontSize: "11px",
                                            backgroundColor: "#f1f5f9",
                                            color: "#334155",
                                            padding: "1px 7px",
                                            borderRadius: "10px",
                                            fontWeight: "700",
                                            marginLeft: "12px",
                                            border: "1px solid #cbd5e1"
                                        }}>
                                            {count}
                                        </span>
                                    </MenuItem>
                                );
                            })}
                        </MuiSelect>
                    </FormControl>

                    {/* Exporter Select */}
                    <Select
                        showSearch
                        value={selectedExporter === "all" ? "All Exporters" : selectedExporter}
                        onChange={(val) => setSelectedExporter(val === "All Exporters" ? "all" : val)}
                        style={{ width: 200 }}
                        size="small"
                        placeholder="Select Exporter"
                    >
                        <Option value="All Exporters">All Exporters</Option>
                        {exporters.map((exp, idx) => (
                            <Option key={`${exp}-${idx}`} value={exp}>{exp}</Option>
                        ))}
                    </Select>

                    {/* Search */}
                    <Input
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: 200 }}
                        size="small"
                        allowClear
                    />
                </div>
            </div>

            {/* Table Content */}
            <div className="jobs-list-content">
                <CJobListTable
                    data={sortJobsByQueryPriority(filteredDisplayRows)}
                    columns={columns}
                    columnOrder={columnOrder}
                    setColumnOrder={handleColumnOrderChange}
                    isLoading={loading}
                    getStatusColor={getStatusColor}
                    getStatusTheme={getStatusTheme}
                />
            </div>

            {/* Pagination in Footer */}
            <div className="pagination-wrapper">
                <Pagination
                    current={currentPage}
                    pageSize={100}
                    total={total}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                />
            </div>

            {/* Render Modals returned by hook */}
            {renderQueryModals && renderQueryModals()}

            <ContainerModal
                open={containerModalOpen}
                onClose={handleModalClose}
                container={selectedContainer}
                jobData={selectedJob}
                initialTab={modalInitialTab}
            />

            <ColumnSettingsModal
                open={settingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
                columns={columns.map(c => ({ id: c.accessorKey || c.id, header: c.header }))}
                columnOrder={columnOrder}
                onSave={(newOrder) => handleColumnOrderChange(newOrder)}
            />
        </div>
    );
}

export default CJobList;
