
import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { getAllUsers, getSystemSettings, toggleSystemSetting, getInviteCodes, generateInviteCode, InvitationCode, getProfile } from '../services/storageService';
import { ShieldAlert, User, ToggleLeft, ToggleRight, Ticket, Plus, Check, X } from 'lucide-react';

const AdminPanel: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [codes, setCodes] = useState<InvitationCode[]>([]);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [u, s, c, me] = await Promise.all([
            getAllUsers(),
            getSystemSettings(),
            getInviteCodes(),
            getProfile()
        ]);
        setUsers(u);
        setSettings(s);
        setCodes(c);
        setCurrentUser(me);
    };

    const handleToggleInvite = async () => {
        const newValue = settings['require_invite'] === 'true' ? 'false' : 'true';
        setSettings(prev => ({ ...prev, require_invite: newValue })); // Optimistic update
        await toggleSystemSetting('require_invite', newValue);
    };

    const handleGenerateCode = async () => {
        if (!currentUser) return;
        setLoading(true);
        const newCode = await generateInviteCode(currentUser.id);
        if (newCode) {
            setCodes(prev => [newCode, ...prev]);
        }
        setLoading(false);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <ShieldAlert size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Administration</h1>
                    <p className="text-gray-500">Manage platform users, invitation codes, and global settings.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* System Settings */}
                <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Registration Control</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-gray-900">Require Invitation Code</div>
                            <p className="text-sm text-gray-500">If enabled, new users must provide a valid code to sign up.</p>
                        </div>
                        <button 
                            onClick={handleToggleInvite}
                            className={`text-2xl focus:outline-none transition-colors ${settings['require_invite'] === 'true' ? 'text-indigo-600' : 'text-gray-300'}`}
                        >
                            {settings['require_invite'] === 'true' ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                        </button>
                    </div>
                </div>

                {/* Invite Code Generator */}
                <div className="bg-white shadow sm:rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Invitation Codes</h3>
                        <button 
                            onClick={handleGenerateCode}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Plus size={14} className="mr-1" />
                            Generate New
                        </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {codes.map(code => (
                                    <tr key={code.id}>
                                        <td className="px-3 py-2 whitespace-nowrap font-mono font-bold text-sm">{code.code}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                                            {code.is_used ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                    Used
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                            {new Date(code.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                                {codes.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-3 py-4 text-center text-xs text-gray-500">No codes generated yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Users List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Registered Users</h3>
                </div>
                <div className="border-t border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User size={16} className="text-gray-500" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{u.full_name || 'No Name'}</div>
                                                <div className="text-sm text-gray-500">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                                        {u.id}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
