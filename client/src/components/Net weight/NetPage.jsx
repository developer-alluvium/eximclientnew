import { useState, useEffect, useRef, useContext , useCallback} from "react";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { TextField, Box, Typography, Button, Paper } from "@mui/material";
import axios from "axios";
import ImportAnalytics from "./ImportAnalytics";
import { SimpleHeader } from "./SharedComponents";
import ChargesSummary from "./ChargesSummary";
import ChargesTable from "./ChargesTable"; // Add this import
import Calculator from "./Calculator"; 
import JobDetailsPanel from "./JobDetailsPanel";
import BackButton from "../BackButton";
import Header from "../Header"; // Import the Header component
import CssBaseline from "@mui/material/CssBaseline"; // Import CssBaseline for consistent styling
import JobExcelTable from "./JobExcelTable";
import { UserContext } from "../../context/UserContext";
import { logActivity } from "../../utils/activityLogger";
import { useNavigate } from "react-router-dom";

const NetPage = () => {
  // Tabs for Jobs/Gandhidham
  const [tabValue, setTabValue] = useState(0);
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Always check localStorage for tab visibility
  const getTabVisibility = () => {
    const userDataFromStorage = localStorage.getItem("exim_user");
    if (userDataFromStorage) {
      try {
        const parsedUser = JSON.parse(userDataFromStorage);
        return {
          showJobsTab: !!parsedUser?.jobsTabVisible,
          showGandhidhamTab: !!parsedUser?.gandhidhamTabVisible,
        };
      } catch {
        return { showJobsTab: true, showGandhidhamTab: true };
      }
    }
    return { showJobsTab: true, showGandhidhamTab: true };
  };

  const { showJobsTab, showGandhidhamTab } = getTabVisibility();
  const { user, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const years = ["25-26", "24-25"];
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(years[0]);
  const [jobNo, setJobNo] = useState("");
  const [userId, setUserId] = useState(null);
  // Add states for header functionality
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [anchorEl, setAnchorEl] = useState(null);
  const [userName, setUserName] = useState("User");
  const [userInitial, setUserInitial] = useState("U");
    const [ieCodeAssignments, setIeCodeAssignments] = useState([]);
  const open = Boolean(anchorEl);
  
  // Create refs for the input fields
  const inputRefs = {
    shipping: useRef(null),
    customclearancecharges: useRef(null),
    detention: useRef(null),
    cfs: useRef(null),
    transport: useRef(null),
    Labour: useRef(null),
   weight: useRef(null) 
  };

  // State for storing API response
  const [jobData, setJobData] = useState(null);
  const [dutyRates, setDutyRates] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  // Format date and time for header
  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Header related functions
  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      // Log logout activity before calling logout API
     

      // Call logout API with user ID for logout time tracking
      const logoutData = {};
      if (user?.id) {
        logoutData.user_id = user.id;
      }

      await axios.post(
        `${process.env.REACT_APP_API_STRING}/logout`,
        logoutData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      localStorage.removeItem("exim_user");
            localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('sso_token');
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const [calculatorData, setCalculatorData] = useState({
    jobReference: "",
    duty: "",
    shipping: "",
    customclearancecharges: "",
    detention: "",
    cfs: "",
    transport: "",
    Labour: "",
    //miscellaneous: "",
    weight: "",
    custom_fields:[],
  });

  // Separate state for displayed results to prevent continuous recalculation
  const [calculationResults, setCalculationResults] = useState({
    totalCost: "0.00",
    perKgCost: "0.00",
  });

  const handleInputChange = async (e) => {
    const { id, value } = e.target;

    // Store current cursor position
    const cursorPosition = e.target.selectionStart;

    setCalculatorData((prev) => ({
      ...prev,
      [id]: value,
    }));

    // Auto-calculate when duty or weight changes
    if ((id === 'duty' || id === 'weight') && jobNo && value) {
      await triggerAutoCalculation(id, value);
    }

    // Use setTimeout to restore focus and cursor position after state update
    setTimeout(() => {
      if (inputRefs[id] && inputRefs[id].current) {
        const input = inputRefs[id].current;
        input.focus();
        input.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  // Function to trigger auto-calculation via API when duty or weight changes
 // Function to trigger auto-calculation via API when duty or weight changes
const triggerAutoCalculation = async (fieldId, fieldValue) => {
  try {
    const currentWeight = fieldId === 'weight' ? fieldValue : calculatorData.weight;
    const currentDuty = fieldId === 'duty' ? fieldValue : calculatorData.duty;
    
    // Only trigger if we have both duty and weight
    if (!currentDuty || !currentWeight || parseFloat(currentDuty) <= 0 || parseFloat(currentWeight) <= 0) {
      return;
    }

    // Get user's IE codes
    const userIeCodes = getUserIeCodes();
    if (userIeCodes.length === 0) {
      console.warn('No IE codes found for auto-calculation');
      return;
    }

    const response = await fetch(
      `${process.env.REACT_APP_API_STRING}/update-job-duty-weight/${jobNo}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: selectedYear,
          total_duty: currentDuty,
          job_net_weight: currentWeight,
          ie_code_nos: userIeCodes.join(',') // Updated to use multiple IE codes
        }),
      }
    );

    if (response.ok) {
      const responseData = await response.json();
      if (responseData.success && responseData.data.per_kg_cost) {
        const newPerKgCost = responseData.data.per_kg_cost;
        
        // Update calculation results with the new per kg cost
        setCalculationResults(prev => ({
          ...prev,
          perKgCost: newPerKgCost
        }));
        
        // Update jobData if it exists
        if (jobData?.net_weight_calculator) {
          setJobData(prev => ({
            ...prev,
            net_weight_calculator: {
              ...prev.net_weight_calculator,
              per_kg_cost: newPerKgCost
            }
          }));
        }
      }
    }
  } catch (error) {
    console.error("Error triggering auto-calculation:", error);
  }
};

const saveCalculatorData = async () => {
  if (!jobNo || !selectedYear) {
    // Don't save if no job is selected
    return;
  }

  try {
    setSaveError(null);
    
    // Get user's IE codes
    const userIeCodes = getUserIeCodes();
    const ieCodesParam = userIeCodes.length > 0 ? `&ie_code_nos=${userIeCodes.join(',')}` : '';
    
    const response = await fetch(
      `${process.env.REACT_APP_API_STRING}/store-calculator-data/${jobNo}?year=${selectedYear}${ieCodesParam}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shipping: calculatorData.shipping,
          customclearancecharges: calculatorData.customclearancecharges,
          detention: calculatorData.detention,
          cfs: calculatorData.cfs,
          transport: calculatorData.transport,
          Labour: calculatorData.Labour,
          miscellaneous: calculatorData.miscellaneous,
          weight: calculatorData.weight,
          totalCost: calculationResults.totalCost,
          custom_fields: calculatorData.custom_fields,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to save calculator data");
    }

    console.log("Calculator data saved successfully");
  } catch (error) {
    console.error("Error saving calculator data:", error);
    setSaveError(error.message);
  }
};


  useEffect(() => {
    const userDataFromStorage = localStorage.getItem("exim_user");
    if (userDataFromStorage) {
      try {
        const parsedUser = JSON.parse(userDataFromStorage);
        // Set tab visibility according to localStorage values
      
        // Set user name and initial for header
        const name = parsedUser?.name;
        setUserName(name);
        setUserInitial(name.charAt(0).toUpperCase());
        setUserId(parsedUser?.ie_code_no);
      } catch (e) {
        console.error("Error parsing user data from storage:", e);
      }
    }
  }, []);
  // Calculate function is now separated from the automatic saving
  const calculateCost = async () => {
    const duty = parseFloat(calculatorData.duty) || 0;
    const shipping = parseFloat(calculatorData.shipping) || 0;
    const customclearancecharges = parseFloat(calculatorData.customclearancecharges) || 0;
    const detention = parseFloat(calculatorData.detention) || 0;
    const cfs = parseFloat(calculatorData.cfs) || 0;
    const transport = parseFloat(calculatorData.transport) || 0;
    const Labour = parseFloat(calculatorData.Labour) || 0;
    const customFieldsTotal = calculatorData.custom_fields?.reduce((sum, field) => 
      sum + (parseFloat(field.value) || 0), 0) || 0;
    const weight = parseFloat(calculatorData.weight) || 0;

    const totalINR =
      duty +
      shipping +
      customclearancecharges +
      detention +
      cfs +
      transport +
      Labour +
      customFieldsTotal;
    const totalString = totalINR.toFixed(2);

    const perKG = weight > 0 ? (totalINR / weight).toFixed(2) : "0.00";

    // Update calculation results
    setCalculationResults({
      totalCost: totalString,
      perKgCost: perKG,
    });

    // Update jobData immediately for the UI
    if (jobData && jobData.net_weight_calculator) {
      const updatedJobData = {
        ...jobData,
        net_weight_calculator: {
          ...jobData.net_weight_calculator,
          duty: calculatorData.duty,
          shipping: calculatorData.shipping,
          custom_clearance_charges: calculatorData.customclearancecharges,
          customclearancecharges: calculatorData.customclearancecharges,
          detention: calculatorData.detention,
          cfs: calculatorData.cfs,
          transport: calculatorData.transport,
          Labour: calculatorData.Labour,
          custom_fields: calculatorData.custom_fields || [],
          per_kg_cost: perKG,
          total_cost: totalString,
          weight: calculatorData.weight
        }
      };
      setJobData(updatedJobData);
    }

    // Save to backend
    if (jobNo) {
      try {
        await saveCalculatorData();

        const response = await fetch(
          `${process.env.REACT_APP_API_STRING}/update-per-kg-cost?year=${selectedYear}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jobNo: jobNo,
              perKgCost: perKG,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to update per kg cost:", errorData.message);
        } else {
          console.log("Per kg cost updated successfully");
        }
      } catch (error) {
        console.error("Error updating per kg cost:", error);
      }
    }
  };

  useEffect(() => {
    // When job data is received, update calculator fields
    if (jobData) {
      // Use total_duty directly from API response instead of recalculating
      const dutyAmount = jobData.total_duty || "0.00";
      
      setCalculatorData({
        jobReference: jobNo,
        duty: dutyAmount.toString(),
        shipping: jobData.net_weight_calculator?.shipping || "0.00",
        customclearancecharges: jobData.net_weight_calculator?.custom_clearance_charges || "0.00",
        detention: jobData.net_weight_calculator?.detention || "0.00",
        cfs: jobData.net_weight_calculator?.cfs || "0.00",
        transport: jobData.net_weight_calculator?.transport || "0.00",
        Labour: jobData.net_weight_calculator?.Labour || "0.00",
        miscellaneous: jobData.net_weight_calculator?.miscellaneous || "0.00",
        weight: jobData.job_net_weight?.toString() || "0.00",
        custom_fields: jobData.net_weight_calculator?.custom_fields || [],
      });
    }
  }, [jobData, jobNo]);

  const getUserIeCodes = useCallback(() => {
    try {
      const userData = localStorage.getItem("exim_user");
      if (!userData) return [];
      const parsed = JSON.parse(userData);
      return parsed?.ie_code_assignments?.map(a => a.ie_code_no) || [];
    } catch {
      return [];
    }
  }, []);

// Updated fetchJobData function
  const fetchJobData = async () => {
    if (!jobNo) return;

    setLoading(true);
    setApiError(null);

    try {
      // Get user's IE codes
      const userIeCodes = getUserIeCodes();
      
      if (userIeCodes.length === 0) {
        throw new Error("No IE codes found for user");
      }

      // For NetPage, use ALL IE codes (no importer filtering)
      const response = await fetch(
        `${process.env.REACT_APP_API_STRING}/lookup/${jobNo}/${selectedYear}?ie_code_nos=${userIeCodes.join(',')}`
      );

      if (!response.ok) {
        throw new Error("Job not found");
      }

      const data = await response.json();
      if (data.success) {
        // Store the job data from API response
        const jobDataFromApi = data.data.job_data;
        
        // Format the data to match the component's expected structure
        const formattedJobData = {
          ...jobDataFromApi,
          hs_code: data.data.hs_code,
          basic_duty_sch: data.data.basic_duty_sch,
          basic_duty_ntfn: data.data.basic_duty_ntfn,
          igst: data.data.igst,
          sws_10_percent: data.data.sws_10_percent,
          total_duty: jobDataFromApi.total_duty
        };
        
        setJobData(formattedJobData);
        setDutyRates(data.data);
        setApiError(null);

        // Automatically call update-per-kg-cost API after successful job lookup
        try {
          const totalDuty = parseFloat(jobDataFromApi.total_duty) || 0;
          const netWeight = parseFloat(jobDataFromApi.job_net_weight) || 0;
          const calculatedPerKgCost = netWeight > 0 ? (totalDuty / netWeight).toFixed(2) : "0.00";

          const perKgCostResponse = await fetch(
            `${process.env.REACT_APP_API_STRING}/update-per-kg-cost?year=${selectedYear}&ie_code_nos=${userIeCodes.join(',')}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jobNo: jobNo,
                perKgCost: calculatedPerKgCost,
              }),
            }
          );

          if (perKgCostResponse.ok) {
            const perKgCostData = await perKgCostResponse.json();
            console.log('Per kg cost data updated:', perKgCostData);
            
            setCalculationResults(prev => ({
              ...prev,
              perKgCost: calculatedPerKgCost
            }));
            
            if (perKgCostData.success && perKgCostData.data) {
              if (perKgCostData.data.job_data) {
                setJobData(prevJobData => ({
                  ...prevJobData,
                  ...perKgCostData.data.job_data
                }));
              }
              
              if (perKgCostData.data.calculation_results) {
                setCalculationResults(perKgCostData.data.calculation_results);
              }
            }
          }
        } catch (perKgError) {
          console.warn('Failed to update per kg cost:', perKgError.message);
        }

        // Automatically call store-calculator-data API
        try {
          const calculatorPayload = {
            shipping: jobDataFromApi.net_weight_calculator?.shipping || "0.00",
            customclearancecharges: jobDataFromApi.net_weight_calculator?.custom_clearance_charges || "0.00",
            detention: jobDataFromApi.net_weight_calculator?.detention || "0.00",
            cfs: jobDataFromApi.net_weight_calculator?.cfs || "0.00",
            transport: jobDataFromApi.net_weight_calculator?.transport || "0.00",
            Labour: jobDataFromApi.net_weight_calculator?.Labour || "0.00",
            miscellaneous: jobDataFromApi.net_weight_calculator?.miscellaneous || "0.00",
            weight: jobDataFromApi.job_net_weight?.toString() || "0.00",
            totalCost: "0.00",
            custom_fields: jobDataFromApi.net_weight_calculator?.custom_fields || [],
          };

          const storeCalculatorResponse = await fetch(
            `${process.env.REACT_APP_API_STRING}/store-calculator-data/${jobNo}?year=${selectedYear}&ie_code_nos=${userIeCodes.join(',')}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(calculatorPayload),
            }
          );

          if (storeCalculatorResponse.ok) {
            const calculatorData = await storeCalculatorResponse.json();
            console.log('Calculator data stored and total cost calculated:', calculatorData);
            
            if (calculatorData.success) {
              const duty = parseFloat(jobDataFromApi.total_duty) || 0;
              const shipping = parseFloat(calculatorPayload.shipping) || 0;
              const customclearancecharges = parseFloat(calculatorPayload.customclearancecharges) || 0;
              const detention = parseFloat(calculatorPayload.detention) || 0;
              const cfs = parseFloat(calculatorPayload.cfs) || 0;
              const transport = parseFloat(calculatorPayload.transport) || 0;
              const Labour = parseFloat(calculatorPayload.Labour) || 0;
              const customFieldsTotal = calculatorPayload.custom_fields?.reduce((sum, field) => 
                sum + (parseFloat(field.value) || 0), 0) || 0;

              const totalCost = (duty + shipping + customclearancecharges + detention + cfs + transport + Labour + customFieldsTotal).toFixed(2);
              
              setCalculationResults(prev => ({
                ...prev,
                totalCost: totalCost
              }));
            }
          }
        } catch (calculatorError) {
          console.warn('Failed to store calculator data:', calculatorError.message);
        }
        
      } else {
        throw new Error(data.message || "Job not found");
      }
    } catch (error) {
      setApiError(error.message);
      setJobData(null);
      setDutyRates(null);
    } finally {
      setLoading(false);
    }
  };

  // Search job when user submits
  const handleSearch = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    fetchJobData();
  };

  // Component for detail field in job details
  const DetailField = ({ label, value }) => (
    <div
      style={{
        backgroundColor: "#ffffff",
        padding: "8px 12px",
        borderRadius: "4px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        marginBottom: "8px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#6B7280" }}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: "500" }}>{value}</div>
    </div>
  );

  // Component for calculator input field
  const CalculatorField = ({
    id,
    label,
    value,
    onChange,
    disabled = false,
  }) => (
    <Box sx={{ mb: 1.5, display: "flex", alignItems: "center" }}>
      <Box sx={{ width: "55%", display: "flex", alignItems: "center" }}>
        <Typography variant="body2" color="textPrimary" noWrap>
          {label}
        </Typography>
      </Box>
      <Box sx={{ width: "45%" }}>
        <TextField
          id={id}
          fullWidth
          size="small"
          value={value}
          onChange={onChange}
          disabled={disabled}
          // Use the ref from the inputRefs object
          inputRef={inputRefs[id]}
          inputProps={{
            inputMode: "decimal",
          }}
          placeholder="0.00"
          sx={{
            "& .MuiOutlinedInput-root": { height: 32 },
            "& input": { paddingRight: 1 },
            "& .Mui-disabled": {
              backgroundColor: "#F3F4F6",
              cursor: "not-allowed",
            },
          }}
        />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      
      {/* Add Header Component */}
      <Header
        formattedDate={formattedDate}
        formattedTime={formattedTime}
        userName={userName}
        userInitial={userInitial}
        anchorEl={anchorEl}
        open={open}
        handleUserMenuOpen={handleUserMenuOpen}
        handleUserMenuClose={handleUserMenuClose}
        handleLogout={handleLogout}
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          padding: "24px",
          marginTop: "64px", // Add space for fixed header
          minHeight: "100vh",
          //  backgroundColor: "red", // Uncomment if you want a light background
          backgroundColor: "#F3F4F6",
        }}
      >
        <div
          style={{
            maxWidth: "1600px",
            margin: "0 auto",
            
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
        
            }}
          >
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#1F2937",
                margin: 0,
              }}
            >
              Customs Import Calculator
            </h1>
          </div>
          <BackButton />
          

          {/* Tabs for Jobs/Gandhidham - show according to localStorage values */}
          {(showJobsTab || showGandhidhamTab) && (
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="job tabs">
                {showJobsTab && <Tab label="Jobs" />}
                {showGandhidhamTab && <Tab label="Gandhidham" />}
              </Tabs>
            </Box>
          )}

          {/* Job Excel Table - positioned between BackButton and existing content */}
          {(showJobsTab || showGandhidhamTab) && (
            <JobExcelTable 
              userId={userId} 
              selectedYear={selectedYear} 
              gandhidham={showGandhidhamTab && !showJobsTab ? true : tabValue === (showJobsTab ? 1 : 0)}
              key={`${tabValue}-${selectedYear}`} // Add this key to force re-render
            />
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "24px",
              marginBottom: "24px",
            }}
          >
            {/* LEFT: Job Details Panel */}
            <JobDetailsPanel
              years={years}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              jobNo={jobNo}
              setJobNo={setJobNo}
              loading={loading}
              handleSearch={handleSearch}
              apiError={apiError}
              jobData={jobData}
              dutyRates={dutyRates}
              userId={userId}
            />

            {/* RIGHT: Calculator Panel */}
            <Calculator 
              calculatorData={calculatorData}
              handleInputChange={handleInputChange}
              inputRefs={inputRefs}
              saveError={saveError}
              jobNo={jobNo}
              calculationResults={calculationResults}
              calculateCost={calculateCost}
            />
          </div>

          {/* BOTTOM: Analytics Panel */}
          <div style={{ marginBottom: "24px" }}>
            {/* Only show ChargesSummary when we have job data */}
            {/* {jobData && (
              <div style={{ marginBottom: "24px" }}>
                <ChargesSummary
                  jobNo={jobNo}
                  selectedYear={selectedYear}
                  jobData={jobData}
                />
              </div>
            )} */}
                 {/* {jobData && (
              <div style={{ marginBottom: "24px" }}>
                <ChargesTable
                  jobNo={jobNo}
                  selectedYear={selectedYear}
                  jobData={jobData}
                />
              </div>
            )} */}

            {/* BOTTOM: Analytics Panel */}
            <ImportAnalytics />
          </div>

          <div
            style={{
              textAlign: "center",
              color: "#6B7280",
              fontSize: "14px",
              padding: "16px 0",
            }}
          >
            © 2025 Customs Import Calculator | All Rights Reserved
          </div>
        </div>
      </Box>
    </Box>
  );
};

export default NetPage;