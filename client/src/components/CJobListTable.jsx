import React, { useMemo } from 'react';
import { Empty, Spin } from 'antd';
import '../styles/job-list.scss';

const CJobListTable = ({ 
  data = [], 
  columns = [], 
  columnOrder = [], 
  // setColumnOrder, // No longer needed here if dragging is removed or handled via modal only
  isLoading = false,
  getStatusColor,
  // pagination, // Moved to parent
  // onPaginationChange // Moved to parent
}) => {
  
  // Define default minimum widths for specific columns if not present in column def
  const defaultMinCode = {
    'job_no': 150,
    'supplier_exporter': 250,
    'be_no': 200,
    'checklist': 250,
    'shipment_details': 240,
    'container_details': 220,
    'container_numbers': 220,
    'movement_timeline': 300,
  };

  // Enhance columns with visibility and ordering logic
  const visibleColumns = useMemo(() => {
    if (!columnOrder || columnOrder.length === 0) return columns;
    
    const orderedCols = [];
    const colMap = new Map(columns.map(c => [c.accessorKey || c.id, c]));
    
    columnOrder.forEach(key => {
      if (colMap.has(key)) {
        orderedCols.push(colMap.get(key));
      }
    });
    
    // Append any columns that are in 'columns' but not in 'columnOrder' (new columns)
    const processedKeys = new Set(orderedCols.map(c => c.accessorKey || c.id));
    columns.forEach(c => {
        const key = c.accessorKey || c.id;
        if (!processedKeys.has(key)) {
            orderedCols.push(c);
        }
    });
    
    return orderedCols.length > 0 ? orderedCols : columns;
  }, [columns, columnOrder]);

  if (isLoading && (!data || data.length === 0)) {
    return (
      <div className="flex justify-center items-center h-full p-10">
        <Spin size="large" tip="Loading jobs..." />
      </div>
    );
  }

  return (
    <div className="table-container custom-table-container flex flex-col h-full bg-white rounded-lg shadow-sm">
       <div className="table-scroll-area">
         {isLoading && (
            <div className="absolute inset-0 bg-white/70 z-50 flex items-center justify-center">
                <Spin size="large" />
            </div>
         )}
         
         {(!data || data.length === 0) && !isLoading ? (
             <div className="flex justify-center items-center p-10 h-full">
                 <Empty description="No jobs found" />
             </div>
         ) : (
            <table className="w-full relative"> 
                <thead>
                    <tr>
                    {visibleColumns.map((col) => {
                        const colId = col.accessorKey || col.id;
                        const minWidth = col.minWidth || defaultMinCode[colId] || 150;
                        return (
                            <th 
                                key={colId} 
                                style={{ width: col.size, minWidth: minWidth }}
                            >
                                {col.header}
                            </th>
                        );
                    })}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr 
                            key={row._id || row.id || rowIndex} 
                            style={{ 
                                backgroundColor: getStatusColor ? getStatusColor(row.detailed_status) : 'inherit' 
                            }}
                        >
                            {visibleColumns.map((col) => (
                                <td 
                                    key={`${row._id}-${col.accessorKey || col.id}`}
                                >
                                    {col.Cell ? (
                                        col.Cell({ 
                                            row: { original: row, index: rowIndex }, 
                                            cell: { 
                                                getValue: () => row[col.accessorKey],
                                                row: { original: row } 
                                            } 
                                        })
                                    ) : (
                                        <span className="text-sm text-gray-700">
                                            {row[col.accessorKey] || 'NA'}
                                        </span>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
         )}
       </div>
    </div>
  );
};

export default CJobListTable;
