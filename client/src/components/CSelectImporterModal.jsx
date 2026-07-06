import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";
import { SelectedYearContext } from "../context/SelectedYearContext";
import { UserContext } from "../context/UserContext";
import { convertToExcel } from "../utils/convertToExcel";
import { downloadAllReport } from "../utils/downloadAllReport.jsx";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import { useImportersContext } from "../context/importersContext";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
};

export default function CSelectImporterModal(props) {
  const { selectedYear } = React.useContext(SelectedYearContext);
  const { user } = React.useContext(UserContext) || {};
  const { importers, setImporters } = useImportersContext();
  const [importerData, setImporterData] = React.useState([]);
  const [selectedImporter, setSelectedImporter] = React.useState("");
  const [selectedApiYears, setSelectedApiYears] = React.useState([]);

  const assignedImporterNames = React.useMemo(() => {
    if (!user) return [];
    
    let names = [];
    if (user.ie_code_assignments && Array.isArray(user.ie_code_assignments)) {
      names = user.ie_code_assignments.map(a => a.importer_name?.trim()).filter(Boolean);
    }
    
    if (names.length === 0 && user.assigned_importer_name) {
      names = (Array.isArray(user.assigned_importer_name) 
        ? user.assigned_importer_name 
        : [user.assigned_importer_name]
      ).map(name => name?.trim()).filter(Boolean);
    }
    
    return [...new Set(names)];
  }, [user]);

  const hasSingleImporter = React.useMemo(() => {
    return user && user.role !== 'Admin' && assignedImporterNames.length === 1;
  }, [user, assignedImporterNames]);

  const singleImporterName = React.useMemo(() => {
    return hasSingleImporter ? assignedImporterNames[0] : "";
  }, [hasSingleImporter, assignedImporterNames]);

  React.useEffect(() => {
    if (hasSingleImporter) {
      setSelectedImporter(singleImporterName);
    }
  }, [hasSingleImporter, singleImporterName]);

  const getUniqueImporterNames = (importerData) => {
    const uniqueImporters = new Set();
    return importerData
      ?.filter((importer) => {
        if (uniqueImporters.has(importer.importer)) {
          return false;
        } else {
          uniqueImporters.add(importer.importer);
          return true;
        }
      })
      .map((importer, index) => {
        return {
          label: importer.importer,
          key: `${importer.importer}-${index}`,
        };
      });
  };

  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYear) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYear}`
        );
        let fetchedData = res.data || [];
        if (user && user.role !== 'Admin') {
          fetchedData = fetchedData.filter(item =>
            assignedImporterNames.some(name => name.toLowerCase() === item.importer?.trim().toLowerCase())
          );
        }
        setImporterData(fetchedData);
        setImporters(fetchedData);
        if (hasSingleImporter) {
          setSelectedImporter(singleImporterName);
        } else if (user && user.role !== 'Admin' && assignedImporterNames.length > 0) {
          setSelectedImporter(assignedImporterNames[0]);
        } else if (fetchedData.length > 0) {
          setSelectedImporter(fetchedData[0].importer);
        } else {
          setSelectedImporter("");
        }
      }
    }
    getImporterList();
  }, [selectedYear, user, hasSingleImporter, singleImporterName, assignedImporterNames]);

  const handleImporterChange = (event, newValue) => {
    setSelectedImporter(newValue?.label || null);
  };

  const handleYearChange = (event) => {
    const year = event.target.value;
    setSelectedApiYears((prevYears) =>
      prevYears.includes(year)
        ? prevYears.filter((y) => y !== year)
        : [...prevYears, year]
    );
  };

  const handleSelectAllYearsChange = (event) => {
    if (event.target.checked) {
      setSelectedApiYears(["26-27", "25-26", "24-25"]);
    } else {
      setSelectedApiYears([]);
    }
  };

  const importerNames = React.useMemo(() => {
    if (user && user.role !== 'Admin') {
      return assignedImporterNames.map((name, index) => ({
        label: name,
        key: `${name}-${index}`,
      }));
    }
    return getUniqueImporterNames(importerData);
  }, [user, assignedImporterNames, importerData]);

  const handleReportDownload = async () => {
    const importerToDownload = hasSingleImporter ? singleImporterName : selectedImporter;
    if (importerToDownload !== "" && selectedApiYears.length > 0) {
      const yearString = selectedApiYears.join(",");
      const res = await axios.get(
        `${
          process.env.REACT_APP_API_STRING
        }/download-report/${yearString}/${importerToDownload
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^\w]+/g, "")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "")}/${props.status}`
      );

      convertToExcel(
        res.data,
        importerToDownload,
        props.status,
        props.detailedStatus
      );
    }
  };

  return (
    <div>
      <Modal
        open={props.open}
        onClose={props.handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h6" component="h2" sx={{ fontWeight: "bold" }}>
            {hasSingleImporter 
              ? `Download DSR Report for ${singleImporterName}`
              : "Select an importer to download DSR"}
          </Typography>
          <br />



          <div>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "600" }}>
              Select Years:
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedApiYears.length === 3}
                  indeterminate={selectedApiYears.length > 0 && selectedApiYears.length < 3}
                  onChange={handleSelectAllYearsChange}
                />
              }
              label="All Years"
            />
            <FormControlLabel
              control={
                <Checkbox
                  value="26-27"
                  checked={selectedApiYears.includes("26-27")}
                  onChange={handleYearChange}
                />
              }
              label="26-27"
            />
            <FormControlLabel
              control={
                <Checkbox
                  value="25-26"
                  checked={selectedApiYears.includes("25-26")}
                  onChange={handleYearChange}
                />
              }
              label="25-26"
            />
            <FormControlLabel
              control={
                <Checkbox
                  value="24-25"
                  checked={selectedApiYears.includes("24-25")}
                  onChange={handleYearChange}
                />
              }
              label="24-25"
            />
          </div>

          <br />
          {!hasSingleImporter && (
            <>
              <Autocomplete
                disablePortal
                fullWidth
                options={importerNames}
                getOptionLabel={(option) => option.label}
                value={
                  importerNames.find(
                    (option) => option.label === selectedImporter
                  ) || null
                }
                onChange={handleImporterChange}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="Select importer" />
                )}
              />
              <br />
            </>
          )}

          <button
            className="btn"
            onClick={handleReportDownload}
          >
            Download
          </button>
        </Box>
      </Modal>
    </div>
  );
}
