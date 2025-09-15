import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    info: 'bg-blue-600 text-white',
  };

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Activity,
  };

  const Icon = icons[type];

  return (
    <div
      className={`${styles[type]} px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 max-w-md animate-slideIn`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 flex-shrink-0">
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;
