import React, { useState, useEffect } from 'react';
import { Template, Client, UserProfile } from '../types';
import { getTemplates, getClients, saveClient, deleteTemplate, deleteClient, getPublicTemplates, copyTemplateToLibrary } from '../services/storageService';
import { Plus, Layout, Users, FileEdit, Trash2, Search, ExternalLink, Printer, History, Globe, Download } from 'lucide-react';
import { useLocation } from 'wouter';

const Dashboard: React.FC<{ user: UserProfile }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'clients' | 'gallery'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [galleryTemplates, setGalleryTemplates] = useState<Template[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [location, setLocation] = useLocation();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [t, c] = await Promise.all([getTemplates(), getClients()]);
    setTemplates(t);
    setClients(c);
  };

  const handleTabChange = (tab: 'templates' | 'clients' | 'gallery') => {
      setActiveTab(tab);
      if (tab === 'gallery') {
          getPublicTemplates().then(setGalleryTemplates);
      }
  };

  const handleCreateTemplate = () => {
    setLocation('/editor/new');
  };

  const handleEditTemplate = (id: string) => {
    setLocation(`/editor/${id}`);
  };

  const handlePrintTemplate = (id: string) => {
    // Navigate with query param for print action
    // Note: Since wouter with hash location doesn't support query params natively in navigate, we append it manually
    window.location.hash = `/editor/${id}?action=print`;
  };

  const handleHistoryTemplate = (id: string) => {
    window.location.hash = `/editor/${id}?action=history`;
  };

  const handleDeleteTemplate = async (id: string) => {
    if(confirm("Are you sure?")) {
        await deleteTemplate(id);
        loadData();
    }
  };

  const handleAddToLibrary = async (template: Template) => {
      const confirmAdd = window.confirm(`Add "${template.name}" to your library?`);
      if (confirmAdd) {
          try {
              await copyTemplateToLibrary(template, user);
              alert("Template added successfully!");
              handleTabChange('templates'); // Switch back to my templates
              loadData();
          } catch (e) {
              console.error(e);
              alert("Failed to add template.");
          }
      }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!newClientName) return;
    await saveClient(newClientName);
    setNewClientName('');
    loadData();
  };

  const handleDeleteClient = async (id: string) => {
    if(confirm("Delete this client?")) {
        await deleteClient(id);
        loadData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user.full_name || user.email}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('templates')}
            className={`${
              activeTab === 'templates'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Layout size={18} />
            My Templates
          </button>
          <button
            onClick={() => handleTabChange('gallery')}
            className={`${
              activeTab === 'gallery'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Globe size={18} />
            Template Gallery
          </button>
          <button
            onClick={() => handleTabChange('clients')}
            className={`${
              activeTab === 'clients'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
          >
            <Users size={18} />
            Client CRM
          </button>
        </nav>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Saved Designs</h2>
            <button
              onClick={handleCreateTemplate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus size={16} className="mr-2" />
              New Template
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div key={template.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${template.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {template.is_public ? 'Global' : 'Private'}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(template.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 truncate">{template.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {template.settings.widthUnit} x {template.settings.heightUnit} {template.settings.unit}
                  </p>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between items-center">
                    <div className="flex gap-2">
                         <button onClick={() => handlePrintTemplate(template.id)} title="Print" className="text-gray-500 hover:text-indigo-600 p-1">
                             <Printer size={16} />
                         </button>
                         <button onClick={() => handleHistoryTemplate(template.id)} title="History" className="text-gray-500 hover:text-indigo-600 p-1">
                             <History size={16} />
                         </button>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => handleEditTemplate(template.id)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium flex items-center gap-1">
                            <FileEdit size={14} /> Edit
                        </button>
                        {template.user_id === user.id && (
                            <button onClick={() => handleDeleteTemplate(template.id)} className="text-red-600 hover:text-red-900 text-sm font-medium flex items-center gap-1">
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                    <Layout className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new design.</p>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Gallery Tab */}
      {activeTab === 'gallery' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Community Gallery</h2>
            <span className="text-sm text-gray-500">Browse shared templates</span>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {galleryTemplates.map((template) => (
              <div key={template.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow group">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Public
                    </span>
                    <span className="text-xs text-gray-500">{new Date(template.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 truncate">{template.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {template.settings.widthUnit} x {template.settings.heightUnit} {template.settings.unit}
                  </p>
                </div>
                <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-end items-center">
                    <button 
                        onClick={() => handleAddToLibrary(template)} 
                        className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                        <Download size={14} /> Add to Library
                    </button>
                </div>
              </div>
            ))}
            {galleryTemplates.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                    <Globe className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No public templates</h3>
                    <p className="mt-1 text-sm text-gray-500">Be the first to share a template!</p>
                </div>
            )}
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="bg-white shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Address Book</h3>
                <form onSubmit={handleAddClient} className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder="New Client Name" 
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm border-gray-300 rounded-md border px-3 py-1.5"
                        value={newClientName}
                        onChange={e => setNewClientName(e.target.value)}
                    />
                    <button type="submit" className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700">Add</button>
                </form>
            </div>
            <ul className="divide-y divide-gray-200">
                {clients.map(client => (
                    <li key={client.id} className="px-4 py-4 sm:px-6 flex justify-between items-center hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                {client.name[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{client.name}</span>
                        </div>
                        <button onClick={() => handleDeleteClient(client.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                        </button>
                    </li>
                ))}
                {clients.length === 0 && (
                    <li className="px-4 py-8 text-center text-gray-500 text-sm">No clients added yet.</li>
                )}
            </ul>
        </div>
      )}
    </div>
  );
};

export default Dashboard;