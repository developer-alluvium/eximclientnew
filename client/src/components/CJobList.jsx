import React, { useState, useEffect, useRef } from "react";
import "../styles/job-list.scss";
import useCustomerJobList from "../customHooks/useCustomerJobList";
import { getTableRowsClassname } from "../utils/getTableRowsClassname";
import useFetchJobsData from "../customHooks/useFetchJobsData";
import { detailedStatusOptions } from "../assets/data/detailedStatusOptions";
import ContainerModal from "./ContainerModal";
import {
  MenuItem,
  TextField,
  IconButton,
  Typography,
  Pagination,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Button,
  Autocomplete,
  Box,
  useTheme,
  useMediaQuery,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DownloadIcon from "@mui/icons-material/Download";
import SelectImporterModal from "./CSelectImporterModal";
import { useNavigate } from "react-router-dom";
import { useImportersContext } from "../context/importersContext";
import SaveIcon from "@mui/icons-material/Save";

function CJobList(props) {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [detailedStatus, setDetailedStatus] = useState("all");
  const [custom_house, setCustomHouse] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedExporter, setSelectedExporter] = useState("all");
  const [exporters, setExporters] = useState([]);
  const {
    columns,
    containerModalOpen,
    handleModalClose,
    selectedContainer,
    transporterModal,
  } = useCustomerJobList(detailedStatus);
  const { importers } = useImportersContext();
  const [username, setUsername] = useState(null);
  const { selectedImporter, setSelectedImporter } = useImportersContext();
  const [userImporterName, setUserImporterName] = useState(null);
  const [ieCodeAssignments, setIeCodeAssignments] = useState([]);

  // Ref for table container scroll handling
  const tableContainerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollPosition, setScrollPosition] = useState({ left: 0, x: 0 });

  const [currentUserId, setCurrentUserId] = useState(null);
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();

  const [columnOrder, setColumnOrder] = useState([]);
  const [allowedColumns, setAllowedColumns] = useState([]);
  const [userRole, setUserRole] = useState("user");
  const [isColumnOrderLoaded, setIsColumnOrderLoaded] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [tableKey, setTableKey] = useState(0); // Force table re-render on resize
  const icdCodeOptions = ["ICD SACHANA", "ICD SANAND", "ICD KHODIYAR"];

  // Responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Function to get background color based on status
  const getStatusColor = (statusValue) => {
    switch (statusValue) {
      case "ETA Date Pending":
        return "#ffffff"; // White
      case "Estimated Time of Arrival":
        return "#ffffe0"; // Light Yellow
      case "Custom Clearance Completed":
        return "#e6f3ff"; // Light Blue
      case "PCV Done, Duty Payment Pending":
        return "#fff8e1"; // Light orange/cream
      case "Discharged":
        return "#ffe0b3"; // Light Orange
      case "BE Noted, Arrival Pending":
        return "#f0e6ff"; // Light Purple
      case "BE Noted, Clearance Pending":
        return "#f0e6ff"; // Light Purple
      case "Gateway IGM Filed":
        return "#ffe0b3"; // Light Orange
      case "Rail Out":
        return "#f0fff0"; // Honeydew background
      case "Billing Pending":
        return "#ffe4e1"; // Misty rose background
      case "Completed":
        return "#e8f5e9"; // Light green
      case "In Progress":
        return "#fff3e0"; // Light orange
      default:
        return "transparent"; // Default transparent background
    }
  };

  // Get username and importer name from localStorage
  useEffect(() => {
    const userDataFromStorage = localStorage.getItem("exim_user");
    if (userDataFromStorage) {
      try {
        const parsedUser = JSON.parse(userDataFromStorage);
        const userId = parsedUser?.id;
        const role = parsedUser?.role || "customer";

        let importerName = parsedUser?.assignedImporterName;
        if (
          !importerName &&
          parsedUser?.ie_code_assignments &&
          parsedUser.ie_code_assignments.length > 0
        ) {
          importerName = parsedUser.ie_code_assignments[0].importer_name;
        }

        setCurrentUserId(userId);
        setUserRole(role);

        if (importerName) {
          setUsername(importerName);
          setUserImporterName(importerName);
          setSelectedImporter(importerName);
        }

        setIeCodeAssignments(parsedUser?.ie_code_assignments || []);

        console.log("Importer name set from useEffect:", importerName);
      } catch (e) {
        console.error("Error parsing user data from storage:", e);
      }
    }
  }, []);

  // Add effect to fetch exporters when selectedImporter changes
  useEffect(() => {
    async function fetchExporters() {
      if (!selectedImporter || selectedImporter === "all") {
        setExporters([]);
        setSelectedExporter("all");
        return;
      }

      try {
        const baseApiUrl = process.env.REACT_APP_API_STRING || "";
        const exportersUrl = props.gandhidham
          ? `${baseApiUrl}/gandhidham/get-exporters`
          : `${baseApiUrl}/get-exporters`;

        const res = await axios.get(exportersUrl, {
          params: {
            importer: selectedImporter,
            year: selectedYear,
            status: props.status || "all",
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
  }, [selectedImporter, selectedYear, props.status, props.gandhidham]);

  // Reset exporter selection when importer or year changes
  useEffect(() => {
    setSelectedExporter("all");
  }, [selectedImporter, selectedYear]);

  // Force table re-render when screen size changes significantly
  useEffect(() => {
    setTableKey((prev) => prev + 1);
  }, []);

  // Track if column order has been fetched

  // Fixed useEffect hook - replace the problematic section around lines 170-295
  useEffect(() => {
    if (hasAttemptedFetch || !currentUserId) {
      return;
    }

    const fetchColumnOrder = async () => {
      setHasAttemptedFetch(true);

      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("Authentication token not found.");
        setIsColumnOrderLoaded(true);
        return;
      }

      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/column-order`,
          {
            params: { userId: currentUserId },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Set allowed columns based on user role and backend response
        if (userRole === "superadmin") {
          setAllowedColumns(columns.map((col) => col.accessorKey));
        } else {
          const userAllowedColumns =
            res.data.allowedColumns && res.data.allowedColumns.length > 0
              ? res.data.allowedColumns
              : columns.map((col) => col.accessorKey);
          setAllowedColumns(userAllowedColumns);
        }

        if (res.data.columnOrder?.length) {
          setColumnOrder(res.data.columnOrder);
        } else {
          const allowedCols =
            userRole === "superadmin"
              ? columns.map((col) => col.accessorKey)
              : res.data.allowedColumns && res.data.allowedColumns.length > 0
              ? res.data.allowedColumns
              : columns.map((col) => col.accessorKey);
          setColumnOrder(allowedCols);
        }

        // Check if user info was returned and update localStorage if there's a mismatch
        //   if (res.data.userInfo && res.data.userInfo.id !== currentUserId) {
        //     const userDataFromStorage = localStorage.getItem("exim_user");
        //     if (userDataFromStorage) {
        //       try {
        //         const parsedUser = JSON.parse(userDataFromStorage);

        //         if (parsedUser.data && parsedUser.data.user) {
        //           parsedUser.data.user.id = res.data.userInfo.id;
        //           parsedUser.data.user.name = res.data.userInfo.name;
        //           parsedUser.data.user.ie_code_no = res.data.userInfo.ie_code_no;
        //         } else {
        //           parsedUser.id = res.data.userInfo.id;
        //           parsedUser.name = res.data.userInfo.name;
        //           parsedUser.ie_code_no = res.data.userInfo.ie_code_no;
        //         }

        //         localStorage.setItem("exim_user", JSON.stringify(parsedUser));

        //         setCurrentUserId(res.data.userInfo.id);
        //         setUsername(res.data.userInfo.name);
        //         setUserImporterName(res.data.userInfo.name);
        //         setSelectedImporter(res.data.userInfo.name);

        //       } catch (e) {
        //         console.error("Error updating user data in storage:", e);
        //       }
        //     }
        //   }
        // } catch (err) {
        //   console.error("Failed to fetch column order", err);

        // if (err.response?.status === 404 && err.response?.data?.suggestion) {
        //   console.warn("User session appears to be stale. Consider logging out and back in.");
        // }

        const defaultOrder = columns.map((col) => col.accessorKey);
        setColumnOrder(defaultOrder);
      } finally {
        setIsColumnOrderLoaded(true);
      }
    };

    fetchColumnOrder();
  }, [currentUserId, hasAttemptedFetch, userRole, columns]);

  // Fixed saveColumnOrderToBackend function
  const saveColumnOrderToBackend = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      console.warn("No token found. Cannot save column layout.");
      return;
    }

    if (!currentUserId) {
      console.warn("No user ID found. Cannot save column layout.");
      return;
    }

    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/user-management/users/columns/order`,
        {
          columnOrder: columnOrder,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setUnsavedChanges(false);
      console.log("Column order saved successfully");
    } catch (err) {
      console.error("Failed to save column order", err);
    }
  };

  // Track dependencies for job fetching
  useEffect(() => {
    if (selectedImporter) {
      //console.log("Ready to fetch jobs with importer:", selectedImporter);
    }
  }, [
    selectedImporter,
    detailedStatus,
    custom_house,
    selectedYear,
    props.status,
    debouncedSearchQuery,
    selectedExporter,
  ]);
  const {
    rows,
    total,
    totalPages,
    currentPage,
    handlePageChange,
    fetchJobsData,
  } = useFetchJobsData(
    detailedStatus,
    selectedYear,
    props.status,
    debouncedSearchQuery,
    selectedImporter,
    selectedExporter,
    custom_house, // <-- Place custom_house here
    props.gandhidham // <-- Place gandhidham after
  );

  useEffect(() => {
    async function getYears() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-years`
        );
        const filteredYears = res.data.filter((year) => year !== null);
        setYears(filteredYears);

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const prevTwoDigits = String((currentYear - 1) % 100).padStart(2, "0");
        const currentTwoDigits = String(currentYear).slice(-2);
        const nextTwoDigits = String((currentYear + 1) % 100).padStart(2, "0");

        let defaultYearPair =
          currentMonth >= 4
            ? `${currentTwoDigits}-${nextTwoDigits}`
            : `${prevTwoDigits}-${currentTwoDigits}`;

        if (selectedYear === "" && filteredYears.length > 0) {
          const yearToSet = filteredYears.includes(defaultYearPair)
            ? defaultYearPair
            : filteredYears[0];
          setSelectedYear(yearToSet || "");
        }
      } catch (error) {
        console.error("Error fetching years:", error);
      }
    }
    getYears();
  }, []); // No dependencies to prevent resets

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Load IE code assignments from localStorage
  useEffect(() => {
    const userDataFromStorage = localStorage.getItem("exim_user");
    if (userDataFromStorage) {
      const userData = JSON.parse(userDataFromStorage);
      setIeCodeAssignments(userData?.ie_code_assignments || []);
    }
  }, []);

  // Table scroll handlers
  const mouseDownHandler = (e) => {
    // Only activate on left mouse button (mousedown event) or on touch devices
    if (e.button !== 0 && e.type !== "touchstart") return;

    // Stop event propagation to prevent any other handlers
    e.stopPropagation();

    const table = tableContainerRef.current;
    if (!table) return;

    // Get the current scroll position and mouse/touch position
    const startPosition = {
      left: table.scrollLeft,
      x: e.clientX || (e.touches ? e.touches[0].clientX : 0),
    };

    setIsScrolling(true);
    setScrollPosition(startPosition);

    // Prevent text selection during dragging
    document.body.style.userSelect = "none";
  };

  const mouseMoveHandler = (e) => {
    if (!isScrolling) return;

    // Prevent default behavior like text selection
    e.preventDefault();

    const table = tableContainerRef.current;
    if (!table) return;

    // Calculate how far the mouse has moved
    const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
    const dx = clientX - scrollPosition.x;
    const speed = 1.5; // Increase this value to make scrolling faster
    const newScrollLeft = scrollPosition.left - dx * speed;

    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      // Update scroll position with easing
      table.scrollLeft = newScrollLeft;

      // Update the scroll position state with the new mouse position
      setScrollPosition({
        left: newScrollLeft,
        x: clientX,
      });
    });
  };

  const mouseUpHandler = () => {
    setIsScrolling(false);
    document.body.style.userSelect = "";
  };

  // Add/remove event listeners
  useEffect(() => {
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
    document.addEventListener("touchmove", mouseMoveHandler);
    document.addEventListener("touchend", mouseUpHandler);

    return () => {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
      document.removeEventListener("touchmove", mouseMoveHandler);
      document.removeEventListener("touchend", mouseUpHandler);
    };
  }, [isScrolling, scrollPosition]);
  const table = useMaterialReactTable({
    // Filter columns based on user role and permissions
    // SuperAdmin can see all columns, regular users can only see their allowed columns
    columns: columns.filter(
      (col) =>
        userRole === "superadmin" || allowedColumns.includes(col.accessorKey)
    ),
    data: rows.map((row, index) => ({ ...row, id: row._id || `row-${index}` })),
    enableColumnResizing: true,
    state: {
      // Also filter column order to match allowed columns
      columnOrder: columnOrder.filter(
        (colKey) => userRole === "superadmin" || allowedColumns.includes(colKey)
      ),
    },
    onColumnOrderChange: (newOrder) => {
      // Allow all users to change column order
      setColumnOrder(newOrder);
      setUnsavedChanges(true);
    },
    enableColumnOrdering: true, // Enable for all users
    enablePagination: false,
    enableBottomToolbar: false,
    enableDensityToggle: false,

    // Ensure proper event handling
    enableClickToPause: true,
    muiTableOptions: {
      sx: {
        tableLayout: "fixed",
      },
    },
    initialState: {
      density: "compact",
      columnPinning: { left: ["job_no"] },
    },
    enableGlobalFilter: false,
    enableGrouping: false, // Disable grouping to prevent event interference
    enableColumnFilters: false,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableColumnActions: false, // Enable for all users
    enableStickyHeader: true,
    enablePinning: true,
    enableRowActions: false,
    muiTableBodyCellProps: {
      sx: { cursor: "default" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef,
      onMouseDown: (e) => {
        if (e.target === tableContainerRef.current) {
          mouseDownHandler(e);
        }
      },
      onTouchStart: (e) => {
        if (e.target === tableContainerRef.current) {
          mouseDownHandler(e);
        }
      },
      sx: {
        maxHeight: {
          xs: "calc(100vh - 350px)",
          sm: "calc(100vh - 300px)",
          md: "590px",
        },
        overflowY: "auto",
        overflowX: "auto",
        cursor: isScrolling ? "grabbing" : "grab",
        willChange: "scroll-position",
        WebkitOverflowScrolling: "touch",
        transform: "translateZ(0)",
        width: "100%",
        minHeight: { xs: "300px", sm: "400px" },
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      sx: {
        textAlign: "center",
        backgroundColor: getStatusColor(row.original.detailed_status),
      },
      onClick: (e) => e.stopPropagation(),
    }),
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
    renderTopToolbarCustomActions: () => (
      <div
        style={{
          display: "flex",
          // flexDirection: "column",
          alignItems: "flex-start",
          width: "100%",
          gap: "12px",
          padding: isMobile ? "8px 0" : "0",
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontWeight: "bold",
            fontSize: { xs: "1.1rem", sm: "1.3rem", md: "1.5rem" },
            textAlign: "left",
            flexShrink: 0,
          }}
        >
          {props.status} Jobs: {total}
        </Typography>

        <div
          style={{
            display: "flex",
            // flexDirection: isMobile ? "row" : "row",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: isMobile ? "8px" : "12px",
            width: isMobile ? "100%" : "auto",
            flexWrap: "wrap",
          }}
        >
          <TextField
            select
            defaultValue={years[0]}
            size="small"
            value={selectedYear || ""}
            onChange={(e) => {
              setSelectedYear(e.target.value);
            }}
            sx={{
              width: { xs: "80px", sm: "80px" },
              minWidth: "80px",
              "& .MuiInputBase-input": {
                fontSize: "0.75rem",
                padding: "6px 8px",
              },
            }}
          >
            {years.map((year, index) => (
              <MenuItem key={`year-${year}-${index}`} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>

          {ieCodeAssignments && ieCodeAssignments.length > 1 && (
            <Autocomplete
              size="small"
              options={[
                "All Importers",
                ...(ieCodeAssignments?.map(
                  (assignment) => assignment.importer_name
                ) || []),
              ]}
              value={selectedImporter || "All Importers"}
              onChange={(event, newValue) => {
                setSelectedImporter(
                  newValue === "All Importers" ? null : newValue
                );
              }}
              sx={{
                width: { xs: "200px", sm: "250px", md: "300px" },
                minWidth: "200px",
                "& .MuiInputBase-input": {
                  fontSize: "0.75rem",
                  padding: "6px 8px",
                },
              }}
              renderInput={(params) => (
                <TextField {...params} placeholder="Select Importer" />
              )}
              isOptionEqualToValue={(option, value) => {
                if (value === "All Importers" && option === "All Importers")
                  return true;
                if (
                  value !== "All Importers" &&
                  option !== "All Importers" &&
                  option === value
                )
                  return true;
                return false;
              }}
            />
          )}

          <TextField
            select
            label="Select ICD"
            value={custom_house}
            onChange={(e) => setCustomHouse(e.target.value)}
            size="small"
            sx={{ minWidth: "140px", fontSize: "0.75rem" }}
          >
            <MenuItem value="all">Select ICD</MenuItem>
            {icdCodeOptions.map((port) => (
              <MenuItem key={port} value={port}>
                {port}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={detailedStatus}
            onChange={(e) => {
              setDetailedStatus(e.target.value);
            }}
            sx={{
              width: { xs: "180px", sm: "200px", md: "220px" },
              minWidth: "180px",
              "& .MuiInputBase-input": {
                fontSize: "0.75rem",
                padding: "6px 8px",
              },
            }}
          >
            {detailedStatusOptions.map((option, index) => (
              <MenuItem
                key={`status-${option.id || option.value || index}`}
                value={option.value}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontSize: "0.75rem",
                }}
              >
                {option.value !== "all" && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: getStatusColor(option.value),
                      border: "1px solid #666",
                      marginRight: "6px",
                      flexShrink: 0,
                    }}
                  />
                )}
                {option.name}
              </MenuItem>
            ))}
          </TextField>

          <Autocomplete
            size="small"
            options={["All Exporters", ...exporters]}
            value={
              selectedExporter === "all" ? "All Exporters" : selectedExporter
            }
            onChange={(event, newValue) => {
              const value =
                newValue === "All Exporters" ? "all" : newValue || "all";
              setSelectedExporter(value);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Exporter"
                variant="outlined"
                sx={{
                  width: { xs: "180px", sm: "200px", md: "220px" },
                  minWidth: "180px",
                  "& .MuiInputBase-input": {
                    fontSize: "0.75rem",
                    padding: "6px 8px",
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: "0.75rem",
                  },
                }}
              />
            )}
            sx={{
              width: { xs: "180px", sm: "200px", md: "220px" },
              minWidth: "180px",
            }}
            isOptionEqualToValue={(option, value) => {
              if (value === "All Exporters" && option === "All Exporters")
                return true;
              if (
                value !== "All Exporters" &&
                option !== "All Exporters" &&
                option === value
              )
                return true;
              return false;
            }}
          />

          <TextField
            placeholder="Search by Job No, Importer, or AWB/BL Number"
            size="small"
            variant="outlined"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      fetchJobsData(1);
                    }}
                  >
                    <SearchIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: "200px", sm: "220px", md: "250px" },
              minWidth: "200px",
              "& .MuiInputBase-input": {
                fontSize: "0.75rem",
                padding: "6px 8px",
              },
            }}
          />

          {unsavedChanges && (
            <Button
              startIcon={<SaveIcon fontSize="small" />}
              variant="contained"
              color="primary"
              size="small"
              onClick={saveColumnOrderToBackend}
              sx={{
                minWidth: { xs: "100%", sm: "auto" },
                height: "32px",
                fontSize: "0.75rem",
                padding: "4px 8px",
              }}
            >
              Save Layout
            </Button>
          )}
        </div>
      </div>
    ),
  });

  return (
    <div
      className={`table-container ${isScrolling ? "dragging" : ""}`}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        width: "100%",
        marginTop: "-16px",
      }}
    >
      {/* Show a notification to users if their column visibility is restricted */}
      {userRole !== "superadmin" &&
        allowedColumns.length > 0 &&
        allowedColumns.length < columns.length}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <MaterialReactTable key={tableKey} table={table} />
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: "16px 0",
          borderTop: "1px solid #e0e0e0",
          backgroundColor: "white",
        }}
      >
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={(page) => {
            handlePageChange(page);
          }}
          color="primary"
          size={isMobile ? "small" : "medium"}
          siblingCount={isMobile ? 0 : 1}
          boundaryCount={isMobile ? 1 : 2}
          sx={{
            display: "flex",
            justifyContent: "center",
            "& .MuiPaginationItem-root": {
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              minWidth: { xs: "24px", sm: "32px" },
              height: { xs: "24px", sm: "32px" },
            },
          }}
        />
      </div>

      <SelectImporterModal
        open={open}
        handleClose={() => {
          handleClose();
        }}
        status={props.status}
        detailedStatus={detailedStatus}
        selectedImporter={userImporterName}
        custom_house={custom_house}
      />

      {/* Container Modal */}
      <ContainerModal
        open={containerModalOpen}
        onClose={handleModalClose}
        container={selectedContainer}
      />

      {/* Transporter Modal */}
      {transporterModal}
    </div>
  );
}

export default React.memo(CJobList);
