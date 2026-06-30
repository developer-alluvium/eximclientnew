import React, { useState } from "react";
import { Tabs, Tab, Box, Paper } from "@mui/material";
import EwayBillGenerate from "./EwayBillGenerate";
import EwayBillDashboard from "./EwayBillDashboard";
import EwayBillLookup from "./EwayBillLookup";
import EwayBillReports from "./EwayBillReports";
import "../../styles/ewaybill.scss";


function EwayBillForm() {
    const [tabValue, setTabValue] = useState(0);

    // Sync tab with URL query params on mount
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab");
        const lr = params.get("lr");
        
        if (lr) {
            setTabValue(0); // If LR is present, go to Generate tab
        } else if (tab === "dashboard") {
            setTabValue(1);
        } else if (tab === "search") {
            setTabValue(2);
        } else if (tab === "reports") {
            setTabValue(3);
        }
    }, []);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <div className="ewaybill-container">
            <div className="ewaybill-header">
                <button className="back-btn" onClick={() => window.history.back()}>
                     ← Back
                </button>
                <h2>E-Way Bill Management</h2>
            </div>
            
            <Paper elevation={0} sx={{ marginBottom: 3, borderBottom: 1, borderColor: 'divider', background: 'transparent' }}>
                <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange} 
                    aria-label="eway bill tabs"
                    textColor="primary"
                    indicatorColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '1rem',
                            padding: '12px 24px'
                        }
                    }}
                >
                    <Tab label="Generate New E-Way Bill" />
                    <Tab label="Dashboard & History" />
                    <Tab label="🔍 Search & Lookup" />
                    <Tab label="📊 Reports" />
                </Tabs>
            </Paper>

            <Box sx={{ padding: '0 4px' }}>
                {tabValue === 0 && <EwayBillGenerate />}
                {tabValue === 1 && <EwayBillDashboard />}
                {tabValue === 2 && <EwayBillLookup />}
                {tabValue === 3 && <EwayBillReports />}
            </Box>
        </div>
    );
}

export default EwayBillForm;
