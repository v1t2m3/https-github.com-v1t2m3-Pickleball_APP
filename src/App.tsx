import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Trophy, ListChecks, Plus, LogIn, ChevronRight, Activity, LogOut, Upload, Image as ImageIcon, Shield, Mail, Trash2, MapPin, Clock, Users, Dices } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tournament, TournamentType } from './types';
import TournamentView from './components/TournamentView';
import Login from './components/Login';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
import { api } from './lib/api';

const AdminPanel = lazy(() => import('./components/AdminPanel'));
const PickerWheel = lazy(() => import('./components/PickerWheel'));
const PublicInvitationView = lazy(() => import('./components/PublicInvitationView'));

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { user, isAuthenticated, logout, isAdmin, isReferee, hasPermission, hasAnyPermission } = useAuth();
  const toast = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingSocial, setIsCreatingSocial] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminPanelInitialTab, setAdminPanelInitialTab] = useState<'users' | 'players' | 'tournaments' | 'invitations'>('users');
  const [isPickerWheelOpen, setIsPickerWheelOpen] = useState(false);
  const [activeInvitationToken, setActiveInvitationToken] = useState<string | null>(null);

  const [newTournament, setNewTournament] = useState({
    name: '',
    type: 'knockout' as TournamentType,
    banner_url: '',
    poster_url: '',
    start_time: '',
    location: '',
    max_participants: 16,
    match_type: 'Doubles',
    scoring_format: '11_win_by_2'
  });

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  const fetchTournaments = async () => {
    try {
      const data = await api('/tournaments');
      setTournaments(data);
    } catch (error) {
      console.error("Failed to fetch tournaments:", error);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  // Modern Web Guidance: Platform Controls Dismiss Dialog (Escape key closes open overlay modals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreating) setIsCreating(false);
        else if (isLoginOpen) setIsLoginOpen(false);
        else if (isAdminPanelOpen) setIsAdminPanelOpen(false);
        else if (isPickerWheelOpen) setIsPickerWheelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreating, isLoginOpen, isAdminPanelOpen, isPickerWheelOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let token = params.get('t') || params.get('token');
    
    // Also support direct path matching like /invite?t=... or /invite/:token
    if (!token && window.location.pathname.startsWith('/invite')) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && parts[0] === 'invite') {
        token = parts[1];
      }
    }

    if (token) {
      setActiveInvitationToken(token);
    }
  }, []);

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
        body: formData,
      });

      setNewTournament(prev => ({
        ...prev,
        [type === 'banner' ? 'banner_url' : 'poster_url']: response.url
      }));
      toast.success(`${type === 'banner' ? 'Banner' : 'Poster'} đã được tải lên thành công!`);
    } catch (error: any) {
      console.error("Upload failed", error);
      toast.error(`Lỗi tải ${type}: ${error.message || "Không xác định"}`);
    } finally {
      if (type === 'banner') setUploadingBanner(false);
      else setUploadingPoster(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!newTournament.name) return;
    try {
      await api('/tournaments', {
        method: 'POST',
        body: JSON.stringify({
          name: newTournament.name,
          format: newTournament.type,
          banner_url: newTournament.banner_url,
          poster_url: newTournament.poster_url,
          start_time: newTournament.start_time,
          location: newTournament.location,
          max_participants: newTournament.max_participants,
          match_type: newTournament.match_type,
          scoring_format: newTournament.scoring_format
        })
      });
      setIsCreating(false);
      setNewTournament({
        name: '', type: 'knockout', banner_url: '', poster_url: '',
        start_time: '', location: '', max_participants: 16,
        match_type: 'Doubles', scoring_format: '11_win_by_2'
      });
      fetchTournaments();
      toast.success("Tạo giải đấu thành công!");
    } catch (error: any) {
      console.error("Create failed", error);
      toast.error("Không thể tạo giải đấu: " + (error.message || "Lỗi không xác định"));
    }
  };

  const handleInvitationClick = () => {
    if (isAdmin) {
      setAdminPanelInitialTab('invitations');
      setIsAdminPanelOpen(true);
    } else {
      toast.error("Vui lòng đăng nhập với quyền Admin để thiết kế và quản lý mẫu thiệp mời.");
      setIsLoginOpen(true);
    }
  };

  if (activeInvitationToken) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#070708] flex items-center justify-center text-[#D4FF00] font-mono text-xs uppercase tracking-widest">Đang tải thiệp mời...</div>}>
        <PublicInvitationView token={activeInvitationToken} onBack={() => {
          window.history.replaceState({}, document.title, "/");
          setActiveInvitationToken(null);
        }} />
      </Suspense>
    );
  }

  if (isPickerWheelOpen) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#070708] flex items-center justify-center text-[#D4FF00] font-mono text-xs uppercase tracking-widest">Đang tải vòng quay...</div>}>
        <PickerWheel onBack={() => setIsPickerWheelOpen(false)} />
      </Suspense>
    );
  }

  const canOpenControlPanel = isAdmin || hasAnyPermission(['players:manage', 'tournaments:create', 'tournaments:edit', 'tournaments:delete', 'invitations:design', 'invitations:guests']);

  const handleDeleteTournament = async (t: Tournament, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa giải đấu "${t.name}" không?\n\nToàn bộ dữ liệu trận đấu, bảng đấu, đội thi đấu sẽ bị xóa vĩnh viễn.`)) {
      return;
    }
    try {
      await api(`/tournaments/${t.id}`, { method: 'DELETE' });
      toast.success(`Đã xóa giải đấu "${t.name}" thành công!`);
      fetchTournaments();
    } catch (error: any) {
      console.error("Delete tournament failed:", error);
      toast.error(`Lỗi khi xóa giải đấu: ${error.message || "Không thể xóa giải đấu"}`);
    }
  };

  if (isAdminPanelOpen && canOpenControlPanel) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#070708] flex items-center justify-center text-[#D4FF00] font-mono text-xs uppercase tracking-widest">Đang tải bảng quản trị...</div>}>
        <AdminPanel
          onBack={() => {
            setIsAdminPanelOpen(false);
            fetchTournaments();
          }}
          initialTab={adminPanelInitialTab}
          onManageTournament={(t) => {
            setIsAdminPanelOpen(false);
            setSelectedTournament(t);
            fetchTournaments();
          }}
        />
      </Suspense>
    );
  }

  if (selectedTournament) {
    return (
      <TournamentView
        tournament={selectedTournament}
        onBack={() => {
          setSelectedTournament(null);
          fetchTournaments();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans">
      {/* Header */}
      <header className="bg-[#0a0a0a] text-white px-3 sm:px-6 py-2.5 sm:py-3.5 flex justify-between items-center sticky top-0 z-50 pt-safe shadow-lg border-b border-white/5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0" onClick={() => { setSelectedTournament(null); setIsAdminPanelOpen(false); setIsPickerWheelOpen(false); }}>
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#D4FF00] rounded-lg flex items-center justify-center shrink-0">
              <Activity className="text-black w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight shrink-0">Pickleball Pro</h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setIsPickerWheelOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/15 text-[#D4FF00] rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 active:scale-[0.98] border border-white/10 shrink-0 cursor-pointer"
              title="Bốc thăm ngẫu nhiên"
            >
              <Dices size={14} />
              <span className="hidden sm:inline">Bốc thăm</span>
            </button>

            <button
              onClick={handleInvitationClick}
              className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/15 text-[#D4FF00] rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 active:scale-[0.98] border border-white/10 shrink-0 cursor-pointer"
              title="Thiệp mời điện tử"
            >
              <Mail size={14} />
              <span className="hidden sm:inline">Thiệp mời</span>
            </button>
          </div>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {canOpenControlPanel && (
              <button
                onClick={() => setIsAdminPanelOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-[#D4FF00] text-black rounded-lg hover:bg-[#c2eb00] active:scale-[0.98] transition-colors cursor-pointer"
                title="Quản trị hệ thống"
              >
                <Shield size={14} />
                <span className="hidden md:inline">Quản trị</span>
              </button>
            )}
            <span className="text-xs font-mono opacity-80 hidden lg:inline text-[#D4FF00]">
              {user?.username} ({user?.role})
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-white/10 rounded-lg hover:bg-white/15 active:scale-[0.98] transition-colors text-white/90 cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsLoginOpen(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#D4FF00] hover:bg-[#c2eb00] text-black rounded-lg font-semibold text-xs sm:text-sm active:scale-[0.98] transition-colors shrink-0 cursor-pointer"
          >
            <LogIn size={15} />
            <span>Đăng nhập</span>
          </button>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 pb-16">
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 text-gray-900">Giải đấu đang diễn ra</h2>
              <p className="text-xs sm:text-sm text-gray-500">Tham gia theo dõi và quản lý lịch thi đấu thể thao.</p>
            </div>
            {(isAdmin || hasPermission('tournaments:create')) && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setIsCreatingSocial(true);
                    setNewTournament({
                      name: '',
                      type: 'social' as any,
                      location: '',
                      max_participants: 20,
                      banner_url: '',
                      poster_url: '',
                      start_time: '',
                      match_type: 'Doubles',
                      scoring_format: '11_win_by_2'
                    });
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-semibold active:scale-[0.98] transition-colors text-xs cursor-pointer border border-gray-200"
                >
                  <Users size={15} className="text-gray-600" />
                  <span>Giải giao lưu</span>
                </button>
                <button
                  onClick={() => {
                    setIsCreating(true);
                    setIsCreatingSocial(false);
                    setNewTournament({
                      name: '',
                      location: '',
                      start_time: '',
                      max_participants: 16,
                      type: 'knockout',
                      banner_url: '',
                      poster_url: '',
                      match_type: 'Doubles',
                      scoring_format: '11_win_by_2'
                    });
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0a0a0a] hover:bg-[#222] text-white rounded-xl font-semibold active:scale-[0.98] transition-colors text-xs cursor-pointer shadow-sm"
                >
                  <Plus size={15} />
                  <span>Tạo giải đấu</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {tournaments.map((t, idx) => (
              <motion.div
                key={t.id}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedTournament(t)}
                className="group cursor-pointer bg-white border border-gray-200 p-0 rounded-2xl hover:border-[#D4FF00] hover:shadow-xl transition-all relative overflow-hidden flex flex-col active:scale-[0.99] cv-auto"
              >
                {t.banner_url ? (
                  <div className="h-28 sm:h-32 w-full bg-gray-200 overflow-hidden">
                    <img 
                      src={t.banner_url} 
                      alt={t.name || "Banner"} 
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding="async"
                      {...(idx === 0 ? { fetchPriority: "high" as const } : {})}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" 
                    />
                  </div>
                ) : (
                  <div className="h-28 sm:h-32 w-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Trophy size={64} />
                    </div>
                  </div>
                )}

                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  <div className="mb-3">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full",
                      t.status === 'active' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {t.status || 'active'}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold mb-3 line-clamp-2 flex-1 text-gray-900">{t.name}</h3>

                  <div className="flex flex-col gap-1.5 text-gray-500 text-xs font-mono mb-4">
                    <div className="flex items-center gap-2 uppercase">
                      <ListChecks size={14} className="shrink-0 text-gray-400" />
                      <span className="truncate">{t.format || 'unknown format'}</span>
                    </div>
                    {t.location && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="shrink-0 text-gray-400" />
                        <span className="truncate">{t.location}</span>
                      </div>
                    )}
                    {t.start_time && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="shrink-0 text-gray-400" />
                        <span className="truncate">{new Date(t.start_time).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center text-gray-800 font-semibold text-xs sm:text-sm gap-1 group-hover:text-black">
                      Xem chi tiết <ChevronRight size={15} />
                    </div>
                    {(isAdmin || hasPermission('tournaments:delete')) && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTournament(t, e)}
                        className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors border border-red-200"
                        title="Xóa giải đấu"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {tournaments.length === 0 && !isCreating && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                <p className="text-gray-400 font-medium">No tournaments available.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginOpen && <Login onClose={() => setIsLoginOpen(false)} />}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 modal-contain-scroll"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-tournament-title"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm backdrop-contain-scroll"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl p-5 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar pb-8 modal-contain-scroll"
            >
              <h2 id="create-tournament-title" className="text-2xl sm:text-3xl font-bold mb-5 tracking-tight text-gray-900">
                {isCreatingSocial ? 'CREATE SOCIAL PLAY' : 'CREATE TOURNAMENT'}
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Tournament Name</label>
                    <input
                      type="text"
                      value={newTournament.name}
                      onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                      placeholder="e.g. Summer Smash 2024"
                      className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#D4FF00] transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Location</label>
                    <input
                      type="text"
                      value={newTournament.location}
                      onChange={(e) => setNewTournament({ ...newTournament, location: e.target.value })}
                      placeholder="e.g. Center Court"
                      className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#D4FF00] transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Start Time</label>
                    <input
                      type="datetime-local"
                      value={newTournament.start_time}
                      onChange={(e) => setNewTournament({ ...newTournament, start_time: e.target.value })}
                      className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#D4FF00] transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Max Participants</label>
                    <input
                      type="number"
                      value={newTournament.max_participants}
                      onChange={(e) => setNewTournament({ ...newTournament, max_participants: parseInt(e.target.value) || 16 })}
                      className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#D4FF00] transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Banner Image</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTournament.banner_url}
                        onChange={(e) => setNewTournament({ ...newTournament, banner_url: e.target.value })}
                        placeholder="Image URL or upload ->"
                        className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#D4FF00] transition-all outline-none"
                      />
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Poster Image</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newTournament.poster_url}
                        onChange={(e) => setNewTournament({ ...newTournament, poster_url: e.target.value })}
                        placeholder="Image URL or upload ->"
                        className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#D4FF00] transition-all outline-none"
                      />
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

                {!isCreatingSocial && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Format</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['knockout', 'round-robin', 'round-robin-knockout']).map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewTournament({ ...newTournament, type: type as any })}
                          className={cn(
                            "px-4 py-3 rounded-xl font-bold text-xs border-2 transition-all capitalize",
                            newTournament.type === type
                              ? "bg-[#D4FF00]/10 border-[#D4FF00] text-black"
                              : "border-gray-100 hover:border-gray-200 text-gray-400"
                          )}
                        >
                          {type.replace(/-/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Match Type</label>
                    <select
                      value={newTournament.match_type}
                      onChange={(e) => setNewTournament({ ...newTournament, match_type: e.target.value })}
                      className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#D4FF00] outline-none"
                    >
                      <option value="Singles">Singles</option>
                      <option value="Doubles">Doubles</option>
                      <option value="Men Doubles">Men Doubles</option>
                      <option value="Women Doubles">Women Doubles</option>
                      <option value="Mixed Doubles">Mixed Doubles</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Scoring</label>
                    <select
                      value={newTournament.scoring_format}
                      onChange={(e) => setNewTournament({ ...newTournament, scoring_format: e.target.value })}
                      className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#D4FF00] outline-none"
                    >
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

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-6 py-4 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleCreateTournament}
                    className="flex-1 px-6 py-4 bg-[#0a0a0a] text-white rounded-xl font-bold hover:bg-[#1a1a1a] transition-colors"
                  >
                    CREATE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
