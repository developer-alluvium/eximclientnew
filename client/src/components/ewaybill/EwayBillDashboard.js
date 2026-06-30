import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import EwayBillBulkOperations from "./EwayBillBulkOperations";
import EwayBillReports from "./EwayBillReports";
import MetricCards from "./Dashboard/MetricCards";
import TabNavigation from "./Dashboard/TabNavigation";
import PendingLRsTab from "./Dashboard/PendingLRsTab";
import EWBGenerationModal from "./Modals/EWBGenerationModal";
import EwayBillActionModal from "./Modals/EwayBillActionModal";
import "../../styles/ewaybill.scss";

function EwayBillDashboard() {
  const [activeTab, setActiveTab] = useState("ewbs"); // 'pending-lrs', 'ewbs', 'bulk'
  const [ewayBills, setEwayBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    fromDate: "",
    toDate: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEwbs, setSelectedEwbs] = useState([]); // For consolidation

  // Dashboard metrics
  const [metrics, setMetrics] = useState({
    activeEWBs: 0, expiringSoon: 0, expiredTotal: 0, cancelledTotal: 0, pendingLRs: 0
  });
  const [expiringAlerts, setExpiringAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(true);

  // Pending LRs
  const [pendingLRs, setPendingLRs] = useState([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotalPages, setPendingTotalPages] = useState(1);

  // Modal State
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [selectedLrForGeneration, setSelectedLrForGeneration] = useState(null);
  
  // Bulk Operations State
  const [bulkPreFillData, setBulkPreFillData] = useState(null);

  // Action Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedActionEwb, setSelectedActionEwb] = useState(null);

  useEffect(() => {
    fetchMetrics();
    fetchExpiringAlerts();
  }, []);

  useEffect(() => {
    if (['active', 'expiring', 'history', 'ewbs'].includes(activeTab)) {
      fetchEwayBills();
    }
  }, [page, filters, searchQuery, activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    
    // Set appropriate filters for each tab
    if (tabId === 'active') {
      setFilters({ status: 'Generated', fromDate: '', toDate: '', type: '' });
    } else if (tabId === 'expiring') {
      setFilters({ status: 'Generated', fromDate: '', toDate: '', type: 'expiring' });
      setShowAlerts(true);
    } else if (tabId === 'history' || tabId === 'reports') {
      setFilters({ status: '', fromDate: '', toDate: '', type: '' });
    } else {
      setFilters(prev => ({ ...prev, type: '' }));
    }
  };

  useEffect(() => {
    if (activeTab === 'pending-lrs') fetchPendingLRs();
  }, [pendingPage, activeTab]);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/metrics`
      );
      if (response.data.success) {
        setMetrics(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const fetchExpiringAlerts = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/expiring-alerts`
      );
      if (response.data.success) {
        setExpiringAlerts(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching expiring alerts:", error);
    }
  };

  const fetchPendingLRs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/pending-lrs?page=${pendingPage}&limit=15`
      );
      if (response.data.success) {
        setPendingLRs(response.data.data);
        setPendingTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error("Error fetching pending LRs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEwayBills = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10, ...filters };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const queryParams = new URLSearchParams(params).toString();

      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/eway-bill/list?${queryParams}`
      );

      if (response.data.success) {
        setEwayBills(response.data.data);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error("Error fetching E-Way Bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1); // Reset to first page on filter change
  };

  // Helper: Parse date from API format (DD/MM/YYYY HH:MM:SS AM/PM)
  const parseApiDate = (dateStr) => {
    if (!dateStr) return null;
    const ddmmyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const match = String(dateStr).match(ddmmyyyyPattern);
    if (match) {
      const [_, day, month, year] = match;
      const timeMatch = String(dateStr).match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseInt(timeMatch[3]);
        const ampm = timeMatch[4].toUpperCase();
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return new Date(year, month - 1, day, hours, minutes, seconds);
      }
      return new Date(year, month - 1, day, 23, 59, 59);
    }
    return null;
  };

  // Helper: Check if within 24 hours of generation
  const isWithin24Hours = (generatedAt) => {
    if (!generatedAt) return true; // Allow if no date
    const genDate = new Date(generatedAt);
    if (isNaN(genDate.getTime())) return true;
    const hoursSince = (Date.now() - genDate.getTime()) / (1000 * 60 * 60);
    return hoursSince <= 24;
  };

  // Helper: Check if within validity period
  const isWithinValidity = (validUpto) => {
    const validDate = parseApiDate(validUpto);
    if (!validDate) return true;
    return Date.now() < validDate.getTime();
  };

  // Helper: Check if within 8-hour extension window
  const isWithinExtensionWindow = (validUpto) => {
    const validDate = parseApiDate(validUpto);
    if (!validDate) return false;
    const now = Date.now();
    const hoursUntilExpiry = (validDate.getTime() - now) / (1000 * 60 * 60);
    const hoursSinceExpiry = -hoursUntilExpiry;
    // Extension allowed 8 hours before and 8 hours after expiry
    return hoursUntilExpiry <= 8 && hoursSinceExpiry <= 8;
  };

  // Helper: Get time until/since expiry
  const getExpiryInfo = (validUpto) => {
    const validDate = parseApiDate(validUpto);
    if (!validDate) return null;
    const hoursUntilExpiry = (validDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilExpiry > 0) {
      return { expired: false, hours: hoursUntilExpiry };
    }
    return { expired: true, hours: -hoursUntilExpiry };
  };

  // Helper: Show field-level errors in SweetAlert2 modal
  const showFieldErrorsInModal = (validationErrors) => {
    if (!validationErrors || validationErrors.length === 0) return;

    // Clear previous errors
    document.querySelectorAll('.field-error-msg').forEach(el => el.remove());
    document.querySelectorAll('.swal2-input-error').forEach(el => el.classList.remove('swal2-input-error'));

    // Add error styling and messages
    validationErrors.forEach(err => {
      // Try to find the input by various ID patterns
      const fieldId = err.field.replace(/[.\[\]]/g, '-'); // Convert dots and brackets to dashes
      let input = document.getElementById(`swal-${err.field}`) 
        || document.getElementById(`swal-${fieldId}`)
        || document.querySelector(`[name="${err.field}"]`);
      
      if (input) {
        // Add error class to input
        input.classList.add('swal2-input-error');
        input.style.borderColor = '#dc3545';
        input.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-msg';
        errorDiv.style.cssText = 'color: #dc3545; font-size: 0.875em; margin-top: 4px; text-align: left;';
        errorDiv.textContent = err.message;
        
        // Insert after the input
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
      }
    });

    // Scroll to first error
    const firstError = document.querySelector('.swal2-input-error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError.focus();
    }
  };

  // Helper: Handle API errors with field-level display
  const handleModalApiError = async (error, modalTitle) => {
    const validationErrors = error.response?.data?.validationErrors || [];
    
    if (validationErrors.length > 0) {
      // Show errors inline in modal if it's still open
      const swalContainer = document.querySelector('.swal2-container');
      if (swalContainer) {
        showFieldErrorsInModal(validationErrors);
        
        // Also show a summary at the top
        const errorSummary = validationErrors.map(e => `• ${e.field}: ${e.message}`).join('\n');
        Swal.showValidationMessage(
          `<div style="text-align: left; font-size: 0.9em;">
            ${validationErrors.map(e => `<div>• <strong>${e.field}:</strong> ${e.message}</div>`).join('')}
          </div>`
        );
        return false; // Keep modal open
      }
    }
    
    // Fallback: Show error in new modal
    const errMsg = validationErrors.map(e => e.message).join(', ') 
      || error.response?.data?.message 
      || `Failed to ${modalTitle.toLowerCase()}`;
    
    Swal.fire("Error", errMsg, "error");
    return true; // Close modal
  };
  const handleCancel = async (ewb, previousValues = {}, previousErrors = []) => {
    const { value: formValues, dismiss } = await Swal.fire({
      title: 'Cancel E-Way Bill',
      html: `
        <div style="text-align: left; padding: 0 20px;">
          ${previousErrors.length > 0 ? `
            <div id="error-summary" style="background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px; padding: 10px; margin-bottom: 15px;">
              <strong style="color: #c62828;">Please fix the following errors:</strong>
              ${previousErrors.map(e => `<div style="color: #c62828; font-size: 0.85em; margin-top: 4px;">• ${e.field}: ${e.message}</div>`).join('')}
            </div>
          ` : ''}
          <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666;">
            E-Way Bill: <strong>${ewb.ewbNo}</strong>
          </p>
          <div class="form-field-wrapper">
            <label style="font-size: 0.85rem; color: #666;">Cancellation Reason *</label>
            <select id="swal-reason" class="swal2-input ${previousErrors.find(e => e.field === 'reason') ? 'swal-input-error' : ''}" style="width: 100%; padding: 8px; ${previousErrors.find(e => e.field === 'reason') ? 'border-color: #dc3545;' : ''}">
              <option value="" disabled ${!previousValues.reason ? 'selected' : ''}>Select a reason</option>
              <option value="1" ${previousValues.reason === '1' ? 'selected' : ''}>Duplicate</option>
              <option value="2" ${previousValues.reason === '2' ? 'selected' : ''}>Order Cancelled</option>
              <option value="3" ${previousValues.reason === '3' ? 'selected' : ''}>Data Entry Mistake</option>
              <option value="4" ${previousValues.reason === '4' ? 'selected' : ''}>Others</option>
            </select>
            ${previousErrors.find(e => e.field === 'reason') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'reason').message}</div>` : ''}
          </div>
          <div class="form-field-wrapper" style="margin-top: 15px;">
            <label style="font-size: 0.85rem; color: #666;">Remark *</label>
            <input id="swal-remark" class="swal2-input ${previousErrors.find(e => e.field === 'remark') ? 'swal-input-error' : ''}" style="width: 100%; ${previousErrors.find(e => e.field === 'remark') ? 'border-color: #dc3545;' : ''}" placeholder="Explain why you're cancelling..." value="${previousValues.remark || ''}">
            ${previousErrors.find(e => e.field === 'remark') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'remark').message}</div>` : ''}
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Cancel E-Way Bill',
      confirmButtonColor: '#c62828',
      width: '450px',
      preConfirm: () => {
        const reason = document.getElementById('swal-reason').value;
        const remark = document.getElementById('swal-remark').value;
        
        if (!reason) {
            Swal.showValidationMessage('Please select a cancellation reason');
            return false;
        }
        if (!remark) {
             Swal.showValidationMessage('Please enter a remark');
             return false;
        }
        return { reason, remark };
      }
    });

    if (dismiss) return; // User clicked cancel

    if (formValues) {
      try {
        setLoading(true);
        const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/cancel`, {
          ewayBillId: ewb._id,
          ewayBillNo: ewb.ewbNo,
          cancelReason: formValues.reason,
          cancelRemark: formValues.remark,
          consignorGstin: ewb.consignorGstin
        });

        if (response.data.success) {
          Swal.fire("Success", "E-Way Bill cancelled successfully", "success");
          fetchEwayBills();
        }
      } catch (error) {
        console.error("Error cancelling E-Way Bill:", error);
        setLoading(false);
        
        // Get validation errors from API response
        const validationErrors = error.response?.data?.validationErrors || [];
        
        if (validationErrors.length > 0) {
          // Re-open modal with errors displayed
          handleCancel(ewb, formValues, validationErrors);
        } else {
          // Show generic error
          Swal.fire("Error", error.response?.data?.message || "Failed to cancel E-Way Bill", "error");
        }
        return;
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Update Vehicle
  const handleUpdateVehicle = async (ewb, previousValues = {}, previousErrors = []) => {
    const { value: formValues, dismiss } = await Swal.fire({
      title: 'Update Vehicle Number',
      html: `
        <div style="text-align: left; padding: 0 20px;">
          ${previousErrors.length > 0 ? `
            <div id="error-summary" style="background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px; padding: 10px; margin-bottom: 15px;">
              <strong style="color: #c62828;">Please fix the following errors:</strong>
              ${previousErrors.map(e => `<div style="color: #c62828; font-size: 0.85em; margin-top: 4px;">• ${e.field}: ${e.message}</div>`).join('')}
            </div>
          ` : ''}
          <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666;">
            E-Way Bill: <strong>${ewb.ewbNo}</strong><br/>
            Current Vehicle: <strong>${ewb.vehicleNumber || 'N/A'}</strong>
          </p>
          <div class="form-field-wrapper">
            <label style="font-size: 0.85rem; color: #666;">New Vehicle Number *</label>
            <input id="swal-vehicleNo" class="swal2-input ${previousErrors.find(e => e.field === 'vehicleNo') ? 'swal-input-error' : ''}" placeholder="e.g., MH12AB1234" style="width: 100%; ${previousErrors.find(e => e.field === 'vehicleNo') ? 'border-color: #dc3545;' : ''}" value="${previousValues.vehicleNo || ''}">
            ${previousErrors.find(e => e.field === 'vehicleNo') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'vehicleNo').message}</div>` : ''}
          </div>
          <div class="form-field-wrapper" style="margin-top: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Vehicle Type</label>
            <select id="swal-vehicleType" class="swal2-input" style="width: 100%;">
              <option value="r" ${previousValues.vehicleType === 'r' ? 'selected' : ''}>Regular</option>
              <option value="o" ${previousValues.vehicleType === 'o' ? 'selected' : ''}>Over Dimensional Cargo (ODC)</option>
            </select>
          </div>
          <div class="form-field-wrapper" style="margin-top: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Reason for Update</label>
            <select id="swal-reasonCode" class="swal2-input" style="width: 100%;">
              <option value="due to break down" ${previousValues.reasonCode === 'due to break down' ? 'selected' : ''}>Breakdown</option>
              <option value="Transhipment" ${previousValues.reasonCode === 'Transhipment' ? 'selected' : ''}>Transhipment</option>
              <option value="Others" ${previousValues.reasonCode === 'Others' ? 'selected' : ''}>Others</option>
            </select>
          </div>
          <input id="swal-reasonText" class="swal2-input" placeholder="Reason Description (Optional)" style="width: 100%; margin-top: 10px;" value="${previousValues.reasonText || ''}">
          <div class="form-field-wrapper" style="margin-top: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Mode of Transport</label>
            <select id="swal-modeOfTransport" class="swal2-input" style="width: 100%;">
              <option value="1" ${previousValues.modeOfTransport === 1 ? 'selected' : ''}>Road</option>
              <option value="2" ${previousValues.modeOfTransport === 2 ? 'selected' : ''}>Rail</option>
              <option value="3" ${previousValues.modeOfTransport === 3 ? 'selected' : ''}>Air</option>
              <option value="4" ${previousValues.modeOfTransport === 4 ? 'selected' : ''}>Ship</option>
            </select>
          </div>
          <input id="swal-fromPlace" class="swal2-input ${previousErrors.find(e => e.field === 'fromPlace') ? 'swal-input-error' : ''}" placeholder="Current Place" style="width: 100%; margin-top: 10px; ${previousErrors.find(e => e.field === 'fromPlace') ? 'border-color: #dc3545;' : ''}" value="${previousValues.fromPlace || ewb.consignorPlace || ''}">
          ${previousErrors.find(e => e.field === 'fromPlace') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'fromPlace').message}</div>` : ''}
          <input id="swal-fromState" class="swal2-input ${previousErrors.find(e => e.field === 'fromState') ? 'swal-input-error' : ''}" placeholder="Current State" style="width: 100%; margin-top: 10px; ${previousErrors.find(e => e.field === 'fromState') ? 'border-color: #dc3545;' : ''}" value="${previousValues.fromState || ewb.consignorState || ''}">
          ${previousErrors.find(e => e.field === 'fromState') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'fromState').message}</div>` : ''}
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Vehicle',
      width: '500px',
      preConfirm: () => {
        const vehicleNo = document.getElementById('swal-vehicleNo').value.trim().toUpperCase();
        if (!vehicleNo) {
          Swal.showValidationMessage('Vehicle number is required');
          return false;
        }
        if (!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(vehicleNo.replace(/\s/g, ''))) {
          Swal.showValidationMessage('Invalid vehicle number format');
          return false;
        }
        return {
          vehicleNo,
          vehicleType: document.getElementById('swal-vehicleType').value,
          reasonCode: document.getElementById('swal-reasonCode').value,
          reasonText: document.getElementById('swal-reasonText').value,
          modeOfTransport: parseInt(document.getElementById('swal-modeOfTransport').value),
          fromPlace: document.getElementById('swal-fromPlace').value,
          fromState: document.getElementById('swal-fromState').value
        };
      }
    });

    if (dismiss) return; // User clicked cancel

    if (formValues) {
      try {
        setLoading(true);
        const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/update-vehicle`, {
          ewayBillId: ewb._id,
          ewayBillNo: ewb.ewbNo,
          ...formValues,
          userGstin: ewb.userGstin || ewb.consignorGstin
        });

        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: "Vehicle Updated",
            html: `
              <p>Vehicle number updated successfully!</p>
              <p><strong>Old:</strong> ${response.data.data.oldVehicle || 'N/A'}</p>
              <p><strong>New:</strong> ${response.data.data.newVehicle}</p>
            `
          });
          fetchEwayBills();
        }
      } catch (error) {
        console.error("Error updating vehicle:", error);
        setLoading(false);
        
        // Get validation errors from API response
        const validationErrors = error.response?.data?.validationErrors || [];
        
        if (validationErrors.length > 0) {
          // Re-open modal with errors displayed
          handleUpdateVehicle(ewb, formValues, validationErrors);
        } else {
          // Show generic error
          Swal.fire("Error", error.response?.data?.message || "Failed to update vehicle", "error");
        }
        return;
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Extend Validity
  const handleExtendValidity = async (ewb, previousValues = {}, previousErrors = []) => {
    const expiryInfo = getExpiryInfo(ewb.validUpto);
    let expiryText = '';
    if (expiryInfo) {
      if (expiryInfo.expired) {
        expiryText = `<span style="color: #c62828;">Expired ${expiryInfo.hours.toFixed(1)} hours ago</span>`;
      } else {
        expiryText = `<span style="color: ${expiryInfo.hours < 8 ? '#ff9800' : '#2e7d32'};">Expires in ${expiryInfo.hours.toFixed(1)} hours</span>`;
      }
    }

    const { value: formValues, dismiss } = await Swal.fire({
      title: 'Extend E-Way Bill Validity',
      html: `
        <div style="text-align: left; padding: 0 20px;">
          ${previousErrors.length > 0 ? `
            <div id="error-summary" style="background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px; padding: 10px; margin-bottom: 15px;">
              <strong style="color: #c62828;">Please fix the following errors:</strong>
              ${previousErrors.map(e => `<div style="color: #c62828; font-size: 0.85em; margin-top: 4px;">• ${e.field}: ${e.message}</div>`).join('')}
            </div>
          ` : ''}
          <p style="margin-bottom: 10px; font-size: 0.9rem; color: #666;">
            E-Way Bill: <strong>${ewb.ewbNo}</strong><br/>
            Current Validity: <strong>${ewb.validUpto || 'N/A'}</strong><br/>
            ${expiryText}
          </p>
          <div class="form-field-wrapper">
            <label style="font-size: 0.85rem; color: #666;">Extension Reason</label>
            <select id="swal-reason" class="swal2-input" style="width: 100%;">
              <option value="Natural Calamity" ${previousValues.reason === 'Natural Calamity' ? 'selected' : ''}>Natural Calamity</option>
              <option value="Law and Order" ${previousValues.reason === 'Law and Order' ? 'selected' : ''}>Law and Order</option>
              <option value="Transshipment" ${previousValues.reason === 'Transshipment' ? 'selected' : ''}>Transshipment</option>
              <option value="Accident" ${previousValues.reason === 'Accident' ? 'selected' : ''}>Accident</option>
              <option value="Others" ${!previousValues.reason || previousValues.reason === 'Others' ? 'selected' : ''}>Others</option>
            </select>
          </div>
          <div class="form-field-wrapper" style="margin-top: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Remarks *</label>
            <textarea id="swal-remarks" class="swal2-textarea ${previousErrors.find(e => e.field === 'remarks') ? 'swal-input-error' : ''}" placeholder="Explain the reason for extension..." style="width: 100%; min-height: 80px; ${previousErrors.find(e => e.field === 'remarks') ? 'border-color: #dc3545;' : ''}">${previousValues.remarks || ''}</textarea>
            ${previousErrors.find(e => e.field === 'remarks') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'remarks').message}</div>` : ''}
          </div>
          <div class="form-field-wrapper" style="margin-top: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Remaining Distance (KM) *</label>
            <input id="swal-remainingDistance" class="swal2-input ${previousErrors.find(e => e.field === 'remainingDistance') ? 'swal-input-error' : ''}" type="number" placeholder="Distance left to travel" style="width: 100%; ${previousErrors.find(e => e.field === 'remainingDistance') ? 'border-color: #dc3545;' : ''}" value="${previousValues.remainingDistance || ewb.transportDistance || ''}">
            ${previousErrors.find(e => e.field === 'remainingDistance') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'remainingDistance').message}</div>` : ''}
          </div>
          <div class="form-field-wrapper" style="margin-top: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Current Location</label>
            <input id="swal-currentPlace" class="swal2-input ${previousErrors.find(e => e.field === 'currentPlace') ? 'swal-input-error' : ''}" placeholder="Current Place" style="width: 100%; ${previousErrors.find(e => e.field === 'currentPlace') ? 'border-color: #dc3545;' : ''}" value="${previousValues.currentPlace || ewb.consignorPlace || ''}">
            ${previousErrors.find(e => e.field === 'currentPlace') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'currentPlace').message}</div>` : ''}
          </div>
          <input id="swal-currentState" class="swal2-input ${previousErrors.find(e => e.field === 'currentState') ? 'swal-input-error' : ''}" placeholder="Current State" style="width: 100%; margin-top: 10px; ${previousErrors.find(e => e.field === 'currentState') ? 'border-color: #dc3545;' : ''}" value="${previousValues.currentState || ewb.consignorState || ''}">
          ${previousErrors.find(e => e.field === 'currentState') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'currentState').message}</div>` : ''}
          <input id="swal-currentPincode" class="swal2-input ${previousErrors.find(e => e.field === 'currentPincode') ? 'swal-input-error' : ''}" type="number" placeholder="Current Pincode" style="width: 100%; margin-top: 10px; ${previousErrors.find(e => e.field === 'currentPincode') ? 'border-color: #dc3545;' : ''}" value="${previousValues.currentPincode || ewb.consignorPincode || ''}">
          ${previousErrors.find(e => e.field === 'currentPincode') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'currentPincode').message}</div>` : ''}
          <input id="swal-vehicleNo" class="swal2-input" placeholder="Vehicle Number" style="width: 100%; margin-top: 10px;" value="${previousValues.vehicleNo || ewb.vehicleNumber || ''}">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Extend Validity',
      width: '500px',
      preConfirm: () => {
        const remarks = document.getElementById('swal-remarks').value.trim();
        const remainingDistance = document.getElementById('swal-remainingDistance').value;
        
        if (!remarks) {
          Swal.showValidationMessage('Remarks are required');
          return false;
        }
        if (!remainingDistance || parseInt(remainingDistance) <= 0) {
          Swal.showValidationMessage('Remaining distance is required');
          return false;
        }
        
        return {
          reason: document.getElementById('swal-reason').value,
          remarks,
          remainingDistance: parseInt(remainingDistance),
          currentPlace: document.getElementById('swal-currentPlace').value,
          currentState: document.getElementById('swal-currentState').value,
          currentPincode: document.getElementById('swal-currentPincode').value,
          vehicleNo: document.getElementById('swal-vehicleNo').value
        };
      }
    });

    if (dismiss) return; // User clicked cancel

    if (formValues) {
      try {
        setLoading(true);
        const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/extend-validity`, {
          ewayBillId: ewb._id,
          ewayBillNo: ewb.ewbNo,
          ...formValues,
          userGstin: ewb.userGstin || ewb.consignorGstin
        });

        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: "Validity Extended",
            html: `
              <p>E-Way Bill validity extended successfully!</p>
              <p><strong>Previous:</strong> ${response.data.data.previousValidUpto || 'N/A'}</p>
              <p><strong>New:</strong> ${response.data.data.newValidUpto || 'Unknown'}</p>
            `
          });
          fetchEwayBills();
        }
      } catch (error) {
        console.error("Error extending validity:", error);
        setLoading(false);
        
        // Get validation errors from API response
        const validationErrors = error.response?.data?.validationErrors || [];
        
        if (validationErrors.length > 0) {
          // Re-open modal with errors displayed
          handleExtendValidity(ewb, formValues, validationErrors);
        } else {
          // Show generic error
          Swal.fire("Error", error.response?.data?.message || "Failed to extend validity", "error");
        }
        return;
      } finally {
        setLoading(false);
      }
    }
  };

  // handleReject and handleMultiVehicle moved to EwayBillActionModal.jsx

  const handlePrint = (e, url) => {
    let pdfUrl = typeof e === 'string' ? e : url;
    
    if (pdfUrl) {
      if (!pdfUrl.startsWith('http')) {
        pdfUrl = `https://${pdfUrl}`;
      }
      window.open(pdfUrl, '_blank');
    } else {
      Swal.fire("Info", "PDF not available", "info");
    }
  };

  // ============================================
  // PHASE 2: Consolidation & Multi-Vehicle
  // ============================================

  // Toggle E-Way Bill selection for consolidation
  const toggleEwbSelection = (ewbNo) => {
    setSelectedEwbs(prev => {
      if (prev.includes(ewbNo)) {
        return prev.filter(e => e !== ewbNo);
      } else {
        return [...prev, ewbNo];
      }
    });
  };

  // Handle Consolidate E-Way Bills
  const handleConsolidate = async (previousValues = {}, previousErrors = []) => {
    if (selectedEwbs.length < 2) {
      Swal.fire("Warning", "Please select at least 2 E-Way Bills to consolidate", "warning");
      return;
    }

    const { value: formValues, dismiss } = await Swal.fire({
      title: 'Consolidate E-Way Bills',
      html: `
        <div style="text-align: left; padding: 0 20px;">
          ${previousErrors.length > 0 ? `
            <div id="error-summary" style="background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px; padding: 10px; margin-bottom: 15px;">
              <strong style="color: #c62828;">Please fix the following errors:</strong>
              ${previousErrors.map(e => `<div style="color: #c62828; font-size: 0.85em; margin-top: 4px;">• ${e.field}: ${e.message}</div>`).join('')}
            </div>
          ` : ''}
          <p style="margin-bottom: 10px; font-size: 0.9rem; color: #666;">
            <strong>Selected E-Way Bills (${selectedEwbs.length}):</strong><br>
            ${selectedEwbs.map(e => `<span style="background: #e3f2fd; padding: 2px 6px; border-radius: 4px; margin: 2px; display: inline-block; font-size: 0.8rem;">${e}</span>`).join('')}
          </p>
          <div class="form-field-wrapper" style="margin-bottom: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Vehicle Number *</label>
            <input id="swal-vehicleNumber" class="swal2-input ${previousErrors.find(e => e.field === 'vehicleNumber') ? 'swal-input-error' : ''}" style="width: 100%; ${previousErrors.find(e => e.field === 'vehicleNumber') ? 'border-color: #dc3545;' : ''}" placeholder="e.g., MH12AB1234" value="${previousValues.vehicleNumber || ''}">
            ${previousErrors.find(e => e.field === 'vehicleNumber') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'vehicleNumber').message}</div>` : ''}
          </div>
          <div class="form-field-wrapper" style="margin-bottom: 10px;">
            <label style="font-size: 0.85rem; color: #666;">GSTIN *</label>
            <input id="swal-userGstin" class="swal2-input ${previousErrors.find(e => e.field === 'userGstin') ? 'swal-input-error' : ''}" style="width: 100%; ${previousErrors.find(e => e.field === 'userGstin') ? 'border-color: #dc3545;' : ''}" placeholder="Your GSTIN" value="${previousValues.userGstin || ''}">
            ${previousErrors.find(e => e.field === 'userGstin') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'userGstin').message}</div>` : ''}
          </div>
          <div class="form-field-wrapper" style="margin-bottom: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Place of Consignor</label>
            <input id="swal-placeOfConsignor" class="swal2-input" style="width: 100%;" placeholder="City/Place" value="${previousValues.placeOfConsignor || ''}">
          </div>
          <div class="form-field-wrapper" style="margin-bottom: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Mode of Transport</label>
            <select id="swal-modeOfTransport" class="swal2-input" style="width: 100%; padding: 8px;">
              <option value="1" ${previousValues.modeOfTransport === '1' || !previousValues.modeOfTransport ? 'selected' : ''}>Road</option>
              <option value="2" ${previousValues.modeOfTransport === '2' ? 'selected' : ''}>Rail</option>
              <option value="3" ${previousValues.modeOfTransport === '3' ? 'selected' : ''}>Air</option>
              <option value="4" ${previousValues.modeOfTransport === '4' ? 'selected' : ''}>Ship</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Consolidate',
      confirmButtonColor: '#3085d6',
      width: '500px',
      preConfirm: () => {
        const vehicleNumber = document.getElementById('swal-vehicleNumber').value.trim().toUpperCase();
        const userGstin = document.getElementById('swal-userGstin').value.trim().toUpperCase();
        
        if (!vehicleNumber) {
          Swal.showValidationMessage('Vehicle number is required');
          return false;
        }
        if (!userGstin) {
          Swal.showValidationMessage('GSTIN is required');
          return false;
        }
        
        return {
          vehicleNumber,
          userGstin,
          placeOfConsignor: document.getElementById('swal-placeOfConsignor').value,
          modeOfTransport: document.getElementById('swal-modeOfTransport').value
        };
      }
    });

    if (dismiss) return;

    if (formValues) {
      try {
        setLoading(true);
        const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/consolidate`, {
          ewayBillList: selectedEwbs,
          ...formValues
        });

        if (response.data.success) {
          Swal.fire("Success", `Consolidated E-Way Bill Created: ${response.data.data.cewbNo}`, "success");
          setSelectedEwbs([]); // Clear selection
          fetchEwayBills();
        }
      } catch (error) {
        console.error("Error consolidating E-Way Bills:", error);
        setLoading(false);
        
        const validationErrors = error.response?.data?.validationErrors || [];
        if (validationErrors.length > 0) {
          handleConsolidate(formValues, validationErrors);
        } else {
          Swal.fire("Error", error.response?.data?.message || "Failed to consolidate E-Way Bills", "error");
        }
        return;
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Multi-Vehicle Movement (Initiate)
  // handleMultiVehicle moved to EwayBillActionModal.jsx
  const handleMultiVehicle = (ewb) => {
    setSelectedActionEwb(ewb);
    setActionModalOpen(true);
  };

  // Handle Add Vehicle to Multi-Vehicle Group
  const handleAddVehicle = async (ewb, previousValues = {}, previousErrors = []) => {
    const groupNo = ewb.multiVehicleGroup?.groupNo;
    
    if (!groupNo) {
      Swal.fire("Error", "Multi-vehicle not initiated for this E-Way Bill", "error");
      return;
    }

    const { value: formValues, dismiss } = await Swal.fire({
      title: 'Add Vehicle to Group',
      html: `
        <div style="text-align: left; padding: 0 20px;">
          ${previousErrors.length > 0 ? `
            <div id="error-summary" style="background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px; padding: 10px; margin-bottom: 15px;">
              <strong style="color: #c62828;">Please fix the following errors:</strong>
              ${previousErrors.map(e => `<div style="color: #c62828; font-size: 0.85em; margin-top: 4px;">• ${e.field}: ${e.message}</div>`).join('')}
            </div>
          ` : ''}
          <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666;">
            E-Way Bill: <strong>${ewb.ewbNo}</strong><br>
            Group Number: <strong>${groupNo}</strong>
          </p>
          <div class="form-field-wrapper" style="margin-bottom: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Vehicle Number *</label>
            <input id="swal-vehicleNumber" class="swal2-input ${previousErrors.find(e => e.field === 'vehicleNumber') ? 'swal-input-error' : ''}" style="width: 100%; ${previousErrors.find(e => e.field === 'vehicleNumber') ? 'border-color: #dc3545;' : ''}" placeholder="e.g., MH12AB1234" value="${previousValues.vehicleNumber || ''}">
            ${previousErrors.find(e => e.field === 'vehicleNumber') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'vehicleNumber').message}</div>` : ''}
          </div>
          <div class="form-field-wrapper" style="margin-bottom: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Quantity for this Vehicle *</label>
            <input id="swal-quantity" type="number" step="0.01" class="swal2-input ${previousErrors.find(e => e.field === 'quantity') ? 'swal-input-error' : ''}" style="width: 100%; ${previousErrors.find(e => e.field === 'quantity') ? 'border-color: #dc3545;' : ''}" placeholder="Quantity carried in this vehicle" value="${previousValues.quantity || ''}">
            ${previousErrors.find(e => e.field === 'quantity') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'quantity').message}</div>` : ''}
          </div>
          <div class="form-field-wrapper" style="margin-bottom: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Transporter Doc Number</label>
            <input id="swal-transporterDocNo" class="swal2-input" style="width: 100%;" placeholder="Optional" value="${previousValues.transporterDocNo || ''}">
          </div>
          <div class="form-field-wrapper" style="margin-bottom: 10px;">
            <label style="font-size: 0.85rem; color: #666;">Transporter Doc Date</label>
            <input id="swal-transporterDocDate" type="date" class="swal2-input" style="width: 100%;" value="${previousValues.transporterDocDate || ''}">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Add Vehicle',
      confirmButtonColor: '#7b1fa2',
      width: '500px',
      preConfirm: () => {
        const vehicleNumber = document.getElementById('swal-vehicleNumber').value.trim().toUpperCase();
        const quantity = document.getElementById('swal-quantity').value;
        
        if (!vehicleNumber) {
          Swal.showValidationMessage('Vehicle number is required');
          return false;
        }
        if (!quantity || parseFloat(quantity) <= 0) {
          Swal.showValidationMessage('Please enter a valid quantity');
          return false;
        }
        
        return {
          vehicleNumber,
          quantity: parseFloat(quantity),
          transporterDocNo: document.getElementById('swal-transporterDocNo').value,
          transporterDocDate: document.getElementById('swal-transporterDocDate').value
        };
      }
    });

    if (dismiss) return;

    if (formValues) {
      try {
        setLoading(true);
        const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/multi-vehicle/add-vehicle`, {
          ewayBillId: ewb._id,
          ewayBillNo: ewb.ewbNo,
          groupNo: groupNo,
          userGstin: ewb.userGstin || ewb.consignorGstin,
          ...formValues
        });

        if (response.data.success) {
          Swal.fire("Success", `Vehicle ${formValues.vehicleNumber} added successfully`, "success");
          fetchEwayBills();
        }
      } catch (error) {
        console.error("Error adding vehicle:", error);
        setLoading(false);
        
        const validationErrors = error.response?.data?.validationErrors || [];
        if (validationErrors.length > 0) {
          handleAddVehicle(ewb, formValues, validationErrors);
        } else {
          Swal.fire("Error", error.response?.data?.message || "Failed to add vehicle", "error");
        }
        return;
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Update Transporter
  const handleUpdateTransporter = async (ewb, previousValues = {}, previousErrors = []) => {
    const { value: formValues, dismiss } = await Swal.fire({
      title: 'Update Transporter ID',
      html: `
        <div style="text-align: left; padding: 0 20px;">
          ${previousErrors.length > 0 ? `
            <div id="error-summary" style="background: #ffebee; border: 1px solid #ef9a9a; border-radius: 4px; padding: 10px; margin-bottom: 15px;">
              <strong style="color: #c62828;">Please fix the following errors:</strong>
              ${previousErrors.map(e => `<div style="color: #c62828; font-size: 0.85em; margin-top: 4px;">• ${e.field}: ${e.message}</div>`).join('')}
            </div>
          ` : ''}
          <p style="margin-bottom: 15px; font-size: 0.9rem; color: #666;">
            E-Way Bill: <strong>${ewb.ewbNo}</strong><br/>
            Current Transporter: <strong>${ewb.transporterId || ewb.transporterName || 'N/A'}</strong>
          </p>
          <div class="form-field-wrapper">
            <label style="font-size: 0.85rem; color: #666;">New Transporter GSTIN *</label>
            <input id="swal-transporterId" class="swal2-input ${previousErrors.find(e => e.field === 'transporterId') ? 'swal-input-error' : ''}" placeholder="e.g., 27AABCU9603R1ZM" style="width: 100%; ${previousErrors.find(e => e.field === 'transporterId') ? 'border-color: #dc3545;' : ''}" value="${previousValues.transporterId || ''}">
            ${previousErrors.find(e => e.field === 'transporterId') ? `<div style="color: #dc3545; font-size: 0.8em; margin-top: 2px;">${previousErrors.find(e => e.field === 'transporterId').message}</div>` : ''}
          </div>
          <p style="font-size: 0.8em; color: #999; margin-top: 10px;">
            Enter the 15-digit GSTIN of the new transporter.
          </p>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Transporter',
      width: '450px',
      preConfirm: () => {
        const transporterId = document.getElementById('swal-transporterId').value.trim().toUpperCase();
        if (!transporterId) {
          Swal.showValidationMessage('Transporter GSTIN is required');
          return false;
        }
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(transporterId)) {
          Swal.showValidationMessage('Invalid GSTIN format (15 chars: 27AABCU9603R1ZM)');
          return false;
        }
        return { transporterId };
      }
    });

    if (dismiss) return;

    if (formValues) {
      try {
        setLoading(true);
        const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/update-transporter`, {
          ewayBillId: ewb._id,
          ewayBillNo: ewb.ewbNo,
          transporterId: formValues.transporterId,
          userGstin: ewb.userGstin || ewb.consignorGstin
        });

        if (response.data.success) {
          Swal.fire({
            icon: "success",
            title: "Transporter Updated",
            html: `
              <p>Transporter ID updated successfully!</p>
              <p><strong>Old:</strong> ${response.data.data.oldTransporterId || 'N/A'}</p>
              <p><strong>New:</strong> ${response.data.data.newTransporterId}</p>
            `
          });
          fetchEwayBills();
        }
      } catch (error) {
        console.error("Error updating transporter:", error);
        setLoading(false);
        
        const validationErrors = error.response?.data?.validationErrors || [];
        if (validationErrors.length > 0) {
          handleUpdateTransporter(ewb, formValues, validationErrors);
        } else {
          Swal.fire("Error", error.response?.data?.message || "Failed to update transporter", "error");
        }
        return;
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle Sync Status
  const handleSyncStatus = async (ewb) => {
    try {
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/sync-status`, {
        ewayBillId: ewb._id,
        ewayBillNo: ewb.ewbNo,
        userGstin: ewb.userGstin || ewb.consignorGstin
      });

      if (response.data.success) {
        const changes = response.data.data.changes || [];
        if (changes.length > 0) {
          Swal.fire({
            icon: "info",
            title: "E-Way Bill Updated",
            html: `
              <p style="margin-bottom: 10px;">${response.data.message}</p>
              <div style="text-align: left; font-size: 0.9em;">
                ${changes.map(c => `<p>• <strong>${c.field}:</strong> ${c.old || 'N/A'} → ${c.new}</p>`).join('')}
              </div>
            `
          });
          fetchEwayBills();
        } else {
          Swal.fire("Up to Date", "No changes found. E-Way Bill is already synced.", "success");
        }
      }
    } catch (error) {
      console.error("Error syncing status:", error);
      Swal.fire("Error", error.response?.data?.message || "Failed to sync E-Way Bill status", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSync = async () => {
    if (selectedEwbs.length === 0) return;
    
    const result = await Swal.fire({
      title: 'Sync Selected Status?',
      text: `Syncing status for ${selectedEwbs.length} E-Way Bills. This may take a moment.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Sync All',
      cancelButtonText: 'Cancel',
      showLoaderOnConfirm: true
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const ewbNo of selectedEwbs) {
          const ewb = ewayBills.find(e => e.ewbNo === ewbNo);
          if (!ewb) continue;

          try {
            await axios.post(`${process.env.REACT_APP_API_STRING}/eway-bill/sync-status`, {
              ewayBillId: ewb._id,
              ewayBillNo: ewb.ewbNo,
              userGstin: ewb.userGstin || ewb.consignorGstin
            });
            successCount++;
          } catch (err) {
            console.error(`Failed to sync ${ewbNo}`, err);
            failCount++;
          }
        }

        Swal.fire(
          'Sync Complete',
          `Successfully synced ${successCount} E-Way Bills.${failCount > 0 ? ` Failed: ${failCount}` : ''}`,
          'success'
        );
        fetchEwayBills();
        setSelectedEwbs([]);
      } catch (error) {
        Swal.fire('Error', 'An error occurred during bulk sync', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const ddmmyyyyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;
    const match = String(dateStr).match(ddmmyyyyPattern);
    
    if (match) {
      const [_, day, month, year] = match;
      const dateObj = new Date(`${year}-${month}-${day}`);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString(); 
      }
      return `${day}/${month}/${year}`;
    }

    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? String(dateStr) : date.toLocaleDateString();
  };

  // Get status badge styles
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case "generated":
        return "badge-generated-solid";
      case "cancelled":
        return "badge-cancelled-pill";
      case "assigned":
        return "badge-assigned-pill";
      case "rejected":
        return "badge-rejected-pill";
      case "expired":
        return "badge-expired-pill";
      default:
        return "badge-default-pill";
    }
  };

  // Handle Bulk Actions (Smart Context)
  const handleBulkAction = (action) => {
    // Filter selected EWBs
    const selected = ewayBills.filter(ewb => selectedEwbs.includes(ewb.ewbNo));
    if (selected.length === 0) return;

    // State Name to Code Mapper (Simplified)
    const STATE_NAME_TO_CODE = {
        "JAMMU AND KASHMIR": "01", "HIMACHAL PRADESH": "02", "PUNJAB": "03", "CHANDIGARH": "04",
        "UTTARAKHAND": "05", "HARYANA": "06", "DELHI": "07", "RAJASTHAN": "08", "UTTAR PRADESH": "09",
        "BIHAR": "10", "SIKKIM": "11", "ARUNACHAL PRADESH": "12", "NAGALAND": "13", "MANIPUR": "14",
        "MIZORAM": "15", "TRIPURA": "16", "MEGHALAYA": "17", "ASSAM": "18", "WEST BENGAL": "19",
        "JHARKHAND": "20", "ODISHA": "21", "CHHATTISGARH": "22", "MADHYA PRADESH": "23",
        "GUJARAT": "24", "DADRA AND NAGAR HAVELI AND DAMAN AND DIU": "26", "MAHARASHTRA": "27",
        "ANDHRA PRADESH": "28", "KARNATAKA": "29", "GOA": "30", "LAKSHADWEEP": "31",
        "KERALA": "32", "TAMIL NADU": "33", "PUDUCHERRY": "34", "ANDAMAN AND NICOBAR ISLANDS": "35",
        "TELANGANA": "36", "ANDHRA PRADESH (NEW)": "37", "LADAKH": "38", "OTHER TERRITORY": "97", "OTHERS": "99"
    };

    const getStateCode = (name) => {
        if (!name) return "";
        const upper = String(name).toUpperCase().trim();
        return STATE_NAME_TO_CODE[upper] || upper; // Return code or original if not found
    };

    // Map to JSON based on action
    const data = selected.map(ewb => {
        const base = {
            userGstin: ewb.userGstin || ewb.consignorGstin,
            ewayBillNo: ewb.ewbNo
        };
        
        if (action === 'update_part_b') {
            return {
                ...base,
                vehicleNo: ewb.vehicleNumber || "",
                fromPlace: ewb.consignorPlace || "",
                fromState: getStateCode(ewb.consignorState) || 0,
                reasonCode: "2", // Breakdown
                reasonRem: "Vehicle Breakdown",
                transMode: "1", // Road
                vehicleType: "R" // Regular
            };
        }
        if (action === 'extend_validity') {
            return {
                ...base,
                vehicleNo: ewb.vehicleNumber || "",
                fromPlace: ewb.consignorPlace || "", // Should be current place
                fromState: getStateCode(ewb.consignorState) || 0,
                remainingDistance: 0,
                transporterDocNo: "",
                transporterDocDate: "",
                transMode: "1",
                extnRsnCode: "2", // Natural Calamity / Traffic
                extnRemarks: "Traffic Jam"
            };
        }
        if (action === 'cancel') {
            return {
                ...base,
                cancelRsnCode: "2", // Data Entry Error
                cancelRmrk: "Incorrect Data"
            };
        }
        
        return base;
    });

    setBulkPreFillData({ action, data });
    setActiveTab('bulk');
  };

    return (
    <div className="ewaybill-dashboard ewaybill-container">
      <div className="ewaybill-header">
        <h2>E-Way Bill Dashboard</h2>
      </div>

      {/* ===== EXPIRY ALERT BANNER ===== */}
      {showAlerts && expiringAlerts.length > 0 && (
        <div className="ewb-expiry-banner">
          <button className="ewb-expiry-banner__dismiss" onClick={() => setShowAlerts(false)} title="Dismiss">×</button>
          <div className="ewb-expiry-banner__title">
            {expiringAlerts.length} E-Way Bill{expiringAlerts.length > 1 ? 's' : ''} Expiring Soon
          </div>
          <div className="ewb-expiry-banner__cards">
            {expiringAlerts.slice(0, 5).map(alert => (
              <div key={alert._id} className={`ewb-expiry-card ewb-expiry-card--${alert.severity || 'info'}`}>
                <div className="ewb-expiry-card__no">EWB {alert.ewbNo}</div>
                <div className="ewb-expiry-card__meta">
                  {alert.vehicleNumber} &bull; {alert.hoursLeft}h left &bull; {alert.consigneeName || 'N/A'}
                </div>
              </div>
            ))}
            {expiringAlerts.length > 5 && (
              <div className="ewb-expiry-more">+{expiringAlerts.length - 5} more</div>
            )}
          </div>
        </div>
      )}

      {/* ===== NEW COMPONENTS ===== */}
      <MetricCards 
        metrics={metrics} 
        onTabChange={(tab) => handleTabChange(tab)} 
        loading={loading && !ewayBills.length && !pendingLRs.length} // Only show loader on initial load
      />
      
      <TabNavigation 
        activeTab={activeTab === 'ewbs' ? 'active' : activeTab} // Map old 'ewbs' to 'active' if needed
        onTabChange={handleTabChange} 
        metrics={metrics} 
      />

      {/* ===== TAB CONTENT ===== */}

      {activeTab === 'bulk' ? (
          <EwayBillBulkOperations 
            onSuccess={() => { setActiveTab('ewbs'); setFilters(f => ({ ...f, status: 'Generated' })); setPage(1); }} 
            preFillData={bulkPreFillData}
          />
      ) : activeTab === 'reports' ? (
          <EwayBillReports />
      ) : activeTab === 'pending-lrs' ? (
        <PendingLRsTab 
          pendingLRs={pendingLRs}
          loading={loading && pendingLRs.length === 0}
          page={pendingPage}
          setPage={setPendingPage}
          totalPages={pendingTotalPages}
          onGenerate={(lr) => {
            setSelectedLrForGeneration(lr);
            setShowGenerationModal(true);
          }}
        />
      ) : (
        <>
      {/* Search & Filters */}
      <div className="form-section ewb-filter-section">
        <h3 className="blue-dot">Search & Filters</h3>
        <div className="section-body">
          <div className="ewb-search-row">
          <input
            type="text"
            className="form-input"
            placeholder="Search by EWB No, Document No, Consignor, Consignee or Vehicle..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchEwayBills(); }}
          />
          {searchQuery && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => { setSearchQuery(''); setPage(1); }}
              title="Clear search"
            >
              Clear
            </button>
          )}
        </div>
        <div className="form-row three-cols">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All</option>
              <option value="Generated">Active</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input type="date" className="form-input" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} />
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input type="date" className="form-input" name="toDate" value={filters.toDate} onChange={handleFilterChange} />
          </div>
        </div>
      </div>
    </div>

      {/* Bulk Actions Toolbar */}
      {selectedEwbs.length > 0 && (
        <div className="ewb-bulk-toolbar">
          <span className="ewb-bulk-toolbar__count">{selectedEwbs.length} selected</span>
          <div className="ewb-bulk-toolbar__actions">
            <button className="btn btn-sm btn-primary" onClick={() => handleBulkAction('update_part_b')}>
              Bulk Update Part-B
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => handleBulkAction('extend_validity')}>
              Bulk Extend Validity
            </button>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleConsolidate()}
              disabled={selectedEwbs.length < 2}
            >
              Consolidate Selected
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => handleBulkSync()}>
              Sync Selection
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedEwbs([])}>
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="form-section">
        <h3 className={activeTab === 'history' ? 'amber-dot' : activeTab === 'expiring' ? 'red-dot' : 'green-dot'}>
          {activeTab === 'history' ? 'E-Way Bill History' : activeTab === 'expiring' ? 'Expiring E-Way Bills' : 'Active E-Way Bills'}
        </h3>
        <div className="section-body" style={{ padding: 0 }}>
          <div className="ewb-table-wrap">
        <table className="ewb-table">
          <thead>
            <tr>
              <th className="ewb-th-check">
                <input
                  type="checkbox"
                  title="Select all active E-Way Bills"
                  onChange={(e) => {
                    if (e.target.checked) {
                      const activeEwbs = ewayBills.filter(ewb => ewb.ewbStatus === 'Generated' && !ewb.isPartOfConsolidation).map(ewb => ewb.ewbNo);
                      setSelectedEwbs(activeEwbs);
                    } else {
                      setSelectedEwbs([]);
                    }
                  }}
                  checked={selectedEwbs.length > 0 && selectedEwbs.length === ewayBills.filter(ewb => ewb.ewbStatus === 'Generated' && !ewb.isPartOfConsolidation).length}
                />
              </th>
              <th>EWB No</th>
              <th>Date</th>
              <th>Consignor</th>
              <th>Consignee</th>
              <th>Vehicle</th>
              <th>Transporter</th>
              <th>Valid Upto</th>
              <th>Status</th>
              <th className="ewb-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="10" className="ewb-table-empty">Loading...</td></tr>
            ) : ewayBills.length === 0 ? (
              <tr><td colSpan="10" className="ewb-table-empty">No E-Way Bills found.</td></tr>
            ) : (
              ewayBills.map((ewb) => {
                const isActive = ewb.ewbStatus === 'Generated';
                const canCancel = isActive && isWithin24Hours(ewb.generatedAt);
                const canUpdateVehicle = isActive && isWithinValidity(ewb.validUpto);
                const canUpdateTransporter = isActive;
                const canExtend = isActive && isWithinExtensionWindow(ewb.validUpto);
                const canReject = isActive;
                const canConsolidate = isActive && !ewb.isPartOfConsolidation;
                const canMultiVehicle = isActive && !ewb.isMultiVehicle;
                const hasMultiVehicleGroup = ewb.isMultiVehicle && ewb.multiVehicleGroup?.groupNo;
                
                return (
                  <tr key={ewb._id} className={selectedEwbs.includes(ewb.ewbNo) ? 'ewb-row ewb-row--selected' : 'ewb-row'}>
                    <td className="ewb-td-check">
                      {canConsolidate && (
                        <input
                          type="checkbox"
                          checked={selectedEwbs.includes(ewb.ewbNo)}
                          onChange={() => toggleEwbSelection(ewb.ewbNo)}
                          title="Select for consolidation"
                        />
                      )}
                    </td>
                    <td className="ewb-td-no">
                      {ewb.ewbNo}
                      {ewb.isPartOfConsolidation && <span className="ewb-tag ewb-tag--consol" title="Part of consolidation">CONSOL</span>}
                      {ewb.isMultiVehicle && <span className="ewb-tag ewb-tag--multi" title={`Multi-Vehicle Group: ${ewb.multiVehicleGroup?.groupNo}`}>MULTI</span>}
                    </td>
                    <td>{formatDate(ewb.ewbDate)}</td>
                    <td>{ewb.consignorName || '—'}</td>
                    <td>{ewb.consigneeName || '—'}</td>
                    <td>{ewb.vehicleNumber || '—'}</td>
                    <td className="ewb-td-transporter">
                      {ewb.transporterId
                        ? <span title={ewb.transporterName || ewb.transporterId}>{ewb.transporterId.substring(0, 12)}</span>
                        : <span className="ewb-td-empty">—</span>}
                    </td>
                    <td>{formatDate(ewb.validUpto)}</td>
                    <td>
                      <span className={getStatusBadgeClass(ewb.ewbStatus)}>
                        {ewb.ewbStatus || 'Generated'}
                      </span>
                    </td>
                    <td className="ewb-td-actions">
                      <div className="ewb-action-btns">
                        <button
                          className="btn-print-solid"
                          onClick={() => handlePrint(ewb.pdfUrl)}
                          title="Download PDF"
                        >
                          Print
                        </button>
                        {(canUpdateVehicle || canUpdateTransporter || canExtend || canCancel || canReject || canMultiVehicle || hasMultiVehicleGroup) && (
                          <button
                            className="btn-manage-outline"
                            onClick={() => { setSelectedActionEwb(ewb); setActionModalOpen(true); }}
                          >
                            Manage
                          </button>
                        )}
                        <button
                          className="btn-sync-icon"
                          onClick={() => handleSyncStatus(ewb)}
                          title="Sync status from API"
                          disabled={loading}
                        >
                          Sync
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '10px'}}>
         <button 
           className="btn btn-secondary btn-sm" 
           disabled={page === 1}
           onClick={() => setPage(p => p - 1)}
         >
           Previous
         </button>
         <span style={{display: 'flex', alignItems: 'center'}}>Page {page} of {totalPages}</span>
         <button 
           className="btn btn-secondary btn-sm" 
           disabled={page === totalPages}
           onClick={() => setPage(p => p + 1)}
         >
           Next
         </button>
      </div>
        </div>
      </div>
      </>
      )}
      
      {/* Generation Modal */}
      {showGenerationModal && (
        <EWBGenerationModal 
          show={showGenerationModal} 
          onHide={() => setShowGenerationModal(false)}
          initialData={selectedLrForGeneration}
          onSuccess={() => {
            setShowGenerationModal(false);
            fetchEwayBills();
            // Also refresh metrics
            fetchMetrics();
            if (activeTab === 'pending-lrs') fetchPendingLRs();
          }}
        />
      )}

      {/* Action Modal */}
      {actionModalOpen && (
        <EwayBillActionModal
          open={actionModalOpen}
          onClose={() => setActionModalOpen(false)}
          ewayBill={selectedActionEwb}
          onSuccess={(data) => {
              console.log("Action Success:", data);
              fetchEwayBills(); // Refresh list
          }}
        />
      )}
    </div>
  );
}

export default EwayBillDashboard;
