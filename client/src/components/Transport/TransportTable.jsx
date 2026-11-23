import React, { useMemo, useState, useEffect } from 'react';
import { Tag, Pagination, Spin, Empty, Tooltip, Modal, Timeline } from 'antd';
import ColumnSettingsModal from './ColumnSettingsModal';
import axios from 'axios';
import Swal from 'sweetalert2';
import LrEwayBillDialog from '../ewaybill/Modals/LrEwayBillDialog';
import LiveLogisticsTrackingModal from './LiveLogisticsTrackingModal';
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

  // Live Logistics / Toll Booth Tracking Modal States
  const [isTollModalOpen, setIsTollModalOpen] = useState(false);
  const [selectedTollRow, setSelectedTollRow] = useState(null);

  // Responsive Mobile Detection & Card Expand State
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [expandedCards, setExpandedCards] = useState({});

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCard = (cardKey) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
  };

  const getStatusColor = (st) => {
    if (!st) return 'default';
    const s = String(st).toLowerCase();
    if (s.includes('offload') || s.includes('delivered') || s.includes('out') || s.includes('completed')) return 'success';
    if (s.includes('transit') || s.includes('in') || s.includes('loaded')) return 'processing';
    if (s.includes('pending')) return 'warning';
    if (s.includes('breakdown') || s.includes('error')) return 'error';
    return 'blue';
  };

  const handleOpenTollTracking = (rowItem) => {
    setSelectedTollRow(rowItem);
    setIsTollModalOpen(true);
  };

  // Tracking Status History Modal States
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [selectedTrackingItem, setSelectedTrackingItem] = useState(null);
  const [trackingHistoryList, setTrackingHistoryList] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  const handleOpenTrackingHistory = async (rowItem) => {
    setSelectedTrackingItem(rowItem);
    setIsTrackingModalOpen(true);
    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingHistoryList([]);

    const containerId = rowItem.container_id || rowItem._id;
    const containerNumber = rowItem.container_number;
    const trNo = rowItem.tr_no;

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_STRING}/transport/tracking-history`, {
        params: {
          ...(containerId && { containerId }),
          ...(containerNumber && { containerNumber }),
          ...(trNo && { trNo }),
        }
      });

      if (response.data && response.data.success) {
        setTrackingHistoryList(response.data.data || []);
      } else {
        setTrackingHistoryList([]);
      }
    } catch (err) {
      console.error("Failed to fetch tracking history:", err);
      setTrackingError(err.response?.data?.message || err.message || "Failed to load tracking history");
    } finally {
      setTrackingLoading(false);
    }
  };

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
        header: <>Sr<br />No</>,
        size: 45,
        minWidth: 45,
        Cell: ({ row }) => <span className="text-secondary font-bold">{row.docSrNo || (row.index + 1)}</span>,
      },
      {
        id: 'doc_be_branch',
        header: <>Doc, BE &<br />Branch</>,
        minWidth: 165,
        Cell: ({ row }) => (
          <div className="t-cell">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="t-main" style={{ fontWeight: 700, color: '#0f172a' }}>
                📄 {row.original.document_no || 'NA'}
              </span>
              {row.original.branch && (
                <Tag color="cyan" style={{ margin: 0, fontSize: '0.68rem', padding: '0 4px', lineHeight: '18px' }}>
                  {row.original.branch}
                </Tag>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <span className="t-sub" style={{ fontSize: '0.74rem' }}>
                BE: <strong>{row.original.be_no || 'NA'}</strong>
              </span>
              {row.original.document_date && (
                <span className="t-sub" style={{ fontSize: '0.72rem' }}>
                  📅 {new Date(row.original.document_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'container_vehicle',
        header: <>Container &<br />Vehicle</>,
        minWidth: 195,
        Cell: ({ row }) => {
          const veh = row.original.vehicle_no ? String(row.original.vehicle_no).trim() : '';
          const hasVeh = veh && veh !== 'NA' && veh !== 'null';

          return (
            <div className="t-cell">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="t-main" style={{ fontWeight: 700, color: '#1e293b' }}>
                  📦 {row.original.container_number || 'NA'}
                </span>
                {row.original.container_type && (
                  <Tag color="blue" style={{ margin: 0, fontSize: '0.68rem', padding: '0 4px', lineHeight: '18px' }}>
                    {row.original.container_type}
                  </Tag>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                <span className="t-sub" style={{ fontWeight: 600, color: '#1e293b' }}>
                  🚛 {veh || 'NA'}
                </span>
                {hasVeh && (
                  <span
                    onClick={() => handleOpenTollTracking(row.original)}
                    style={{
                      cursor: 'pointer',
                      padding: '1px 6px',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '4px',
                      color: '#15803d',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s'
                    }}
                    title="View Live Toll Booth Checkpoints & Vahan Compliance"
                  >
                    📍 Toll Booth
                  </span>
                )}
              </div>
              {row.original.seal_no && row.original.seal_no !== 'NA' && (
                <span className="t-sub" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  🔒 Seal: {row.original.seal_no}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'tracking_status',
        header: <>Tracking Status &<br />Date</>,
        minWidth: 175,
        Cell: ({ row }) => {
          const status = row.original.tracking_status;
          const statusDate = row.original.tracking_status_date;

          const getStatusColor = (st) => {
            if (!st) return 'default';
            const s = String(st).toLowerCase();
            if (s.includes('offload') || s.includes('delivered') || s.includes('out') || s.includes('completed')) return 'success';
            if (s.includes('transit') || s.includes('in') || s.includes('loaded')) return 'processing';
            if (s.includes('pending')) return 'warning';
            if (s.includes('breakdown') || s.includes('error')) return 'error';
            return 'blue';
          };

          return (
            <div className="t-cell">
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexWrap: 'wrap' }}
                onClick={() => handleOpenTrackingHistory(row.original)}
                title="Click to view tracking stage history timeline"
              >
                <Tag 
                  color={getStatusColor(status)} 
                  style={{ 
                    margin: 0, 
                    fontWeight: 600, 
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  {status || 'Not Started'}
                </Tag>
                <Tooltip title="Click to view full stage history timeline">
                  <span style={{ 
                    fontSize: '0.68rem', 
                    color: '#2563eb', 
                    fontWeight: 600,
                    background: '#eff6ff',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    border: '1px solid #bfdbfe'
                  }}>
                    History ⏱
                  </span>
                </Tooltip>
              </div>
              {statusDate ? (
                <span className="t-sub" style={{ fontSize: '0.72rem', marginTop: 3 }}>
                  🕒 {formatDate(statusDate)} {new Date(statusDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : (
                <span className="t-sub" style={{ fontSize: '0.72rem', marginTop: 3, color: '#94a3b8' }}>
                  No date
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'lr_eway',
        header: <>LR No &<br />E-Way Bill</>,
        minWidth: 165,
        Cell: ({ row }) => {
          const ewb = row.original.eWay_bill || row.original.eway_bill || row.original.ewayBillNo;
          const hasValidEwb = ewb && 
            String(ewb).trim() !== '' && 
            String(ewb).trim() !== '000000000000' && 
            String(ewb).trim().toLowerCase() !== 'null';

          return (
            <div className="t-cell">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span className="t-main" style={{ fontWeight: 600 }}>
                  LR: {row.original.lr_no || row.original.tr_no || 'NA'}
                </span>
                {row.original.lr_date && (
                  <span className="t-sub" style={{ fontSize: '0.72rem' }}>
                    ({new Date(row.original.lr_date).toLocaleDateString()})
                  </span>
                )}
              </div>
              <div style={{ marginTop: 2 }}>
                <span 
                  className="t-sub"
                  style={{ 
                    fontWeight: 600,
                    color: hasValidEwb ? '#1e293b' : '#64748b'
                  }}
                >
                  📄 EWB: {hasValidEwb ? String(ewb).trim() : 'NA'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: 'parties',
        header: <>Parties<br />(From / To)</>,
        minWidth: 200,
        Cell: ({ row }) => (
          <div className="t-cell">
            <Tooltip title={row.original.consignor || ''}>
              <span className="t-sub" style={{ fontWeight: 600, color: '#1e293b' }}>
                From: {row.original.consignor || 'NA'}
              </span>
            </Tooltip>
            <Tooltip title={row.original.consignee || ''}>
              <span className="t-sub" style={{ color: '#475569' }}>
                To: {row.original.consignee || 'NA'}
              </span>
            </Tooltip>
          </div>
        ),
      },
      {
        id: 'route_locations',
        header: <>Route &<br />Terminals</>,
        minWidth: 180,
        Cell: ({ row }) => (
          <div className="t-cell">
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span className="t-main" style={{ fontSize: '0.78rem', color: '#1e293b' }}>
                📍 {row.original.goods_pickup || 'NA'}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>➔</span>
              <span className="t-main" style={{ fontSize: '0.78rem', color: '#1e293b' }}>
                🏁 {row.original.goods_delivery || 'NA'}
              </span>
            </div>
            {(row.original.container_loading || row.original.container_offloading) && (
              <div style={{ display: 'flex', gap: 6, fontSize: '0.7rem', color: '#64748b', marginTop: 2, flexWrap: 'wrap' }}>
                <span>Load: {row.original.container_loading || 'NA'}</span>
                <span>|</span>
                <span>Offload: {row.original.container_offloading || 'NA'}</span>
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'shipping_do',
        header: <>Shipping Line &<br />DO Validity</>,
        minWidth: 180,
        Cell: ({ row }) => {
          const displayDoValidity = row.original.lr_do_validity || row.original.do_validity;
          return (
            <div className="t-cell">
               <Tooltip title={row.original.shipping_line}>
                  <span className="t-main" style={{ fontWeight: 600 }}>{row.original.shipping_line || 'NA'}</span>
               </Tooltip>
               <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 4, marginTop: 3 }}>
                 <span className={`t-sub ${displayDoValidity ? 't-error' : ''}`} style={{ fontWeight: 500, fontSize: '0.72rem' }}>
                   DO: {displayDoValidity ? formatDate(displayDoValidity) : 'NA'}
                 </span>
               </div>
               {Array.isArray(row.original.do_revalidity) && row.original.do_revalidity.map((rev, index) => (
                 <div key={rev._id || index} style={{ marginTop: 2 }}>
                   <span className="t-sub" style={{ fontWeight: 500, fontSize: '0.7rem' }}>
                     Rev {index + 1}: {rev.date ? formatDate(rev.date) : 'NA'}
                   </span>
                 </div>
               ))}
            </div>
          );
        },
      },
      {
        id: 'driver_info',
        header: <>Driver Name &<br />Phone</>,
        minWidth: 160,
        Cell: ({ row }) => {
          const phone = row.original.driver_phone ? String(row.original.driver_phone).trim() : '';
          const hasPhone = phone && phone !== 'NA' && phone !== 'null' && phone !== 'undefined';

          return (
            <div className="t-cell">
              <span className="t-main" style={{ fontWeight: 600, color: '#1e293b' }}>
                👤 {row.original.driver_name || 'NA'}
              </span>
              {hasPhone ? (
                <a
                  href={`tel:${phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.75rem',
                    color: '#16a34a',
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    width: 'fit-content',
                    marginTop: 3,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  title={`Click to call driver ${phone}`}
                >
                  <span>📞</span>
                  <span>{phone}</span>
                  <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 700, marginLeft: 2 }}>Call</span>
                </a>
              ) : (
                <span className="t-sub" style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 3 }}>
                  📞 No Phone
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'invoice_detention',
        header: <>Invoice &<br />Detention</>,
        minWidth: 165,
        Cell: ({ row }) => (
          <div className="t-cell">
            <div>
              <span className="t-main" style={{ fontWeight: 600 }}>
                Inv: {row.original.vendor_inv_no || 'NA'}
              </span>
              {row.original.vendor_inv_date && (
                <span className="t-sub" style={{ fontSize: '0.72rem' }}>
                  ({new Date(row.original.vendor_inv_date).toLocaleDateString()})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
              <Tag color={row.original.detention_days > 0 ? "warning" : "default"} style={{ margin: 0, fontSize: '0.68rem', padding: '0 4px', lineHeight: '18px' }}>
                {row.original.detention_days ? `${row.original.detention_days} Days` : '0 Days'}
              </Tag>
              {row.original.reason && (
                <span className="t-error" style={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                  {row.original.reason}
                </span>
              )}
            </div>
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
      // Gracefully map legacy saved column IDs to new combined IDs
      let targetId = id;
      if (id === 'document_info' || id === 'be_no' || id === 'branch_info') targetId = 'doc_be_branch';
      if (id === 'container_scal') targetId = 'container_vehicle';
      if (id === 'lr_details' || id === 'eway_vehicle') targetId = 'lr_eway';
      if (id === 'locations' || id === 'cargo_route') targetId = 'route_locations';
      if (id === 'invoice_info' || id === 'detention_info') targetId = 'invoice_detention';

      if (colMap.has(targetId)) {
        ordered.push(colMap.get(targetId));
        colMap.delete(targetId);
      }
    });
    // Add any remaining columns
    colMap.forEach(col => ordered.push(col));
    return ordered;
  }, [columns, columnOrder]);

  // Client-side Filtering & Sorting & Grouping Logic
  const groupedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    // Filter out empty standalone records that have no valid document, BE, branch, or container info
    let result = data.filter(item => item && (
      item.document_no || 
      item.be_no || 
      item.branch || 
      item.container_type || 
      item.seal_no || 
      item.shipping_line
    ));
    
    // Filter by search text
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(item => 
        Object.values(item).some(val => 
          val && val.toString().toLowerCase().includes(lowerSearch)
        )
      );
    }
    
    // Sort by BE No (fallback to Document No, then TR No) then Consignor
    result = [...result].sort((a, b) => {
        const keyA = a.be_no || a.document_no || a.tr_no || '';
        const keyB = b.be_no || b.document_no || b.tr_no || '';
        const keyResult = keyA.localeCompare(keyB);
        
        if (keyResult !== 0) return keyResult;
        
        const consignorA = a.consignor || '';
        const consignorB = b.consignor || '';
        return consignorA.localeCompare(consignorB);
    });

    // Assign Group Serial Numbers based on Group Key (BE No || Doc No || TR No) + Consignor
    let currentGroupKey = null;
    let currentConsignor = null;
    let groupCounter = 0;
    
    return result.map((item) => {
        const groupKey = item.be_no || item.document_no || item.tr_no || '';
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

        const groupKey = row.be_no || row.document_no || row.tr_no || '';
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
        ) : isMobile ? (
          /* Mobile Card View (Phone App Style with Expand / Collapse) */
          <div className="transport-mobile-cards-list">
            {paginatedData.map((row, index) => {
              const cardKey = row._id || `${row.tr_no}_${row.container_number}_${index}`;
              const isExpanded = !!expandedCards[cardKey];
              const veh = row.vehicle_no ? String(row.vehicle_no).trim() : '';
              const hasVeh = veh && veh !== 'NA' && veh !== 'null';
              const phone = row.driver_phone ? String(row.driver_phone).trim() : '';
              const hasPhone = phone && phone !== 'NA' && phone !== 'null' && phone !== 'undefined';
              const ewb = row.eWay_bill || row.eway_bill || row.ewayBillNo;
              const hasEwb = ewb && String(ewb).trim() !== '' && String(ewb).trim() !== '000000000000' && String(ewb).trim().toLowerCase() !== 'null';
              const displayDoValidity = row.lr_do_validity || row.do_validity;

              return (
                <div key={cardKey} className="mobile-transport-card">
                  {/* Card Header: Sr No, Container No, Type, Status */}
                  <div className="card-header">
                    <div className="card-title-row">
                      <span className="card-sr-badge">#{row.docSrNo || (index + 1)}</span>
                      <span className="card-container-no">
                        📦 {row.container_number || 'No Container'}
                      </span>
                      {row.container_type && (
                        <Tag color="blue" style={{ margin: 0, fontSize: '0.68rem', padding: '0 4px', lineHeight: '18px' }}>
                          {row.container_type}
                        </Tag>
                      )}
                    </div>
                    <Tag 
                      color={getStatusColor(row.tracking_status)} 
                      className="card-status-tag"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleOpenTrackingHistory(row)}
                    >
                      {row.tracking_status || 'Not Started'}
                    </Tag>
                  </div>

                  {/* Card Main Body: Quick At-a-glance Info */}
                  <div className="card-body">
                    {/* Vehicle & Toll Booth Action */}
                    <div className="card-info-row">
                      <div className="info-item">
                        <span className="info-label">Truck:</span>
                        <span className="info-val" style={{ fontWeight: 600 }}>🚛 {veh || 'NA'}</span>
                      </div>
                      {hasVeh && (
                        <button 
                          type="button"
                          className="toll-booth-btn"
                          onClick={() => handleOpenTollTracking(row)}
                        >
                          📍 Toll Booth
                        </button>
                      )}
                    </div>

                    {/* Route */}
                    {(row.goods_pickup || row.goods_delivery) && (
                      <div className="card-route-row">
                        <span>📍 {row.goods_pickup || 'Origin'}</span>
                        <span className="route-arrow">➔</span>
                        <span>🏁 {row.goods_delivery || 'Destination'}</span>
                      </div>
                    )}

                    {/* Driver & Call Action */}
                    <div className="card-info-row">
                      <div className="info-item">
                        <span className="info-label">Driver:</span>
                        <span className="info-val" style={{ fontWeight: 500 }}>👤 {row.driver_name || 'NA'}</span>
                      </div>
                      {hasPhone ? (
                        <a href={`tel:${phone}`} className="driver-call-btn">
                          📞 Call {phone}
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>📞 No Phone</span>
                      )}
                    </div>

                    {/* Status Timestamp & History Action */}
                    <div className="card-status-row">
                      <span className="status-time">
                        🕒 {row.tracking_status_date ? `${formatDate(row.tracking_status_date)} ${new Date(row.tracking_status_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No date recorded'}
                      </span>
                      <button 
                        type="button"
                        className="history-btn"
                        onClick={() => handleOpenTrackingHistory(row)}
                      >
                        ⏱ History
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details Grid (Shown when expanded) */}
                  {isExpanded && (
                    <div className="card-expanded-content">
                      <div className="expanded-grid">
                        <div className="expanded-field">
                          <span className="exp-label">Document No</span>
                          <span className="exp-val font-semibold">{row.document_no || 'NA'}</span>
                        </div>
                        <div className="expanded-field">
                          <span className="exp-label">Document Date</span>
                          <span className="exp-val">{row.document_date ? new Date(row.document_date).toLocaleDateString() : 'NA'}</span>
                        </div>
                        <div className="expanded-field">
                          <span className="exp-label">BE No</span>
                          <span className="exp-val font-semibold">{row.be_no || 'NA'}</span>
                        </div>
                        <div className="expanded-field">
                          <span className="exp-label">Branch</span>
                          <span className="exp-val">{row.branch || 'NA'}</span>
                        </div>
                        <div className="expanded-field">
                          <span className="exp-label">LR No</span>
                          <span className="exp-val font-semibold">{row.lr_no || row.tr_no || 'NA'}</span>
                        </div>
                        <div className="expanded-field">
                          <span className="exp-label">LR Date</span>
                          <span className="exp-val">{row.lr_date ? new Date(row.lr_date).toLocaleDateString() : 'NA'}</span>
                        </div>
                        <div className="expanded-field full-width">
                          <span className="exp-label">E-Way Bill No</span>
                          <span className="exp-val" style={{ fontWeight: 600, color: hasEwb ? '#166534' : '#64748b' }}>
                            📄 {hasEwb ? String(ewb).trim() : 'NA'}
                          </span>
                        </div>
                        <div className="expanded-field">
                          <span className="exp-label">Seal No</span>
                          <span className="exp-val">{row.seal_no || 'NA'}</span>
                        </div>
                        <div className="expanded-field">
                          <span className="exp-label">Shipping Line</span>
                          <span className="exp-val">{row.shipping_line || 'NA'}</span>
                        </div>
                        <div className="expanded-field">
                          <span className="exp-label">DO Validity</span>
                          <span className={`exp-val ${displayDoValidity ? 't-error' : ''}`}>
                            {displayDoValidity ? formatDate(displayDoValidity) : 'NA'}
                          </span>
                        </div>
                        <div className="expanded-field">
                          <span className="exp-label">Detention</span>
                          <span className="exp-val">
                            {row.detention_days ? `${row.detention_days} Days` : '0 Days'} {row.reason ? `(${row.reason})` : ''}
                          </span>
                        </div>
                        <div className="expanded-field full-width">
                          <span className="exp-label">From (Consignor)</span>
                          <span className="exp-val">{row.consignor || 'NA'}</span>
                        </div>
                        <div className="expanded-field full-width">
                          <span className="exp-label">To (Consignee)</span>
                          <span className="exp-val">{row.consignee || 'NA'}</span>
                        </div>
                        {(row.container_loading || row.container_offloading) && (
                          <>
                            <div className="expanded-field">
                              <span className="exp-label">Terminal Load</span>
                              <span className="exp-val">{row.container_loading || 'NA'}</span>
                            </div>
                            <div className="expanded-field">
                              <span className="exp-label">Terminal Offload</span>
                              <span className="exp-val">{row.container_offloading || 'NA'}</span>
                            </div>
                          </>
                        )}
                        <div className="expanded-field full-width">
                          <span className="exp-label">Vendor Invoice</span>
                          <span className="exp-val">
                            {row.vendor_inv_no || 'NA'} {row.vendor_inv_date ? `(${new Date(row.vendor_inv_date).toLocaleDateString()})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expand / Collapse Footer Tap Action */}
                  <div 
                    className="card-expand-toggle"
                    onClick={() => toggleCard(cardKey)}
                  >
                    <span>{isExpanded ? "Hide Details ▴" : "View More Details ▾"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Table View (Kept Exactly As It Is) */
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
                      // Apply Grouping to 'sr_no', 'doc_be_branch', 'document_info', 'parties', AND 'be_no'
                      if (col.id === 'sr_no' || col.id === 'doc_be_branch' || col.id === 'document_info' || col.id === 'parties' || col.id === 'be_no') {
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

      {/* Tracking Stage History Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              📍 Tracking Stage History
            </span>
            {selectedTrackingItem && (
              <Tag color="blue" style={{ fontSize: '0.82rem', padding: '2px 8px', fontWeight: 600 }}>
                {selectedTrackingItem.container_number || 'Container'}
              </Tag>
            )}
          </div>
        }
        open={isTrackingModalOpen}
        onCancel={() => setIsTrackingModalOpen(false)}
        footer={[
          <button
            key="close"
            type="button"
            onClick={() => setIsTrackingModalOpen(false)}
            style={{
              padding: '6px 16px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              color: '#334155'
            }}
          >
            Close
          </button>
        ]}
        width={620}
        destroyOnClose
      >
        {selectedTrackingItem && (
          <div style={{ marginBottom: 18, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>TR No: </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedTrackingItem.tr_no || 'NA'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Vehicle No: </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedTrackingItem.vehicle_no || 'NA'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Container Type: </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedTrackingItem.container_type || 'NA'}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Current Status: </span>
                <Tag color="geekblue" style={{ margin: 0, fontWeight: 600 }}>
                  {selectedTrackingItem.tracking_status || 'Not Started'}
                </Tag>
              </div>
            </div>
          </div>
        )}

        {trackingLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="Fetching tracking status history..." />
          </div>
        ) : trackingError ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#ef4444', fontSize: '0.9rem' }}>
            ⚠️ {trackingError}
          </div>
        ) : trackingHistoryList.length === 0 ? (
          <Empty 
            description="No tracking stage history recorded yet for this container." 
            style={{ padding: '30px 0' }}
          />
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto', padding: '10px 10px 10px 6px' }}>
            <Timeline
              items={trackingHistoryList.map((hist, idx) => ({
                color: idx === 0 ? 'green' : 'blue',
                children: (
                  <div style={{ paddingBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Tag color={idx === 0 ? 'green' : 'geekblue'} style={{ fontWeight: 600, margin: 0 }}>
                        {hist.trackingStatusName || hist.change || 'Status Updated'}
                      </Tag>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        🕒 {hist.date || ''} {hist.time || ''}
                      </span>
                    </div>
                    {hist.change && (
                      <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: 4, fontWeight: 500 }}>
                        {hist.change}
                      </div>
                    )}
                    {hist.remarks && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>
                        Note: {hist.remarks}
                      </div>
                    )}
                  </div>
                )
              }))}
            />
          </div>
        )}
      </Modal>

      {/* Live Logistics / Toll Booth Tracking Modal */}
      <LiveLogisticsTrackingModal
        open={isTollModalOpen}
        onClose={() => {
          setIsTollModalOpen(false);
          setSelectedTollRow(null);
        }}
        vehicleNo={selectedTollRow?.vehicle_no}
        vehicleType={selectedTollRow?.container_type}
        ownHired={selectedTollRow?.own_hired}
        driverName={selectedTollRow?.driver_name}
        driverPhone={selectedTollRow?.driver_phone}
      />
    </div>
  );
};

export default TransportTable;
