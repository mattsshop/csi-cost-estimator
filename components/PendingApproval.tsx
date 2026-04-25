import React from 'react';
import { motion } from 'motion/react';
import { LogOut, Clock, ShieldAlert } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface PendingApprovalProps {
  status: 'pending' | 'rejected' | string;
}

const PendingApproval: React.FC<PendingApprovalProps> = ({ status }) => {
  const isRejected = status === 'rejected';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center"
      >
        <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${isRejected ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
          {isRejected ? <ShieldAlert size={40} /> : <Clock size={40} />}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isRejected ? 'Account Rejected' : 'Approval Pending'}
        </h1>
        
        <p className="text-gray-600 mb-8">
          {isRejected 
            ? 'Your account has been rejected by the administrator. If you believe this is an error, please contact support.'
            : 'Your account is currently waiting for administrator approval. You will have full access once your account is activated.'}
        </p>

        <div className="space-y-4">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200"
          >
            Check Status
          </button>
          
          <button
            onClick={() => signOut(auth)}
            className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Construction Cost Estimator v2.0
        </p>
      </motion.div>
    </div>
  );
};

export default PendingApproval;
