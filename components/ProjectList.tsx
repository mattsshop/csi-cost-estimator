import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Trash2, Calendar, MapPin, Download, Upload } from 'lucide-react';

interface ProjectListItem {
  id: string;
  projectInfo: {
    jobName: string;
    address: string;
  };
  createdAt?: string | number;
  updatedAt: string | number;
}

interface ProjectListProps {
  isOpen: boolean;
  onClose: () => void;
  projects: any[]; // Using any[] to match App.tsx state for now, but will treat as ProjectListItem
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDownloadBackup: () => void;
  onDownloadIndividual: (id: string) => void;
  onImport: (file: File) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ 
  isOpen, 
  onClose, 
  projects, 
  onSelect, 
  onDelete, 
  onDownloadBackup,
  onDownloadIndividual,
  onImport
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">My Projects</h2>
                {projects.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{projects.length} project(s) total</p>
                )}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 active:bg-gray-200 active:scale-95 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onDownloadBackup}
                  disabled={projects.length === 0}
                  className="py-2.5 px-4 bg-indigo-600 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-sm transition-all active:scale-[0.98] font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={14} />
                  <span>Export All</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 shadow-sm transition-all active:scale-[0.98] font-medium text-xs"
                >
                  <Upload size={14} />
                  <span>Import JSON</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center px-4">
                Manage your project data locally. Use JSON files to transfer projects or keep offline copies.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {projects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="text-gray-300" size={32} />
                  </div>
                  <p className="text-gray-900 font-medium">No projects found</p>
                  <p className="text-gray-500 text-sm mt-1">Save your first estimate or import a file.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project: ProjectListItem) => (
                    <div
                      key={project.id}
                      className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md active:bg-gray-50 transition-all cursor-pointer"
                      onClick={() => onSelect(project.id)}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                            {project.projectInfo.jobName || 'Untitled Project'}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mt-1">
                            <MapPin size={12} className="flex-shrink-0" />
                            <span className="truncate">{project.projectInfo.address || 'No address'}</span>
                          </div>
                          <div className="flex flex-col gap-1 text-gray-400 text-[10px] mt-2">
                            <div className="flex items-center gap-2">
                              <Calendar size={10} />
                              <span>
                                Updated: {new Date(project.updatedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadIndividual(project.id);
                            }}
                            title="Download JSON"
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(project.id);
                            }}
                            title="Delete"
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProjectList;
