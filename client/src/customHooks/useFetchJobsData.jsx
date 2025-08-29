import { useEffect, useState } from "react";
import axios from "axios";

function useFetchJobsData(
  detailedStatus,
  selectedYear,
  status,
  searchQuery,
  selectedImporter,
  selectedExporter = "all",
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
      const ieCodeAssignments = localStorage.getItem('ieCodeAssignments');
      
      // If we have IE code assignments, use the multiple IE codes endpoint
      if (ieCodeAssignments) {
        const apiString = process.env.REACT_APP_API_STRING || "";
        const formattedSearchQuery = searchQuery ? encodeURIComponent(searchQuery) : "";
        const formattedExporter = selectedExporter && selectedExporter !== "all"
          ? encodeURIComponent(selectedExporter)
          : "";

        let apiUrl = `${apiString}/${selectedYear}/jobs/${status}/${detailedStatus}/multiple?ieCodes=${ieCodeAssignments}&page=${page}&limit=100&search=${formattedSearchQuery}${formattedExporter ? `&exporter=${formattedExporter}` : ''}`;
        
        console.log("Fetching jobs data with multiple IE codes from:", apiUrl);
        
        const response = await axios.get(apiUrl);
        const { data, total, totalPages, currentPage } = response.data;
        
        setRows(data || []);
        setTotal(total || 0);
        setTotalPages(totalPages || 1);
        setCurrentPage(currentPage || 1);
        
        return;
      }

      // If no IE code assignments, use the original importer-based endpoint
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
      const formattedExporter = selectedExporter && selectedExporter !== "all"
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
        apiUrl = `${apiString}/gandhidham/${selectedYear}/jobs/${status}/${detailedStatus}/${formattedImporter}?page=${page}&limit=100&search=${formattedSearchQuery}${formattedExporter ? `&exporter=${formattedExporter}` : ''}`;
      } else {
        apiUrl = `${apiString}/${selectedYear}/jobs/${status}/${detailedStatus}/${formattedImporter}?page=${page}&limit=100&search=${formattedSearchQuery}${formattedExporter ? `&exporter=${formattedExporter}` : ''}`;
      }

      console.log("Fetching jobs data from:", apiUrl);

      const response = await axios.get(apiUrl);

      const { data, total, totalPages, currentPage } = response.data;
      setRows(data || []);
      setTotal(total || 0);
      setTotalPages(totalPages || 1);
      setCurrentPage(currentPage || 1);

      console.log(
        `Fetched ${data?.length || 0} rows successfully for importer: ${
          cleanImporter || "all"
        }`
      );
    } catch (error) {
      console.error("Error fetching job list:", error);
      setError(error.message || "Failed to fetch job data");
      // Keep the previous data instead of clearing it on error
    } finally {
      setLoading(false);
    }
  };

  // This effect handles initial and filter-based data fetching
  useEffect(() => {
    console.log("Filter dependencies changed:", {
      detailedStatus,
      selectedYear,
      status,
      searchQuery,
      selectedImporter,
      selectedExporter,
    });

    // Always attempt to fetch if we have the year
    if (selectedYear) {
      setCurrentPage(1);
      fetchJobsData(1);
    }
  }, [detailedStatus, selectedYear, status, searchQuery, selectedImporter, selectedExporter]);

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
