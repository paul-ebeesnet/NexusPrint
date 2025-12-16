import React, { useEffect, useState } from 'react';
import { getAllPrintHistory, HistoryItem } from '../services/storageService';
import { History, Printer, Search, Calendar, FileText } from 'lucide-react';
import { useLocation } from 'wouter';

const HistoryPage: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [, setLocation] = useLocation();

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const data = await getAllPrintHistory();
            setHistory(data);
        } finally {
            setLoading(false);
        }
    };

    const handleReprint = (item: HistoryItem) => {
        // Navigate to editor with action=reprint and the history ID
        // The EditorPage will read the ID and fetch the record to pre-fill values
        // Note: wouter navigation doesn't support query params well in setLocation directly if strictly strictly path based, 
        // but passing the full string usually works or we use window.location
        window.location.hash = `/editor/${item.template_id}?action=reprint&history_id=${item.id}`;
    };

    const filteredHistory = history.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return (
            item.template_name?.toLowerCase().includes(searchLower) || 
            Object.values(item.data).some(val => String(val).toLowerCase().includes(searchLower))
        );
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <History size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Print History</h1>
                    <p className="text-gray-500">View and reprint past documents.</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative rounded-md shadow-sm max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                        placeholder="Search by template or content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading history...</div>
                ) : filteredHistory.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <History size={48} className="text-gray-300 mb-4" />
                        <p>No print history found.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date & Time
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Template
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Content Preview
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gray-400" />
                                            {new Date(item.created_at).toLocaleDateString()}
                                            <span className="text-gray-400 text-xs ml-1">
                                                {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                <FileText size={16} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{item.template_name}</div>
                                                <div className="text-xs text-gray-500 font-mono">{item.template_id.substring(0,8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 line-clamp-2 max-w-xs">
                                            {Object.entries(item.data).map(([k, v]) => (
                                                <span key={k} className="mr-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                    {k}: {v}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => handleReprint(item)}
                                            className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 ml-auto"
                                        >
                                            <Printer size={16} /> Reprint
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;