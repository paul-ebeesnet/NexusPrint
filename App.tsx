import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Printer, MousePointer2, Type, Save, ArrowLeft, LogOut, Calendar, DollarSign, Coins, Hash, Image as ImageIcon, Undo, Redo } from 'lucide-react';
import CanvasArea from './components/CanvasArea';
import Sidebar from './components/Sidebar';
import PrintView from './components/PrintView';
import AuthModal from './components/AuthModal';
import PrintModal from './components/PrintModal';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';
import { CanvasObject, CanvasSettings, LogicType, Template, UserProfile } from './types';
import { generateId, numberToEnglish, numberToChinese, formatCurrency, formatDate, convertToPx, MM_TO_PX } from './services/utils';
import { saveTemplate, getTemplateById, getProfile, logout, addRecentName, GUEST_USER_ID } from './services/storageService';
import { supabase } from './services/supabase';

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [location, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref to track user state for event listeners without re-subscribing
  const userRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Auth Guard
  useEffect(() => {
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
           // Use ref to check current user state to avoid stale closure issues
           if (userRef.current?.id !== GUEST_USER_ID) {
              setUser(null);
              // Use simplified navigation for hash routing compatibility
              if (window.location.hash.replace('#', '') !== '/') setLocation('/');
           }
      } else if (event === 'SIGNED_IN' && session?.user) {
           // Optional: Auto-refresh profile on sign-in event from other tabs
           // but we usually handle this in handleSignIn for this tab
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Effect to redirect logged-in users away from landing page
  useEffect(() => {
      if (user && location === '/') {
          setLocation('/dashboard');
      }
  }, [user, location]);

  const checkUser = async () => {
    try {
      const u = await getProfile();
      if (u) {
          setUser(u);
      }
    } catch (e) {
      console.error("Profile check failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email: string, password?: string) => {
    if (!password) return;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (data.user) {
            const optimisticUser: UserProfile = {
                id: data.user.id,
                email: data.user.email || '',
                full_name: data.user.user_metadata?.full_name || email.split('@')[0],
                role: 'user'
            };

            setUser(optimisticUser);
            setShowAuthModal(false);
            setLocation('/dashboard');

            getProfile(data.user).then(realProfile => {
                if (realProfile && (realProfile.role !== optimisticUser.role || realProfile.full_name !== optimisticUser.full_name)) {
                    setUser(realProfile);
                }
            }).catch(err => console.warn("Background profile fetch warning:", err));
        }
    } catch (e: any) {
        console.error("Login Error:", e);
        // Enhanced error handling for common network/environment issues
        if (e.message?.includes('fetch') || e.message?.includes('Network') || e.message?.includes('Load failed') || e.name === 'TypeError') {
            throw new Error("Connection Error: Unable to reach the server. Please use 'Continue as Guest' if the problem persists.");
        }
        throw e;
    }
  };

  const handleGuestLogin = () => {
      const guest: UserProfile = {
          id: GUEST_USER_ID,
          email: 'guest@local',
          full_name: 'Guest User',
          role: 'user'
      };
      setUser(guest);
      setShowAuthModal(false);
      setLocation('/dashboard');
  };

  const handleSignUp = async (email: string, password?: string) => {
    if (!password) return;
    try {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: { data: { full_name: email.split('@')[0] } } 
        });
        if (error) throw error;

        // Auto-login if session is returned (Email confirmation disabled on server)
        if (data.session && data.user) {
             const optimisticUser: UserProfile = {
                id: data.user.id,
                email: data.user.email || '',
                full_name: data.user.user_metadata?.full_name || email.split('@')[0],
                role: 'user'
            };
            setUser(optimisticUser);
            setShowAuthModal(false);
            setLocation('/dashboard');
        }
    } catch (e: any) {
         if (e.message === 'Failed to fetch' || e.name === 'TypeError' || e.message?.includes('Load failed')) {
            throw new Error("Unable to connect to server. Please use Guest Mode.");
        }
        throw e;
    }
  };

  const handleLogout = async () => {
    if (user?.id === GUEST_USER_ID) {
        setUser(null);
    } else {
        await logout();
        setUser(null);
    }
    setLocation('/');
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading application...</div>;

  return (
    <>
      <Switch>
        {/* Landing / Login */}
        <Route path="/">
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                    <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                        <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                            <Printer size={28} />
                        </div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Print-Anything SaaS</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Professional Canvas Editor & Template Management
                        </p>
                    </div>
                    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                            <button 
                                onClick={() => setShowAuthModal(true)}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Log In / Sign Up
                            </button>
                            <button 
                                onClick={handleGuestLogin}
                                className="mt-4 w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Continue as Guest
                            </button>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        </Route>

        {/* Dashboard */}
        <Route path="/dashboard">
            {user ? (
                <div className="min-h-screen bg-gray-100 flex flex-col">
                    <Navbar user={user} onLogout={handleLogout} />
                    <div className="flex-1">
                        <Dashboard user={user} />
                    </div>
                    <Footer />
                </div>
            ) : (
                <RedirectToHome />
            )}
        </Route>

        {/* Admin Panel */}
        <Route path="/admin">
            {user && user.role === 'admin' ? (
                <div className="min-h-screen bg-gray-100 flex flex-col">
                    <Navbar user={user} onLogout={handleLogout} />
                    <div className="flex-1">
                        <AdminPanel />
                    </div>
                    <Footer />
                </div>
            ) : (
                <RedirectToHome />
            )}
        </Route>

        {/* Editor */}
        <Route path="/editor/:id">
            {(params: any) => (
                user && params?.id ? <EditorPage id={params.id} user={user} fileInputRef={fileInputRef} /> : <RedirectToHome />
            )}
        </Route>

      </Switch>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onLogin={handleSignIn}
        onSignUp={handleSignUp}
        onGuestLogin={handleGuestLogin}
      />
    </>
  );
}

const RedirectToHome = () => {
    const [location, setLocation] = useLocation();
    useEffect(() => {
        if (location !== '/') setLocation('/');
    }, [location]);
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Redirecting...</div>;
}

const Navbar = ({ user, onLogout }: { user: UserProfile, onLogout: () => void }) => {
    const [location, setLocation] = useLocation();
    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center gap-8">
                        <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => setLocation('/dashboard')}>
                            <div className="bg-indigo-600 p-1.5 rounded text-white">
                                <Printer size={18} />
                            </div>
                            <span className="font-bold text-gray-900">Print-Anything</span>
                        </div>
                        {user.role === 'admin' && (
                            <button onClick={() => setLocation('/admin')} className={`text-sm font-medium ${location === '/admin' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>
                                Admin Panel
                            </button>
                        )}
                        <button onClick={() => setLocation('/dashboard')} className={`text-sm font-medium ${location === '/dashboard' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}>
                            Dashboard
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                             <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                             <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                        <button onClick={onLogout} className="text-gray-400 hover:text-gray-600 p-2">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

// Editor Page
const EditorPage = ({ id: rawId, user, fileInputRef }: { id: string, user: UserProfile, fileInputRef: React.RefObject<HTMLInputElement> }) => {
  // Sanitize ID because hash routing might include query params in the ID (e.g. "123?action=print")
  const id = rawId.split('?')[0];

  const [, setLocation] = useLocation();
  const [settings, setSettings] = useState<CanvasSettings>({
    width: Math.round(210 * MM_TO_PX),
    height: Math.round(297 * MM_TO_PX),
    unit: 'mm',
    widthUnit: 210,
    heightUnit: 297,
    dpi: 96
  });
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [templateName, setTemplateName] = useState('Untitled');
  const [isPublic, setIsPublic] = useState(false);
  
  // History State for Undo/Redo
  const [history, setHistory] = useState<CanvasObject[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Print Mode State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printValues, setPrintValues] = useState<Record<string, string>>({});
  const [printModalTab, setPrintModalTab] = useState<'form' | 'history'>('form');

  useEffect(() => {
    // Check URL params for auto-print actions
    const hash = window.location.hash; // #/editor/id?action=print
    if (hash.includes('action=print')) {
        setShowPrintModal(true);
        setPrintModalTab('form');
    } else if (hash.includes('action=history')) {
        setShowPrintModal(true);
        setPrintModalTab('history');
    }
  }, []);

  useEffect(() => {
    if (id && id !== 'new') {
        getTemplateById(id, user).then(t => {
            if(t) {
                setSettings(t.settings);
                setObjects(t.objects);
                setTemplateName(t.name);
                setIsPublic(t.is_public);
                // Initialize history
                setHistory([t.objects]);
                setHistoryIndex(0);
            }
        });
    } else if (id === 'new') {
        // Initialize empty history
        setHistory([[]]);
        setHistoryIndex(0);
    }
  }, [id, user]);

  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      width: convertToPx(prev.widthUnit, prev.unit),
      height: convertToPx(prev.heightUnit, prev.unit)
    }));
  }, [settings.widthUnit, settings.heightUnit, settings.unit]);

  // Recalculate object text whenever objects change OR print values change
  // Note: We do NOT want this to trigger history save, as it's an auto-update.
  useEffect(() => {
    setObjects(currentObjs => {
      const updated = currentObjs.map(obj => {
        if (obj.type === 'image') return obj;

        // Determine the source value: 
        // 1. If we are in print mode (printValues has data) AND object has a variable key, use that.
        // 2. Otherwise use rawValue (Edit mode)
        const effectiveValue = (obj.variableKey && printValues[obj.variableKey] !== undefined && printValues[obj.variableKey] !== '')
            ? printValues[obj.variableKey]
            : obj.rawValue || '';

        let newText = obj.text;
        switch (obj.logicType) {
          case LogicType.DATE:
            newText = formatDate(new Date(), obj.dateFormat || 'YYYY-MM-DD'); break;
          case LogicType.CURRENCY_ENG:
            newText = numberToEnglish(effectiveValue); break;
          case LogicType.CURRENCY_CHI:
            newText = numberToChinese(effectiveValue); break;
          case LogicType.CURRENCY_NUM:
            newText = formatCurrency(effectiveValue); break;
          case LogicType.VARIABLE:
            newText = obj.variableKey && printValues[obj.variableKey] ? effectiveValue : `{{${obj.variableKey || 'var'}}}`; 
            // If in print mode but no value, show placeholder, otherwise show value
            if (obj.variableKey && printValues[obj.variableKey] !== undefined) newText = effectiveValue;
            break;
          case LogicType.CUSTOMER_NAME:
            newText = effectiveValue; break;
          default:
            newText = effectiveValue;
        }
        return newText !== obj.text ? { ...obj, text: newText } : obj;
      });
      
      // Only update if something changed to avoid cycles
      const hasChanges = JSON.stringify(updated) !== JSON.stringify(currentObjs);
      return hasChanges ? updated : currentObjs;
    });
  }, [objects.length, JSON.stringify(printValues), JSON.stringify(objects.map(o => o.rawValue + o.variableKey + o.logicType))]); 

  // --- Undo / Redo Logic ---
  
  const saveToHistory = useCallback((newObjects: CanvasObject[]) => {
      setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(newObjects);
          // Limit history size to 50
          if (newHistory.length > 50) newHistory.shift();
          return newHistory;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const updateObjects = (newObjs: CanvasObject[], recordHistory: boolean = true) => {
      setObjects(newObjs);
      if (recordHistory) {
          saveToHistory(newObjs);
      }
  };

  const handleUndo = () => {
      if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setObjects(history[newIndex]);
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          setHistoryIndex(newIndex);
          setObjects(history[newIndex]);
      }
  };

  const handleAddText = () => {
    const newObj: CanvasObject = {
      id: generateId(),
      type: 'text',
      x: 50, y: 50, width: 200,
      text: 'Text', rawValue: 'Text',
      fontSize: 16, fontFamily: 'Arial', align: 'left',
      logicType: LogicType.STATIC
    };
    const newList = [...objects, newObj];
    updateObjects(newList);
    setSelectedId(newObj.id);
  };

  const handleAddDate = () => {
    const newObj: CanvasObject = {
      id: generateId(),
      type: 'text',
      x: 50, y: 50, width: 200,
      text: '{{date}}', 
      rawValue: '{{date}}',
      fontSize: 16, fontFamily: 'Arial', align: 'left',
      logicType: LogicType.DATE,
      dateFormat: 'YYYY-MM-DD'
    };
    const newList = [...objects, newObj];
    updateObjects(newList);
    setSelectedId(newObj.id);
  };

  const handleAddCurrencyEng = () => {
    const newObj: CanvasObject = {
      id: generateId(),
      type: 'text',
      x: 50, y: 50, width: 300,
      text: '{{amount}}', 
      rawValue: '1234.56',
      fontSize: 16, fontFamily: 'Arial', align: 'left',
      logicType: LogicType.CURRENCY_ENG
    };
    const newList = [...objects, newObj];
    updateObjects(newList);
    setSelectedId(newObj.id);
  };

  const handleAddCurrencyChi = () => {
    const newObj: CanvasObject = {
      id: generateId(),
      type: 'text',
      x: 50, y: 50, width: 300,
      text: '{{amount_chi}}', 
      rawValue: '1234.56',
      fontSize: 16, fontFamily: 'Arial', align: 'left',
      logicType: LogicType.CURRENCY_CHI
    };
    const newList = [...objects, newObj];
    updateObjects(newList);
    setSelectedId(newObj.id);
  };

  const handleAddCurrencyNum = () => {
    const newObj: CanvasObject = {
      id: generateId(),
      type: 'text',
      x: 50, y: 50, width: 150,
      text: '{{amount_num}}',
      rawValue: '1234.56',
      fontSize: 16, fontFamily: 'Arial', align: 'left',
      logicType: LogicType.CURRENCY_NUM
    };
    const newList = [...objects, newObj];
    updateObjects(newList);
    setSelectedId(newObj.id);
  };

  const handleImageUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const src = event.target?.result as string;
          const img = new Image();
          img.src = src;
          img.onload = () => {
              // Scale down if huge
              let width = img.width;
              let height = img.height;
              const maxSize = 300;
              if (width > maxSize || height > maxSize) {
                  const ratio = Math.min(maxSize / width, maxSize / height);
                  width *= ratio;
                  height *= ratio;
              }

              const newObj: CanvasObject = {
                  id: generateId(),
                  type: 'image',
                  x: 50, y: 50,
                  width, height,
                  src,
                  text: '', rawValue: '',
                  opacity: 0.5 // Default opacity 50%
              };
              const newList = [...objects, newObj];
              updateObjects(newList);
              setSelectedId(newObj.id);
          };
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset
  };

  const handleDeleteObject = (objId: string) => {
      const newList = objects.filter(o => o.id !== objId);
      updateObjects(newList);
      if (selectedId === objId) setSelectedId(null);
  };

  const handleSave = async () => {
    if (!user) return;
    const template: Template = {
      id: id === 'new' ? generateId() : id,
      user_id: user.id,
      name: templateName,
      objects,
      settings,
      is_public: isPublic,
      updatedAt: new Date().toISOString()
    };
    
    const newId = await saveTemplate(template, user);
    if (id === 'new') {
        setLocation(`/editor/${newId}`);
    } else {
        alert('Saved successfully!');
    }
  };

  const selectedObject = objects.find(o => o.id === selectedId) || null;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => setLocation('/dashboard')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </button>
          <div>
            <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="font-bold text-gray-900 border-none focus:ring-0 p-0 text-lg"
            />
          </div>
          <div className="h-6 w-px bg-gray-300 mx-2"></div>
          <div className="flex bg-gray-100 rounded-lg p-1">
             <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="px-2 text-sm font-medium hover:bg-white rounded">-</button>
             <span className="px-2 text-xs flex items-center">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="px-2 text-sm font-medium hover:bg-white rounded">+</button>
          </div>
          <div className="h-6 w-px bg-gray-300 mx-2"></div>
          <div className="flex gap-1">
              <button 
                onClick={handleUndo} 
                disabled={historyIndex <= 0}
                className={`p-2 rounded-lg flex items-center justify-center transition-colors ${historyIndex <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Undo"
              >
                  <Undo size={18} />
              </button>
              <button 
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className={`p-2 rounded-lg flex items-center justify-center transition-colors ${historyIndex >= history.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Redo"
              >
                  <Redo size={18} />
              </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button onClick={handleAddText} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2 text-sm" title="Add Text">
             <Type size={18} /> <span className="hidden sm:inline">Text</span>
           </button>
           <button onClick={handleAddDate} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2 text-sm" title="Add Date">
             <Calendar size={18} /> <span className="hidden sm:inline">Date</span>
           </button>
           <button onClick={handleImageUploadClick} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2 text-sm" title="Add Image">
             <ImageIcon size={18} /> <span className="hidden sm:inline">Img</span>
           </button>
           
           {/* Dropdown for currencies could be better, but keeping simple buttons for now */}
           <div className="h-6 w-px bg-gray-300 mx-1"></div>
           
           <button onClick={handleAddCurrencyEng} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="English Currency">
             <DollarSign size={18} />
           </button>
           <button onClick={handleAddCurrencyChi} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Chinese Currency">
             <Coins size={18} />
           </button>
           <button onClick={handleAddCurrencyNum} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Number Currency">
             <Hash size={18} />
           </button>

           <div className="h-6 w-px bg-gray-300 mx-2"></div>

           <button 
             onClick={() => setShowPrintModal(true)} 
             className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium"
           >
             <Printer size={18} />
             Print
           </button>
           <button 
             onClick={handleSave} 
             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium shadow-sm"
           >
             <Save size={18} />
             Save
           </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden no-print">
         <Sidebar 
            selectedObject={selectedObject}
            settings={settings}
            onUpdateObject={(updated) => {
                // Determine if this update should record history
                // Continuous text input might span too many history entries, but keeping it simple for now
                updateObjects(objects.map(o => o.id === updated.id ? updated : o));
            }}
            onUpdateSettings={setSettings}
            onDeleteObject={handleDeleteObject}
            user={user}
         />
         
         <div className="flex-1 bg-gray-100 overflow-auto p-8 relative flex justify-center">
            <CanvasArea 
              settings={settings}
              objects={objects}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChangeObject={(updated) => {
                  // This is called onDragEnd / TransformEnd, which are distinct history events
                  updateObjects(objects.map(o => o.id === updated.id ? updated : o));
              }}
              scale={zoom}
            />
         </div>
      </div>

      {/* Print Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        objects={objects}
        settings={settings}
        onPrint={(values) => {
            setPrintValues(values);
            setShowPrintModal(false);
            // Slight delay to allow DOM to update
            setTimeout(() => window.print(), 100);
        }}
        onValuesChange={(vals) => setPrintValues(vals)}
        templateId={id}
        user={user}
        initialTab={printModalTab}
      />

      {/* Actual Print View (Hidden unless printing) */}
      <div className="print-only">
        <PrintView objects={objects} settings={settings} />
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default App;