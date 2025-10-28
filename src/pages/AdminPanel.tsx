import { useEffect, useState, useCallback } from 'react';
import { useRole } from '../hooks/useRole';
import { supabase } from '../lib/supabase';
import { 
  Shield, Users, DollarSign, Activity, 
  AlertTriangle, CheckCircle, XCircle, Search,
  BarChart3, Zap, Unlock, Ban,
  TrendingUp, Database, Server, Eye, Download, Coins
} from 'lucide-react';
import { toast } from '../components/Toast';
import { debounce } from '../utils/debounce';
import RoleBadge from '../components/RoleBadge';
import { formatTokens } from '../utils/formatTokens';

interface AdminPanelProps {
  onNavigate?: (page: string) => void;
}

interface PlatformStats {
  total_users: number;
  active_users_today: number;
  total_tokens_earned: number;
  total_tokens_spent: number;
  total_tokens_in_circulation: number;
  marketplace_transactions: number;
  pending_withdrawals: number;
  total_revenue: number;
  users_by_role?: Record<string, number>;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  token_balance: number;
  is_banned: boolean;
  ban_reason?: string;
  created_at: string;
  last_active_at: string;
}

export default function AdminPanel({ onNavigate }: AdminPanelProps) {
  const { isAdmin, role, loading: roleLoading } = useRole();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'revenue' | 'settings'>('overview');
  const [stats, setStats] = useState<PlatformStats>({
    total_users: 0,
    active_users_today: 0,
    total_tokens_earned: 0,
    total_tokens_spent: 0,
    total_tokens_in_circulation: 0,
    marketplace_transactions: 0,
    pending_withdrawals: 0,
    total_revenue: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((search: string) => {
      fetchUsers(search);
    }, 500),
    []
  );

  useEffect(() => {
    if (!roleLoading && !isAdmin()) {
      toast.error('Access denied: Admin privileges required');
      onNavigate?.('dashboard');
      return;
    }

    if (isAdmin()) {
      fetchPlatformStats();
      if (activeTab === 'users') {
        fetchUsers();
      }
    }
  }, [roleLoading, activeTab, role]); // Fixed: use 'role' instead of 'isAdmin' function
  
  // Trigger debounced search when searchQuery changes
  useEffect(() => {
    if (activeTab === 'users') {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery, activeTab]);

  const fetchPlatformStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_platform_stats');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load platform statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async (search: string = '') => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, username, email, role, token_balance, is_banned, ban_reason, created_at, last_active_at')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId: string, username: string) => {
    const reason = prompt(`Enter ban reason for ${username}:`);
    if (!reason) return;

    const durationStr = prompt('Ban duration in hours (leave empty for permanent):');
    const duration = durationStr ? parseInt(durationStr) : null;

    try {
      const { error } = await supabase.rpc('ban_user', {
        p_user_id: userId,
        p_reason: reason,
        p_duration_hours: duration
      });

      if (error) throw error;

      toast.success(`${username} has been banned`);
      fetchUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string, username: string) => {
    if (!confirm(`Unban ${username}?`)) return;

    try {
      const { error } = await supabase.rpc('unban_user', {
        p_user_id: userId
      });

      if (error) throw error;

      toast.success(`${username} has been unbanned`);
      fetchUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handleChangeRole = async (userId: string, username: string, currentRole: string) => {
    const newRole = prompt(
      `Change role for ${username}\nCurrent: ${currentRole}\n\nEnter new role (user, vip, moderator, support, developer, admin, super_admin):`
    );

    if (!newRole) return;

    const validRoles = ['user', 'vip', 'moderator', 'support', 'developer', 'admin', 'super_admin'];
    if (!validRoles.includes(newRole)) {
      toast.error('Invalid role');
      return;
    }

    try {
      const { error } = await supabase.rpc('update_user_role', {
        p_user_id: userId,
        p_new_role: newRole
      });

      if (error) throw error;

      toast.success(`${username}'s role updated to ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  const handleViewRevenue = () => {
    onNavigate?.('adminrevenue');
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Admin Control Panel</h1>
              <p className="text-gray-400">Full platform management and analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-red-400 font-semibold text-sm">Role: {role.toUpperCase()}</span>
            </div>
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-green-400 font-semibold text-sm">✓ Full Access</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-[#202225]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'overview'
                ? 'text-white border-b-2 border-[#8B5CF6]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'users'
                ? 'text-white border-b-2 border-[#8B5CF6]'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </div>
          </button>
          <button
            onClick={handleViewRevenue}
            className="px-6 py-3 font-semibold text-gray-400 hover:text-gray-300 transition"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Revenue Dashboard →
            </div>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 opacity-80" />
                  <Activity className="w-5 h-5 opacity-60" />
                </div>
                <div className="text-3xl font-bold mb-1">{(stats?.total_users ?? 0).toLocaleString()}</div>
                <div className="text-white/80 text-sm">Total Users</div>
                <div className="mt-2 text-xs text-white/60">
                  {stats.active_users_today} active today
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-8 h-8 opacity-80" />
                  <TrendingUp className="w-5 h-5 opacity-60" />
                </div>
                <div className="text-3xl font-bold mb-1">${(stats?.total_revenue ?? 0).toFixed(2)}</div>
                <div className="text-white/80 text-sm">Total Revenue</div>
                <div className="mt-2 text-xs text-white/60">All-time earnings</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Database className="w-8 h-8 opacity-80" />
                  <Zap className="w-5 h-5 opacity-60" />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {(stats?.marketplace_transactions ?? 0).toLocaleString()}
                </div>
                <div className="text-white/80 text-sm">Marketplace Sales</div>
                <div className="mt-2 text-xs text-white/60">Completed transactions</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <AlertTriangle className="w-8 h-8 opacity-80" />
                  <Server className="w-5 h-5 opacity-60" />
                </div>
                <div className="text-3xl font-bold mb-1">{stats.pending_withdrawals}</div>
                <div className="text-white/80 text-sm">Pending Withdrawals</div>
                <div className="mt-2 text-xs text-white/60">Require approval</div>
              </div>
            </div>

            {/* Token Economy Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <h3 className="text-white font-bold text-xl mb-4">Token Economy</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Tokens Earned</span>
                    <span className="text-green-400 font-bold text-lg">
                      {formatTokens(stats?.total_tokens_earned ?? 0, { showLabel: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Tokens Spent</span>
                    <span className="text-red-400 font-bold text-lg">
                      {formatTokens(stats?.total_tokens_spent ?? 0, { showLabel: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#202225]">
                    <span className="text-white font-semibold flex items-center gap-2">
                      <Coins className="w-5 h-5 text-yellow-400" />
                      Circulating Supply
                    </span>
                    <span className="text-yellow-400 font-bold text-xl">
                      {formatTokens(stats?.total_tokens_in_circulation ?? 0, { showLabel: true })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#202225]">
                <h3 className="text-white font-bold text-xl mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleViewRevenue}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-5 h-5" />
                    View Revenue Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="w-full px-4 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    Manage Users
                  </button>
                  <button
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchUsers(searchQuery)}
                  placeholder="Search by username or email..."
                  className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-[#202225] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#202225]">
                      <th className="text-left text-gray-400 font-semibold py-4 px-6">User</th>
                      <th className="text-left text-gray-400 font-semibold py-4 px-6">Role</th>
                      <th className="text-right text-gray-400 font-semibold py-4 px-6">Tokens</th>
                      <th className="text-left text-gray-400 font-semibold py-4 px-6">Status</th>
                      <th className="text-left text-gray-400 font-semibold py-4 px-6">Joined</th>
                      <th className="text-right text-gray-400 font-semibold py-4 px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-[#202225] hover:bg-[#0f0f0f] transition">
                        <td className="py-4 px-6">
                          <div>
                            <div className="text-white font-semibold">{user.username}</div>
                            <div className="text-gray-400 text-sm">{user.email}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleChangeRole(user.id, user.username, user.role)}
                            className="flex items-center gap-2 px-3 py-1 bg-[#0f0f0f] hover:bg-[#8B5CF6] text-white rounded-lg text-sm font-semibold transition group"
                            title="Click to change role"
                          >
                            <RoleBadge role={user.role} size="sm" />
                            {!['user'].includes(user.role) ? null : (
                              <span className="text-gray-400 group-hover:text-white">User</span>
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-6 text-right text-yellow-500 font-semibold">
                          {formatTokens(user.token_balance)}
                        </td>
                        <td className="py-4 px-6">
                          {user.is_banned ? (
                            <div className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-red-400 text-sm font-semibold">Banned</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-green-400 text-sm font-semibold">Active</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-gray-400 text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            {user.is_banned ? (
                              <button
                                onClick={() => handleUnbanUser(user.id, user.username)}
                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                                title="Unban user"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBanUser(user.id, user.username)}
                                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                                title="Ban user"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              className="p-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg transition"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

