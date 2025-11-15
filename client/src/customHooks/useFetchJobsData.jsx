import { useEffect, useState } from "react";
import axios from "axios";

// Helper function to extract IE codes from user data (same as backend)
const extractUserIECodes = (user) => {
  if (!user) return [];

  const ieCodes = [];

  // Handle new ie_code_assignments structure
  if (user.ie_code_assignments) {
    if (Array.isArray(user.ie_code_assignments)) {
      // Multiple assignments (existing functionality)
      user.ie_code_assignments.forEach((assignment) => {
        if (assignment && assignment.ie_code_no) {
          ieCodes.push(assignment.ie_code_no.toUpperCase().trim());
        }
      });
    } else if (user.ie_code_assignments.ie_code_no) {
      // Single assignment as object (new compatibility)
      ieCodes.push(user.ie_code_assignments.ie_code_no.toUpperCase().trim());
    }
  }

  // Fallback to legacy field
  if (ieCodes.length === 0 && user.ie_code_no) {
    ieCodes.push(user.ie_code_no.toUpperCase().trim());
  }

  return [...new Set(ieCodes.filter((code) => code && code.length > 0))];
};

// Helper function to extract importers from user data
const extractUserImporters = (user) => {
  if (!user) return [];

  const importers = [];

  if (user.ie_code_assignments) {
    if (Array.isArray(user.ie_code_assignments)) {
      // Multiple assignments
      user.ie_code_assignments.forEach((assignment) => {
        if (assignment && assignment.importer_name) {
          importers.push({
            ie_code_no: assignment.ie_code_no,
            importer_name: assignment.importer_name.trim(),
          });
        }
      });
    } else if (user.ie_code_assignments.importer_name) {
      // Single assignment as object
      importers.push({
        ie_code_no: user.ie_code_assignments.ie_code_no,
        importer_name: user.ie_code_assignments.importer_name.trim(),
      });
    }
  }

  console.log("Extracted importers:", importers);

  return importers;
};

function useFetchJobsData(
  detailedStatus,
  selectedYear,
  status,
  searchQuery,
  selectedImporter,
  selectedExporter = "all",
  custom_house = "all",
  gandhidham = false
) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchJobsData = async (page = 1) => {
    // Don't attempt to fetch if we don't have the minimum required parameters
    if (!selectedYear || !status) {
      console.log("Skipping fetch - missing required parameters", {
        selectedYear,
        status,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userDataFromStorage = localStorage.getItem("exim_user");
      const userData = userDataFromStorage
        ? JSON.parse(userDataFromStorage)
        : null;

      // Extract IE codes and importers using helper functions
      const userIECodes = extractUserIECodes(userData);
      const userImporters = extractUserImporters(userData);

      console.log("Extracted IE codes:", userIECodes);
      console.log("Extracted importers:", userImporters);

      // If we have IE code assignments, use the multiple IE codes endpoint
      if (userIECodes.length > 0) {
        const apiString = process.env.REACT_APP_API_STRING || "";
        const formattedSearchQuery = searchQuery
          ? encodeURIComponent(searchQuery)
          : "";
        const formattedExporter =
          selectedExporter && selectedExporter !== "all"
            ? encodeURIComponent(selectedExporter)
            : "";

        let selectedIeCodes = "";
        let importerToFilter = "";

        if (
          selectedImporter &&
          selectedImporter !== "all" &&
          selectedImporter !== "All Importers"
        ) {
          // Find the matching assignment for the selected importer
          const matchingImporter = userImporters.find(
            (importer) => importer.importer_name === selectedImporter
          );

          if (matchingImporter) {
            selectedIeCodes = matchingImporter.ie_code_no;
            importerToFilter = encodeURIComponent(
              matchingImporter.importer_name
            );
          } else {
            // If selected importer not found in ie_code_assignments, use all IE codes without importer filter
            console.warn(
              "⚠️ Selected importer not found in IE code assignments:",
              selectedImporter
            );
            selectedIeCodes = userIECodes.join(",");
            importerToFilter = ""; // Don't filter by importer since it's not in assignments
          }
        } else {
          // If no importer selected or "All Importers" is chosen, use all IE codes
          selectedIeCodes = userIECodes.join(",");
          importerToFilter = ""; // Omit importers param in this case
        }

        // Build API URL conditionally: only add importers param if importerToFilter is present
        // let apiUrl = `${apiString}/${selectedYear}/jobs/${status}/${detailedStatus}/${custom_house}/multiple?ieCodes=${selectedIeCodes}`;
        console.log("Gandhidham flag:", gandhidham);
        let apiUrl;
        if (gandhidham) {
          apiUrl = `${apiString}/gandhidham/${selectedYear}/jobs/${status}/${detailedStatus}/${custom_house}/multiple?ieCodes=${selectedIeCodes}`;
        } else {
          apiUrl = `${apiString}/${selectedYear}/jobs/${status}/${detailedStatus}/${custom_house}/multiple?ieCodes=${selectedIeCodes}`;
        }

        if (importerToFilter) {
          apiUrl += `&importer=${importerToFilter}`;
        }
        apiUrl += `&page=${page}&limit=100&search=${formattedSearchQuery}`;
        if (formattedExporter) {
          apiUrl += `&exporter=${formattedExporter}`;
        }

        console.log("Fetching jobs data with IE codes from:", apiUrl);

        const response = await axios.get(apiUrl);
        const { data, total, totalPages, currentPage } = response.data;

        setRows(data || []);
        setTotal(total || 0);
        setTotalPages(totalPages || 1);
        setCurrentPage(currentPage || 1);

        console.log(
          `✅ Fetched ${
            data?.length || 0
          } jobs using IE codes: ${selectedIeCodes}`
        );
        return;
      }

      // If no IE code assignments, use the original importer-based endpoint
      console.log(
        "⚠️ No IE code assignments found, falling back to importer-based endpoint"
      );

      const cleanImporter = selectedImporter
        ? selectedImporter.replace(/\u00A0/g, " ").trim()
        : null;

      const formattedImporter = cleanImporter
        ? encodeURIComponent(cleanImporter)
        : "all";

      console.log("Original importer:", selectedImporter);
      console.log("Cleaned importer:", cleanImporter);
      console.log("Formatted importer:", formattedImporter);

      const formattedSearchQuery = searchQuery
        ? encodeURIComponent(searchQuery)
        : "";
      const formattedExporter =
        selectedExporter && selectedExporter !== "all"
          ? encodeURIComponent(selectedExporter)
          : "";
      const apiString = process.env.REACT_APP_API_STRING || "";

      if (!apiString) {
        console.error("API_STRING environment variable is not defined");
        setError("API configuration error");
        return;
      }

      let apiUrl;
      if (gandhidham) {
        apiUrl = `${apiString}/gandhidham/${selectedYear}/jobs/${status}/${detailedStatus}/${formattedImporter}?page=${page}&limit=100&search=${formattedSearchQuery}${
          formattedExporter ? `&exporter=${formattedExporter}` : ""
        }`;
      } else {
        apiUrl = `${apiString}/${selectedYear}/jobs/${status}/${detailedStatus}/${formattedImporter}?page=${page}&limit=100&search=${formattedSearchQuery}${
          formattedExporter ? `&exporter=${formattedExporter}` : ""
        }`;
      }

      console.log("Fetching jobs data from fallback endpoint:", apiUrl);

      const response = await axios.get(apiUrl);
      const { data, total, totalPages, currentPage } = response.data;
      setRows(data || []);
      setTotal(total || 0);
      setTotalPages(totalPages || 1);
      setCurrentPage(currentPage || 1);

      console.log(
        `✅ Fetched ${data?.length || 0} rows successfully for importer: ${
          cleanImporter || "all"
        }`
      );
    } catch (error) {
      console.error("❌ Error fetching job list:", error);
      setError(error.message || "Failed to fetch job data");
      // Keep the previous data instead of clearing it on error
    } finally {
      setLoading(false);
    }
  };

  // This effect handles initial and filter-based data fetching
  useEffect(() => {
    console.log("🔄 Filter dependencies changed:", {
      detailedStatus,
      selectedYear,
      status,
      searchQuery,
      selectedImporter,
      selectedExporter,
      custom_house,
    });

    // Always attempt to fetch if we have the year
    if (selectedYear) {
      setCurrentPage(1);
      fetchJobsData(1);
    }
  }, [
    detailedStatus,
    selectedYear,
    status,
    searchQuery,
    selectedImporter,
    selectedExporter,
    custom_house,
  ]);

  // Handle manual page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchJobsData(newPage);
  };

  return {
    rows,
    total,
    totalPages,
    currentPage,
    loading,
    error,
    handlePageChange,
    fetchJobsData,
  };
}

export default useFetchJobsData;
