import React, { useState } from "react";
import { Modal, Radio, Button, Typography, Empty, Divider, Tag } from "antd";
import { CarOutlined, PictureOutlined, ShareAltOutlined } from "@ant-design/icons";
import "../styles/job-list.scss";

import EditableTransporterCell from "./EditableTransporterCell";

const { Text, Title } = Typography;

const ContainerModal = ({ open, onClose, container, jobData, initialTab = "tracking" }) => {
  const [selectedOption, setSelectedOption] = useState(initialTab);
  
  // Update selected option when modal opens or initialTab changes
  React.useEffect(() => {
      if (open) {
          setSelectedOption(initialTab);
      }
  }, [open, initialTab]);

  const handleTrackingRedirect = () => {
    if (container?.container_number) {
      const trackingUrl = `https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`;
      window.open(trackingUrl, "_blank", "noopener,noreferrer");
    }
  };

  const renderContent = () => {
    if (selectedOption === "tracking") {
        return (
            <div className="modal-content-grid">
                <div className="tracking-header">
                     <div className="tracking-icon-box">
                         <CarOutlined />
                     </div>
                     <div>
                         <Title level={5} style={{ marginBottom: 0 }}>Container Tracking</Title>
                         <Text type="secondary" style={{ fontSize: '0.85rem' }}>Track your container in real-time</Text>
                     </div>
                </div>

                <div className="tracking-card">
                    <Text type="secondary" style={{ display: 'block', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, marginBottom: '8px' }}>Container Number</Text>
                    <div className="container-tag">
                        <Tag 
                            color="blue" 
                            style={{ 
                                fontSize: '0.9rem', 
                                padding: '4px 10px', 
                                fontWeight: 600 
                            }}
                        >
                            {container?.container_number}
                        </Tag>
                    </div>

                    <Button 
                        type="primary" 
                        size="large"
                        icon={<ShareAltOutlined />} 
                        onClick={handleTrackingRedirect} 
                        block
                        style={{ 
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            border: 'none',
                            fontWeight: 600
                        }}
                    >
                        Open Tracking
                    </Button>
                </div>
            </div>
        )
    } else if (selectedOption === "images") {
        return (
            <div className="modal-content-grid">
                 <div className="images-header">
                     <div className="images-icon-box">
                         <PictureOutlined />
                     </div>
                     <div>
                         <Title level={5} style={{ marginBottom: 0 }}>Container Images & Documents</Title>
                         <Text type="secondary" style={{ fontSize: '0.85rem' }}>View container photos and weighment slips</Text>
                     </div>
                </div>

                <div className="images-card">
                     {/* Images */}
                     {Array.isArray(container?.container_images) && container.container_images.length > 0 ? (
                         <div className="images-list">
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                 <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></div>
                                 <Text strong style={{ color: '#374151', fontSize: '0.875rem' }}>
                                     {container.container_images.length} image{container.container_images.length > 1 ? 's' : ''} available
                                 </Text>
                             </div>
                             {container.container_images.map((url, idx) => (
                                 <Button 
                                     key={idx} 
                                     href={url} 
                                     target="_blank" 
                                     icon={<PictureOutlined />}
                                     block
                                     style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                                 >
                                     Container Image {idx + 1}
                                 </Button>
                             ))}
                         </div>
                     ) : (
                         <div style={{ textAlign: 'center', padding: '16px 0' }}>
                             <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No container images" />
                         </div>
                     )}

                     {/* Weighment Slips */}
                     {((Array.isArray(container?.container_images) && container.container_images.length > 0) ||
                       (Array.isArray(container?.weighment_slip_images) && container.weighment_slip_images.length > 0)) && (
                         <Divider style={{ margin: '16px 0', borderColor: 'rgba(0,0,0,0.1)' }} />
                     )}

                     {Array.isArray(container?.weighment_slip_images) && container.weighment_slip_images.length > 0 ? (
                          <div className="images-list">
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                 <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></div>
                                 <Text strong style={{ color: '#374151', fontSize: '0.875rem' }}>
                                     {container.weighment_slip_images.length} weighment slip{container.weighment_slip_images.length > 1 ? 's' : ''} available
                                 </Text>
                             </div>
                             {container.weighment_slip_images.map((url, idx) => (
                                 <Button 
                                     key={idx} 
                                     href={url} 
                                     target="_blank" 
                                     icon={<PictureOutlined />}
                                     block
                                     style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                                 >
                                     Weighment Slip {idx + 1}
                                 </Button>
                             ))}
                         </div>
                     ) : (
                         <div style={{ textAlign: 'center', padding: '16px 0' }}>
                              <Text type="secondary" style={{ fontSize: '0.75rem' }}>No weighment slips</Text>
                         </div>
                     )}
                </div>
            </div>
        )
    } else if (selectedOption === "transporter") {
        return (
            <div className="modal-content-grid">
               <div className="transporter-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                   <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <CarOutlined style={{ color: '#9333ea', fontSize: '20px' }} />
                   </div>
                   <div>
                       <Title level={5} style={{ marginBottom: 0 }}>Assign Transporter</Title>
                       <Text type="secondary" style={{ fontSize: '0.85rem' }}>Manage transporter assignment</Text>
                   </div>
               </div>

                <div className="transporter-card">
                    {jobData && container ? (
                        <EditableTransporterCell 
                            cell={{ 
                                row: { original: jobData },
                                targetContainerNumber: container.container_number
                            }} 
                        />
                    ) : (
                        <Empty description="No job data available" />
                    )}
                </div>
            </div>
        )
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>Close</Button>
      ]}
      width={600}
      title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <CarOutlined style={{ color: '#2563eb' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{container?.container_number}</span>
                   {container?.size && <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 'normal' }}>{container.size}</span>}
              </div>
          </div>
      }
    >
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
            <Radio.Group 
                value={selectedOption} 
                onChange={(e) => setSelectedOption(e.target.value)}
                buttonStyle="solid"
                size="middle"
            >
                <Radio.Button value="tracking">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CarOutlined /> Tracking</span>
                </Radio.Button>
                <Radio.Button value="images">
                     <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PictureOutlined /> Images</span>
                </Radio.Button>
                <Radio.Button value="transporter">
                     <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CarOutlined /> Transporter</span>
                </Radio.Button>
            </Radio.Group>
        </div>

        {renderContent()}
    </Modal>
  );
};

export default ContainerModal;
