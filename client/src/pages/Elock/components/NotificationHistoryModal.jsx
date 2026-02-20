import React, { useState, useEffect } from "react";
import { Modal, Spin, Typography, Space, Empty, List, Tag, Alert } from "antd";
import { BellOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { X } from "lucide-react";
import apiService from "../services/elockApi";

const { Text } = Typography;

const NotificationHistoryModal = ({ elockNumber, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (elockNumber) {
      fetchNotifications();
    }
  }, [elockNumber]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await apiService.getNotificationHistory(elockNumber);
      if (response && response.success !== false) {
        // Assume response gives array or response.data gives array
        const data = Array.isArray(response) ? response : (response.data || response.notifications || []);
        setNotifications(data);
      } else {
        setError(response?.error || response?.message || "Failed to fetch notifications");
      }
    } catch (err) {
            setError("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    return (
    <Modal
      open={true}
      onCancel={onClose}
      footer={null}
      title={
        <div style={{ 
          margin: '-16px -24px 16px -24px', 
          padding: '16px 24px', 
          backgroundColor: '#1e293b', 
          color: 'white',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px'
        }}>
          <Space>
            <BellOutlined style={{ color: '#fff' }} />
            <span style={{ color: 'white' }}>Notification History - {elockNumber}</span>
          </Space>
        </div>
      }
      width={700}
      bodyStyle={{ maxHeight: '60vh', overflowY: 'auto' }}
      closeIcon={<X style={{ color: 'white', marginTop: '16px', marginRight: '16px' }} />}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="Loading notification history..." />
        </div>
      ) : error ? (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : notifications.length === 0 ? (
        <Empty 
          description="There is no history available for this e-lock."
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(notification) => {
            // Get data from components object based on the provided API response structure
            const title = notification.components?.title || notification.title || "Event";
            const timeStr = notification.components?.time || notification.createdAt;
            
            // Checking logic based on parsed title from API string
            // Example "8294630189: Pull out lock rope" -> check if contains alarm keywords
            const titleLower = title.toLowerCase();
            const isAlarm = 
              titleLower.includes('alarm') || 
              titleLower.includes('warning') || 
              titleLower.includes('long-time');

            return (
              <List.Item style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid #f0f0f0',
                background: '#ffffffff', // Very light pink to match image bg
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: isAlarm ? '#ef4444' : '#22c55e', // Red for A, Green for E
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  marginRight: '16px',
                  flexShrink: 0,
                  marginTop: '4px'
                }}>
                  {isAlarm ? 'A' : 'E'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#ef4444', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                    {title}
                  </span>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>
                    {timeStr || "N/A"}
                  </span>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </Modal>
  );
};

export default NotificationHistoryModal;
