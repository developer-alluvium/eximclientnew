
const ImportVideo = ({ className = '' }) => {
 
  return (
    <>
    <div className={`import-video-container ${className}`}>
      <div className="video-wrapper">
        <h1> This is a import video page </h1>
        <iframe
          title="Import Video"
          src="https://www.youtube.com/embed/your-video-id" // Replace with your video ID
          allowFullScreen
        ></iframe>
      </div>
      
      </div> 
    </>
  );
};

export default ImportVideo;