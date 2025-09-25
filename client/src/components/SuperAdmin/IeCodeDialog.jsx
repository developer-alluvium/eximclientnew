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
} from "@mui/material";

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
    filteredIeCodes = [], // pass filtered assign list if applicable
  }) => {
    const filteredOptions = useMemo(() => {
      return isRemovingIeCode
        ? selectedEntity?.ie_code_assignments || []
        : filteredIeCodes;
    }, [isRemovingIeCode, selectedEntity, filteredIeCodes]);

    const selectedOptions = useMemo(() => {
      if (!selectedIeCodes.length) return [];
      return selectedIeCodes.map(
        (code) =>
          filteredOptions.find(
            (opt) => (opt.ie_code_no || opt.iecNo) === code
          ) || { ie_code_no: code }
      );
    }, [selectedIeCodes, filteredOptions]);

    const renderOption = useCallback(
      (props, option, { selected }) => (
        <li {...props} key={option.ie_code_no || option.iecNo}>
          <Box sx={{ width: "100%" }}>
            <Typography variant="body2" fontWeight="bold" color="primary">
              {option.ie_code_no || option.iecNo}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {option.importer_name || option.importerName}
            </Typography>
          </Box>
          {selected && (
            <Chip
              size="small"
              label="Selected"
              color="primary"
              sx={{ ml: 1 }}
            />
          )}
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
              onClick={() => setIsRemovingIeCode((v) => !v)}
              disabled={loading}
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
            options={filteredOptions}
            getOptionLabel={(opt) => opt.ie_code_no || opt.iecNo || ""}
            isOptionEqualToValue={(opt, val) =>
              (opt.ie_code_no || opt.iecNo) === (val.ie_code_no || val.iecNo)
            }
            value={selectedOptions}
            onChange={handleChange}
            filterSelectedOptions
            renderOption={renderOption}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option.ie_code_no || option.iecNo}
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
                placeholder="Search IE codes..."
                disabled={loading}
              />
            )}
            sx={{ mb: 2 }}
            ListboxProps={{ style: { maxHeight: 320 } }}
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
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            <Button onClick={onClose} disabled={loading} sx={{ flexGrow: 1 }}>
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
