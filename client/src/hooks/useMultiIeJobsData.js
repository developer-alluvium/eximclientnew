import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { getIeCodeNumbers, getPrimaryIeCode } from '../utils/ieCodeHelpers';

/**
 * Hook for fetching jobs data with support for multiple IE codes
 */
function useMultiIeJobsData(
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
  const [selectedIeCode, setSelectedIeCode] = useState(() => getPrimaryIeCode());
  const [availableIeCodes, setAvailableIeCodes] = useState(() => getIeCodeNumbers());

  // Fetch job data for multiple IE codes
  const fetchJobsData = useCallback(async (page = 1) => {
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
      // Get all assigned IE codes
      const userIeCodes = selectedIeCode ? [selectedIeCode] : getIeCodeNumbers();
      
      if (userIeCodes.length === 0) {
        throw new Error('No IE codes assigned to user');
      }

      // Fetch jobs for all IE codes in parallel
      const jobPromises = userIeCodes.map(ieCode => {
        // Clean the importer name
        const cleanImporter = selectedImporter
          ? selectedImporter.replace(/\u00A0/g, ' ').trim()
          : 'all';

        const formattedImporter = encodeURIComponent(cleanImporter);
        const formattedSearchQuery = searchQuery ? encodeURIComponent(searchQuery) : '';
        const formattedExporter = selectedExporter && selectedExporter !== 'all' 
          ? encodeURIComponent(selectedExporter) 
          : '';

        let apiUrl = gandhidham
          ? `${process.env.REACT_APP_API_STRING}/api/gandhidham/${selectedYear}/jobs`
          : `${process.env.REACT_APP_API_STRING}/api/optimized/${selectedYear}/jobs`;

        apiUrl += `/${ieCode}/${status}`;

        // Add query parameters
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: '50',
          importer: formattedImporter,
          search: formattedSearchQuery,
        });

        if (formattedExporter) {
          queryParams.append('exporter', formattedExporter);
        }

        if (detailedStatus && detailedStatus !== 'all') {
          queryParams.append('detailedStatus', detailedStatus);
        }

        return axios.get(`${apiUrl}?${queryParams}`);
      });

      const responses = await Promise.all(jobPromises);
      
      // Combine and process the results
      let allJobs = [];
      let totalCount = 0;

      responses.forEach(response => {
        if (response.data.success) {
          allJobs = [...allJobs, ...(response.data.data || [])];
          totalCount += response.data.pagination?.total || 0;
        }
      });

      // Sort jobs by date (newest first)
      allJobs.sort((a, b) => {
        const dateA = new Date(a.job_date || a.createdAt);
        const dateB = new Date(b.job_date || b.createdAt);
        return dateB - dateA;
      });

      setRows(allJobs);
      setTotal(totalCount);
      setTotalPages(Math.ceil(totalCount / 50));
      setCurrentPage(page);

    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError(error.message || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, status, detailedStatus, selectedImporter, selectedExporter, searchQuery, gandhidham, selectedIeCode]);

  // Fetch jobs when parameters change
  useEffect(() => {
    setCurrentPage(1);
    fetchJobsData(1);
  }, [fetchJobsData]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchJobsData(newPage);
  };

  const handleIeCodeChange = (ieCode) => {
    setSelectedIeCode(ieCode);
    setCurrentPage(1);
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
    selectedIeCode,
    handleIeCodeChange,
    availableIeCodes
  };
}

export default useMultiIeJobsData;
