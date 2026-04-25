import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Loader2, Send, FileUp, FileText } from 'lucide-react';

interface AIQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (textOrFile: string | { data: string; mimeType: string }) => Promise<void>;
  isProcessing: boolean;
  targetItemName: string;
}

const AIQuoteModal: React.FC<AIQuoteModalProps> = ({ 
  isOpen, 
  onClose, 
  onProcess, 
  isProcessing,
  targetItemName 
}) => {
  const [quoteText, setQuoteText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setQuoteText(''); // Clear text if file is selected
    } else if (file) {
      alert('Please upload a PDF file.');
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await onProcess({ data: base64, mimeType: selectedFile.type });
      };
      reader.readAsDataURL(selectedFile);
    } else if (quoteText.trim()) {
      await onProcess(quoteText);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl bg-white rounded-2xl shadow-2xl z-[70] overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">AI Quote Assistant</h2>
                  <p className="text-xs text-gray-500">Extracting for: <span className="text-indigo-600 font-medium">{targetItemName}</span></p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                disabled={isProcessing}
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-4">
                {!selectedFile && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paste Supplier/Subcontractor Quote
                    </label>
                    <div className="relative">
                      <textarea
                        value={quoteText}
                        onChange={(e) => setQuoteText(e.target.value)}
                        placeholder="Paste email content or quote details here..."
                        className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm resize-none"
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                )}

                {(!quoteText.trim() || selectedFile) && (
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">OR</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf"
                      className="hidden"
                    />
                    
                    {!selectedFile ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-full p-8 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                      >
                        <div className="p-3 bg-gray-50 text-gray-400 group-hover:text-indigo-500 group-hover:bg-white rounded-full transition-all shadow-sm">
                          <FileUp size={24} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-gray-700">Upload Quote PDF</p>
                          <p className="text-xs text-gray-400 mt-1">Directly analyze your document</p>
                        </div>
                      </button>
                    ) : (
                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-600 text-white rounded-lg">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-indigo-900 truncate max-w-[240px]">
                              {selectedFile.name}
                            </p>
                            <p className="text-[10px] text-indigo-400">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeFile}
                          className="p-1 hover:bg-indigo-200 text-indigo-400 rounded transition-colors"
                          disabled={isProcessing}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-[10px] text-gray-400 italic text-center px-4">
                  The AI will automatically extract the final total and scope of work from either your text or the PDF file.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || (!quoteText.trim() && !selectedFile)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Analyze Quote</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AIQuoteModal;
