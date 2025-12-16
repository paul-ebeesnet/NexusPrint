import React, { useEffect, useState } from 'react';
import { CanvasObject, CanvasSettings, LogicType, UserProfile } from '../types';
import { Trash2, Type, Calendar, DollarSign, User, Braces, Settings, Hash, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { getClients } from '../services/storageService';
import { formatDate } from '../services/utils';

interface SidebarProps {
  selectedObject: CanvasObject | null;
  settings: CanvasSettings;
  onUpdateObject: (obj: CanvasObject) => void;
  onUpdateSettings: (s: CanvasSettings) => void;
  onDeleteObject: (id: string) => void;
  user: UserProfile | null;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedObject,
  settings,
  onUpdateObject,
  onUpdateSettings,
  onDeleteObject,
  user
}) => {
  const [clientNames, setClientNames] = useState<string[]>([]);

  useEffect(() => {
    // Load clients for autocomplete
    getClients().then(clients => {
        setClientNames(clients.map(c => c.name));
    });
  }, [user]); // Reload if user changes (guest vs auth)

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (selectedObject && selectedObject.type === 'text') {
        onUpdateObject({
            ...selectedObject,
            rawValue: e.target.value,
            text: selectedObject.logicType === LogicType.STATIC ? e.target.value : (selectedObject.text || '')
        });
    }
  };

  const handlePropChange = (key: keyof CanvasObject, value: any) => {
    if (selectedObject) {
      onUpdateObject({ ...selectedObject, [key]: value });
    }
  };

  const handleDateFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newFormat = e.target.value;
      if (selectedObject) {
          // Immediately update text to reflect new format
          const newText = formatDate(new Date(), newFormat);
          onUpdateObject({ 
              ...selectedObject, 
              dateFormat: newFormat,
              text: newText 
          });
      }
  };

  const handleDimensionChange = (e: React.ChangeEvent<HTMLInputElement>, dim: 'width' | 'height') => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onUpdateSettings({ ...settings, [`${dim}Unit`]: val });
    }
  };

  const showVariableKeyInput = selectedObject && selectedObject.type === 'text' && (
      selectedObject.logicType === LogicType.VARIABLE || 
      selectedObject.logicType === LogicType.CURRENCY_ENG || 
      selectedObject.logicType === LogicType.CURRENCY_CHI || 
      selectedObject.logicType === LogicType.CURRENCY_NUM ||
      selectedObject.logicType === LogicType.CUSTOMER_NAME
  );

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto no-print">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Properties</h2>
      </div>

      <div className="flex-1 p-4 space-y-6">
        
        {/* No Selection: Canvas Settings */}
        {!selectedObject && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-800 font-medium">
              <Settings size={18} />
              <h3>Canvas Setup</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Width</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.widthUnit}
                    onChange={(e) => handleDimensionChange(e, 'width')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400">{settings.unit}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Height</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.heightUnit}
                    onChange={(e) => handleDimensionChange(e, 'height')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  />
                  <span className="absolute right-3 top-2 text-xs text-gray-400">{settings.unit}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
              <select
                value={settings.unit}
                onChange={(e) => onUpdateSettings({ ...settings, unit: e.target.value as 'mm' | 'in' })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              >
                <option value="mm">Millimeters (mm)</option>
                <option value="in">Inches (in)</option>
              </select>
            </div>
          </div>
        )}

        {/* Object Selection */}
        {selectedObject && (
          <div className="space-y-6 animate-fadeIn">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600 font-medium">
                  {selectedObject.type === 'text' && selectedObject.logicType === LogicType.STATIC && <Type size={18} />}
                  {selectedObject.type === 'text' && selectedObject.logicType === LogicType.VARIABLE && <Braces size={18} />}
                  {selectedObject.type === 'text' && selectedObject.logicType === LogicType.DATE && <Calendar size={18} />}
                  {selectedObject.type === 'text' && (selectedObject.logicType === LogicType.CURRENCY_ENG || selectedObject.logicType === LogicType.CURRENCY_CHI) && <DollarSign size={18} />}
                  {selectedObject.type === 'text' && selectedObject.logicType === LogicType.CURRENCY_NUM && <Hash size={18} />}
                  {selectedObject.type === 'text' && selectedObject.logicType === LogicType.CUSTOMER_NAME && <User size={18} />}
                  {selectedObject.type === 'image' && <ImageIcon size={18} />}
                  <span>{selectedObject.type === 'image' ? 'Image Object' : 'Text Object'}</span>
                </div>
                <button 
                  onClick={() => onDeleteObject(selectedObject.id)}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
             </div>

             {/* IMAGE PROPERTIES */}
             {selectedObject.type === 'image' && (
                 <div className="space-y-4">
                     <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
                         <strong>Tip:</strong> Drag the corners or sides on the canvas to resize or distort (stretch) the image.
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Width (px)</label>
                            <input
                                type="number"
                                value={Math.round(selectedObject.width)}
                                onChange={(e) => handlePropChange('width', parseInt(e.target.value))}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Height (px)</label>
                            <input
                                type="number"
                                value={Math.round(selectedObject.height || 0)}
                                onChange={(e) => handlePropChange('height', parseInt(e.target.value))}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>
                     </div>
                     
                     {/* Opacity Control */}
                     <div>
                        <div className="flex justify-between mb-1">
                            <label className="block text-xs font-medium text-gray-500">Opacity</label>
                            <span className="text-xs text-gray-700">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round((selectedObject.opacity ?? 1) * 100)}
                            onChange={(e) => handlePropChange('opacity', parseInt(e.target.value) / 100)}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                     </div>
                 </div>
             )}

             {/* TEXT PROPERTIES */}
             {selectedObject.type === 'text' && (
                 <>
                    <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Data Type</label>
                    <select
                        value={selectedObject.logicType}
                        onChange={(e) => handlePropChange('logicType', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-white"
                    >
                        <option value={LogicType.STATIC}>Static Text</option>
                        <option value={LogicType.VARIABLE}>Variable Placeholder ({'{{key}}'})</option>
                        <option value={LogicType.DATE}>Current Date</option>
                        <option value={LogicType.CURRENCY_ENG}>Currency (English Words)</option>
                        <option value={LogicType.CURRENCY_CHI}>Currency (Chinese Words)</option>
                        <option value={LogicType.CURRENCY_NUM}>Currency (1,234.56)</option>
                        <option value={LogicType.CUSTOMER_NAME}>Client Name (Autocomplete)</option>
                    </select>
                    </div>

                    <div>
                    {showVariableKeyInput && (
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-indigo-600 mb-1">
                                {selectedObject.logicType === LogicType.VARIABLE ? "Variable Key" : "Bind Variable Name (Optional)"}
                            </label>
                            <input
                                type="text"
                                value={selectedObject.variableKey || ''}
                                onChange={(e) => handlePropChange('variableKey', e.target.value)}
                                placeholder="e.g. amount"
                                className="block w-full rounded-md border-indigo-300 ring-1 ring-indigo-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 bg-indigo-50/50"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">
                                {selectedObject.logicType === LogicType.VARIABLE 
                                    ? "Value will be filled at print time." 
                                    : "If set, overrides default value during batch print (e.g. use 'amount' for all currency fields)."}
                            </p>
                        </div>
                    )}

                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        {selectedObject.logicType === LogicType.STATIC ? 'Content' : 'Default / Test Value'}
                    </label>
                    
                    {selectedObject.logicType === LogicType.DATE ? (
                        <select
                        value={selectedObject.dateFormat || 'YYYY-MM-DD'}
                        onChange={handleDateFormatChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        >
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD Month YYYY">DD Month YYYY</option>
                        <option value="YYYY">YYYY (Year)</option>
                        <option value="MM">MM (Month)</option>
                        <option value="DD">DD (Day)</option>
                        </select>
                    ) : (
                        <>
                        <input
                            type={selectedObject.logicType?.includes('CURRENCY') ? "number" : "text"}
                            list={selectedObject.logicType === LogicType.CUSTOMER_NAME ? "client-names" : undefined}
                            value={selectedObject.rawValue || ''}
                            onChange={handleTextChange}
                            placeholder={selectedObject.logicType === LogicType.STATIC ? "Enter text..." : "Enter value..."}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                        {selectedObject.logicType === LogicType.CUSTOMER_NAME && (
                            <datalist id="client-names">
                            {clientNames.map((name, i) => (
                                <option key={i} value={name} />
                            ))}
                            </datalist>
                        )}
                        </>
                    )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Width (px)</label>
                        <input
                            type="number"
                            value={Math.round(selectedObject.width)}
                            onChange={(e) => handlePropChange('width', parseInt(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                        </div>
                        <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Font Size</label>
                        <input
                            type="number"
                            value={selectedObject.fontSize}
                            onChange={(e) => handlePropChange('fontSize', parseInt(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Font Family</label>
                        <select
                            value={selectedObject.fontFamily}
                            onChange={(e) => handlePropChange('fontFamily', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        >
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Inter">Inter</option>
                        </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Alignment</label>
                      <div className="flex rounded-md shadow-sm">
                        <button
                          onClick={() => handlePropChange('align', 'left')}
                          className={`relative inline-flex items-center px-3 py-2 rounded-l-md border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 flex-1 justify-center ${selectedObject.align === 'left' || !selectedObject.align ? 'bg-indigo-50 text-indigo-600 border-indigo-200 z-10' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          <AlignLeft size={16} />
                        </button>
                        <button
                          onClick={() => handlePropChange('align', 'center')}
                          className={`relative inline-flex items-center px-3 py-2 -ml-px border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 flex-1 justify-center ${selectedObject.align === 'center' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 z-10' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          <AlignCenter size={16} />
                        </button>
                        <button
                          onClick={() => handlePropChange('align', 'right')}
                          className={`relative inline-flex items-center px-3 py-2 -ml-px rounded-r-md border text-sm font-medium focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 flex-1 justify-center ${selectedObject.align === 'right' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 z-10' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          <AlignRight size={16} />
                        </button>
                      </div>
                    </div>
                 </>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;