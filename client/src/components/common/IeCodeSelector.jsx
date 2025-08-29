import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { getUserIeCodes } from '../../utils/ieCodeHelpers';

const IeCodeSelector = ({ selectedIeCode, onIeCodeChange }) => {
  const ieCodes = getUserIeCodes();

  return (
    <FormControl fullWidth size="small">
      <InputLabel>Select IE Code</InputLabel>
      <Select
        value={selectedIeCode || ''}
        onChange={(e) => onIeCodeChange(e.target.value)}
        label="Select IE Code"
      >
        <MenuItem value="">
          <em>All IE Codes</em>
        </MenuItem>
        {ieCodes.map((ieCode) => (
          <MenuItem key={ieCode.ie_code_no} value={ieCode.ie_code_no}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2">
                {ieCode.ie_code_no}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {ieCode.importer_name}
                </Typography>
                {ieCode.is_primary && (
                  <Chip
                    label="Primary"
                    color="primary"
                    size="small"
                    variant="outlined"
                    sx={{ height: 16 }}
                  />
                )}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default IeCodeSelector;
