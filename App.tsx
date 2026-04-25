
// AI-DEPLOY: Small comment to trigger GitHub Export update
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { initialData } from './data/csiCodes';
import { Division as DivisionType, ProjectInfo, LineItem, ProjectData } from './types';
import Header from './components/Header';
import CostTable from './components/CostTable';
import Summary from './components/Summary';
import { generatePdf } from './services/pdfService';
import { generateMissingPricesPdf } from './services/missingPricesService';
import { generateExcel } from './services/excelService';
import { GoogleGenAI, Type } from "@google/genai";
import ProjectList from './components/ProjectList';
import AIQuoteModal from './components/AIQuoteModal';
import ErrorBoundary from './components/ErrorBoundary';
import ConfirmModal from './components/ConfirmModal';
import Toast, { ToastType } from './components/Toast';
import ShareModal from './components/ShareModal';
import { UserPlus, Save, Loader2 } from 'lucide-react';

// Firebase imports
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';

const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please set it in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Helper to catch hanging Firestore writes that are retrying internally due to quota
const raceWithTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 4000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("FIRESTORE_TIMEOUT")), timeoutMs)
    )
  ]);
};

const App: React.FC = () => {
  console.log("App component rendering...");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    jobName: 'Project Name',
    address: '123 Main St',
    rooms: 1,
    squareFeet: 1,
    margin: 10,
    add: 3,
  });
  const [divisions, setDivisions] = useState<DivisionType[]>(initialData);
  const [isClientView, setIsClientView] = useState<boolean>(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isProjectListOpen, setIsProjectListOpen] = useState(false);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<{ divisionId: string; itemId: string; name: string } | null>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [userTemplate, setUserTemplate] = useState<DivisionType[] | null>(null);
  const lastSavedRef = useRef<string>('');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(() => {
    const lastError = localStorage.getItem('firestore_quota_error');
    if (lastError) {
      try {
        const { timestamp } = JSON.parse(lastError);
        // Quota resets every 24 hours (mostly), but let's be conservative and check if was within last 12h
        if (Date.now() - timestamp < 12 * 60 * 60 * 1000) {
          return true;
        }
      } catch (e) {
        localStorage.removeItem('firestore_quota_error');
      }
    }
    return false;
  });

  const handleRetrySync = () => {
    setIsQuotaExceeded(false);
    localStorage.removeItem('firestore_quota_error');
    setLogLevel('error');
    console.log("Sync manually retried by user.");
    showToast("Attempting to reconnect and sync with cloud...", "info");
  };

  // Circuit breaker effect: Silence Firestore logs if quota is exceeded
  useEffect(() => {
    if (isQuotaExceeded) {
      setLogLevel('silent');
    } else {
      setLogLevel('error');
    }
  }, [isQuotaExceeded]);

  // Custom UI state
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false
  });
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'info' | 'warning';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const closeToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' | 'warning' = 'info', confirmText?: string) => {
    setConfirm({ isOpen: true, title, message, onConfirm, type, confirmText });
  };

  const closeConfirm = () => {
    setConfirm(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (!auth || !db) {
      setIsAuthReady(true);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Fetch user template
        try {
          if (!isQuotaExceeded) {
            console.log("Fetching user template...");
            const templateDoc = await getDoc(doc(db, 'userTemplates', currentUser.uid));
            if (templateDoc.exists()) {
              console.log("User template found and applied.");
              setUserTemplate(templateDoc.data().divisions);
            } else {
              console.log("No custom user template found. Using defaults.");
            }
          }
        } catch (err) {
          console.error("Error fetching user template:", err);
        }

        // Save user profile
        try {
          if (!isQuotaExceeded) {
            // We use a shorter timeout here because this is background work
            await raceWithTimeout(setDoc(doc(db, 'users', currentUser.uid), {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              updatedAt: new Date().toISOString()
            }, { merge: true }), 3000);
          }
        } catch (err: any) {
          const msg = (err.message || "").toLowerCase();
          const code = err.code || "";
          if (msg.includes("quota") || msg.includes("resource-exhausted") || code === "resource-exhausted" || msg.includes("timeout")) {
            setIsQuotaExceeded(true);
            localStorage.setItem('firestore_quota_error', JSON.stringify({ timestamp: Date.now() }));
          }
          console.error("Error saving user profile:", err);
        }
      } else {
        setUserProjects([]);
        setCurrentProjectId(null);
        setProjectInfo({
          jobName: 'Project Name',
          address: '123 Main St',
          rooms: 1,
          squareFeet: 1,
          margin: 10,
          add: 3,
        });
        setDivisions(initialData);
        setCollaborators([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isAuthReady || !db) return;

    // We use two separate listeners to be more robust against complex security rule evaluations
    // and composite index requirements.
    
    // 1. Owned projects
    const qOwned = query(collection(db, 'estimates'), where('userId', '==', user.uid));
    
    // 2. Shared projects (if email is available)
    const rawEmail = user?.email || null;
    const normalizedEmail = rawEmail ? rawEmail.toLowerCase().trim() : null;
    
    if (normalizedEmail) {
      console.log('Setting up shared projects listener for:', normalizedEmail);
    }
    
    const qShared = normalizedEmail ? query(
      collection(db, 'estimates'), 
      where('collaborators', 'array-contains', normalizedEmail)
    ) : null;

    let ownedProjects: any[] = [];
    let sharedProjects: any[] = [];

    const updateProjects = () => {
      // Combine and unique by ID
      const combined = [...ownedProjects];
      sharedProjects.forEach(sp => {
        if (!combined.find(p => p.id === sp.id)) {
          combined.push(sp);
        }
      });
      
      setUserProjects(combined);
      
      // Sync collaborators if looking at current project
      if (currentProjectId) {
        const current = combined.find(p => p.id === currentProjectId);
        if (current) {
          setCollaborators(current.collaborators || []);
        }
      }
    };

    const unsubOwned = onSnapshot(qOwned, (snapshot) => {
      // Self-healing: If we successfully got data from server, the quota issue is definitely resolved
      if (!snapshot.metadata.fromCache && isQuotaExceeded) {
        console.log("Cloud connection restored! Clearing local mode.");
        setIsQuotaExceeded(false);
        localStorage.removeItem('firestore_quota_error');
      }

      ownedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      updateProjects();
    }, (error: any) => {
      const msg = (error.message || "").toLowerCase();
      const code = error.code || "";
      if (msg.includes("quota") || msg.includes("resource-exhausted") || code === "resource-exhausted") {
        setIsQuotaExceeded(true);
        localStorage.setItem('firestore_quota_error', JSON.stringify({ timestamp: Date.now() }));
      }
      console.error("Error fetching owned projects listener:", error);
    });

    let unsubShared = () => {};
    if (qShared && normalizedEmail) {
      unsubShared = onSnapshot(qShared, (snapshot) => {
        // Self-healing
        if (!snapshot.metadata.fromCache && isQuotaExceeded) {
          setIsQuotaExceeded(false);
          localStorage.removeItem('firestore_quota_error');
        }

        console.log(`Shared projects update: found ${snapshot.docs.length} docs`);
        sharedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateProjects();
      }, (error: any) => {
        const msg = (error.message || "").toLowerCase();
        const code = error.code || "";
        if (msg.includes("quota") || msg.includes("resource-exhausted") || code === "resource-exhausted") {
          setIsQuotaExceeded(true);
          localStorage.setItem('firestore_quota_error', JSON.stringify({ timestamp: Date.now() }));
        }
        console.error("Shared projects query error:", error);
        
        // Help user identify if it's an indexing issue
        if (msg.includes("index")) {
           showToast("Index required for shared projects. Check browser console for the URL.", "warning");
        }
      });
    }

    return () => {
      unsubOwned();
      unsubShared();
    };
  }, [user, isAuthReady, currentProjectId]);

  const handleLogin = async () => {
    if (!auth) {
      showToast("Cloud features are disabled. Please configure Firebase to log in.", "error");
      return;
    }
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      await signInWithPopup(auth, provider);
      showToast("Logged in successfully!", "success");
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log("Login cancelled by user or another request.");
      } else {
        console.error("Login failed:", error);
        showToast("Login failed. Please try again.", "error");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (!auth) {
      showToast("Firebase is not configured.", "error");
      return;
    }
    try {
      await signOut(auth);
      showToast("Logged out successfully!", "info");
    } catch (error) {
      console.error("Logout failed:", error);
      showToast("Logout failed.", "error");
    }
  };

  const handleProjectInfoChange = useCallback((field: keyof ProjectInfo, value: string | number) => {
    setProjectInfo(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleItemChange = useCallback((divisionId: string, itemId: string, field: keyof LineItem, value: string | number | boolean) => {
    setDivisions(prevDivisions =>
      prevDivisions.map(div => {
        if (div.id === divisionId) {
          return {
            ...div,
            items: div.items.map(item => {
              if (item.id === itemId) {
                return { ...item, [field]: value };
              }
              return item;
            }),
          };
        }
        return div;
      })
    );
  }, []);

  const handleAddItem = useCallback((divisionId: string) => {
    setDivisions(prevDivisions =>
      prevDivisions.map(div => {
        if (div.id === divisionId) {
          const newItem: LineItem = {
            id: generateId(),
            costCode: '',
            service: '',
            description: '',
            material: 0,
            labor: 0,
            equipment: 0,
            subContract: 0,
          };
          return {
            ...div,
            items: [...div.items, newItem],
          };
        }
        return div;
      })
    );
  }, []);

  const handleRemoveItem = useCallback((divisionId: string, itemId: string) => {
    setDivisions(prevDivisions =>
      prevDivisions.map(div => {
        if (div.id === divisionId) {
          return {
            ...div,
            items: div.items.filter(item => item.id !== itemId),
          };
        }
        return div;
      })
    );
  }, []);

  const handleSaveProject = useCallback(async (isSilent: boolean = false) => {
    if (isQuotaExceeded) return;
    
    if (!user) {
      if (!isSilent) {
        showToast("Please log in to save projects.", "warning");
        handleLogin();
      }
      return;
    }

    if (!db) {
      if (!isSilent) showToast("Cloud storage is not available. Your changes are local only.", "warning");
      return;
    }
    
    setIsSaving(true);
    const now = new Date().toISOString();
    const projectId = currentProjectId || generateId();
    
    let ownerId = user.uid;
    let projectCollaborators = collaborators;
    let existingCreatedAt = now;

    // Find if project already exists to preserve owner
    const existingProject = userProjects.find(p => p.id === projectId);
    
    if (existingProject) {
      ownerId = existingProject.userId;
      projectCollaborators = existingProject.collaborators || collaborators;
      existingCreatedAt = existingProject.createdAt;
    } else if (currentProjectId) {
      // Robustness: If we have an ID but it's not in our list (maybe list failed),
      // try to fetch it directly to get the correct owner before setting.
      try {
        const docRef = doc(db, 'estimates', currentProjectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          ownerId = data.userId;
          projectCollaborators = data.collaborators || collaborators;
          existingCreatedAt = data.createdAt;
        }
      } catch (e) {
        console.warn("Could not fetch existing project directly:", e);
      }
    }
    
    const estimateData = {
      id: projectId,
      userId: ownerId,
      collaborators: projectCollaborators,
      projectInfo,
      divisions,
      updatedAt: now,
      createdAt: existingCreatedAt,
    };

    try {
      const estimateRef = doc(db, 'estimates', projectId);
      // Use raceWithTimeout to catch hanging retries
      await raceWithTimeout(setDoc(estimateRef, estimateData), 5000);
      setCurrentProjectId(projectId);
      lastSavedRef.current = JSON.stringify({ projectInfo, divisions });
      if (!isSilent) showToast("Project saved to cloud!", "success");
    } catch (error: any) {
      console.error('Save failed:', error);
      
      const errorMessage = error.message || String(error);
      const errorCode = error.code || "";
      
      if (errorMessage.includes('quota') || errorMessage.includes('resource-exhausted') || errorCode === 'resource-exhausted' || errorMessage.includes('FIRESTORE_TIMEOUT')) {
        showToast("Cloud storage quota exceeded. Changes will save locally but won't sync until tomorrow.", "warning");
        setIsQuotaExceeded(true);
        localStorage.setItem('firestore_quota_error', JSON.stringify({ timestamp: Date.now() }));
        // Update the ref anyway to stop the auto-save retry loop for this state
        lastSavedRef.current = JSON.stringify({ projectInfo, divisions });
      } else if (!isSilent) {
        if (errorMessage.includes('permission-denied') || errorMessage.includes('insufficient permissions')) {
          showToast("Permission denied. Ensure your Firestore rules are deployed and you are logged in correctly.", "error");
        } else if (errorMessage.includes('not-found') || errorMessage.includes('database')) {
          showToast("Database not found. Please ensure you have created the 'Firestore Database' in your Firebase console.", "error");
        } else {
          showToast(`Save failed: ${errorMessage.substring(0, 100)}`, "error");
        }
      }
      
      try {
        handleFirestoreError(error, OperationType.WRITE, `estimates/${projectId}`);
      } catch (e) {
        // Just to log it to console as well
      }
    } finally {
      setIsSaving(false);
    }
  }, [projectInfo, divisions, currentProjectId, user, userProjects, collaborators]);

  // Auto-save disabled as per user request to save on Firebase writes
  /*
  useEffect(() => {
    if (!user || !db || isClientView || isQuotaExceeded) return;

    // Check if there are ACTUAL changes since last save
    const currentDataString = JSON.stringify({ projectInfo, divisions });
    if (currentDataString === lastSavedRef.current) return;

    // Don't auto-save if everything is empty/placeholder
    const hasData = divisions.some(div => 
      div.items.some(item => (item.material || item.labor || item.equipment || item.subContract))
    );
    if (!hasData) return;

    const timeoutId = setTimeout(() => {
      handleSaveProject(true);
    }, 10000); // Increased to 10 second debounce to be more conservative with quota

    return () => clearTimeout(timeoutId);
  }, [divisions, projectInfo, user, isClientView, handleSaveProject]);
  */

  const handleSelectProject = async (id: string) => {
    const project = userProjects.find(p => p.id === id);
    if (project) {
      setProjectInfo(project.projectInfo);
      setDivisions(project.divisions);
      setCollaborators(project.collaborators || []);
      setCurrentProjectId(id);
      lastSavedRef.current = JSON.stringify({ 
        projectInfo: project.projectInfo, 
        divisions: project.divisions 
      });
      setIsProjectListOpen(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (isQuotaExceeded) {
      showToast("Cloud storage is paused. Cannot delete cloud projects right now.", "warning");
      return;
    }
    showConfirm(
      "Delete Project?",
      "Are you sure you want to delete this project? This action cannot be undone.",
      async () => {
        if (!db) {
          showToast("Cloud storage is not available.", "error");
          return;
        }
        try {
          await raceWithTimeout(deleteDoc(doc(db, 'estimates', id)), 4000);
          if (currentProjectId === id) {
            setCurrentProjectId(null);
            setProjectInfo({
              jobName: '',
              address: '',
              rooms: 1,
              squareFeet: 1,
              margin: 10,
              add: 3,
              description: '',
            });
            setDivisions(JSON.parse(JSON.stringify(initialData)));
            setIsClientView(false);
          }
          closeConfirm();
          showToast("Project deleted from cloud.", "info");
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `estimates/${id}`);
        }
      },
      'danger',
      'Delete'
    );
  };

  const handleNewProject = useCallback(() => {
    showConfirm(
      "Start New Project?",
      "This will clear all current prices and data. Would you like to save the current project first?",
      async () => {
        setProjectInfo({
          jobName: '',
          address: '',
          rooms: 1,
          squareFeet: 1,
          margin: 10,
          add: 3,
          description: '',
        });
        
        // Use user template if available, otherwise original initialData
        const templateToUse = userTemplate ? userTemplate : initialData;
        setDivisions(JSON.parse(JSON.stringify(templateToUse)));
        
        setCurrentProjectId(null);
        lastSavedRef.current = '';
        setIsClientView(false);
        closeConfirm();
        showToast("New project started.", "success");
      },
      'warning',
      'Start Fresh'
    );
  }, [userTemplate, showConfirm, closeConfirm, showToast]);

  const handleSaveAsTemplate = useCallback(async () => {
    if (isQuotaExceeded) {
      showToast("Cloud storage is paused due to quota. Cannot save template.", "warning");
      return;
    }
    if (!user || !db) {
      showToast("Please login to save a custom template.", "warning");
      return;
    }

    showConfirm(
      "Save as Master Template?",
      "This will save the current budget structure (all items, cost codes, and services) as your default starting point for all NEW projects. Current values (Material, Labor, etc.) will be reset to 0 in the template.",
      async () => {
        closeConfirm();
        showToast("Saving template to cloud...", "info");
        try {
          // Deep copy and reset amounts for the template
          const templateDivisions = JSON.parse(JSON.stringify(divisions)).map((div: any) => ({
            ...div,
            items: (div.items || []).map((item: any) => ({
              ...item,
              material: 0,
              labor: 0,
              equipment: 0,
              subContract: 0
            }))
          }));

          console.log("Attempting to save template for user:", user.uid);
          
          await raceWithTimeout(setDoc(doc(db, 'userTemplates', user.uid), {
            userId: user.uid,
            divisions: templateDivisions,
            updatedAt: new Date().toISOString()
          }), 10000); // Increased timeout to 10s for large templates

          setUserTemplate(templateDivisions);
          showToast("Custom template saved! Your next 'New Project' will use this layout.", "success");
        } catch (error: any) {
          console.error("Failed to save template:", error);
          const msg = error.message || String(error);
          showToast(`Failed to save template: ${msg.includes('timeout') ? 'Connection Timeout' : 'Cloud Error'}`, "error");
        }
      },
      'info',
      'Save Template'
    );
  }, [divisions, user, isQuotaExceeded]);

  const handleGeminiHelp = async () => {
    setIsGenerating(true);
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I am building a construction estimate for a project named "${projectInfo.jobName}" at "${projectInfo.address}". 
        It has ${projectInfo.rooms} rooms and ${projectInfo.squareFeet} sq ft. 
        Can you provide a brief, professional description for this project that I can use in a proposal?`,
      });
      
      const text = response.text;
      if (text) {
        setProjectInfo(prev => ({ ...prev, description: text }));
        showToast("Project description generated by Gemini!", "success");
      }
    } catch (error) {
      console.error("Gemini failed:", error);
      showToast("Failed to generate description. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadProject = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('File content is not readable.');
        }
        const data: ProjectData = JSON.parse(text);

        if (data.projectInfo && Array.isArray(data.divisions)) {
          setProjectInfo(data.projectInfo);
          setDivisions(data.divisions);
          setCurrentProjectId(null); // New project from file
          showToast('Project loaded from file successfully!', 'success');
        } else {
          throw new Error('Invalid project file format.');
        }
      } catch (error: any) {
        console.error("Failed to load project:", error);
        showToast(`Failed to load project. Error: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, []);

  const subTotalBase = useMemo(() => {
    return divisions.reduce((total, div) => {
      return total + div.items.reduce((divTotal, item) => {
        return divTotal + (Number(item.material) + Number(item.labor) + Number(item.equipment) + Number(item.subContract));
      }, 0);
    }, 0);
  }, [divisions]);

  const subTotalWithOverhead = useMemo(() => {
    return subTotalBase * (1 + projectInfo.add / 100);
  }, [subTotalBase, projectInfo.add]);
  
  const marginAmount = useMemo(() => subTotalWithOverhead * (projectInfo.margin / 100), [subTotalWithOverhead, projectInfo.margin]);
  const grandTotal = useMemo(() => subTotalWithOverhead + marginAmount, [subTotalWithOverhead, marginAmount]);

  const handleGeneratePdf = (showOverhead: boolean = true, orientation: 'p' | 'l' = 'p', showDetailedColumns: boolean = false) => {
    console.log("handleGeneratePdf clicked", { showOverhead, orientation, showDetailedColumns });
    const sub = showOverhead ? subTotalWithOverhead : subTotalBase;
    const margin = sub * (projectInfo.margin / 100);
    const total = sub + margin;
    generatePdf(projectInfo, divisions, sub, margin, total, isClientView, showOverhead, orientation, showDetailedColumns);
  };

  const handleReviewMissingPrices = () => {
    console.log("handleReviewMissingPrices clicked");
    generateMissingPricesPdf(projectInfo, divisions);
  };

  const handleShareAdd = async (email: string) => {
    if (isQuotaExceeded) {
       showToast("Cloud storage is paused. Cannot share right now.", "warning");
       return;
    }
    if (!currentProjectId || !user) return;
    const normalizedEmail = email.toLowerCase().trim();
    
    if (collaborators.map(c => c.toLowerCase().trim()).includes(normalizedEmail)) {
      showToast(`${email} is already a collaborator.`, "info");
      return;
    }

    const newCollaborators = [...collaborators, normalizedEmail];
    try {
      await raceWithTimeout(updateDoc(doc(db, 'estimates', currentProjectId), {
        collaborators: newCollaborators
      }), 4000);
      setCollaborators(newCollaborators);
      showToast(`${normalizedEmail} added as a collaborator.`, "success");
    } catch (error: any) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("quota") || msg.includes("resource-exhausted") || msg.includes("timeout")) {
        setIsQuotaExceeded(true);
        localStorage.setItem('firestore_quota_error', JSON.stringify({ timestamp: Date.now() }));
        showToast("Cloud storage quota exceeded.", "warning");
      }
      handleFirestoreError(error, OperationType.WRITE, `estimates/${currentProjectId}`);
    }
  };

  const handleShareRemove = async (email: string) => {
    if (isQuotaExceeded) {
       showToast("Cloud storage is paused.", "warning");
       return;
    }
    if (!currentProjectId || !user) return;
    const normalizedEmail = email.toLowerCase().trim();
    const newCollaborators = collaborators.filter(e => e.toLowerCase().trim() !== normalizedEmail);
    try {
      await raceWithTimeout(updateDoc(doc(db, 'estimates', currentProjectId), {
        collaborators: newCollaborators
      }), 4000);
      setCollaborators(newCollaborators);
      showToast(`${normalizedEmail} removed.`, "info");
    } catch (error: any) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("quota") || msg.includes("resource-exhausted") || msg.includes("timeout")) {
        setIsQuotaExceeded(true);
        localStorage.setItem('firestore_quota_error', JSON.stringify({ timestamp: Date.now() }));
        showToast("Cloud storage quota exceeded.", "warning");
      }
      handleFirestoreError(error, OperationType.WRITE, `estimates/${currentProjectId}`);
    }
  };

  const isOwner = useMemo(() => {
    const current = userProjects.find(p => p.id === currentProjectId);
    return !current || current.userId === user?.uid;
  }, [userProjects, currentProjectId, user]);

  const handleExportExcel = useCallback(async () => {
    const projectData: ProjectData = {
      projectInfo,
      divisions,
    };
    try {
      const buffer = await generateExcel(projectData, subTotalWithOverhead, marginAmount, grandTotal);
      const dataBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = projectInfo.jobName.replace(/\s+/g, '_') || 'project';
      link.download = `${fileName}_estimate.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel export failed:", error);
      showToast("Failed to generate Excel file.", "error");
    }
  }, [projectInfo, divisions, subTotalWithOverhead, marginAmount, grandTotal]);

  const handleDownloadBackup = useCallback(() => {
    if (userProjects.length === 0) {
      showToast("No projects to download.", "info");
      return;
    }

    try {
      const backupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        userEmail: user?.email,
        projects: userProjects
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `estimator_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast("Backup downloaded successfully!", "success");
    } catch (e) {
      console.error("Backup failed:", e);
      showToast("Failed to create backup file.", "error");
    }
  }, [userProjects, user, showToast]);

  const handleDownloadIndividual = useCallback((projectId: string) => {
    const project = userProjects.find(p => p.id === projectId);
    if (!project) {
      showToast("Project not found.", "error");
      return;
    }

    try {
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = (project.projectInfo.jobName || 'project').replace(/\s+/g, '_').toLowerCase();
      link.download = `${fileName}_backup.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast(`${project.projectInfo.jobName} exported!`, "success");
    } catch (e) {
      console.error("Single project export failed:", e);
      showToast("Failed to export project.", "error");
    }
  }, [userProjects, showToast]);

  const handleAIQuoteClick = (divisionId: string, itemId: string, name: string) => {
    setAiTarget({ divisionId, itemId, name });
    setIsAIModalOpen(true);
  };

  const handleAIQuoteProcess = async (textOrFile: string | { data: string; mimeType: string }) => {
    if (!aiTarget) return;
    setIsAIProcessing(true);
    try {
      const ai = getAi();
      
      const contents = typeof textOrFile === 'string' 
        ? `Extract the total base quoted amount and a short, one-sentence scope of work from this quote. 
           IMPORTANT: Only mention "adders" or "alternates" if they are explicitly found in the quote text. If none are found, do NOT mention them at all.
           
           Quote text: "${textOrFile}"`
        : {
            parts: [
              { text: `Extract the total base quoted amount and a short, one-sentence scope of work from this quote. 
                       IMPORTANT: Only mention "adders" or "alternates" if they are explicitly found in the quote text. If none are found, do NOT mention them at all.` },
              { inlineData: textOrFile }
            ]
          };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER },
              description: { type: Type.STRING }
            },
            required: ["amount", "description"]
          }
        }
      });

      const result = JSON.parse(response.text);
      
      // Update the Specific field
      handleItemChange(aiTarget.divisionId, aiTarget.itemId, 'subContract', result.amount);
      handleItemChange(aiTarget.divisionId, aiTarget.itemId, 'description', result.description);
      
      showToast("Quote data extracted and applied!", "success");
      setIsAIModalOpen(false);
      setAiTarget(null);
    } catch (error) {
      console.error("AI Quote extraction failed:", error);
      showToast("AI failed to parse the quote. Please try regular typing.", "error");
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleAiDivisionPrompt = async (divisionId: string, prompt: string) => {
    setIsGenerating(true);
    try {
      const division = divisions.find(d => d.id === divisionId);
      if (!division) throw new Error("Division not found");

      showToast(`AI is thinking about your ${division.title} items...`, "info");
      
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a list of construction cost line items for the following project division: "${division.title}".
        User request: "${prompt}"
        
        Rules:
        1. Return standard cost codes, clear services names, and short descriptions.
        2. Set initial material/labor/equipment/subContract costs to 0.
        3. Only return items relevant to this division.
        4. Max 8 items.
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                costCode: { type: Type.STRING },
                service: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["costCode", "service", "description"]
            }
          }
        }
      });

      const items = JSON.parse(response.text);
      
      const newItems: LineItem[] = items.map((item: any) => ({
        id: generateId(),
        costCode: item.costCode,
        service: item.service,
        description: item.description,
        isCritical: false,
        material: 0,
        labor: 0,
        equipment: 0,
        subContract: 0
      }));

      setDivisions(prev => prev.map(d => 
        d.id === divisionId 
          ? { ...d, items: [...d.items, ...newItems] }
          : d
      ));

      showToast(`Added ${newItems.length} items to ${division.title}!`, "success");
    } catch (error) {
      console.error("AI Item generation failed:", error);
      showToast("AI failed to generate items. Please try again.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Expose to window for the Division.tsx component
  useEffect(() => {
    (window as any).triggerAIDivisionItems = handleAiDivisionPrompt;
    return () => { delete (window as any).triggerAIDivisionItems; };
  }, [divisions, handleAiDivisionPrompt]);

  const handleImportProject = useCallback(async (file: File) => {
    if (isQuotaExceeded) {
      showToast("Cloud storage is paused. Please try a local load instead.", "warning");
      return;
    }
    if (!user) {
      showToast("Please login to import projects.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Handle both individual projects and bulk backups
        const projectsToImport = data.projects ? data.projects : [data];

        for (const p of projectsToImport) {
          // Basic validation
          if (!p.projectInfo || !p.divisions) {
            throw new Error("Invalid project format in file.");
          }

          // Create a new ID to avoid collisions, or use existing if it's a valid restore
          const newId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const importedProject = {
            ...p,
            id: newId,
            userId: user.uid,
            updatedAt: Date.now(),
            collaborators: [] // Reset collaborators for imported projects
          };

          await raceWithTimeout(setDoc(doc(db, 'estimates', newId), importedProject), 4000);
        }

        showToast(`Successfully imported ${projectsToImport.length} project(s)!`, "success");
      } catch (err: any) {
        console.error("Import failed:", err);
        showToast(err.message || "Failed to parse JSON file.", "error");
      }
    };
    reader.readAsText(file);
  }, [user, showToast]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 text-gray-800 font-sans antialiased">
        {isQuotaExceeded && (
          <div className="bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-4 shadow-inner">
             <div className="flex items-center gap-2">
               <Save size={16} className="opacity-80" />
               Cloud storage quota reached. Working in <strong>Local Mode</strong>.
             </div>
             <button 
               onClick={handleRetrySync}
               id="retry-sync-btn"
               className="bg-white text-amber-700 hover:bg-amber-50 px-3 py-1 rounded text-xs font-bold transition-colors shadow-sm"
             >
               Retry Sync
             </button>
          </div>
        )}
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 pb-48">
          <Header 
            projectInfo={projectInfo} 
            onChange={handleProjectInfoChange}
            onSave={() => handleSaveProject(false)}
            onNewProject={handleNewProject}
            onSaveTemplate={handleSaveAsTemplate}
            onLoad={handleLoadProject}
            onExportExcel={handleExportExcel}
            onOpenProjectList={() => setIsProjectListOpen(true)}
            onShare={() => setIsShareModalOpen(true)}
            canShare={!!(user && currentProjectId)}
            onGeminiHelp={handleGeminiHelp}
            isSaving={isSaving}
            isGenerating={isGenerating}
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
            isLoggingIn={isLoggingIn}
          />
          <CostTable 
            divisions={divisions} 
            on_change={handleItemChange} 
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onAIQuoteClick={handleAIQuoteClick}
            isClientView={isClientView} 
            overheadPercent={projectInfo.add}
          />
        </main>
        <Summary 
          projectInfo={projectInfo}
          divisions={divisions}
          subTotal={subTotalWithOverhead}
          marginAmount={marginAmount}
          grandTotal={grandTotal}
          isClientView={isClientView}
          onClientViewToggle={() => setIsClientView(v => !v)}
          onGeneratePdf={handleGeneratePdf}
          onReviewMissingPrices={handleReviewMissingPrices}
          onSave={() => handleSaveProject(false)}
          onSaveTemplate={handleSaveAsTemplate}
          isSaving={isSaving}
        />

        <ShareModal 
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          collaborators={collaborators}
          onAdd={handleShareAdd}
          onRemove={handleShareRemove}
          isOwner={isOwner}
        />

        <ProjectList 
          isOpen={isProjectListOpen}
          onClose={() => setIsProjectListOpen(false)}
          projects={userProjects}
          onSelect={handleSelectProject}
          onDelete={handleDeleteProject}
          onDownloadBackup={handleDownloadBackup}
          onDownloadIndividual={handleDownloadIndividual}
          onImport={handleImportProject}
        />

        <ConfirmModal
          isOpen={confirm.isOpen}
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          onConfirm={confirm.onConfirm}
          onCancel={closeConfirm}
          type={confirm.type}
        />

        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />

        <AIQuoteModal 
          isOpen={isAIModalOpen}
          onClose={() => {
            setIsAIModalOpen(false);
            setAiTarget(null);
          }}
          onProcess={handleAIQuoteProcess}
          isProcessing={isAIProcessing}
          targetItemName={aiTarget?.name || 'this item'}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;
