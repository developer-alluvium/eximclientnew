import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import {
  MoreVert,
} from '@mui/icons-material';

const ModernDataTable = ({ 
  columns = [], 
  rows = [], 
  title,
  loading = false,
  dense = false,
  onRowClick = null,
  actions = null,
}) => {
  const renderCell = (row, column) => {
    if (column.render) {
      return column.render(row[column.id], row);
    }

    const value = row[column.id];
    
    if (column.type === 'status') {
      const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
          case 'active': return { bg: '#ECFDF5', color: '#059669' };
          case 'inactive': return { bg: '#FEF2F2', color: '#DC2626' };
          case 'pending': return { bg: '#FFFBEB', color: '#D97706' };
          default: return { bg: '#F3F4F6', color: '#6B7280' };
        }
      };
      
      const colors = getStatusColor(value);
      return (
        <Chip
          label={value}
          size="small"
          sx={{
            backgroundColor: colors.bg,
            color: colors.color,
            fontSize: '0.6875rem',
            fontWeight: 500,
            height: 20,
            '& .MuiChip-label': {
              px: 1,
            },
          }}
        />
      );
    }

    if (column.type === 'date') {
      return new Date(value).toLocaleDateString();
    }

    return value;
  };

  const LoadingRow = () => (
    <TableRow>
      {columns.map((_, index) => (
        <TableCell key={index}>
          <Box
            sx={{
              height: 16,
              backgroundColor: '#F3F4F6',
              borderRadius: 1,
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 },
              },
            }}
          />
        </TableCell>
      ))}
    </TableRow>
  );

  return (
    <Paper
      sx={{
        border: '1px solid #F3F4F6',
        borderRadius: 2,
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      {title && (
        <Box
          sx={{
            p: 3,
            borderBottom: '1px solid #F3F4F6',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontSize: '1rem',
              fontWeight: 600,
              color: '#1F2937',
            }}
          >
            {title}
          </Typography>
        </Box>
      )}
      
      <TableContainer>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: '#F8FAFC',
              }}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#1F2937',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em',
                    borderBottom: '1px solid #E5E7EB',
                    py: 1.5,
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
              {actions && (
                <TableCell
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#1F2937',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em',
                    borderBottom: '1px solid #E5E7EB',
                    py: 1.5,
                    width: 80,
                  }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <LoadingRow key={index} />
              ))
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={row.id || index}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: onRowClick ? '#F8FAFC' : 'transparent',
                    },
                    '&:last-child td': {
                      borderBottom: 'none',
                    },
                  }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      sx={{
                        fontSize: '0.8125rem',
                        color: '#1F2937',
                        borderBottom: '1px solid #F3F4F6',
                        py: dense ? 1 : 1.5,
                      }}
                    >
                      {renderCell(row, column)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell
                      sx={{
                        borderBottom: '1px solid #F3F4F6',
                        py: dense ? 1 : 1.5,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          actions(row);
                        }}
                        sx={{
                          color: '#6B7280',
                          '&:hover': {
                            backgroundColor: '#F3F4F6',
                          },
                        }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ModernDataTable;
