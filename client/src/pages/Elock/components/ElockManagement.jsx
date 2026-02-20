import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Unlock,
  MapPin,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { apiService } from "../services/elockApi";
import Toast from "./Toast";
import LoadingSpinner from "./LoadingSpinner";
import ElockDetailsForm from "./ElockDetailsForm";
import UnlockConfirmation from "./UnlockConfirmation";
import TrackingMap from "./TrackingMap";

const ElockManagement = () => {
  const [elocks, setElocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [selectedElock, setSelectedElock] = useState(null);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchElocks();
  }, [currentPage, searchTerm, statusFilter, itemsPerPage]);

  const fetchElocks = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await apiService.getElockDetails(params);

      if (response.success) {
        setElocks(response.data);
        setTotalPages(response.pagination?.totalPages || 1);
      } else {
        setToast({
          message: response.error || "Failed to fetch e-lock details",
          type: "error",
        });
        setElocks([]);
      }
    } catch (error) {
      console.error("Error fetching e-locks:", error);
      setToast({
        message: "Network error: Unable to fetch e-lock data",
        type: "error",
      });
      setElocks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddElock = () => {
    setSelectedElock(null);
    setShowForm(true);
  };

  const handleEditElock = (elock) => {
    setSelectedElock(elock);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      const response = selectedElock
        ? await apiService.updateElockDetail(selectedElock.id, formData)
        : await apiService.createElockDetail(formData);

      if (response.success) {
        setToast({
          message: selectedElock
            ? "E-lock updated successfully"
            : "E-lock created successfully",
          type: "success",
        });
        setShowForm(false);
        setSelectedElock(null);
        fetchElocks();
      } else {
        setToast({
          message: response.error || "Failed to save e-lock details",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error saving e-lock:", error);
      setToast({
        message: "Error saving e-lock details",
        type: "error",
      });
    }
  };

  const handleUnlock = (elock) => {
    setSelectedElock(elock);
    setShowUnlockConfirm(true);
  };

  const handleUnlockConfirm = async () => {
    if (!selectedElock) return;

    setLoadingStates((prev) => ({
      ...prev,
      [`unlock_${selectedElock.id}`]: true,
    }));

    try {
      // Use the same unlock logic from your main dashboard
      const adminRes = await fetch(
        "http://icloud.assetscontrols.com:8092/OpenApi/Admin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FAction: "QueryAdminAssetByAssetId",
            FTokenID: "e36d2589-9dc3-4302-be7d-dc239af1846c",
            FAssetID: selectedElock.elock_number,
          }),
        }
      );

      const adminData = await adminRes.json();
      if (!adminData.FObject || !adminData.FObject.length) {
        setToast({ message: "Asset not found in system", type: "error" });
        return;
      }

      const FGUID = adminData.FObject[0].FGUID;
      const unlockRes = await fetch(
        "http://icloud.assetscontrols.com:8092/OpenApi/Instruction",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FTokenID: "e36d2589-9dc3-4302-be7d-dc239af1846c",
            FAction: "OpenLockControl",
            FAssetGUID: FGUID,
          }),
        }
      );

      const unlockData = await unlockRes.json();
      if (unlockData.Result === 200) {
        setToast({
          message: `Unlock command sent successfully for ${selectedElock.elock_number}`,
          type: "success",
        });
      } else {
        setToast({
          message: unlockData.Message || "Failed to send unlock command",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error unlocking device:", error);
      setToast({ message: "Failed to unlock device", type: "error" });
    } finally {
      setLoadingStates((prev) => ({
        ...prev,
        [`unlock_${selectedElock.id}`]: false,
      }));
      setShowUnlockConfirm(false);
      setSelectedElock(null);
    }
  };

  const handleTrack = (elock) => {
    setSelectedElock(elock);
    setShowTrackingMap(true);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "assigned":
        return "bg-green-100 text-green-800";
      case "unassigned":
        return "bg-yellow-100 text-yellow-800";
      case "returned":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatFieldValue = (value) => {
    if (!value || value === "null" || value === "undefined") return "N/A";
    return value;
  };

  if (loading && elocks.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            E-Lock Management
          </h1>
          <p className="text-gray-600">Manage and track electronic locks</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchElocks}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleAddElock}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add E-Lock
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by e-lock number, consignor, consignee..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <option value="All Status">All Status</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="UNASSIGNED">Unassigned</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>
        </div>
      </div>

      {/* E-Locks Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                E-Lock Records
              </h2>
              <p className="text-sm text-gray-600">
                {elocks.length} records found
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span>Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-Lock Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consignor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consignee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver Phone
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {elocks.map((elock) => (
                <tr key={elock.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUnlock(elock)}
                        disabled={loadingStates[`unlock_${elock.id}`]}
                        className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                      >
                        {loadingStates[`unlock_${elock.id}`] ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleTrack(elock)}
                        className="inline-flex items-center px-3 py-1 border border-green-300 rounded-md text-sm text-green-700 bg-green-50 hover:bg-green-100"
                        title="Track"
                      >
                        <MapPin className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatFieldValue(elock.elock_number)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        elock.status
                      )}`}
                    >
                      {formatFieldValue(elock.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {formatFieldValue(elock.consignor)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {formatFieldValue(elock.consignee)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatFieldValue(elock.vehicle_number)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatFieldValue(elock.driver_name)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatFieldValue(elock.driver_phone)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {elocks.length === 0 && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No e-lock records found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria or add a new e-lock record.
            </p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <ElockDetailsForm
          elock={selectedElock}
          onClose={() => {
            setShowForm(false);
            setSelectedElock(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Unlock Confirmation Modal */}
      {showUnlockConfirm && (
        <UnlockConfirmation
          elockNumber={selectedElock?.elock_number}
          onClose={() => {
            setShowUnlockConfirm(false);
            setSelectedElock(null);
          }}
          onConfirm={handleUnlockConfirm}
        />
      )}

      {/* Tracking Map Modal */}
      {showTrackingMap && selectedElock && (
        <TrackingMap
          isOpen={showTrackingMap}
          onClose={() => {
            setShowTrackingMap(false);
            setSelectedElock(null);
          }}
          elockNo={selectedElock.elock_number}
          containerData={selectedElock}
          source="elock-management"
        />
      )}

      {/* Toast Notifications */}
      {/* {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )} */}
    </div>
  );
};

export default ElockManagement;
