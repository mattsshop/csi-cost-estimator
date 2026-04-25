import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Check, Ban, UserCheck, Shield, Mail, Calendar } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  status: 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: UserProfile[] = [];
      snapshot.forEach((doc) => {
        usersData.push(doc.data() as UserProfile);
      });
      // Sort: Pending first, then by date
      setUsers(usersData.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users for admin panel:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleStatusUpdate = async (uid: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error updating user status:", err);
      alert("Failed to update user status. Check permissions.");
    }
  };

  const handleRoleUpdate = async (uid: string, newRole: 'user' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error updating user role:", err);
      alert("Failed to update user role. Check permissions.");
    }
  };

  const filteredUsers = activeTab === 'pending' 
    ? users.filter(u => u.status === 'pending')
    : users;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">User Management</h2>
              <p className="text-indigo-100 text-xs">Approve and manage application access</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'pending' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Approval
            {users.filter(u => u.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px]">
                {users.filter(u => u.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'all' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Users
            <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-[10px]">
              {users.length}
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
              <UserCheck size={48} className="mb-4 opacity-20" />
              <p className="font-medium text-gray-500">No users found</p>
              <p className="text-sm">Everything is up to date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div 
                  key={user.uid}
                  className="p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-100 transition-all flex items-center justify-between group shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`} 
                      alt={user.displayName || 'User'}
                      className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{user.displayName || 'User'}</h3>
                        {user.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <Shield size={10} />
                            ADMIN
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          user.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          user.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {(user.status || 'pending').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Mail size={12} />
                          {user.email}
                        </span>
                        {user.createdAt && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar size={12} />
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {user.status !== 'approved' && (
                      <button 
                        onClick={() => handleStatusUpdate(user.uid, 'approved')}
                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors title='Approve'"
                        title="Approve User"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    {user.status !== 'rejected' && user.role !== 'admin' && (
                      <button 
                        onClick={() => handleStatusUpdate(user.uid, 'rejected')}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                        title="Reject User"
                      >
                        <Ban size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleRoleUpdate(user.uid, user.role === 'admin' ? 'user' : 'admin')}
                      className={`p-2 rounded-lg transition-colors ${
                        user.role === 'admin' 
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-600 hover:text-white' 
                          : 'bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white'
                      }`}
                      title={user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                    >
                      <Shield size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminPanel;
