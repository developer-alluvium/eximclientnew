import React from 'react';
import { RefreshCw } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading...', size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <RefreshCw className={`animate-spin text-blue-600 ${sizeClasses[size]}`} />
      <p className="text-gray-600 mt-4 text-center">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
