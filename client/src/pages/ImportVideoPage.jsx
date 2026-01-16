import React, { useState } from "react";
import { Card, Typography, Row, Col, Button, Modal, Space } from "antd";
import {
  PlayCircleOutlined,
  ArrowLeftOutlined,
  ImportOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text, Paragraph } = Typography;

// ---- Video Data ----
const importVideos = [
  {
    title: "How to Create Voluntary Challan on ICEGATE Portal",
    videoId: "69EXsw5mMes",
  },
  { title: "How to Pay Import Custom Duty | English", videoId: "KjsqYU26Ivc" },
  { title: "How to Pay Import Custom Duty | Hindi", videoId: "Ok4zCGPc1vY" },
];

const exportVideos = [
  { title: "How to Transfer RoDTEP Scrip Easily", videoId: "BpOjch24LHg" },
  {
    title: "How to apply online for RoDTEP scheme | English",
    videoId: "nEuKqiSOJeQ",
  },
  {
    title: "RoDTEP योजना के लिए ऑनलाइन आवेदन कैसे करें | Hindi",
    videoId: "Rf9bR0y11X0",
  },
  { title: "What is RoDTEP? | in Hindi", videoId: "534otGHKauY" },
  {
    title: "What is factory Stuffing & Dock Stuffing?",
    videoId: "VHbKfv58jhY",
  },
];

// ---- Helpers ----
const getEmbedUrl = (id) => `https://www.youtube.com/embed/${id}?autoplay=1`;

// ---- Main Component ----
const ImportVideoPage = () => {
  const navigate = useNavigate();
  const [modalVideoId, setModalVideoId] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const openModal = (videoId) => setModalVideoId(videoId);
  const closeModal = () => setModalVideoId(null);

  const VideoCard = ({ video }) => {
    const isHovered = hoveredCard === video.videoId;

    return (
      <Card
        hoverable
        onClick={() => openModal(video.videoId)}
        onMouseEnter={() => setHoveredCard(video.videoId)}
        onMouseLeave={() => setHoveredCard(null)}
        style={{
          borderRadius: 16,
          border: "1px solid #f0f0f0",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isHovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow: isHovered
            ? "0 12px 24px rgba(0, 0, 0, 0.12)"
            : "0 2px 8px rgba(0, 0, 0, 0.06)",
          cursor: "pointer",
          height: "100%",
        }}
        bodyStyle={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isHovered
              ? "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)"
              : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            boxShadow: isHovered
              ? "0 8px 16px rgba(24, 144, 255, 0.3)"
              : "0 8px 16px rgba(249, 115, 22, 0.3)",
            transition: "all 0.3s ease",
            transform: isHovered ? "scale(1.1)" : "scale(1)",
          }}
        >
          <PlayCircleOutlined style={{ fontSize: 28, color: "#ffffff" }} />
        </div>

        <Text
          strong
          style={{
            fontSize: 15,
            color: isHovered ? "#1890ff" : "#262626",
            transition: "color 0.3s ease",
            lineHeight: 1.5,
          }}
        >
          {video.title}
        </Text>
      </Card>
    );
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header Section */}
      <div style={{ marginBottom: 48 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ marginBottom: 24, borderRadius: 8 }}
        >
          Back
        </Button>

        <div style={{ textAlign: "center" }}>
          <Title
            level={1}
            style={{
              marginBottom: 12,
              background: "linear-gradient(135deg, #262626 0%, #595959 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Trademaster Guide
          </Title>
          <Paragraph
            type="secondary"
            style={{
              fontSize: 16,
              maxWidth: 600,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Master import and export procedures with our comprehensive video
            tutorials
          </Paragraph>
        </div>
      </div>

      {/* Import Videos Section */}
      <Card
        style={{
          marginBottom: 32,
          borderRadius: 16,
          border: "1px solid #f0f0f0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
        bodyStyle={{ padding: "32px" }}
      >
        <Space align="center" style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #52c41a 0%, #237804 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ImportOutlined style={{ fontSize: 20, color: "#fff" }} />
          </div>
          <Title level={3} style={{ margin: 0 }}>
            Import Videos
          </Title>
        </Space>

        <Row gutter={[24, 24]}>
          {importVideos.map((video) => (
            <Col key={video.videoId} xs={24} sm={12} lg={8}>
              <VideoCard video={video} />
            </Col>
          ))}
        </Row>
      </Card>

      {/* Export Videos Section */}
      <Card
        style={{
          borderRadius: 16,
          border: "1px solid #f0f0f0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
        bodyStyle={{ padding: "32px" }}
      >
        <Space align="center" style={{ marginBottom: 24 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ExportOutlined style={{ fontSize: 20, color: "#fff" }} />
          </div>
          <Title level={3} style={{ margin: 0 }}>
            Export Videos
          </Title>
        </Space>

        <Row gutter={[24, 24]}>
          {exportVideos.map((video) => (
            <Col key={video.videoId} xs={24} sm={12} lg={8}>
              <VideoCard video={video} />
            </Col>
          ))}
        </Row>
      </Card>

      {/* Video Modal */}
      <Modal
        open={!!modalVideoId}
        onCancel={closeModal}
        footer={null}
        width="90%"
        style={{ maxWidth: 1200, top: 40 }}
        styles={{
          body: { padding: 0, aspectRatio: "16/9" },
          content: { borderRadius: 16, overflow: "hidden" },
        }}
        destroyOnClose
      >
        {modalVideoId && (
          <iframe
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              aspectRatio: "16/9",
            }}
            src={getEmbedUrl(modalVideoId)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube Video Player"
          />
        )}
      </Modal>
    </div>
  );
};

export default ImportVideoPage;
