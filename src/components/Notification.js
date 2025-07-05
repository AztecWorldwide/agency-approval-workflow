import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
};

const colors = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

const Notification = ({ show, message, type = 'info', onClose }) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white ${colors[type]}`}
    >
      <div className="mr-3">{icons[type]}</div>
      <div className="text-sm font-medium">{message}</div>
      <button onClick={onClose} className="ml-4 -mr-1 p-1 rounded-full hover:bg-white/20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Notification;