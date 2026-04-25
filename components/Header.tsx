
import React, { useRef } from 'react';
import { ProjectInfo } from '../types';
import { Save, FolderOpen, FileSpreadsheet, Sparkles, Loader2, Plus, LogIn, LogOut, User as UserIcon, UserPlus, Shield } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  projectInfo: ProjectInfo;
  onChange: (field: keyof ProjectInfo, value: string | number) => void;
  onSave: () => void;
  onNewProject: () => void;
  onLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportExcel: () => void;
  onOpenProjectList: () => void;
  onSaveTemplate: () => void;
  onShare: () => void;
  canShare: boolean;
  onGeminiHelp: () => void;
  isSaving: boolean;
  isGenerating: boolean;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  isAdmin: boolean;
  onOpenAdmin: () => void;
}

const InfoInput: React.FC<{label: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, step?: string}> = ({label, value, onChange, type = "text", step}) => (
    <div>
        <label className="block text-sm font-medium text-gray-500">{label}</label>
        <input
            type={type}
            step={step}
            value={type === 'number' && value === 0 ? '' : value}
            onChange={onChange}
            onFocus={(e) => type === 'number' ? e.target.select() : undefined}
            placeholder={type === 'number' ? '0' : ''}
            className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
    </div>
);


const Header: React.FC<HeaderProps> = ({ projectInfo, onChange, onSave, onNewProject, onLoad, onExportExcel, onOpenProjectList, onSaveTemplate, onShare, canShare, onGeminiHelp, isSaving, isGenerating, user, onLogin, onLogout, isLoggingIn, isAdmin, onOpenAdmin }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <header className="mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Studio Cost Estimator</h1>
            <p className="text-gray-600 mt-1">Cloud-synced estimation powered by Google AI Studio.</p>
          </div>
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Shield size={12} />
              ADMIN PANEL
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3 mr-4 pr-4 border-r border-gray-200">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <UserIcon size={16} />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-gray-900 leading-none">{user.displayName || 'User'}</p>
                <button onClick={onLogout} className="text-[10px] text-gray-500 hover:text-indigo-600 flex items-center gap-1 mt-1">
                  <LogOut size={10} /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2 bg-white text-indigo-600 font-semibold py-3 px-5 rounded-lg border border-indigo-200 hover:bg-indigo-50 active:bg-indigo-100 active:scale-95 transition-all text-sm shadow-sm mr-2 disabled:opacity-50"
            >
              {isLoggingIn ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {isLoggingIn ? 'Signing In...' : 'Sign In'}
            </button>
          )}

          <input 
              type="file" 
              ref={fileInputRef} 
              onChange={onLoad}
              accept=".json"
              className="hidden" 
          />
          
          <button
              onClick={onNewProject}
              className="flex items-center gap-2 bg-white text-gray-700 font-semibold py-3 px-5 rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 active:scale-95 transition-all text-sm shadow-sm"
          >
              <Plus size={18} />
              New Project
          </button>

          <button
              onClick={onOpenProjectList}
              className="flex items-center gap-2 bg-white text-gray-700 font-semibold py-3 px-5 rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 active:scale-95 transition-all text-sm shadow-sm"
          >
              <FolderOpen size={18} />
              My Projects
          </button>

          <button
              onClick={onGeminiHelp}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 font-semibold py-3 px-5 rounded-lg border border-indigo-200 hover:bg-indigo-100 active:bg-indigo-200 active:scale-95 transition-all text-sm shadow-sm disabled:opacity-50"
          >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              AI Description
          </button>

          {canShare && (
            <button
                onClick={onShare}
                className="flex items-center gap-2 bg-white text-indigo-600 font-semibold py-3 px-5 rounded-lg border border-indigo-200 hover:bg-indigo-50 active:bg-indigo-100 active:scale-95 transition-all text-sm shadow-sm"
            >
                <UserPlus size={18} />
                Share
            </button>
          )}

          <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-5 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 active:scale-95 transition-all text-sm shadow-md disabled:bg-indigo-400"
          >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'Saving...' : 'Save'}
          </button>
          
          <button
              onClick={onSaveTemplate}
              title="Save current layout as your default template"
              className="flex items-center gap-2 bg-white text-indigo-600 font-semibold py-3 px-5 rounded-lg border border-indigo-200 hover:bg-indigo-50 active:bg-indigo-100 active:scale-95 transition-all text-sm shadow-sm"
          >
              <Save size={18} className="opacity-70" />
              Save as Template
          </button>
          
          <button
              onClick={onExportExcel}
              className="flex items-center gap-2 bg-emerald-600 text-white font-semibold py-3 px-5 rounded-lg hover:bg-emerald-700 active:bg-emerald-800 active:scale-95 transition-all text-sm shadow-md"
          >
              <FileSpreadsheet size={18} />
              Excel
          </button>
        </div>
      </div>
      
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-2">
                <InfoInput label="Job Name" value={projectInfo.jobName} onChange={e => onChange('jobName', e.target.value)} />
            </div>
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-2">
                <InfoInput label="Address" value={projectInfo.address} onChange={e => onChange('address', e.target.value)} />
            </div>
            <InfoInput label="Rooms" type="number" value={projectInfo.rooms} onChange={e => onChange('rooms', Math.max(1, parseInt(e.target.value) || 1))} />
            <InfoInput label="Square Feet" type="number" value={projectInfo.squareFeet} onChange={e => onChange('squareFeet', Math.max(1, parseInt(e.target.value) || 1))} />
            <InfoInput label="Margin (%)" type="number" step="0.1" value={projectInfo.margin} onChange={e => onChange('margin', parseFloat(e.target.value) || 0)} />
            <InfoInput label="Overhead (%)" type="number" step="0.1" value={projectInfo.add} onChange={e => onChange('add', parseFloat(e.target.value) || 0)} />
        </div>

        {projectInfo.description && (
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-500 mb-2">Project Description (AI Generated)</label>
            <textarea
              value={projectInfo.description}
              onChange={e => onChange('description', e.target.value)}
              rows={3}
              className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="AI generated description will appear here..."
            />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
