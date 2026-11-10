import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Users, Shield, ArrowLeft, Trash2, Edit2, Plus, Trophy, ChevronRight, Upload, Mail, CheckSquare, Square, KeyRound, ShieldCheck, Check, X, SlidersHorizontal, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tournament } from '../types';
import InvitationsTab from './tabs/InvitationsTab';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  groupName: string;
  badge: string;
  items: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    groupName: "1. Quản lý Giải đấu",
    badge: "Tournament",
    items: [
      { key: "tournaments:create", label: "Tạo giải đấu mới", description: "Tạo giải, thiết lập thể thức, tải banner" },
      { key: "tournaments:edit", label: "Sửa thông tin giải đấu", description: "Đổi ngày giờ, địa điểm, cấu hình điểm" },
      { key: "tournaments:delete", label: "Xóa giải đấu", description: "Xóa hoàn toàn giải đấu và dữ liệu liên quan" }
    ]
  },
  {
    groupName: "2. Vận động viên (Players)",
    badge: "Players",
    items: [
      { key: "players:view", label: "Xem danh sách VĐV", description: "Xem hồ sơ các VĐV trong hệ thống" },
      { key: "players:manage", label: "Quản lý VĐV", description: "Thêm, sửa, xóa, import danh sách VĐV" }
    ]
  },
  {
    groupName: "3. Đội thi đấu (Teams)",
    badge: "Teams",
    items: [
      { key: "teams:manage", label: "Quản lý Đội thi đấu", description: "Tạo đội đơn/đôi, ghép cặp VĐV, xóa đội" }
    ]
  },
  {
    groupName: "4. Vòng quay Bốc thăm",
    badge: "Draw Lots",
    items: [
      { key: "draw:manage", label: "Bốc thăm may mắn", description: "Sử dụng vòng quay bốc thăm chia bảng" }
    ]
  },
  {
    groupName: "5. Bảng đấu (Groups)",
    badge: "Groups",
    items: [
      { key: "groups:manage", label: "Quản lý Bảng đấu", description: "Tạo bảng A/B/C/D, thêm bớt đội, sinh lịch vòng tròn" }
    ]
  },
  {
    groupName: "6. Nhánh Knock-out (Bracket)",
    badge: "Bracket",
    items: [
      { key: "bracket:manage", label: "Quản lý Nhánh đấu", description: "Tạo nhánh knockout, sinh nhánh tự động bắt chéo" }
    ]
  },
  {
    groupName: "7. Lịch thi đấu & Phân Sân",
    badge: "Schedule",
    items: [
      { key: "schedule:manage", label: "Lên lịch & Phân sân", description: "Xếp trận vào sân 1, 2, 3..., xếp giờ thi đấu" }
    ]
  },
  {
    groupName: "8. Trọng tài & Nhập điểm",
    badge: "Referee",
    items: [
      { key: "matches:score", label: "Nhập điểm trận đấu", description: "Chấm điểm trực tiếp trên bàn trọng tài" },
      { key: "referee:assign", label: "Phân công trọng tài", description: "Chỉ định trọng tài chính/phụ cho trận đấu" }
    ]
  },
  {
    groupName: "9. Thiệp mời điện tử (E-Invite)",
    badge: "Invitations",
    items: [
      { key: "invitations:design", label: "Thiết kế mẫu thiệp", description: "Tải phôi thiệp, căn chỉnh tọa độ chữ" },
      { key: "invitations:guests", label: "Quản lý khách mời", description: "Thêm khách, cấp mã mời, xuất danh sách" },
      { key: "invitations:share", label: "Gửi & Chia sẻ thiệp", description: "Lấy link gửi Zalo/Facebook, tải ảnh thiệp" }
    ]
  }
];

export const PRESETS = [
  {
    name: "🎯 Trọng tài sân",
    description: "Chỉ chấm điểm trận đấu và xem VĐV",
    perms: ["matches:score", "players:view"]
  },
  {
    name: "📋 Ban Chuyên môn / Thư ký",
    description: "Quản lý VĐV, đội, bảng đấu, lịch sân, bốc thăm",
    perms: ["players:manage", "players:view", "teams:manage", "draw:manage", "groups:manage", "bracket:manage", "schedule:manage", "referee:assign", "matches:score"]
  },
  {
    name: "💌 Ban Truyền thông & Khách mời",
    description: "Thiết kế thiệp, danh sách khách và chia sẻ thiệp",
    perms: ["invitations:design", "invitations:guests", "invitations:share", "players:view"]
  },
  {
    name: "⚡ Toàn quyền (Super Admin)",
    description: "Có đầy đủ mọi quyền trong hệ thống",
    perms: ["*"]
  }
];

interface Props {
  onBack: () => void;
  onManageTournament?: (t: Tournament) => void;
  initialTab?: 'users' | 'players' | 'tournaments' | 'invitations';
}

export default function AdminPanel({ onBack, onManageTournament, initialTab }: Props) {
  const { isAdmin, hasPermission, hasAnyPermission } = useAuth();
  const defaultTab = initialTab || (isAdmin ? 'users' : hasPermission('players:manage') ? 'players' : hasAnyPermission(['invitations:design', 'invitations:guests']) ? 'invitations' : 'tournaments');
  const [activeTab, setActiveTab] = useState<'users' | 'players' | 'tournaments' | 'invitations'>(defaultTab);
  const [users, setUsers] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'banner' | 'poster') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'banner') setUploadingBanner(true);
    else setUploadingPoster(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api('/upload', {
        method: 'POST',
        body: formData
      });
      if (editingTournament) {
        setEditingTournament(prev => prev ? ({
          ...prev,
          [type === 'banner' ? 'banner_url' : 'poster_url']: response.url
        }) : null);
      }
      alert(`${type === 'banner' ? 'Banner' : 'Poster'} uploaded successfully!`);
    } catch (error: any) {
      console.error("Upload failed", error);
      alert(`Failed to upload ${type}: ${error.message || "Unknown error"}`);
    } finally {
      if (type === 'banner') setUploadingBanner(false);
      else setUploadingPoster(false);
    }
  };

  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' });
  const [newSelectedPerms, setNewSelectedPerms] = useState<string[]>(['matches:score', 'players:view']);
  const [editingUserPerms, setEditingUserPerms] = useState<any | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);

  const [newPlayer, setNewPlayer] = useState<any>({ name: '', phone: '', level: 'Beginner', birth_year: '', gender: 'M', team_name: '', tournament_ids: [] });
  const [editingPlayer, setEditingPlayer] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      if (isAdmin) {
        const u = await api('/users').catch(() => []);
        setUsers(u);
      }
      const p = await api('/players').catch(() => []);
      setPlayers(p);
      const t = await api('/tournaments').catch(() => []);
      setTournaments(t);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async () => {
    try {
      const perms = newUser.role === 'admin' ? ['*'] : newSelectedPerms;
      await api('/users', { 
        method: 'POST', 
        body: JSON.stringify({
          ...newUser,
          permissions: perms
        }) 
      });
      setNewUser({ username: '', password: '', role: 'staff' });
      setNewSelectedPerms(['matches:score', 'players:view']);
      fetchData();
      alert("Tạo người dùng và phân quyền thành công!");
    } catch (e: any) {
      console.error(e);
      alert("Lỗi tạo người dùng: " + (e.message || "Unknown error"));
    }
  };

  const handleOpenPermsModal = (user: any) => {
    setEditingUserPerms(user);
    const existing = Array.isArray(user.permissions) ? user.permissions : (user.role === 'admin' ? ['*'] : []);
    setSelectedPerms(existing);
  };

  const handleTogglePerm = (key: string, isCreateForm = false) => {
    if (isCreateForm) {
      setNewSelectedPerms(prev => {
        if (prev.includes('*')) return [key];
        if (prev.includes(key)) return prev.filter(k => k !== key);
        return [...prev, key];
      });
    } else {
      setSelectedPerms(prev => {
        if (prev.includes('*')) return [key];
        if (prev.includes(key)) return prev.filter(k => k !== key);
        return [...prev, key];
      });
    }
  };

  const handleApplyPreset = (perms: string[], isCreateForm = false) => {
    if (isCreateForm) {
      setNewSelectedPerms([...perms]);
    } else {
      setSelectedPerms([...perms]);
    }
  };

  const handleSaveUserPermissions = async () => {
    if (!editingUserPerms) return;
    setSavingPerms(true);
    try {
      await api(`/users/${editingUserPerms.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: selectedPerms })
      });
      setEditingUserPerms(null);
      fetchData();
      alert(`Đã cập nhật phân quyền cho tài khoản ${editingUserPerms.username}!`);
    } catch (e: any) {
      console.error(e);
      alert("Lỗi cập nhật quyền: " + (e.message || "Unknown error"));
    } finally {
      setSavingPerms(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament? All related data (matches, teams, groups) will be lost.')) return;
    try {
      await api(`/tournaments/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTournament = async () => {
    if (!editingTournament) return;
    try {
      await api(`/tournaments/${editingTournament.id}`, { 
        method: 'PUT',
        body: JSON.stringify(editingTournament)
      });
      setEditingTournament(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreatePlayer = async () => {
    try {
      await api('/players', { 
        method: 'POST', 
        body: JSON.stringify({
          ...newPlayer,
          birth_year: newPlayer.birth_year ? parseInt(newPlayer.birth_year) : null,
          tournament_ids: newPlayer.tournament_ids.map((id: any) => parseInt(id))
        }) 
      });
      setNewPlayer({ name: '', phone: '', level: 'Beginner', birth_year: '', gender: 'M', team_name: '', tournament_ids: [] });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;
    try {
      await api(`/players/${editingPlayer.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editingPlayer,
          birth_year: editingPlayer.birth_year ? parseInt(editingPlayer.birth_year) : null,
          tournament_ids: editingPlayer.tournament_ids.map((id: any) => parseInt(id))
        })
      });
      setEditingPlayer(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlayer = async (id: number) => {
    try {
      await api(`/players/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <div className="bg-[#0a0a0a] text-white px-6 py-4 flex items-center gap-4 sticky top-0 z-40">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold tracking-tight">CONTROL PANEL</h1>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex gap-4 mb-8 overflow-x-auto pb-1">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={cn("px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap", activeTab === 'users' ? 'bg-[#D4FF00] text-black' : 'bg-white text-gray-500 hover:bg-gray-50')}
            >
              <Shield size={18} /> PHÂN QUYỀN (RBAC)
            </button>
          )}
          {(isAdmin || hasPermission('players:manage')) && (
            <button
              onClick={() => setActiveTab('players')}
              className={cn("px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap", activeTab === 'players' ? 'bg-[#D4FF00] text-black' : 'bg-white text-gray-500 hover:bg-gray-50')}
            >
              <Users size={18} /> VẬN ĐỘNG VIÊN
            </button>
          )}
          {(isAdmin || hasAnyPermission(['tournaments:create', 'tournaments:edit'])) && (
            <button
              onClick={() => setActiveTab('tournaments')}
              className={cn("px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap", activeTab === 'tournaments' ? 'bg-[#D4FF00] text-black' : 'bg-white text-gray-500 hover:bg-gray-50')}
            >
              <Trophy size={18} /> GIẢI ĐẤU
            </button>
          )}
          {(isAdmin || hasAnyPermission(['invitations:design', 'invitations:guests'])) && (
            <button
              onClick={() => setActiveTab('invitations')}
              className={cn("px-6 py-3 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap", activeTab === 'invitations' ? 'bg-[#D4FF00] text-black' : 'bg-white text-gray-500 hover:bg-gray-50')}
            >
              <Mail size={18} /> THIỆP MỜI (E-INVITE)
            </button>
          )}
        </div>

        {activeTab === 'users' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Users List */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">DANH SÁCH TÀI KHOẢN</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Quản trị viên có thể tùy biến quyền hạn chi tiết cho từng người dùng</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-black text-[#D4FF00] px-3 py-1 rounded-full">
                    {users.length} Users
                  </span>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                  {users.map(u => {
                    const perms: string[] = Array.isArray(u.permissions) ? u.permissions : (u.role === 'admin' ? ['*'] : []);
                    const isAll = perms.includes('*') || u.role === 'admin';

                    return (
                      <div key={u.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-lg text-gray-900">{u.username}</span>
                            <span className={cn(
                              "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md font-bold",
                              u.role === 'admin' ? "bg-purple-100 text-purple-700" :
                              u.role === 'referee' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                              {u.role}
                            </span>
                          </div>

                          {/* Permissions Preview Badge */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isAll ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#D4FF00]/30 text-gray-900 border border-[#D4FF00] px-2 py-0.5 rounded">
                                <Sparkles size={11} className="text-yellow-600" /> Toàn quyền hệ thống (*)
                              </span>
                            ) : perms.length === 0 ? (
                              <span className="text-[11px] text-gray-400 italic">Chưa cấp quyền thao tác nào</span>
                            ) : (
                              <>
                                <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                  {perms.length} quyền được cấp:
                                </span>
                                {perms.slice(0, 3).map(p => (
                                  <span key={p} className="text-[10px] font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                    {p}
                                  </span>
                                ))}
                                {perms.length > 3 && (
                                  <span className="text-[10px] text-gray-500 font-bold">+{perms.length - 3}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleOpenPermsModal(u)}
                            className="px-3.5 py-2 bg-black text-[#D4FF00] hover:bg-gray-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                            title="Tích chọn chức năng cho tài khoản này"
                          >
                            <SlidersHorizontal size={14} /> Phân quyền
                          </button>
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              title="Xóa tài khoản"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Add New User Form */}
              <div className="lg:col-span-5">
                <div className="bg-[#0a0a0a] text-white p-6 rounded-3xl sticky top-24 shadow-xl border border-white/10 space-y-5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#D4FF00] text-black rounded-xl">
                      <Plus size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">THÊM TÀI KHOẢN MỚI</h3>
                      <p className="text-xs text-white/50">Tạo tài khoản và tích chọn quyền trực tiếp</p>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-1">Tên đăng nhập</label>
                      <input 
                        type="text" 
                        placeholder="Ví dụ: trongtai1, btc_thu_ky" 
                        value={newUser.username} 
                        onChange={e => setNewUser({...newUser, username: e.target.value})} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#D4FF00] placeholder:text-white/20" 
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-1">Mật khẩu</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={newUser.password} 
                        onChange={e => setNewUser({...newUser, password: e.target.value})} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#D4FF00] placeholder:text-white/20" 
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-1">Nhóm vai trò</label>
                      <select 
                        value={newUser.role} 
                        onChange={e => {
                          const r = e.target.value;
                          setNewUser({...newUser, role: r});
                          if (r === 'admin') setNewSelectedPerms(['*']);
                          else if (r === 'referee') setNewSelectedPerms(['matches:score', 'players:view']);
                        }} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#D4FF00]"
                      >
                        <option value="staff" className="text-black">Thành viên Ban Tổ Chức (Staff)</option>
                        <option value="referee" className="text-black">Trọng tài (Referee)</option>
                        <option value="admin" className="text-black">Quản trị viên cấp cao (Admin - Toàn quyền)</option>
                      </select>
                    </div>

                    {newUser.role !== 'admin' && (
                      <div className="pt-2 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-[#D4FF00] uppercase tracking-wider flex items-center gap-1">
                            <KeyRound size={12} /> Cấp quyền chức năng ({newSelectedPerms.length})
                          </label>
                          <button
                            type="button"
                            onClick={() => setNewSelectedPerms([])}
                            className="text-[10px] text-white/40 hover:text-white transition-colors"
                          >
                            Bỏ chọn hết
                          </button>
                        </div>

                        {/* Presets Chips */}
                        <div className="flex flex-wrap gap-1.5">
                          {PRESETS.filter(p => p.perms[0] !== '*').map(p => (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => handleApplyPreset(p.perms, true)}
                              className="text-[10px] font-bold px-2.5 py-1 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-white/80 transition-all active:scale-95"
                            >
                              {p.name.split(' ')[0]} {p.name.split(' ')[1]}
                            </button>
                          ))}
                        </div>

                        {/* Quick Checkboxes Accordion / List */}
                        <div className="max-h-56 overflow-y-auto pr-1 space-y-2.5 text-xs border border-white/5 p-2.5 rounded-xl bg-black/40">
                          {PERMISSION_GROUPS.map(grp => (
                            <div key={grp.groupName} className="space-y-1">
                              <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{grp.groupName}</div>
                              <div className="grid grid-cols-1 gap-1">
                                {grp.items.map(item => {
                                  const checked = newSelectedPerms.includes(item.key) || newSelectedPerms.includes('*');
                                  return (
                                    <label key={item.key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer select-none">
                                      <input 
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => handleTogglePerm(item.key, true)}
                                        className="accent-[#D4FF00] rounded"
                                      />
                                      <span className={cn("text-xs font-medium", checked ? "text-[#D4FF00]" : "text-white/70")}>
                                        {item.label}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleCreateUser} 
                      className="w-full mt-2 bg-[#D4FF00] text-black font-black py-3 rounded-xl hover:bg-[#bce600] flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-95 transition-transform shadow-lg shadow-[#D4FF00]/10"
                    >
                      <Plus size={18} /> TẠO TÀI KHOẢN
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Phân Quyền Hạt Nhân (RBAC Modal) */}
            <AnimatePresence>
              {editingUserPerms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setEditingUserPerms(null)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  />

                  {/* Modal Container */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-4xl max-h-[90vh] bg-[#121212] text-white border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                  >
                    {/* Modal Header */}
                    <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/50">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-[#D4FF00] text-black rounded-2xl">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold tracking-tight">
                            PHÂN QUYỀN CHỨC NĂNG: <span className="text-[#D4FF00]">{editingUserPerms.username}</span>
                          </h3>
                          <p className="text-xs text-white/50">
                            Tích chọn các chức năng tài khoản này được phép thao tác trong app.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setEditingUserPerms(null)}
                        className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Presets Bar */}
                    <div className="px-6 py-3 bg-white/5 border-b border-white/5 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white/50 flex items-center gap-1 mr-2">
                        <Sparkles size={13} className="text-[#D4FF00]" /> Mẫu chọn nhanh:
                      </span>
                      {PRESETS.map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleApplyPreset(preset.perms)}
                          className="px-3 py-1.5 bg-white/10 hover:bg-[#D4FF00] hover:text-black border border-white/10 rounded-xl text-xs font-bold transition-all active:scale-95"
                          title={preset.description}
                        >
                          {preset.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedPerms([])}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded-xl text-xs font-bold transition-all ml-auto"
                      >
                        Xóa tất cả quyền
                      </button>
                    </div>

                    {/* Permissions Matrix Body */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1">
                      {selectedPerms.includes('*') && (
                        <div className="p-4 bg-[#D4FF00]/10 border border-[#D4FF00]/40 rounded-2xl flex items-center gap-3 text-sm text-[#D4FF00]">
                          <Shield size={20} />
                          <span>Tài khoản hiện đang được gán quyền <strong>Toàn quyền Quản trị (Super Admin)</strong>. Tất cả mọi chức năng đều được cho phép.</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {PERMISSION_GROUPS.map(grp => (
                          <div 
                            key={grp.groupName} 
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 hover:border-white/20 transition-colors"
                          >
                            <div className="flex items-center justify-between border-b border-white/5 pb-2">
                              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#D4FF00]"></span>
                                {grp.groupName}
                              </h4>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">
                                {grp.badge}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {grp.items.map(item => {
                                const isChecked = selectedPerms.includes(item.key) || selectedPerms.includes('*');
                                return (
                                  <label
                                    key={item.key}
                                    onClick={() => handleTogglePerm(item.key)}
                                    className={cn(
                                      "flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                                      isChecked 
                                        ? "bg-[#D4FF00]/10 border-[#D4FF00]/50" 
                                        : "bg-black/20 border-white/5 hover:bg-white/5"
                                    )}
                                  >
                                    <div className="pt-0.5">
                                      {isChecked ? (
                                        <CheckSquare size={18} className="text-[#D4FF00]" />
                                      ) : (
                                        <Square size={18} className="text-white/30" />
                                      )}
                                    </div>
                                    <div className="space-y-0.5">
                                      <div className={cn("text-xs font-bold", isChecked ? "text-[#D4FF00]" : "text-white")}>
                                        {item.label}
                                      </div>
                                      <div className="text-[11px] text-white/50 leading-tight">
                                        {item.description}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-5 border-t border-white/10 flex items-center justify-between bg-black/60">
                      <div className="text-xs text-white/60">
                        Đang chọn: <strong className="text-[#D4FF00]">{selectedPerms.includes('*') ? 'Toàn bộ' : selectedPerms.length}</strong> quyền
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingUserPerms(null)}
                          className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-white/80"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          disabled={savingPerms}
                          onClick={handleSaveUserPermissions}
                          className="px-6 py-2.5 bg-[#D4FF00] text-black font-black rounded-xl text-xs uppercase tracking-wider hover:bg-[#bce600] active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-[#D4FF00]/10"
                        >
                          <Check size={16} /> {savingPerms ? 'Đang lưu...' : 'LƯU PHÂN QUYỀN'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-2xl font-bold">ALL PLAYERS</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {players.map(p => (
                  <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="font-bold text-lg flex items-center gap-2">
                        {p.name} 
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{p.gender}</span>
                      </div>
                      <div className="text-xs font-mono uppercase tracking-widest text-gray-500 mt-1">
                        {p.team_name || 'No Club'} • {p.level} {p.birth_year && `• ${p.birth_year}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingPlayer({
                            ...p,
                            tournament_ids: Array.isArray(p.tournament_ids) 
                              ? p.tournament_ids.map((id: any) => parseInt(id)) 
                              : p.tournament_id ? [parseInt(p.tournament_id)] : []
                          });
                        }} 
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeletePlayer(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                <h3 className="text-xl font-bold mb-4">ADD PLAYER DIRECTORY</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Full Name" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00]" />
                  <div className="grid grid-cols-2 gap-3">
                     <select value={newPlayer.gender} onChange={e => setNewPlayer({...newPlayer, gender: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00]">
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                    </select>
                    <input type="number" placeholder="Birth Year" value={newPlayer.birth_year} onChange={e => setNewPlayer({...newPlayer, birth_year: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00]" />
                  </div>
                  <input type="text" placeholder="Team/Club Name" value={newPlayer.team_name} onChange={e => setNewPlayer({...newPlayer, team_name: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00]" />
                   <select value={newPlayer.level} onChange={e => setNewPlayer({...newPlayer, level: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00]">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Pro">Pro</option>
                  </select>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block pl-1">ASSOCIATED TOURNAMENTS (GIẢI ĐẤU THAM GIA)</label>
                    <div className="max-h-36 overflow-y-auto bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                      {tournaments.map(t => {
                        const isChecked = newPlayer.tournament_ids?.includes(parseInt(t.id));
                        return (
                          <label key={t.id} className="flex items-center gap-2.5 text-xs font-bold text-gray-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked || false}
                              onChange={() => {
                                const tId = parseInt(t.id);
                                const currentIds = newPlayer.tournament_ids || [];
                                const newIds = currentIds.includes(tId)
                                  ? currentIds.filter((id: number) => id !== tId)
                                  : [...currentIds, tId];
                                setNewPlayer({ ...newPlayer, tournament_ids: newIds });
                              }}
                              className="w-4 h-4 rounded border-gray-300 text-[#D4FF00] focus:ring-[#D4FF00]"
                            />
                            <span className="truncate">{t.name}</span>
                          </label>
                        );
                      })}
                      {tournaments.length === 0 && (
                        <div className="text-[10px] text-gray-400 font-bold uppercase pl-1 text-center py-2">No active tournaments</div>
                      )}
                    </div>
                  </div>

                  <button onClick={handleCreatePlayer} className="w-full bg-[#0a0a0a] text-white font-bold py-3 rounded-xl hover:bg-black flex items-center justify-center gap-2 mt-2">
                    <Plus size={18} /> ADD TO DIRECTORY
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">ALL TOURNAMENTS</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {tournaments.map(t => (
                  <div key={t.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 transition-colors gap-4">
                    <div>
                      <div className="font-bold text-lg">{t.name}</div>
                      <div className="text-xs font-mono uppercase tracking-widest text-gray-500 mt-1">
                        {t.format} • {t.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {onManageTournament && (
                        <button 
                          onClick={() => onManageTournament(t)}
                          className="px-4 py-2 bg-[#0a0a0a] text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-colors"
                        >
                          Manage <ChevronRight size={16} />
                        </button>
                      )}
                      <button onClick={() => setEditingTournament(t)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full bg-blue-50">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteTournament(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full bg-red-50">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {tournaments.length === 0 && (
                   <div className="p-8 text-center text-gray-400 font-medium">No tournaments available. Create one from the home page.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {editingTournament && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative">
              <button onClick={() => setEditingTournament(null)} className="absolute top-6 right-6 text-gray-400 hover:text-black">
                <Trash2 size={24} className="rotate-45" /> {/* Close icon substitute */}
              </button>
              <h3 className="text-3xl font-black mb-8 tracking-tighter uppercase">Edit Tournament</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Tournament Name</label>
                  <input type="text" value={editingTournament.name} onChange={e => setEditingTournament({...editingTournament, name: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Format</label>
                    <select value={editingTournament.format} onChange={e => setEditingTournament({...editingTournament, format: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold">
                      <option value="knockout">Knockout</option>
                      <option value="round-robin">Round-Robin</option>
                      <option value="round-robin-knockout">Round-Robin & Knockout</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Location</label>
                    <input type="text" value={editingTournament.location || ''} onChange={e => setEditingTournament({...editingTournament, location: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Match Type</label>
                    <select value={editingTournament.match_type || 'Doubles'} onChange={e => setEditingTournament({...editingTournament, match_type: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold">
                      <option value="Singles">Singles</option>
                      <option value="Doubles">Doubles</option>
                      <option value="Men's Doubles">Men's Doubles</option>
                      <option value="Women's Doubles">Women's Doubles</option>
                      <option value="Mixed Doubles">Mixed Doubles</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Scoring Format</label>
                    <select value={editingTournament.scoring_format || '11_win_by_2'} onChange={e => setEditingTournament({...editingTournament, scoring_format: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm">
                      <option value="11">Chạm 11 (First to 11)</option>
                      <option value="11_win_by_2">Chạm 11 cách 2 (11 Win by 2)</option>
                      <option value="15">Chạm 15 (First to 15)</option>
                      <option value="15_win_by_2">Chạm 15 cách 2 (15 Win by 2)</option>
                      <option value="21">Chạm 21 (First to 21)</option>
                      <option value="21_win_by_2">Chạm 21 cách 2 (21 Win by 2)</option>
                      <option value="25">Chạm 25 (First to 25)</option>
                      <option value="25_win_by_2">Chạm 25 cách 2 (25 Win by 2)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-bold mb-2">Banner Image</label>
                     <div className="flex gap-2">
                       <input type="text" value={editingTournament.banner_url || ''} onChange={e => setEditingTournament({...editingTournament, banner_url: e.target.value})} className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-xs" />
                       <button 
                         onClick={() => bannerInputRef.current?.click()}
                         disabled={uploadingBanner}
                         className="bg-black text-white px-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center"
                       >
                         {uploadingBanner ? <span className="text-xs font-bold px-2">UPLOADING...</span> : <Upload size={18} />}
                       </button>
                       <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
                     </div>
                  </div>
                  <div>
                     <label className="block text-sm font-bold mb-2">Poster Image</label>
                     <div className="flex gap-2">
                       <input type="text" value={editingTournament.poster_url || ''} onChange={e => setEditingTournament({...editingTournament, poster_url: e.target.value})} className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-xs" />
                       <button 
                         onClick={() => posterInputRef.current?.click()}
                         disabled={uploadingPoster}
                         className="bg-black text-white px-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center"
                       >
                         {uploadingPoster ? <span className="text-xs font-bold px-2">UPLOADING...</span> : <Upload size={18} />}
                       </button>
                       <input type="file" ref={posterInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'poster')} />
                     </div>
                  </div>
                </div>
              </div>
              
              <button onClick={handleUpdateTournament} className="w-full mt-8 py-4 bg-[#D4FF00] text-black rounded-xl font-black text-lg flex items-center justify-center gap-2 hover:bg-[#bce600]">
                SAVE CHANGES
              </button>
            </div>
          </div>
        )}

        {editingPlayer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative">
              <button onClick={() => setEditingPlayer(null)} className="absolute top-6 right-6 text-gray-400 hover:text-black">
                <Trash2 size={24} className="rotate-45" />
              </button>
              <h3 className="text-3xl font-black mb-8 tracking-tighter uppercase">Edit Player Information</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2">Full Name</label>
                  <input type="text" value={editingPlayer.name} onChange={e => setEditingPlayer({...editingPlayer, name: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Gender</label>
                    <select value={editingPlayer.gender} onChange={e => setEditingPlayer({...editingPlayer, gender: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold">
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Birth Year</label>
                    <input type="number" value={editingPlayer.birth_year || ''} onChange={e => setEditingPlayer({...editingPlayer, birth_year: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Team/Club Name</label>
                    <input type="text" value={editingPlayer.team_name || ''} onChange={e => setEditingPlayer({...editingPlayer, team_name: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Skill Level</label>
                    <select value={editingPlayer.level} onChange={e => setEditingPlayer({...editingPlayer, level: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 font-bold">
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Pro">Pro</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold mb-2">Associated Tournaments (Tích chọn giải đấu)</label>
                  <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2.5">
                    {tournaments.map(t => {
                      const isChecked = editingPlayer.tournament_ids?.includes(parseInt(t.id));
                      return (
                        <label key={t.id} className="flex items-center gap-3 text-sm font-bold text-gray-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked || false}
                            onChange={() => {
                              const tId = parseInt(t.id);
                              const currentIds = editingPlayer.tournament_ids || [];
                              const newIds = currentIds.includes(tId)
                                ? currentIds.filter((id: number) => id !== tId)
                                : [...currentIds, tId];
                              setEditingPlayer({ ...editingPlayer, tournament_ids: newIds });
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#D4FF00] focus:ring-[#D4FF00]"
                          />
                          <span className="truncate">{t.name}</span>
                        </label>
                      );
                    })}
                    {tournaments.length === 0 && (
                      <div className="text-xs text-gray-400 font-bold uppercase pl-1 text-center py-2">No active tournaments</div>
                    )}
                  </div>
                </div>
              </div>
              
              <button onClick={handleUpdatePlayer} className="w-full mt-8 py-4 bg-[#D4FF00] text-black rounded-xl font-black text-lg flex items-center justify-center gap-2 hover:bg-[#bce600]">
                SAVE CHANGES
              </button>
            </div>
          </div>
        )}

        {activeTab === 'invitations' && (
          <InvitationsTab />
        )}
      </div>
    </div>
  );
}
