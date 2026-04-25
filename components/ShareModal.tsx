
import React, { useState } from 'react';
import { X, UserPlus, Mail, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborators: string[];
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
  isOwner: boolean;
  shareLink: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, collaborators, onAdd, onRemove, isOwner, shareLink }) => {
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && !collaborators.includes(email.trim())) {
      onAdd(email.trim().toLowerCase());
      setEmail('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 20 }}
           className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
            <div className="flex items-center gap-2">
              <UserPlus size={20} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900">Share Project</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 font-mono outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    copied 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-gray-400">
                Anyone with access (owner or collaborator) can use this link to open the project.
              </p>
            </div>

            {isOwner ? (
              <form onSubmit={handleSubmit} className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Invite by Email</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all text-sm whitespace-nowrap"
                  >
                    Invite
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-gray-500 italic">
                  Note: The invited person must have logged into this app with their Google account.
                </p>
              </form>
            ) : (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-xs flex gap-2">
                <span>⚠️</span>
                <p>Only the project owner can invite others to collaborate.</p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Collaborators</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {collaborators.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-4 text-center">No collaborators added yet.</p>
                ) : (
                  collaborators.map((collabEmail) => (
                    <div key={collabEmail} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {collabEmail.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700 truncate max-w-[200px]">{collabEmail}</span>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => onRemove(collabEmail)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Remove collaborator"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareModal;
