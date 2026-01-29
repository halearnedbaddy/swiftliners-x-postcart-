import { Search, BadgeCheck, Loader, Download, Phone, Mail, Shield, Filter, ArrowUpDown, CheckSquare, Square, Users } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { exportToCSV } from '@/utils/csvExport';
import { supabase } from '@/integrations/supabase/client';
import { UserActionsDropdown } from './UserActionsDropdown';
import { EditUserModal } from './EditUserModal';
import { PromoteUserModal } from './PromoteUserModal';
import { ConfirmActionModal } from './ConfirmActionModal';
import { UserActivityModal } from './UserActivityModal';

type SortField = 'name' | 'role' | 'memberSince' | 'status';
type SortOrder = 'asc' | 'desc';

export function AdminUsers() {
    const [activeTab, setActiveTab] = useState<'ALL' | 'SELLER' | 'BUYER'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<SortField>('memberSince');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    
    // Modal states
    const [editingUser, setEditingUser] = useState<typeof users[0] | null>(null);
    const [promotingUser, setPromotingUser] = useState<typeof users[0] | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ user: typeof users[0]; type: 'activate' | 'deactivate' | 'delete' | 'reset-password' } | null>(null);
    const [viewingActivity, setViewingActivity] = useState<typeof users[0] | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_batchAction, _setBatchAction] = useState<'activate' | 'deactivate' | 'delete' | 'promote' | null>(null);
    
    const { users, loading, error, refetch } = useAdminData();

    // Filter and sort users
    const filteredUsers = useMemo(() => {
        let result = users.filter(u => {
            // Exclude admins from this view
            if (u.role === 'ADMIN' || u.role === 'admin') return false;
            
            const matchesTab = activeTab === 'ALL' || u.role.toUpperCase() === activeTab;
            const matchesSearch = 
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.phone?.includes(searchTerm)) ||
                (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                u.id.includes(searchTerm);
            
            return matchesTab && matchesSearch;
        });

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'role':
                    comparison = a.role.localeCompare(b.role);
                    break;
                case 'memberSince':
                    comparison = new Date(a.memberSince).getTime() - new Date(b.memberSince).getTime();
                    break;
                case 'status':
                    comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [users, activeTab, searchTerm, sortField, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === filteredUsers.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const toggleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    // Action handlers
    const handleEditUser = async (data: { name: string; email?: string; phone?: string }) => {
        if (!editingUser) return;
        
        const { error } = await supabase
            .from('profiles')
            .update({
                name: data.name,
                email: data.email,
                phone: data.phone,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', editingUser.id);

        if (error) throw error;
        
        // Log admin action
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('admin_logs').insert({
                admin_id: user.id,
                action: 'USER_PROFILE_UPDATED',
                target_user_id: editingUser.id,
                details: { changes: data },
            });
        }
        
        await refetch();
    };

    const handlePromoteUser = async (newRole: 'buyer' | 'seller' | 'admin') => {
        if (!promotingUser) return;
        
        // Update user_roles table (this is the source of truth for authorization)
        const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: newRole })
            .eq('user_id', promotingUser.id);

        if (roleError) throw roleError;

        // Also update profile.role for display purposes
        await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('user_id', promotingUser.id);

        // Create seller profile if promoting to seller
        if (newRole === 'seller') {
            const { data: existingProfile } = await supabase
                .from('seller_profiles')
                .select('id')
                .eq('user_id', promotingUser.id)
                .maybeSingle();
            
            if (!existingProfile) {
                await supabase.from('seller_profiles').insert({ user_id: promotingUser.id });
            }
        }
        
        // Log admin action
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('admin_logs').insert({
                admin_id: user.id,
                action: 'USER_ROLE_CHANGED',
                target_user_id: promotingUser.id,
                details: { oldRole: promotingUser.role, newRole },
            });
        }
        
        await refetch();
    };

    const handleActivateUser = async (userId: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ 
                is_active: true, 
                account_status: 'active',
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (error) throw error;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('admin_logs').insert({
                admin_id: user.id,
                action: 'USER_ACTIVATED',
                target_user_id: userId,
            });
        }
        
        await refetch();
    };

    const handleDeactivateUser = async (userId: string) => {
        const { error } = await supabase
            .from('profiles')
            .update({ 
                is_active: false, 
                account_status: 'suspended',
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (error) throw error;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('admin_logs').insert({
                admin_id: user.id,
                action: 'USER_DEACTIVATED',
                target_user_id: userId,
            });
        }
        
        await refetch();
    };

    const handleDeleteUser = async (userId: string) => {
        // Delete from profiles (cascade will handle related records)
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('admin_logs').insert({
                admin_id: user.id,
                action: 'USER_DELETED',
                target_user_id: userId,
            });
        }
        
        await refetch();
    };

    const handleResetPassword = async (userId: string, email: string) => {
        // Use Supabase auth admin to send reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('admin_logs').insert({
                admin_id: user.id,
                action: 'PASSWORD_RESET_SENT',
                target_user_id: userId,
            });
        }
    };

    // Batch actions
    const handleBatchAction = async (action: 'activate' | 'deactivate' | 'delete') => {
        if (selectedUsers.size === 0) return;
        
        setActionLoading('batch');
        try {
            const userIds = Array.from(selectedUsers);
            
            if (action === 'activate') {
                for (const userId of userIds) {
                    await handleActivateUser(userId);
                }
            } else if (action === 'deactivate') {
                for (const userId of userIds) {
                    await handleDeactivateUser(userId);
                }
            } else if (action === 'delete') {
                for (const userId of userIds) {
                    await handleDeleteUser(userId);
                }
            }
            
            setSelectedUsers(new Set());
        } finally {
            setActionLoading(null);
        }
    };

    const handleExportCSV = () => {
        const exportData = filteredUsers.map(user => ({
            id: user.id,
            name: user.name,
            phone: user.phone || '-',
            email: user.email || '-',
            role: user.role,
            signupMethod: user.signupMethod === 'PHONE_OTP' ? 'Phone OTP' : 'Email',
            accountStatus: user.accountStatus,
            isPhoneVerified: user.isPhoneVerified ? 'Yes' : 'No',
            isEmailVerified: user.isEmailVerified ? 'Yes' : 'No',
            isActive: user.isActive ? 'Yes' : 'No',
            availableBalance: user.wallet?.availableBalance || 0,
            pendingBalance: user.wallet?.pendingBalance || 0,
            joinedAt: new Date(user.memberSince).toISOString(),
        }));

        const columns = [
            { key: 'id' as const, label: 'User ID' },
            { key: 'name' as const, label: 'Name' },
            { key: 'phone' as const, label: 'Phone' },
            { key: 'email' as const, label: 'Email' },
            { key: 'role' as const, label: 'Role' },
            { key: 'signupMethod' as const, label: 'Signup Method' },
            { key: 'accountStatus' as const, label: 'Account Status' },
            { key: 'isPhoneVerified' as const, label: 'Phone Verified' },
            { key: 'isEmailVerified' as const, label: 'Email Verified' },
            { key: 'isActive' as const, label: 'Active' },
            { key: 'availableBalance' as const, label: 'Available Balance (KES)' },
            { key: 'pendingBalance' as const, label: 'Pending Balance (KES)' },
            { key: 'joinedAt' as const, label: 'Joined At' },
        ];

        const filename = activeTab === 'ALL' 
            ? `all_users_${new Date().toISOString().split('T')[0]}`
            : `${activeTab.toLowerCase()}s_${new Date().toISOString().split('T')[0]}`;
        
        exportToCSV(exportData, filename, columns);
    };

    const getSignupMethodBadge = (method: string) => {
        switch (method) {
            case 'PHONE_OTP':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-[#5d2ba3]/10 text-[#5d2ba3]">
                        <Phone size={12} /> Phone OTP
                    </span>
                );
            case 'EMAIL_PASSWORD':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-[#5d2ba3]/10 text-[#5d2ba3]">
                        <Mail size={12} /> Email
                    </span>
                );
            case 'ADMIN_CREATED':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-[#4F4A41]/10 text-[#4F4A41]">
                        <Shield size={12} /> Admin
                    </span>
                );
            default:
                return <span className="text-xs text-gray-400">-</span>;
        }
    };

    const getStatusBadge = (user: typeof users[0]) => {
        const status = user.accountStatus?.toLowerCase();
        if (status === 'suspended') {
            return (
                <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-red-100 text-red-700">
                    Suspended
                </span>
            );
        }
        if (!user.isActive) {
            return (
                <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-gray-100 text-gray-600">
                    Inactive
                </span>
            );
        }
        if (user.isVerified) {
            return (
                <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-[#5d2ba3]/10 text-[#5d2ba3]">
                    Active
                </span>
            );
        }
        return (
            <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-[#4F4A41]/10 text-[#4F4A41]">
                Pending
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader size={32} className="animate-spin text-[#5d2ba3]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
                <p className="font-bold">Failed to load users</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    const totalSellers = users.filter(u => u.role === 'SELLER' || u.role === 'seller').length;
    const totalBuyers = users.filter(u => u.role === 'BUYER' || u.role === 'buyer').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#3d1a7a]">User Management</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportCSV}
                        disabled={filteredUsers.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#3d1a7a] text-white rounded-lg text-sm font-semibold hover:bg-[#250e52] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={16} /> Export Users
                    </button>
                </div>
            </div>

            {/* Batch Actions Bar */}
            {selectedUsers.size > 0 && (
                <div className="bg-[#5d2ba3]/5 border border-[#5d2ba3]/20 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users size={18} className="text-[#5d2ba3]" />
                        <span className="font-medium text-[#3d1a7a]">
                            {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleBatchAction('activate')}
                            disabled={actionLoading === 'batch'}
                            className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition"
                        >
                            Activate All
                        </button>
                        <button
                            onClick={() => handleBatchAction('deactivate')}
                            disabled={actionLoading === 'batch'}
                            className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition"
                        >
                            Deactivate All
                        </button>
                        <button
                            onClick={() => {
                                if (confirm(`Delete ${selectedUsers.size} users permanently? This cannot be undone.`)) {
                                    handleBatchAction('delete');
                                }
                            }}
                            disabled={actionLoading === 'batch'}
                            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition"
                        >
                            Delete All
                        </button>
                        <button
                            onClick={() => setSelectedUsers(new Set())}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="border-b border-gray-200">
                    <nav className="flex gap-6 px-6">
                        <button
                            onClick={() => setActiveTab('ALL')}
                            className={`py-4 text-sm font-bold border-b-2 transition ${activeTab === 'ALL' ? 'border-[#5d2ba3] text-[#5d2ba3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            All Users ({totalSellers + totalBuyers})
                        </button>
                        <button
                            onClick={() => setActiveTab('SELLER')}
                            className={`py-4 text-sm font-bold border-b-2 transition ${activeTab === 'SELLER' ? 'border-[#5d2ba3] text-[#5d2ba3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Sellers ({totalSellers})
                        </button>
                        <button
                            onClick={() => setActiveTab('BUYER')}
                            className={`py-4 text-sm font-bold border-b-2 transition ${activeTab === 'BUYER' ? 'border-[#5d2ba3] text-[#5d2ba3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Buyers ({totalBuyers})
                        </button>
                    </nav>
                </div>

                <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, phone, email, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#3d1a7a] text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Filter size={14} />
                        <select
                            value={`${sortField}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                                setSortField(field);
                                setSortOrder(order);
                            }}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3d1a7a]"
                        >
                            <option value="memberSince-desc">Newest First</option>
                            <option value="memberSince-asc">Oldest First</option>
                            <option value="name-asc">Name A-Z</option>
                            <option value="name-desc">Name Z-A</option>
                            <option value="role-asc">Role A-Z</option>
                            <option value="status-desc">Active First</option>
                            <option value="status-asc">Inactive First</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-4 w-10">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                                            <CheckSquare size={18} className="text-[#5d2ba3]" />
                                        ) : (
                                            <Square size={18} />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">
                                        User Details
                                        {sortField === 'name' && <ArrowUpDown size={12} />}
                                    </div>
                                </th>
                                <th className="px-4 py-4">Signup Method</th>
                                <th className="px-4 py-4">Verification</th>
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('status')}>
                                    <div className="flex items-center gap-1">
                                        Status
                                        {sortField === 'status' && <ArrowUpDown size={12} />}
                                    </div>
                                </th>
                                <th className="px-4 py-4">Balance</th>
                                <th className="px-4 py-4 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('memberSince')}>
                                    <div className="flex items-center gap-1">
                                        Joined
                                        {sortField === 'memberSince' && <ArrowUpDown size={12} />}
                                    </div>
                                </th>
                                <th className="px-4 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-gray-50 transition ${selectedUsers.has(user.id) ? 'bg-[#5d2ba3]/5' : ''}`}>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => toggleSelectUser(user.id)}
                                                className="text-gray-400 hover:text-gray-600"
                                            >
                                                {selectedUsers.has(user.id) ? (
                                                    <CheckSquare size={18} className="text-[#5d2ba3]" />
                                                ) : (
                                                    <Square size={18} />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-[#3d1a7a]">{user.name}</p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                        user.role === 'SELLER' || user.role === 'seller' 
                                                            ? 'bg-[#5d2ba3]/10 text-[#5d2ba3]' 
                                                            : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <div className="mt-1 space-y-0.5">
                                                    {user.email && (
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Mail size={10} /> {user.email}
                                                        </p>
                                                    )}
                                                    {user.phone && (
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <Phone size={10} /> {user.phone}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {getSignupMethodBadge(user.signupMethod)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1">
                                                {user.phone && (
                                                    <span className={`inline-flex items-center gap-1 text-xs ${
                                                        user.isPhoneVerified ? 'text-[#5d2ba3]' : 'text-gray-400'
                                                    }`}>
                                                        {user.isPhoneVerified ? <BadgeCheck size={12} /> : null}
                                                        Phone {user.isPhoneVerified ? '✓' : '—'}
                                                    </span>
                                                )}
                                                {user.email && (
                                                    <span className={`inline-flex items-center gap-1 text-xs ${
                                                        user.isEmailVerified ? 'text-[#5d2ba3]' : 'text-gray-400'
                                                    }`}>
                                                        {user.isEmailVerified ? <BadgeCheck size={12} /> : null}
                                                        Email {user.isEmailVerified ? '✓' : '—'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            {getStatusBadge(user)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm">
                                                <p className="font-semibold text-gray-900">KES {(user.wallet?.availableBalance || 0).toLocaleString()}</p>
                                                <p className="text-xs text-gray-500">Pending: {(user.wallet?.pendingBalance || 0).toLocaleString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm text-gray-500">
                                                <p>{new Date(user.memberSince).toLocaleDateString()}</p>
                                                <p className="text-xs">{new Date(user.memberSince).toLocaleTimeString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <UserActionsDropdown
                                                user={user}
                                                loading={actionLoading === user.id}
                                                onEdit={() => setEditingUser(user)}
                                                onPromote={() => setPromotingUser(user)}
                                                onDemote={() => setPromotingUser(user)}
                                                onActivate={() => setConfirmAction({ user, type: 'activate' })}
                                                onDeactivate={() => setConfirmAction({ user, type: 'deactivate' })}
                                                onDelete={() => setConfirmAction({ user, type: 'delete' })}
                                                onResetPassword={() => setConfirmAction({ user, type: 'reset-password' })}
                                                onViewActivity={() => setViewingActivity(user)}
                                            />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleEditUser}
                />
            )}

            {promotingUser && (
                <PromoteUserModal
                    user={promotingUser}
                    isOpen={!!promotingUser}
                    onClose={() => setPromotingUser(null)}
                    onPromote={handlePromoteUser}
                />
            )}

            {confirmAction && (
                <ConfirmActionModal
                    user={confirmAction.user}
                    actionType={confirmAction.type}
                    isOpen={!!confirmAction}
                    onClose={() => setConfirmAction(null)}
                    onConfirm={async () => {
                        const { user: targetUser, type } = confirmAction;
                        if (type === 'activate') {
                            await handleActivateUser(targetUser.id);
                        } else if (type === 'deactivate') {
                            await handleDeactivateUser(targetUser.id);
                        } else if (type === 'delete') {
                            await handleDeleteUser(targetUser.id);
                        } else if (type === 'reset-password' && targetUser.email) {
                            await handleResetPassword(targetUser.id, targetUser.email);
                        }
                    }}
                />
            )}

            {viewingActivity && (
                <UserActivityModal
                    user={viewingActivity}
                    isOpen={!!viewingActivity}
                    onClose={() => setViewingActivity(null)}
                />
            )}
        </div>
    );
}
