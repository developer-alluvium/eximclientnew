import React, { useState, useEffect } from "react";
import { X, RefreshCw, Unlock } from "lucide-react";

const UnlockConfirmation = ({ elockNumber, onClose, onConfirm }) => {
  const [captchaCode, setCaptchaCode] = useState("");
  const [userInput, setUserInput] = useState("");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    // Generate a 4-digit random code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
    setUserInput("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (userInput === captchaCode) {
      onConfirm();
    } else {
      setAttempts(attempts + 1);
      if (attempts >= 2) {
        onClose();
      } else {
        generateCaptcha();
        setUserInput("");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Unlock className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Confirm Unlock
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              You are about to unlock e-lock:{" "}
              <span className="font-semibold">{elockNumber}</span>
            </p>
            <p className="text-xs text-red-600 mb-4">
              Please confirm you want to proceed by entering the code below.
            </p>
          </div>

          {/* CAPTCHA Display */}
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Enter this code:
              </span>
              <button
                type="button"
                onClick={generateCaptcha}
                className="text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="text-2xl font-bold text-gray-800 tracking-widest bg-white py-2 rounded border-2 border-gray-300">
              {captchaCode}
            </div>
          </div>

          {/* User Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Enter the code above *
            </label>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              required
              maxLength={4}
              pattern="[0-9]{4}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-lg font-mono"
              placeholder="____"
            />
          </div>

          {attempts > 0 && (
            <div className="text-sm text-red-600 text-center">
              Incorrect code. {3 - attempts} attempts remaining.
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Confirm Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnlockConfirmation;