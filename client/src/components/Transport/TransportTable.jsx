import React, { useMemo, useState } from 'react';
import { Tag, Pagination, Spin, Empty, Tooltip } from 'antd';
import ColumnSettingsModal from './ColumnSettingsModal';
import axios from 'axios';
import Swal from 'sweetalert2';
import LrEwayBillDialog from '../ewaybill/Modals/LrEwayBillDialog';
import '../../styles/transport.scss';

const formatDate = (dateVal) => {
  if (!dateVal) return '';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

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

  // E-Way Bill Dialog States
  const [isLrEwayBillDialogOpen, setIsLrEwayBillDialogOpen] = useState(false);
  const [lrEwayBillMode, setLrEwayBillMode] = useState("generate"); // "generate" | "update"
  const [currentContainer, setCurrentContainer] = useState(null);
  const [prData, setPrData] = useState(null);
  const [containers, setContainers] = useState([]);
  const [selectedEWBData, setSelectedEWBData] = useState(null);

  const handleEwayBillClick = async (row) => {
    const docNo = row.original.be_no || row.original.document_no;
    if (!docNo) {
      Swal.fire("Error", "No Bill of Entry (BE No) or Document No found for this container.", "error");
      return;
    }
    
    Swal.fire({
      title: "Fetching Details...",
      text: "Please wait while we retrieve LR details.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/boe-lr-data`, {
        params: { document_no: docNo }
      });

      if (response.data.success && response.data.data) {
        const prInfo = response.data.data;
        setPrData(prInfo);
        setContainers(prInfo.all_active_containers || []);
        
        // Find specific container
        const container = prInfo.all_active_containers.find(
          c => c.tr_no === row.original.tr_no || c.container_number === row.original.container_number
        ) || prInfo.container_details;

        setCurrentContainer(container);

        if (row.original.eWay_bill && /^\d{12}$/.test(String(row.original.eWay_bill).trim())) {
          // Fetch existing EWB details to manage it
          const listRes = await axios.get(`${process.env.REACT_APP_API_STRING}/eway-bill/list`, {
            params: { search: row.original.eWay_bill }
          });

          const ewb = listRes.data.data?.find(e => e.ewbNo == row.original.eWay_bill);
          if (ewb) {
            setSelectedEWBData(ewb);
          } else {
            setSelectedEWBData({ ewbNo: row.original.eWay_bill, userGstin: prInfo.consignor?.gstin || prInfo.consignee?.gstin });
          }
          setLrEwayBillMode("update");
        } else {
          setLrEwayBillMode("generate");
          setSelectedEWBData(null);
        }

        setIsLrEwayBillDialogOpen(true);
        Swal.close();
      } else {
        throw new Error("Failed to retrieve LR data");
      }
    } catch (error) {
      console.error("Error fetching LR details for EWB:", error);
      Swal.fire("Error", "Could not fetch LR details for E-Way Bill. Ensure the LR exists for this container.", "error");
    }
  };

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
        id: 'be_no',
        header: <>BE No.</>,
        minWidth: 120,
        Cell: ({ row }) => (
          <div className="t-cell">
            <span className="t-main">{row.original.be_no || 'NA'}</span>
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
            {/* {row.original.eWay_bill ? (
              <span 
                className="t-link" 
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => handleEwayBillClick(row)}
              >
                {row.original.eWay_bill}
              </span>
            ) : (
              <span 
                className="t-link" 
                style={{ cursor: 'pointer', color: '#1677ff', fontWeight: 500 }}
                onClick={() => handleEwayBillClick(row)}
              >
                Generate EWB
              </span>
            )} */}
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
        Cell: ({ row }) => {
          const displayDoValidity = row.original.lr_do_validity || row.original.do_validity;
          return (
            <div className="t-cell">
               <Tooltip title={row.original.shipping_line}>
                  <span className="t-main" style={{ fontWeight: 500 }}>{row.original.shipping_line || 'NA'}</span>
               </Tooltip>
               <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 6, marginTop: 4 }}>
                 <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>DO Validity:</div>
                 <span className={`t-sub ${displayDoValidity ? 't-error' : ''}`} style={{ fontWeight: 500 }}>
                   {displayDoValidity ? formatDate(displayDoValidity) : 'NA'}
                 </span>
               </div>
               {Array.isArray(row.original.do_revalidity) && row.original.do_revalidity.map((rev, index) => (
                 <div key={rev._id || index} style={{ marginTop: 6 }}>
                   <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Revalidation {index + 1}:</div>
                   <span className="t-sub" style={{ fontWeight: 500 }}>
                     {rev.date ? formatDate(rev.date) : 'NA'}
                   </span>
                 </div>
               ))}
            </div>
          );
        },
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
    
    // Sort by BE No (fallback to Document No) then Consignor
    result = [...result].sort((a, b) => {
        const keyA = a.be_no || a.document_no || '';
        const keyB = b.be_no || b.document_no || '';
        const keyResult = keyA.localeCompare(keyB);
        
        if (keyResult !== 0) return keyResult;
        
        const consignorA = a.consignor || '';
        const consignorB = b.consignor || '';
        return consignorA.localeCompare(consignorB);
    });

    // Assign Group Serial Numbers based on Group Key (BE No || Doc No) + Consignor
    let currentGroupKey = null;
    let currentConsignor = null;
    let groupCounter = 0;
    
    return result.map((item) => {
        const groupKey = item.be_no || item.document_no || '';
        if (groupKey !== currentGroupKey || item.consignor !== currentConsignor) {
            currentGroupKey = groupKey;
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

    let currentGroupKey = null;
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

        const groupKey = row.be_no || row.document_no || '';
        const consignor = row.consignor;
        
        // Check if belongs to same group
        if (groupKey === currentGroupKey && consignor === currentConsignor) {
            spanCount++;
        } else {
            commitSpan(startIndex, spanCount);
            
            // New Group
            currentGroupKey = groupKey;
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
                  <tr 
                    key={rowIndex} 
                    className={isGroupLastRow ? 'group-last-row' : ''}
                    style={{ backgroundColor: row.lr_completed ? '#f5f5f5' : '#f0fae1' }}
                  >
                    {visibleColumns.map(col => {
                      // Apply Grouping to 'sr_no', 'document_info', 'parties' (Consignor/Consignee), AND 'be_no'
                      if (col.id === 'sr_no' || col.id === 'document_info' || col.id === 'parties' || col.id === 'be_no') {
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

      {/* E-Way Bill Dialog */}
      <LrEwayBillDialog
        open={isLrEwayBillDialogOpen}
        mode={lrEwayBillMode}
        container={currentContainer}
        prData={prData}
        containers={containers}
        existingEwb={selectedEWBData}
        onClose={() => {
          setIsLrEwayBillDialogOpen(false);
          setCurrentContainer(null);
          setSelectedEWBData(null);
        }}
        onSuccess={() => {
          setIsLrEwayBillDialogOpen(false);
          setCurrentContainer(null);
          setSelectedEWBData(null);
          if (onRefresh) {
            onRefresh();
          }
        }}
      />
    </div>
  );
};

export default TransportTable;
