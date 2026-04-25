import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'info' | 'warning';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'info'
}) => {
  const colors = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    info: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white'
  };

  const iconColors = {
    danger: 'text-red-600 bg-red-50',
    info: 'text-indigo-600 bg-indigo-50',
    warning: 'text-amber-500 bg-amber-50'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${iconColors[type]}`}>
                  <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                  <p className="text-gray-600 mt-2 leading-relaxed">{message}</p>
                </div>
                <button 
                  onClick={onCancel}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-semibold rounded-lg active:scale-95 transition-all ${colors[type]}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
