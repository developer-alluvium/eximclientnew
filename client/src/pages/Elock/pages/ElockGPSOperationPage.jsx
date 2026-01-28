import React, { useState,  } from 'react';
import { useParams , useNavigate} from 'react-router-dom';
import ElockGPSOperation from '../components/ElockGPSOperation';

const ElockGPSOperationPage = () => {
  const { elockNo } = useParams();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(true); // Start open if you want

  const handleCloseModal = () => {
    setModalOpen(false);
    navigate('/'); // Redirect to home or another page after closing
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ElockGPSOperation
        isOpen={modalOpen}
        onClose={handleCloseModal}
        elockNo={elockNo}
      />
    </div>
  );
};

export default ElockGPSOperationPage;