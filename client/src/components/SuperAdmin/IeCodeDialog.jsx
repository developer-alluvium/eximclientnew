import React, { useState, useMemo, useCallback } from "react";
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  InputAdornment,
} from "@mui/material";
import { Search, Business, Person } from "@mui/icons-material";

const IeCodeDialog = React.memo(
  ({
    open,
    onClose,
    selectedEntity,
    isRemovingIeCode,
    setIsRemovingIeCode,
    selectedIeCodes,
    setSelectedIeCodes,
    ieCodeReason,
    setIeCodeReason,
    loading,
    handleIeCodeOperation,
    filteredIeCodes = [],
  }) => {
    const baseOptions = useMemo(() => {
      return isRemovingIeCode
        ? selectedEntity?.ie_code_assignments || []
        : filteredIeCodes;
    }, [isRemovingIeCode, selectedEntity, filteredIeCodes]);

    const selectedOptions = useMemo(() => {
      if (!selectedIeCodes.length) return [];
      return selectedIeCodes.map(
        (code) =>
          baseOptions.find((opt) => (opt.ie_code_no || opt.iecNo) === code) || {
            ie_code_no: code,
          }
      );
    }, [selectedIeCodes, baseOptions]);

    // Custom filter function for Autocomplete
    const filterOptions = useCallback((options, { inputValue }) => {
      if (!inputValue) {
        return options;
      }

      const lowerCaseInput = inputValue.toLowerCase();
      return options.filter(
        (option) =>
          (option.ie_code_no || option.iecNo || "")
            .toLowerCase()
            .includes(lowerCaseInput) ||
          (option.importer_name || option.importerName || "")
            .toLowerCase()
            .includes(lowerCaseInput)
      );
    }, []);

    const renderOption = useCallback(
      (props, option, { selected }) => (
        <li {...props} key={option.ie_code_no || option.iecNo}>
          <Box sx={{ width: "100%" }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
            >
              <Business fontSize="small" color="primary" />
              <Typography variant="body2" fontWeight="bold" color="primary">
                {option.ie_code_no || option.iecNo}
              </Typography>
              {selected && (
                <Chip
                  size="small"
                  label="Selected"
                  color="primary"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Person fontSize="small" color="text.secondary" />
              <Typography variant="caption" color="text.secondary">
                {option.importer_name ||
                  option.importerName ||
                  "No Importer Name"}
              </Typography>
            </Box>
          </Box>
        </li>
      ),
      []
    );

    const handleChange = useCallback(
      (_, newValue) => {
        setSelectedIeCodes(newValue.map((val) => val.ie_code_no || val.iecNo));
      },
      [setSelectedIeCodes]
    );

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={loading}
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6">
              {isRemovingIeCode ? "Remove" : "Assign"} IE Codes -{" "}
              {selectedEntity?.name}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setIsRemovingIeCode((v) => !v)}
              disabled={loading}
              color={isRemovingIeCode ? "primary" : "error"}
            >
              Switch to {isRemovingIeCode ? "Assignment" : "Removal"}
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedEntity?.ie_code_assignments?.length > 0
              ? `Current IE Codes: ${selectedEntity.ie_code_assignments
                  .map(
                    (a) =>
                      `${a.ie_code_no} (${
                        a.importer_name || "No Importer Name"
                      })`
                  )
                  .join(", ")}`
              : "No IE codes currently assigned."}
          </Typography>

          <Autocomplete
            multiple
            disableCloseOnSelect
            options={baseOptions}
            getOptionLabel={(opt) => opt.ie_code_no || opt.iecNo || ""}
            isOptionEqualToValue={(opt, val) =>
              (opt.ie_code_no || opt.iecNo) === (val.ie_code_no || val.iecNo)
            }
            value={selectedOptions}
            onChange={handleChange}
            filterOptions={filterOptions}
            filterSelectedOptions
            renderOption={renderOption}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography variant="caption" fontWeight="bold">
                        {option.ie_code_no || option.iecNo}
                      </Typography>
                      {option.importer_name || option.importerName ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 0.5 }}
                        >
                          ({option.importer_name || option.importerName})
                        </Typography>
                      ) : null}
                    </Box>
                  }
                  {...getTagProps({ index })}
                  key={option.ie_code_no || option.iecNo}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={
                  isRemovingIeCode
                    ? "Select IE Codes to Remove"
                    : "Select IE Codes to Assign"
                }
                placeholder="Search by IE code or importer name..."
                disabled={loading}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
                helperText={`Type to search by IE code or importer name${
                  baseOptions.length > 0
                    ? ` • ${baseOptions.length} available`
                    : ""
                }`}
              />
            )}
            sx={{ mb: 2 }}
            ListboxProps={{
              style: {
                maxHeight: 320,
              },
            }}
            noOptionsText="No IE codes found matching your search"
          />

          <TextField
            fullWidth
            label="Reason (Optional)"
            placeholder={`Enter reason for IE code ${
              isRemovingIeCode ? "removal" : "assignment"
            }...`}
            value={ieCodeReason}
            onChange={(e) => setIeCodeReason(e.target.value)}
            multiline
            rows={3}
            helperText={`Provide a reason for this IE code ${
              isRemovingIeCode ? "removal" : "assignment"
            }. This will be logged for audit purposes.`}
            disabled={loading}
          />

          {/* Selected Count */}
          {selectedIeCodes.length > 0 && (
            <Box sx={{ mt: 2, p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="body2" color="primary">
                <strong>{selectedIeCodes.length}</strong> IE code
                {selectedIeCodes.length > 1 ? "s" : ""} selected for{" "}
                {isRemovingIeCode ? "removal" : "assignment"}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            <Button
              onClick={onClose}
              disabled={loading}
              sx={{ flexGrow: 1 }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleIeCodeOperation}
              disabled={loading || selectedIeCodes.length === 0}
              color={isRemovingIeCode ? "error" : "primary"}
              sx={{ flexGrow: 1 }}
            >
              {isRemovingIeCode
                ? `Remove ${selectedIeCodes.length} IE Code${
                    selectedIeCodes.length > 1 ? "s" : ""
                  }`
                : `Assign ${selectedIeCodes.length} IE Code${
                    selectedIeCodes.length > 1 ? "s" : ""
                  }`}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    );
  }
);

export default IeCodeDialog;
