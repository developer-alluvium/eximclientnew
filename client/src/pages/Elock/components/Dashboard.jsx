
import React, { useState, useEffect } from "react";
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Modal,
  Image,
  message,
  Tabs,
  Tooltip,
  Typography,
  Badge,
  Descriptions,
  Spin,
  Card,
  Row,
  Col
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  LockOutlined,
  UnlockOutlined,
  EnvironmentOutlined,
  PictureOutlined,
  PhoneOutlined,
  PhoneFilled,
  LeftOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined
} from "@ant-design/icons";
import { apiService } from "../services/elockApi";
import TrackingMap from "./TrackingMap.jsx";
import ElockManagement from "./ElockManagement.jsx";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

const Dashboard = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [filterType, setFilterType] = useState("All Types");
  const [userData, setUserData] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [clientCallStates, setClientCallStates] = useState({});
  const [selectedIeCode, setSelectedIeCode] = useState("");
  const [limits, setLimits] = useState(null);
  const [limitsLoading, setLimitsLoading] = useState(false);

  // Tracking Map States
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [selectedElockNo, setSelectedElockNo] = useState(null);
  const [selectedContainerData, setSelectedContainerData] = useState(null);

  // Image Preview
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewTitle, setPreviewTitle] = useState('');

  const [activeTab, setActiveTab] = useState("assignments");

  useEffect(() => {
    fetchUserData();
    checkServiceStatus();
  }, []);

  useEffect(() => {
    if (userData) {
      fetchAssignments();
    }
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    statusFilter,
    filterType,
    userData,
    selectedIeCode,
  ]);

  useEffect(() => {
    if (selectedIeCode) {
      fetchLimits();
    }
  }, [selectedIeCode, filterType]);

  const fetchLimits = async () => {
    try {
      const typeStr = filterType
        ? filterType.charAt(0).toUpperCase() + filterType.slice(1).toLowerCase()
        : "";

      setLimitsLoading(true);
      const response = await apiService.getElockAssignLimits(
        selectedIeCode || userData?.ieCodeNo || "",
        typeStr
      );

      const data = response?.data || response;

      if (Array.isArray(data) && data.length > 0) {
        setLimits(data[0]);
      } else if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        Object.keys(data).length > 0
      ) {
        setLimits(data);
      } else {
        setLimits(null);
      }
    } catch (error) {
      console.error("fetchLimits error:", error);
      setLimits(null);
    } finally {
      setLimitsLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await apiService.getUserData();
      if (response && response.success && response.user) {
        setUserData(response.user);

        if (response.user.ieCodes && response.user.ieCodes.length > 0) {
          setSelectedIeCode(response.user.ieCodes[0]);
        }

        // if (response.user.ieCodes && response.user.ieCodes.length > 1) {
        //   message.success(`Authenticated with ${response.user.ieCodes.length} IE Codes`);
        // } else if (response.user.ieCodeNo) {
        //   message.success(`Authenticated with IE Code: ${response.user.ieCodeNo}`);
        // }
      } else {
        message.error("Failed to load user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      //message.error("Error loading user data");
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = {
        ieCodeNo: selectedIeCode || userData?.ieCodeNo || "",
        search: searchTerm || "",
        status: statusFilter || "",
        filterType: filterType || "",
        page: currentPage,
        limit: itemsPerPage
      };

      const response = await apiService.getElockAssignments(params);

      if (response.success) {
        setAssignments(response.data);
        setTotalCount(response.pagination?.totalCount || response.data.length);

        // Initialize client call states
        const initialCallStates = {};
        response.data.forEach((assignment) => {
          initialCallStates[assignment.id || assignment._id] =
            assignment.client_call_enabled || false;
        });
        setClientCallStates(initialCallStates);
      } else {
        message.error(response.error || "Failed to fetch assignments");
        setAssignments([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      message.error("Network error: Unable to fetch data");
      setAssignments([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const checkServiceStatus = async () => {
    try {
      const response = await apiService.getServiceStatus();
      setServiceStatus({
        main: response.success,
        overall: response.success,
      });
    } catch (error) {
      setServiceStatus({
        main: false,
        overall: false,
      });
    }
  };

  const handleUnlockDevice = async (assetId, containerNo) => {
    if (!assetId) {
      message.error("Asset ID not available");
      return;
    }
    setLoadingStates((prev) => ({ ...prev, [`unlock_${assetId}`]: true }));
    try {
      const adminRes = await fetch(
        "http://icloud.assetscontrols.com:8092/OpenApi/Admin",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            FAction: "QueryAdminAssetByAssetId",
            FTokenID: "e36d2589-9dc3-4302-be7d-dc239af1846c",
            FAssetID: assetId,
          }),
        }
      );
      const adminData = await adminRes.json();
      if (!adminData.FObject || !adminData.FObject.length) {
        message.error("Asset not found in system");
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
        message.success(`Unlock command sent successfully for ${containerNo}`);
      } else {
        message.error(unlockData.Message || "Failed to send unlock command");
      }
    } catch (error) {
      console.error("Error unlocking device:", error);
      message.error("Failed to unlock device");
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`unlock_${assetId}`]: false }));
    }
  };

  const handleTrackElock = (elockNo, containerData) => {
    if (!elockNo) {
      message.error("E-lock number not available");
      return;
    }
    setSelectedElockNo(elockNo);
    setSelectedContainerData(containerData);
    setShowTrackingMap(true);
  };

  const handleClientCallToggle = async (assignmentId) => {
    // Optimistic update
    setClientCallStates((prev) => ({
      ...prev,
      [assignmentId]: !prev[assignmentId],
    }));
    message.success(`Client call ${!clientCallStates[assignmentId] ? "enabled" : "disabled"}`);
  };

  const handleViewImages = (assignment) => {
    if (assignment.uploadedImageUrls && assignment.uploadedImageUrls.length > 0) {
      setPreviewImages(assignment.uploadedImageUrls);
      setPreviewVisible(true);
      setPreviewTitle(`Images for ${assignment.container_no}`);
    } else {
      message.info("No images available");
    }
  };

  const formatFieldValue = (value) => {
    if (!value || value === "null" || value === "undefined") return "N/A";
    return value;
  };

  /* Compact Render Limit Pills */
  const renderLimitPills = () => {
    if (limitsLoading) {
      return <Spin size="small" />;
    }
    if (!limits && filterType) {
      return <Tag icon={<ExclamationCircleOutlined />} color="warning" style={{ fontSize: '12px' }}>Sync Needed</Tag>;
    }
    if (limits) {
      return (
        <div className="limit-pills-container compact">
          <div className="custom-pill pill-assigned compact">
            <span className="pill-label">ASSIGNED</span>
            <span className="pill-count">{limits.assigned || 0}</span>
          </div>
          <div className="custom-pill pill-remaining compact">
            <span className="pill-label">REMAINING</span>
            <span className="pill-count">{limits.remaining || 0}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  /* Compact Pagination */
  const CustomPagination = () => (
    <div className="custom-pagination-wrapper compact" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="pagination-text" style={{ fontSize: '12px' }}>Page:</span>
        <Select
          value={itemsPerPage}
          onChange={(val) => {
            setItemsPerPage(val);
            setCurrentPage(1);
          }}
          className="pagination-select compact"
          size="small"
          dropdownMatchSelectWidth={false}
          style={{ width: 60, fontSize: '12px' }}
        >
          <Option value={20}>20</Option>
          <Option value={100}>100</Option>
          <Option value={1000}>1000</Option>
        </Select>
        <span className="pagination-text" style={{ fontSize: '12px' }}>
          {currentPage}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button
          size="small"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="pagination-nav-btn compact"
          style={{ fontSize: '12px' }}
        >
          Prev
        </Button>
        <div className="pagination-numbers compact" style={{ display: 'flex' }}>
          {[...Array(Math.min(5, Math.ceil(totalCount / itemsPerPage) || 1))].map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                className={`pagination-number-btn compact ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        <Button
          size="small"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / itemsPerPage) || 1))}
          disabled={currentPage >= (Math.ceil(totalCount / itemsPerPage) || 1)}
          className="pagination-nav-btn compact"
          style={{ fontSize: '12px' }}
        >
          Next
        </Button>
      </div>
    </div>
  );

  const columns = [
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space direction="vertical" size="small" style={{ gap: '4px' }}>
          <Button
            size="small"
            danger
            icon={<UnlockOutlined style={{ fontSize: '12px' }} />}
            loading={loadingStates[`unlock_${record.f_asset_id || record.elock_no}`]}
            disabled={
              !(record.f_asset_id || record.elock_no) ||
              record.elock_assign_status === "RETURNED"
            }
            onClick={() => handleUnlockDevice(record.f_asset_id || record.elock_no, record.container_no)}
            style={{ fontSize: '11px', height: '22px', padding: '0 8px' }}
          >
            Unlock
          </Button>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<EnvironmentOutlined style={{ fontSize: '12px' }} />}
            disabled={
              !(record.f_asset_id || record.elock_no) ||
              record.elock_assign_status === "RETURNED"
            }
            onClick={() => handleTrackElock(record.f_asset_id || record.elock_no, record)}
            style={{ fontSize: '11px', height: '22px', padding: '0 8px' }}
          >
            Track
          </Button>
          <Button
            size="small"
            icon={<PictureOutlined style={{ fontSize: '12px' }} />}
            disabled={!record.uploadedImageUrls || record.uploadedImageUrls.length === 0}
            onClick={() => handleViewImages(record)}
            style={{ fontSize: '11px', height: '22px', padding: '0 8px' }}
          >
            Images
          </Button>
        </Space>
      ),
      width: 90,
    },
    {
      title: 'LR No',
      dataIndex: 'tr_no',
      key: 'tr_no',
      width: 130,
      render: text => <Text style={{ fontSize: '12px' }} strong>{formatFieldValue(text)}</Text>
    },
    {
      title: 'Consignor',
      dataIndex: 'consignor_name',
      key: 'consignor_name',
      width: 150,
      ellipsis: true,
      render: text => <Tooltip title={text}><Text style={{ fontSize: '12px' }}>{formatFieldValue(text)}</Text></Tooltip>
    },
    {
      title: 'Consignee',
      dataIndex: 'consignee_name',
      key: 'consignee_name',
      width: 150,
      ellipsis: true,
      render: text => <Tooltip title={text}><Text style={{ fontSize: '12px' }}>{formatFieldValue(text)}</Text></Tooltip>
    },
    {
      title: 'Container',
      dataIndex: 'container_no',
      key: 'container_no',
      width: 110,
      render: text => <Text style={{ fontSize: '12px' }} strong>{formatFieldValue(text)}</Text>
    },
    {
      title: 'Vehicle',
      dataIndex: 'vehicle_no',
      key: 'vehicle_no',
      width: 100,
      render: text => <Text style={{ fontSize: '12px' }}>{formatFieldValue(text)}</Text>
    },
    {
      title: 'Driver',
      key: 'driver',
      width: 140,
      render: (_, record) => (
        <div style={{ lineHeight: '1.2' }}>
          <Text style={{ fontSize: '12px' }} strong>{formatFieldValue(record.driver_name)}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>{formatFieldValue(record.driver_phone)}</Text>
        </div>
      )
    },
    {
      title: 'E-Lock',
      key: 'elock',
      width: 120,
      render: (_, record) => {
        let statusColor = "default";
        const status = record.elock_status?.toLowerCase();
        if (status === 'assigned' || status === 'active') statusColor = 'green';
        if (status === 'unassigned') statusColor = 'gold';
        if (status === 'returned') statusColor = 'blue';
        if (status === 'inactive') statusColor = 'red';

        return (
          <div style={{ lineHeight: '1.2' }}>
            <Text style={{ fontSize: '12px' }} strong>{formatFieldValue(record.elock_no || record.f_asset_id)}</Text>
            <div>
              <Tag color={statusColor} style={{ fontSize: '10px', lineHeight: '18px', padding: '0 4px', margin: 0 }}>{formatFieldValue(record.elock_status)}</Tag>
            </div>
          </div>
        );
      }
    },
    {
      title: 'Call',
      key: 'clientCall',
      width: 90,
      render: (_, record) => {
        const isEnabled = clientCallStates[record.id || record._id];
        return (
          <Button
            type={isEnabled ? "primary" : "default"}
            size="small"
            icon={isEnabled ? <PhoneFilled style={{ fontSize: '10px' }} /> : <PhoneOutlined style={{ fontSize: '10px' }} />}
            onClick={() => handleClientCallToggle(record.id || record._id)}
            className={isEnabled ? "bg-green-600" : ""}
            style={{ fontSize: '11px', height: '22px', display: 'flex', alignItems: 'center' }}
          >
            {isEnabled ? "On" : "Off"}
          </Button>
        );
      }
    },
    {
      title: 'Pickup',
      dataIndex: 'pickup_location_address',
      key: 'pickup',
      width: 140,
      ellipsis: true,
      render: text => (
        <Tooltip title={text}>
          <div style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatFieldValue(text)}
          </div>
        </Tooltip>
      )
    },
    {
      title: 'Delivery',
      dataIndex: 'delivery_location_address',
      key: 'delivery',
      width: 140,
      ellipsis: true,
      render: text => (
        <Tooltip title={text}>
          <div style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {formatFieldValue(text)}
          </div>
        </Tooltip>
      )
    },
  ];

  return (
    <div className="dashboard-container-ant compact">
      {/* Header */}
      <div className="dashboard-header-ant compact">
        <Row align="middle" justify="space-between" gutter={[8, 8]}>
          <Col>
            <Space size="small">
              <Button icon={<LeftOutlined />} onClick={() => navigate("/")} type="text" size="small" />
              <div>
                <Title level={5} style={{ margin: 0, fontSize: '16px' }}>E-Lock Tracking</Title>
                {userData && (
                  <div style={{ marginTop: 2 }}>
                    {userData.ieCodes && userData.ieCodes.length > 1 ? (
                      <Select
                        value={selectedIeCode}
                        onChange={(val) => {
                          setSelectedIeCode(val);
                          setCurrentPage(1);
                        }}
                        size="small"
                        style={{ width: 200 }}
                        prefix={<UserOutlined />}
                      >
                        {userData.ieCodes.map((code, idx) => (
                          <Option key={code} value={code}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                              <span>{code}</span>
                            </div>
                          </Option>
                        ))}
                      </Select>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <UserOutlined style={{ marginRight: 4 }} /> {userData?.ieCodeNo} {userData?.ieCodeAssignments?.[0]?.importer_name}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="small">
              <Tag icon={serviceStatus?.overall ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />} color={serviceStatus?.overall ? "success" : "error"} style={{ fontSize: '11px', padding: '0 4px' }}>
                {serviceStatus?.overall ? "Online" : "Offline"}
              </Tag>
              <Button size="small" icon={<ReloadOutlined />} onClick={() => { fetchAssignments(); checkServiceStatus(); fetchLimits(); }}>Refresh</Button>
              <Button size="small" icon={<SyncOutlined />} onClick={fetchLimits}>Sync</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div className="main-content-ant compact" style={{ padding: '16px' }}>
        <Card bordered={false} className="shadow-box" bodyStyle={{ padding: '12px' }}>

          {/* Controls Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>

            {/* Top Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'nowrap', gap: 12 }}>

              {/* Filters Left */}
              <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Input
                  placeholder="Search container..."
                  prefix={<SearchOutlined />}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  allowClear
                  size="small"
                  style={{ width: 180, fontSize: '12px' }}
                />
                <Select
                  style={{ width: 110, fontSize: '12px' }}
                  placeholder="Status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  allowClear
                  size="small"
                  defaultValue="All Status"
                >
                  <Option value="All Status">All Status</Option>
                  <Option value="ASSIGNED">Assigned</Option>
                  <Option value="RETURNED">Returned</Option>
                  <Option value="UNASSIGNED">Unassigned</Option>
                </Select>
                <Select
                  style={{ width: 110, fontSize: '12px' }}
                  placeholder="Type"
                  value={filterType}
                  onChange={setFilterType}
                  allowClear
                  size="small"
                  defaultValue="All Type"
                >
                  <Option value="All Type">All Type</Option>
                  <Option value="consignor">Consignor</Option>
                  <Option value="consignee">Consignee</Option>
                </Select>
              </div>

              {/* Pills Right */}
              <div style={{ flexShrink: 0 }}>
                {renderLimitPills()}
              </div>
            </div>

            {/* Second Row: Pagination Right - MOVED TO TABS */}
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            size="small"
            tabBarGutter={24}
            tabBarExtraContent={<CustomPagination />}
          >
            <TabPane tab="Container Assignments" key="assignments">
              <Table
                columns={columns}
                dataSource={assignments}
                rowKey={record => record.id || record._id}
                loading={loading}
                pagination={false}
                size="small"
                scroll={{ x: '100%' }}
                style={{ fontSize: '12px' }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </div>

      {showTrackingMap && (
        <TrackingMap
          isOpen={showTrackingMap}
          onClose={() => {
            setShowTrackingMap(false);
            setSelectedElockNo(null);
            setSelectedContainerData(null);
          }}
          elockNo={selectedElockNo}
          containerId={selectedContainerData?.id || selectedContainerData?._id}
          containerData={selectedContainerData}
          source="containers"
        />
      )}

      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        title={previewTitle}
      >
        <div style={{ display: 'flex', overflowX: 'auto', gap: 16, padding: 16 }}>
          {previewImages.map((src, idx) => (
            <Image
              key={idx}
              width={200}
              src={src}
              fallback="https://via.placeholder.com/200?text=Error"
            />
          ))}
        </div>
      </Modal>

    </div>
  );
};

export default Dashboard;
