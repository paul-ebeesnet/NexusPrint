import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, History, RotateCcw, Eye } from 'lucide-react';
import { CanvasObject, PrintRecord, UserProfile, CanvasSettings } from '../types';
import { getPrintHistory, savePrintRecord } from '../services/storageService';
import PrintView from './PrintView';

interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    objects: CanvasObject[];
    settings: CanvasSettings;
    onPrint: (values: Record<string, string>) => void;
    onValuesChange: (values: Record<string, string>) => void; // Live preview
    templateId: string;
    user: UserProfile;
    initialTab?: 'form' | 'history';
}

const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose, objects, settings, onPrint, onValuesChange, templateId, user, initialTab = 'form' }) => {
    const [variables, setVariables] = useState<string[]>([]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<PrintRecord[]>([]);
    const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

    // Initialize tab on open
    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    // Extract variables whenever objects change (structural change only)
    // We use a JSON string of keys to avoid unnecessary re-runs if other props change
    const variableKeysHash = JSON.stringify(objects.map(o => o.variableKey).filter(k => k));
    
    useEffect(() => {
        if (!isOpen) return;

        const uniqueVars: string[] = Array.from(new Set(
            objects
                .filter(o => o.variableKey && o.variableKey.trim() !== '')
                .map(o => o.variableKey as string)
        ));
        
        setVariables(uniqueVars);
        
        // Ensure we have value entries for all variables
        setValues(prev => {
            const next = { ...prev };
            let hasChange = false;
            uniqueVars.forEach((v: string) => {
                if (next[v] === undefined) {
                    next[v] = '';
                    hasChange = true;
                }
            });
            // Note: We don't force push to parent here to avoid circular render loops.
            // App.tsx handles missing keys gracefully (defaults to rawValue).
            return hasChange ? next : prev;
        });
    }, [isOpen, variableKeysHash]);

    // Load History whenever opened or templateId changes
    useEffect(() => {
        if (isOpen && templateId) {
            getPrintHistory(templateId).then(setHistory);
        }
    }, [isOpen, templateId]);

    const handleChange = (key: string, val: string) => {
        const newValues = { ...values, [key]: val };
        setValues(newValues);
        onValuesChange(newValues);
    };

    const handleHistoryClick = (record: PrintRecord) => {
        setValues(record.data);
        onValuesChange(record.data);
        setActiveTab('form');
    };

    const handleSubmit = async () => {
        await savePrintRecord(templateId, values, user);
        onPrint(values);
        // Refresh history
        getPrintHistory(templateId).then(setHistory);
    };

    // Calculate preview scale to fit in the right column
    const previewScale = useMemo(() => {
        if (!settings.width || !settings.height) return 0.5;
        const availableWidth = 500; // rough estimate of column width
        const availableHeight = 500;
        const scaleW = availableWidth / settings.width;
        const scaleH = availableHeight / settings.height;
        return Math.min(scaleW, scaleH, 0.8); // 0.8 max to not overblow small templates
    }, [settings]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 no-print backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[700px] flex overflow-hidden">
                
                {/* Left Sidebar: Tabs & Inputs (35%) */}
                <div className="w-[35%] bg-gray-50 border-r border-gray-200 flex flex-col min-w-[320px]">
                    <div className="flex border-b border-gray-200">
                        <button 
                            onClick={() => setActiveTab('form')}
                            className={`flex-1 py-4 text-sm font-medium ${activeTab === 'form' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Input Data
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-4 text-sm font-medium ${activeTab === 'history' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            History ({history.length})
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'form' ? (
                            <>
                                <div className="text-sm text-gray-500 mb-6">
                                    <p className="mb-2">Fill in the variables below. The preview on the right updates automatically.</p>
                                </div>
                                {variables.length > 0 ? (
                                    <form className="space-y-4">
                                        {variables.map(key => (
                                            <div key={key}>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1 capitalize">
                                                    {key.replace(/_/g, ' ')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={values[key] || ''}
                                                    onChange={(e) => handleChange(key, e.target.value)}
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2.5"
                                                    placeholder={`Enter ${key}...`}
                                                />
                                            </div>
                                        ))}
                                    </form>
                                ) : (
                                    <div className="text-center py-10 text-gray-400 bg-white rounded border border-dashed">
                                        No variables found.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="space-y-3">
                                {history.map(rec => (
                                    <div 
                                        key={rec.id} 
                                        onClick={() => handleHistoryClick(rec)}
                                        className="bg-white p-3 rounded border border-gray-200 cursor-pointer hover:border-indigo-400 hover:shadow-sm transition-all group"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-semibold text-gray-600">
                                                {new Date(rec.created_at).toLocaleDateString()} {new Date(rec.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            <RotateCcw size={14} className="text-gray-400 group-hover:text-indigo-600" />
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                            {Object.keys(rec.data).length > 0 
                                                ? Object.entries(rec.data).map(([k, v]) => `${k}: ${v}`).join(', ')
                                                : 'No variable data'}
                                        </div>
                                    </div>
                                ))}
                                {history.length === 0 && <p className="text-center text-gray-400 text-sm mt-10">No print history yet.</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Content: Preview (65%) */}
                <div className="flex-1 flex flex-col bg-gray-100">
                    <div className="px-6 py-4 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Eye className="text-indigo-600" size={20} />
                            Live Preview
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-gray-200/50">
                        <div 
                            className="bg-white shadow-2xl transition-all duration-300 ease-in-out"
                            style={{
                                width: settings.width,
                                height: settings.height,
                                transform: `scale(${previewScale})`,
                                transformOrigin: 'center center',
                            }}
                        >
                            <PrintView objects={objects} settings={settings} />
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 z-10">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Close
                        </button>
                        <button 
                            onClick={handleSubmit}
                            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Printer size={16} />
                            Print Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintModal;