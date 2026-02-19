import React, { useMemo, useState } from 'react';
import { Tag, Pagination, Spin, Empty, Tooltip } from 'antd';
import ColumnSettingsModal from './ColumnSettingsModal';
import '../../styles/transport.scss';

const TransportTable = ({ 
  data, 
  loading, 
  onRefresh,
  searchText,
  columnOrder,
  setColumnOrder,
  isColumnOrderLoaded,
  isColumnSettingsOpen,
  setIsColumnSettingsOpen
}) => {
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Define Columns
  const columns = useMemo(
    () => [
      {
        id: 'sr_no',
        header: <>Sr <br /> No</>,
        size: 50, // Keep minimal fixed width for Sr No
        Cell: ({ row }) => <span className="text-secondary">{row.index + 1}</span>,
      },
      {
        id: 'document_info',
        header: <>Document No &<br />Date</>,
        minWidth: 150,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-main">{row.original.document_no || 'NA'}</span>
            <span className="t-sub">
              {row.original.document_date ? new Date(row.original.document_date).toLocaleDateString() : 'NA'}
            </span>
          </div>
        ),
      },
      {
        id: 'branch_info',
        header: <>Branch &<br />Container</>,
        minWidth: 150,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-main" style={{ fontWeight: 500 }}>{row.original.branch || 'NA'}</span>
            <Tag style={{ margin: 0, width: 'fit-content' }}>{row.original.container_type || 'NA'}</Tag>
          </div>
        ),
      },
      {
        id: 'lr_details',
        header: <>LR No &<br />Date</>,
        minWidth: 250,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-main">{row.original.lr_no || row.original.tr_no || 'NA'}</span>
            <span className="t-sub">
              {row.original.lr_date ? new Date(row.original.lr_date).toLocaleDateString() : 'NA'}
            </span>
          </div>
        ),
      },
      {
        id: 'eway_vehicle',
        header: <>Eway Bill &<br />Vehicle</>,
        minWidth: 160,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-link">{row.original.eWay_bill || 'NA'}</span>
            <span className="t-sub">{row.original.vehicle_no || 'NA'}</span>
          </div>
        ),
      },
      {
        id: 'container_scal',
        header: <>Container &<br />Seal</>,
        minWidth: 160,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-main">{row.original.container_number || 'NA'}</span>
            <span className="t-sub">Seal: {row.original.seal_no || 'NA'}</span>
          </div>
        ),
      },
      {
        id: 'shipping_do',
        header: <>Shipping Line &<br />DO Validity</>,
        minWidth: 200,
        Cell: ({ row }) => (
          <div className="t-cell">
             <Tooltip title={row.original.shipping_line}>
                <span className="t-main" style={{ fontWeight: 500 }}>{row.original.shipping_line || 'NA'}</span>
             </Tooltip>
             <span className={`t-sub ${row.original.do_validity ? 't-error' : ''}`}>
               Valid: {row.original.do_validity ? new Date(row.original.do_validity).toLocaleDateString() : 'NA'}
             </span>
          </div>
        ),
      },
      {
        id: 'parties',
        header: <>Consignor &<br />Consignee</>,
        minWidth: 300,
        Cell: ({ row }) => (
          <div className="t-cell">
            <Tooltip title={row.original.consignor || ''}>
              <span className="t-sub" style={{ fontWeight: 600, color: '#333' }}>
                From: {row.original.consignor || 'NA'}
              </span>
            </Tooltip>
            <Tooltip title={row.original.consignee || ''}>
              <span className="t-sub">
                To: {row.original.consignee || 'NA'}
              </span>
            </Tooltip>
          </div>
        ),
      },
      {
        id: 'locations',
        header: <>Loading &<br />Offloading</>,
        minWidth: 180,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-sub" style={{ color: '#333' }}>Load: {row.original.container_loading || 'NA'}</span>
            <span className="t-sub">Offload: {row.original.container_offloading || 'NA'}</span>
          </div>
        ),
      },
      {
        id: 'cargo_route',
        header: <>Cargo Source &<br />Dest.</>,
        minWidth: 180,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-sub" style={{ color: '#333' }}>Src: {row.original.goods_pickup || 'NA'}</span>
            <span className="t-sub">Dest: {row.original.goods_delivery || 'NA'}</span>
          </div>
        ),
      },
      {
        id: 'driver_info',
        header: <>Driver Name &<br />Phone</>,
        minWidth: 160,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-main" style={{ fontWeight: 500 }}>{row.original.driver_name || 'NA'}</span>
            <span className="t-link" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
               📞 {row.original.driver_phone || 'NA'}
            </span>
          </div>
        ),
      },
      {
        id: 'detention_info',
        header: <>Detention Days &<br />Reason</>,
        minWidth: 160,
        Cell: ({ row }) => (
          <div className="t-cell">
             <Tag color={row.original.detention_days > 0 ? "warning" : "default"} style={{ width: 'fit-content' }}>
               {row.original.detention_days ? `${row.original.detention_days} Days` : '0 Days'}
             </Tag>
             {row.original.reason && (
               <span className="t-error" style={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                 {row.original.reason}
               </span>
             )}
          </div>
        ),
      },
      {
        id: 'invoice_info',
        header: <>Invoice No &<br />Date</>,
        minWidth: 220,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-main">{row.original.vendor_inv_no || 'NA'}</span>
            <span className="t-sub">
              {row.original.vendor_inv_date ? new Date(row.original.vendor_inv_date).toLocaleDateString() : 'NA'}
            </span>
          </div>
        ),
      },
    ],
    []
  );

  // Determine Visible Columns based on Order
  const visibleColumns = useMemo(() => {
    if (!columnOrder || columnOrder.length === 0) return columns;
    const ordered = [];
    const colMap = new Map(columns.map(c => [c.id, c]));
    
    columnOrder.forEach(id => {
      if (colMap.has(id)) {
        ordered.push(colMap.get(id));
        colMap.delete(id);
      }
    });
    // Add any new columns that weren't in the saved order
    colMap.forEach(col => ordered.push(col));
    return ordered;
  }, [columns, columnOrder]);

  // Client-side Filtering & Sorting & Grouping Logic
  const groupedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    let result = data;
    
    // Filter
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(item => 
        Object.values(item).some(val => 
          val && val.toString().toLowerCase().includes(lowerSearch)
        )
      );
    }
    
    // Sort by Document No then Consignor
    result = [...result].sort((a, b) => {
        const docA = a.document_no || '';
        const docB = b.document_no || '';
        const docResult = docA.localeCompare(docB);
        
        if (docResult !== 0) return docResult;
        
        const consignorA = a.consignor || '';
        const consignorB = b.consignor || '';
        return consignorA.localeCompare(consignorB);
    });

    // Assign Group Serial Numbers based on Doc No + Consignor
    let currentDocNo = null;
    let currentConsignor = null;
    let groupCounter = 0;
    
    return result.map((item) => {
        // Check if either changed
        if (item.document_no !== currentDocNo || item.consignor !== currentConsignor) {
            currentDocNo = item.document_no;
            currentConsignor = item.consignor;
            groupCounter++;
        }
        return { ...item, docSrNo: groupCounter };
    });
  }, [data, searchText]);

  // Client-side Pagination
  const paginatedData = useMemo(() => {
    if (groupedData.length === 0) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return groupedData.slice(startIndex, startIndex + pageSize);
  }, [groupedData, currentPage, pageSize]);

  // Calculate Row Spans and Meta for the current page
  const rowMeta = useMemo(() => {
    const meta = {};
    if (paginatedData.length === 0) return meta;

    let currentDocNo = null;
    let currentConsignor = null;
    let spanCount = 0;
    let startIndex = -1;

    // Helper to commit a span
    const commitSpan = (start, count) => {
        if (start !== -1) {
            meta[start] = { span: count, isStart: true };
            // Mark subsequent rows as hidden for spanned columns
            for (let i = 1; i < count; i++) {
                meta[start + i] = { span: 0, isStart: false };
            }
            // Mark end row
            meta[start + count - 1].isEnd = true;
        }
    };

    paginatedData.forEach((row, index) => {
        // Initialize meta for this row if not present
        if (!meta[index]) meta[index] = {};

        const docNo = row.document_no;
        const consignor = row.consignor;
        
        // Check if belongs to same group
        if (docNo === currentDocNo && consignor === currentConsignor) {
            spanCount++;
        } else {
            commitSpan(startIndex, spanCount);
            
            // New Group
            currentDocNo = docNo;
            currentConsignor = consignor;
            spanCount = 1;
            startIndex = index;
        }
    });
    // Commit last group
    commitSpan(startIndex, spanCount);
    
    return meta;
  }, [paginatedData]);

  if (!isColumnOrderLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="transport-module-wrapper">
      {/* Table Area (Toolbar removed) */}
      <div className="transport-table-container">
        {loading && (
           <div className="loading-overlay">
             <Spin tip="Loading data..." size="large" />
           </div>
        )}
        
        {!loading && (!groupedData || groupedData.length === 0) ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', flexDirection: 'column', alignItems: 'center' }}>
            <Empty description={searchText ? "No results found" : "No transportation data available"} />
          </div>
        ) : (
          <table className="transport-table">
            <thead>
              <tr>
                {visibleColumns.map(col => (
                  <th key={col.id} style={{ width: col.size, minWidth: col.minWidth }}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, rowIndex) => {
                 const globalIndex = (currentPage - 1) * pageSize + rowIndex;
                 const meta = rowMeta[rowIndex] || { span: 1, isStart: true, isEnd: true };
                 const isGroupLastRow = meta.isEnd;

                 return (
                  <tr key={rowIndex} className={isGroupLastRow ? 'group-last-row' : ''}>
                    {visibleColumns.map(col => {
                      // Apply Grouping to 'sr_no', 'document_info', AND 'parties' (Consignor/Consignee)
                      if (col.id === 'sr_no' || col.id === 'document_info' || col.id === 'parties') {
                          if (!meta.isStart) return null; // Skip rendering subsumed cells
                          
                          return (
                            <td key={col.id} rowSpan={meta.span} className="grouped-cell">
                              {col.id === 'sr_no' ? (
                                  <span className="text-secondary font-bold">{row.docSrNo}</span>
                              ) : col.Cell ? (
                                col.Cell({ row: { original: row, index: globalIndex } })
                              ) : (
                                <span className="t-sub">{row[col.id] || 'NA'}</span>
                              )}
                            </td>
                          );
                      }
                      
                      // For other columns, render normally
                      return (
                        <td key={col.id}>
                          {col.Cell ? (
                            col.Cell({ row: { original: row, index: globalIndex } })
                          ) : (
                            <span className="t-sub">{row[col.id] || 'NA'}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="transport-pagination">
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={groupedData.length || 0}
          onChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
          showSizeChanger
          showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
          pageSizeOptions={['25', '50', '100']}
        />
      </div>

      {/* Column Reorder Modal */}
      <ColumnSettingsModal
        open={isColumnSettingsOpen}
        onClose={() => setIsColumnSettingsOpen(false)}
        columns={columns}
        columnOrder={columnOrder}
        onSave={(newOrder) => {
          setColumnOrder(newOrder); // Update Parent State
          setIsColumnSettingsOpen(false);
        }}
      />
    </div>
  );
};

export default TransportTable;
