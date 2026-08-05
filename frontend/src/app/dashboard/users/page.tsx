'use client';

import { useState, useEffect, useCallback } from 'react';
// ProtectedLayout removed since layout.tsx handles it
import { useAuth } from '@/providers/AuthProvider';
import { userApi, roleApi, Role, PaginatedResponse, UserCreatePayload } from '@/lib/api/users';
import { User } from '@/types/auth';
import {
  Search, Plus, Edit2, Trash2, RotateCcw, UserCheck, UserX,
  ChevronLeft, ChevronRight, Loader2, X
} from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', full_name: '', role_id: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Reset password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page, page_size: pageSize };
      if (search) params.q = search;
      if (filterRole) params.role_id = filterRole;
      if (filterActive !== '') params.is_active = filterActive === 'true';

      const res = await userApi.list(params);
      setUsers(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, filterRole, filterActive]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await roleApi.list();
      setRoles(res.data);
    } catch (err) {
      // Roles fail silently
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    setPage(1);
  }, [search, filterRole, filterActive]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', full_name: '', role_id: roles[0]?.id || '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '',
      full_name: user.full_name,
      role_id: user.role.id,
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (editingUser) {
        const updatePayload: any = {};
        if (formData.full_name !== editingUser.full_name) updatePayload.full_name = formData.full_name;
        if (formData.email !== (editingUser.email || '')) updatePayload.email = formData.email || null;
        if (formData.password) updatePayload.password = formData.password;
        await userApi.update(editingUser.id, updatePayload);
      } else {
        await userApi.create(formData as UserCreatePayload);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await userApi.delete(id);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      if (user.is_active) {
        await userApi.deactivate(user.id);
      } else {
        await userApi.activate(user.id);
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to change status');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    try {
      await userApi.resetPassword(resetUserId, newPassword);
      setShowResetModal(false);
      setNewPassword('');
      alert('Password reset successfully');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset password');
    }
  };

  if (currentUser && currentUser.role.name !== 'admin') {
    return <div className="p-8 text-center text-red-600">Access Denied. Admins only.</div>;
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Management</h1>
            <p className="text-muted-foreground text-xs mt-1">{total} total users</p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 h-10 text-sm font-medium text-white shadow-sm transition-all"
          >
            <Plus className="mr-2 h-4 w-4" /> New User
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, username, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 h-10 border border-slate-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-6 h-10 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">User</th>
                    <th className="px-6 h-10 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                    <th className="px-6 h-10 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 h-10 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Created</th>
                    <th className="px-6 h-10 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-blue-700">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-slate-800">{user.full_name}</div>
                            <div className="text-xs text-slate-500 font-medium">@{user.username}</div>
                            {user.email && <div className="text-[10px] text-slate-400 mt-0.5">{user.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex rounded text-[11px] font-semibold px-2 py-0.5 ${
                          user.role.name === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role.name}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex rounded text-[11px] font-semibold px-2 py-0.5 ${
                          user.is_active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-slate-600">
                        {new Date(user.last_login_at || '').toLocaleDateString() || '—'}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditModal(user)} title="Edit"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleToggleActive(user)}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-md transition-colors ${user.is_active ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                            {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => { setResetUserId(user.id); setNewPassword(''); setShowResetModal(true); }}
                            title="Reset Password"
                            className="p-1.5 text-slate-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors">
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button onClick={() => handleDelete(user.id)} title="Delete"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-medium text-base">No users found.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * pageSize, total)}</span> of{' '}
                <span className="font-medium">{total}</span> results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold tracking-tight text-slate-900">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-rose-50 border-l-2 border-rose-500 p-3 text-sm text-rose-700 rounded-r-md">{formError}</div>
              )}
              {!editingUser && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Username</label>
                  <input type="text" required minLength={3}
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                <input type="text" required
                  placeholder="Enter full name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Email</label>
                <input type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Password <span className="font-normal text-slate-400">{editingUser && '(leave blank to keep current)'}</span>
                </label>
                <input type="password" minLength={6}
                  required={!editingUser}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
                />
              </div>
              {!editingUser && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Role</label>
                  <select required
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">Select role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 h-10 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="px-4 h-10 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-70 transition-colors shadow-sm">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (editingUser ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold tracking-tight text-slate-900">Reset Password</h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">New Password</label>
                <input type="password" required minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowResetModal(false)}
                  className="px-4 h-10 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                  Cancel
                </button>
                <button onClick={handleResetPassword}
                  className="px-4 h-10 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-500 shadow-sm transition-colors">
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
