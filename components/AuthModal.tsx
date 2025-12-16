import React, { useState, useEffect, useRef } from 'react';
import { X, Database, UserCircle, Eye, EyeOff, UserPlus, ArrowRight, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password?: string) => Promise<void>;
  onSignUp: (email: string, password?: string) => Promise<void>;
  onGuestLogin: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onSignUp, onGuestLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline' | null>(null);
  
  // Track if we should suggest switching to sign up
  const [suggestSignUp, setSuggestSignUp] = useState(false);
  
  const isMounted = useRef(true);

  useEffect(() => {
      isMounted.current = true;
      return () => { isMounted.current = false; };
  }, []);

  // Reset state when mode changes
  useEffect(() => {
      setError(null);
      setSuggestSignUp(false);
      setConnectionStatus(null);
  }, [isSignUp, isOpen]);

  // Check connection when modal opens to reassure user
  useEffect(() => {
      if(isOpen) checkConnection();
  }, [isOpen]);

  const checkConnection = async () => {
      if (!isMounted.current) return;
      setConnectionStatus('checking');
      try {
          // Simple ping to Auth service
          const { error } = await supabase.auth.getSession();
          if (error) throw error;
          if (isMounted.current) setConnectionStatus('online');
      } catch (e) {
          console.error("Connection check failed:", e);
          if (isMounted.current) setConnectionStatus('offline');
      }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail || !password) {
        setError("Please enter both email and password.");
        return;
    }
    setError(null);
    setSuggestSignUp(false);
    setLoading(true);
    
    try {
        if (isSignUp) {
            await onSignUp(cleanEmail, password);
            if (isMounted.current) {
                alert("Sign up successful! Please check your email for confirmation or sign in.");
                setIsSignUp(false);
            }
        } else {
            await onLogin(cleanEmail, password);
        }
    } catch (err: any) {
        let msg = err.message || "Authentication failed";
        console.error("Auth Error:", err);

        // Re-check connection on error to verify if it's network or creds
        checkConnection();

        if (msg.includes("Invalid login credentials")) {
            msg = "Incorrect email or password.";
            if (!isSignUp) setSuggestSignUp(true);
        } else if (msg.includes("User already registered")) {
             msg = "This email is already registered. Please sign in.";
             if (isSignUp) {
                 setTimeout(() => setIsSignUp(false), 1500);
             }
        } else if (msg.includes("fetch") || msg.includes("network") || msg.includes("Load failed")) {
            msg = "Network Error: Cannot connect to server.";
        }

        if (isMounted.current) {
            setError(msg);
        }
    } finally {
        if (isMounted.current) {
            setLoading(false);
        }
    }
  };

  const isNetworkError = error && (error.includes('Network') || error.includes('Guest') || error.includes('Connection') || connectionStatus === 'offline');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 no-print backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 transform transition-all relative">
        
        {/* Connection Status Indicator */}
        <div className="absolute top-4 right-12 flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-full border border-gray-100" title="Server Status">
             {connectionStatus === 'checking' && <Activity size={12} className="text-blue-500 animate-pulse" />}
             {connectionStatus === 'online' && <CheckCircle size={12} className="text-green-500" />}
             {connectionStatus === 'offline' && <AlertTriangle size={12} className="text-red-500" />}
             <span className={`text-[10px] font-medium uppercase tracking-wider ${
                 connectionStatus === 'online' ? 'text-green-700' : 
                 connectionStatus === 'offline' ? 'text-red-700' : 'text-gray-500'
             }`}>
                 {connectionStatus === 'checking' ? 'Checking...' : 
                  connectionStatus === 'online' ? 'System Online' : 
                  connectionStatus === 'offline' ? 'System Offline' : ''}
             </span>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             <div className="bg-indigo-100 p-2 rounded-lg">
                <Database className="text-indigo-600" size={24} />
             </div>
             {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {error && (
            <div className={`text-sm p-4 rounded-lg mb-6 flex flex-col gap-2 ${isNetworkError ? 'bg-orange-50 text-orange-800 border border-orange-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <div className="font-medium flex items-center gap-2">
                    {isNetworkError && <AlertTriangle size={16} />}
                    {error}
                </div>
                
                {suggestSignUp && !isSignUp && (
                    <button 
                        onClick={() => { setIsSignUp(true); setError(null); }}
                        className="text-left text-xs bg-white border border-red-300 p-2 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2 text-gray-800 font-semibold"
                    >
                        <UserPlus size={14} className="text-indigo-600" />
                        Account not found? Create one now
                    </button>
                )}
                
                {isNetworkError && (
                    <div className="text-xs font-bold uppercase tracking-wide opacity-80 mt-1">
                        Recommendation: Use Guest Mode below.
                    </div>
                )}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                {!isSignUp && (
                    <button type="button" onClick={() => alert("Please contact support or use Guest Mode to reset password.")} className="text-xs text-indigo-600 hover:text-indigo-800">
                        Forgot?
                    </button>
                )}
            </div>
            <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || connectionStatus === 'offline'}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? (
                <span>Processing...</span>
            ) : (
                isSignUp ? <>Create Account <ArrowRight size={18} /></> : <>Sign In <ArrowRight size={18} /></>
            )}
          </button>
        </form>

        <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">Or continue without account</span>
            </div>
        </div>

        <button 
            onClick={onGuestLogin}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-all border-2 font-medium ${
                isNetworkError 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 ring-2 ring-indigo-500 ring-offset-2' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
        >
            <UserCircle size={20} className={isNetworkError ? "text-indigo-600" : "text-gray-500"} />
            Continue as Guest
            {isNetworkError && <span className="ml-1 text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">Recommended</span>}
        </button>

        <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuggestSignUp(false); }}
                    className="ml-1 font-semibold text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none"
                >
                    {isSignUp ? "Sign In" : "Sign Up"}
                </button>
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;