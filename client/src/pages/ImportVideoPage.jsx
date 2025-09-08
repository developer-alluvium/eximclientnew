import React, { useState } from 'react';
import BackButton from '../components/BackButton';

// ---- Video Data ----
const importVideos = [
  { title: "How to Create Voluntary Challan on ICEGATE Portal", videoId: "69EXsw5mMes" },
  { title: "How to Pay Import Custom Duty | English", videoId: "KjsqYU26Ivc" },
  { title: "How to Pay Import Custom Duty | Hindi", videoId: "Ok4zCGPc1vY" },
];

const exportVideos = [
  { title: "How to Transfer RoDTEP Scrip Easily", videoId: "BpOjch24LHg" },
  { title: "How to apply online for RoDTEP scheme | English", videoId: "nEuKqiSOJeQ" },
  { title: "RoDTEP योजना के लिए ऑनलाइन आवेदन कैसे करें | Hindi", videoId: "Rf9bR0y11X0" },
  { title: "What is RoDTEP? | in Hindi", videoId: "534otGHKauY" },
  { title: "What is factory Stuffing & Dock Stuffing?", videoId: "VHbKfv58jhY" },
];

// ---- Helpers ----
const getEmbedUrl = id => `https://www.youtube.com/embed/${id}?autoplay=1`;

// ---- Enhanced Styles ----
const pageStyle = {
  padding: '32px',
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  minHeight: '100vh',
  position: 'relative',
};

// Add subtle animated background elements
const backgroundOverlayStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: `
    radial-gradient(circle at 20% 80%, rgba(251, 146, 60, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(254, 215, 170, 0.1) 0%, transparent 50%)
  `,
  pointerEvents: 'none',
  zIndex: 0,
};

const contentWrapperStyle = {
  position: 'relative',
  zIndex: 1,
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '56px',
};

const mainTitleStyle = {
  fontSize: '3rem',
  fontWeight: 800,
  background: 'linear-gradient(135deg, #1e293b 0%, #374151 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  marginBottom: '16px',
  textShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  letterSpacing: '-0.02em',
};

const subtitleStyle = {
  fontSize: '1.125rem',
  color: '#64748b',
  maxWidth: '600px',
  margin: '0 auto',
  lineHeight: '1.6',
  textShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
};

const sectionStyle = {
  marginBottom: '56px',
  padding: '32px',
  background: 'rgba(255, 255, 255, 0.95)',
  borderRadius: '24px',
  backdropFilter: 'blur(20px)',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
};

const sectionTitleStyle = {
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#1E293B',
  marginBottom: '32px',
  position: 'relative',
  paddingBottom: '12px',
};

// Add decorative line under section titles
const sectionTitleAfterStyle = {
  content: '""',
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '60px',
  height: '4px',
  background: 'linear-gradient(90deg, #f97316, #ea580c)',
  borderRadius: '2px',
};

const cardsContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '28px',
};

const cardStyle = {
  background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
  borderRadius: '20px',
  padding: '28px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '20px',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  textAlign: 'center',
  outline: 'none',
  position: 'relative',
  overflow: 'hidden',
};

// Add subtle shimmer effect on hover
const cardBeforeStyle = {
  content: '""',
  position: 'absolute',
  top: 0,
  left: '-100%',
  width: '100%',
  height: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
  transition: 'left 0.5s ease',
};

const cardHoverStyle = {
  transform: 'translateY(-8px) scale(1.02)',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 20px -5px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(145deg, #ffffff, #fefefe)',
};

const cardFocusStyle = {
  boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

const cardIconStyle = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
  color: '#ffffff',
  fontSize: '28px',
  boxShadow: '0 8px 16px rgba(249, 115, 22, 0.3)',
  transition: 'all 0.3s ease',
};

const cardIconHoverStyle = {
  transform: 'scale(1.1) rotate(5deg)',
  boxShadow: '0 12px 24px rgba(249, 115, 22, 0.4)',
};

const cardTitleStyle = {
  fontWeight: 600,
  color: '#1E293B',
  fontSize: '1.1rem',
  lineHeight: '1.5',
  transition: 'color 0.3s ease',
};

const cardTitleHoverStyle = {
  color: '#f97316',
};

// ---- Enhanced Modal Styles ----
const modalBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(0, 0, 0, 0.8)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 2000,
  padding: '20px',
  boxSizing: 'border-box',
  animation: 'fadeIn 0.3s ease',
};

const modalContentStyle = {
  background: 'linear-gradient(145deg, #1e293b, #334155)',
  borderRadius: '20px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
  position: 'relative',
  width: '100%',
  maxWidth: '1200px',
  aspectRatio: '16 / 9',
  display: 'flex',
  animation: 'modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
};

const closeButtonStyle = {
  position: 'absolute',
  top: '-50px',
  right: '0',
  background: 'rgba(255, 255, 255, 0.1)',
  border: '2px solid rgba(255, 255, 255, 0.3)',
  borderRadius: '50%',
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  color: 'rgba(255, 255, 255, 0.8)',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  backdropFilter: 'blur(10px)',
};

const closeButtonHoverStyle = {
  color: '#ffffff',
  background: 'rgba(255, 255, 255, 0.2)',
  transform: 'scale(1.1) rotate(90deg)',
  borderColor: 'rgba(255, 255, 255, 0.5)',
};

// Add CSS animations
const globalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes modalSlideIn {
    from { 
      opacity: 0; 
      transform: scale(0.9) translateY(20px); 
    }
    to { 
      opacity: 1; 
      transform: scale(1) translateY(0); 
    }
  }
  
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
`;

// ---- Main Component ----
const ImportVideoPage = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [focusedCard, setFocusedCard] = useState(null);
  const [modalVideoId, setModalVideoId] = useState(null);
  const [closeButtonHovered, setCloseButtonHovered] = useState(false);

  const openModal = (videoId) => setModalVideoId(videoId);
  const closeModal = () => setModalVideoId(null);

  const renderVideoCards = (videos) => videos.map((video) => {
    const isHovered = hoveredCard === video.videoId;
    const isFocused = focusedCard === video.videoId;
    
    return (
      <div
        key={video.videoId}
        style={{
          ...cardStyle,
          ...(isHovered && cardHoverStyle),
          ...(isFocused && cardFocusStyle),
        }}
        tabIndex={0}
        onClick={() => openModal(video.videoId)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openModal(video.videoId); }}
        onMouseEnter={() => setHoveredCard(video.videoId)}
        onMouseLeave={() => setHoveredCard(null)}
        onFocus={() => setFocusedCard(video.videoId)}
        onBlur={() => setFocusedCard(null)}
        role="button"
        aria-label={`Play video: ${video.title}`}
      >
        <div 
          style={{
            ...cardIconStyle,
            ...(isHovered && cardIconHoverStyle),
          }} 
          aria-hidden="true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16">
            <path d="M10.804 8 5 4.633v6.734zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696z" />
          </svg>
        </div>
        <div 
          style={{
            ...cardTitleStyle,
            ...(isHovered && cardTitleHoverStyle),
          }}
        >
          {video.title}
        </div>
      </div>
    );
  });

  return (
    <>
      <style>{globalStyles}</style>
      <div style={pageStyle}>
        <div style={backgroundOverlayStyle} />
        <div style={contentWrapperStyle}>
          <header style={headerStyle}>
            <h1 style={mainTitleStyle}>Trademaster Guide</h1>
            <p style={subtitleStyle}>Master import and export procedures with our comprehensive video tutorials</p>
          </header>

          {modalVideoId && (
            <div style={modalBackdropStyle} onClick={closeModal}>
              <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
                <button
                  style={{ ...closeButtonStyle, ...(closeButtonHovered && closeButtonHoverStyle) }}
                  onClick={closeModal}
                  aria-label="Close video player"
                  onMouseEnter={() => setCloseButtonHovered(true)}
                  onMouseLeave={() => setCloseButtonHovered(false)}
                >
                  ×
                </button>
                <iframe
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: '20px' }}
                  src={getEmbedUrl(modalVideoId)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube Video Player"
                />
              </div>
            </div>
          )}
  <BackButton />
          <main>
              <h2 style={sectionTitleStyle}>
                Import Videos
                <div style={sectionTitleAfterStyle} />
              </h2>
              <div style={cardsContainerStyle}>
                {renderVideoCards(importVideos)}
              </div>
        

   
              <h2 style={sectionTitleStyle}>
                Export Videos
                <div style={sectionTitleAfterStyle} />
              </h2>
              <div style={cardsContainerStyle}>
                {renderVideoCards(exportVideos)}
              </div>
            
          </main>
        </div>
      </div>
    </>
  );
};

export default ImportVideoPage;