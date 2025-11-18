import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getJsonCookie } from "../utils/cookies";

const useOptimizedJobData = (selectedYear, selectedStatus, userId) => {
  const [jobData, setJobData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    total: 0,
    limit: 50,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);

  // Get user's IE code from localStorage
  const getUserIECode = useCallback(() => {
    try {
      const parsedUser = getJsonCookie("exim_user");
      if (parsedUser) {
        return (
          parsedUser?.data?.user?.ie_code_no || parsedUser?.ie_code_no || null
        );
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return null;
  }, []);

  // Debounce function for search
  const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Optimized fetch function using the new backend endpoints
  const fetchJobData = useCallback(
    async (page = 1, append = false) => {
      const ieCode = getUserIECode();
      if (!ieCode || !selectedYear) {
        console.log("Missing IE code or selected year");
        return;
      }

      setLoading(true);
      if (!append) {
        setError(null);
      }

      try {
        let endpoint;
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
          search: debouncedSearchQuery,
        });

        if (selectedStatus === "all") {
          endpoint = `${process.env.REACT_APP_API_STRING}/optimized/${selectedYear}/jobs/${ieCode}/all?${params}`;
        } else {
          endpoint = `${process.env.REACT_APP_API_STRING}/optimized/${selectedYear}/jobs/${ieCode}/${selectedStatus}?${params}`;
        }

        console.log("Fetching from optimized endpoint:", endpoint);

        const response = await axios.get(endpoint);
        const { data, pagination: paginationData } = response.data;

        if (append) {
          setJobData((prevData) => [...prevData, ...data]);
        } else {
          setJobData(data);
        }

        setPagination(paginationData);
        setHasMore(paginationData.currentPage < paginationData.totalPages);

        console.log("Optimized fetch successful:", {
          page: paginationData.currentPage,
          total: paginationData.total,
          fetched: data.length,
        });
      } catch (error) {
        console.error("Error fetching optimized job data:", error);

        // Fallback to original API if optimized endpoint fails
        console.log("Falling back to original API...");
        await fetchJobDataFallback();
      } finally {
        setLoading(false);
      }
    },
    [
      selectedYear,
      selectedStatus,
      debouncedSearchQuery,
      pagination.limit,
      getUserIECode,
    ]
  );

  // Fallback to original API structure
  const fetchJobDataFallback = useCallback(async () => {
    const ieCode = getUserIECode();
    if (!ieCode || !selectedYear) {
      return;
    }

    try {
      let allJobs = [];

      if (selectedStatus === "all") {
        const [pendingResponse, completedResponse, cancelledResponse] =
          await Promise.all([
            axios.get(
              `${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/pending/all/all?limit=1000`
            ),
            axios.get(
              `${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/completed/all/all?limit=1000`
            ),
            axios.get(
              `${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/cancelled/all/all?limit=1000`
            ),
          ]);

        allJobs = [
          ...(pendingResponse.data.data || []),
          ...(completedResponse.data.data || []),
          ...(cancelledResponse.data.data || []),
        ];
      } else {
        const response = await axios.get(
          `${process.env.REACT_APP_API_STRING}/${selectedYear}/jobs/${selectedStatus}/all/all?limit=1000`
        );
        allJobs = response.data.data || [];
      }

      // Filter by IE code and search query
      let userJobs = allJobs.filter((job) => job.ie_code_no == ieCode);

      if (debouncedSearchQuery) {
        const searchLower = debouncedSearchQuery.toLowerCase();
        userJobs = userJobs.filter(
          (job) =>
            job.job_no?.toLowerCase().includes(searchLower) ||
            job.supplier_exporter?.toLowerCase().includes(searchLower) ||
            job.importer?.toLowerCase().includes(searchLower) ||
            job.custom_house?.toLowerCase().includes(searchLower) ||
            job.awb_bl_no?.toLowerCase().includes(searchLower) ||
            job.origin_country?.toLowerCase().includes(searchLower) ||
            job.description?.toLowerCase().includes(searchLower)
        );
      }

      setJobData(userJobs);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        total: userJobs.length,
        limit: userJobs.length,
      });
      setHasMore(false);
    } catch (error) {
      setError("Failed to fetch job data");
    }
  }, [selectedYear, selectedStatus, debouncedSearchQuery, getUserIECode]);

  // Load more data for infinite scrolling
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobData(pagination.currentPage + 1, true);
    }
  }, [loading, hasMore, pagination.currentPage, fetchJobData]);

  // Reset and fetch data when dependencies change
  useEffect(() => {
    setJobData([]);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    setHasMore(true);
    fetchJobData(1, false);
  }, [selectedYear, selectedStatus, debouncedSearchQuery]);

  // Search function
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  return {
    jobData,
    loading,
    error,
    pagination,
    hasMore,
    loadMore,
    handleSearch,
    searchQuery,
  };
};

export default useOptimizedJobData;
