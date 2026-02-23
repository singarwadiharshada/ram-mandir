import React, { useEffect } from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  type: 'success' | 'error';  // This is correct
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      const toast = document.querySelector('.toast');
      if (toast) {
        toast.classList.add('hide');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast ${type}`}>
      <span className="toast-icon">{type === 'success' ? '✅' : '❌'}</span>
      <span className="toast-message">{message}</span>
    </div>
  );
};

export default Toast;