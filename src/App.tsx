import { useState, useEffect, useRef } from 'react';
import { Trophy, ListChecks, Plus, LogIn, ChevronRight, Activity, LogOut, Upload, Image as ImageIcon, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tournament, TournamentType } from './types';
import TournamentView from './components/TournamentView';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './contexts/AuthContext';
import { api } from './lib/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const { user, isAuthenticated, logout, isAdmin, isReferee } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  
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
      alert(`${type === 'banner' ? 'Banner' : 'Poster'} uploaded successfully!`);
    } catch (error: any) {
      console.error("Upload failed", error);
      alert(`Failed to upload ${type}: ${error.message || "Unknown error"}`);
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
    } catch (error: any) {
      console.error("Create failed", error);
      alert("Failed to create tournament: " + (error.message || "Unknown error"));
    }
  };

  if (isAdminPanelOpen && isAdmin) {
    return <AdminPanel 
      onBack={() => setIsAdminPanelOpen(false)} 
      onManageTournament={(t) => {
        setIsAdminPanelOpen(false);
        setSelectedTournament(t);
      }}
    />;
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
      <header className="bg-[#0a0a0a] text-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#D4FF00] rounded-full flex items-center justify-center">
            <Activity className="text-black w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">PICKLEBALL PRO</h1>
        </div>
        
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            {isAdmin && (
              <button 
                onClick={() => setIsAdminPanelOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#D4FF00] text-black rounded-full hover:bg-[#bce600] transition-colors"
              >
                <Shield size={14} /> Control Panel
              </button>
            )}
            <span className="text-xs font-mono opacity-80 hidden sm:inline text-[#D4FF00]">
              {user?.username} ({user?.role})
            </span>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsLoginOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4FF00] text-black rounded-full font-bold text-sm hover:scale-105 transition-transform"
          >
            <LogIn size={16} />
            LOGIN
          </button>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <section className="mb-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-4xl font-bold tracking-tighter mb-2">ACTIVE TOURNAMENTS</h2>
              <p className="text-gray-500 font-medium">Join or manage your pickleball events effortlessly.</p>
            </div>
            {(isAdmin || isReferee) && (
              <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white rounded-xl font-bold hover:bg-[#1a1a1a] transition-colors"
              >
                <Plus size={20} />
                NEW TOURNAMENT
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <motion.div 
                key={t.id}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedTournament(t)}
                className="group cursor-pointer bg-white border border-gray-200 p-0 rounded-2xl hover:border-[#D4FF00] hover:shadow-xl transition-all relative overflow-hidden flex flex-col"
              >
                {t.banner_url ? (
                   <div className="h-32 w-full bg-gray-200">
                     <img src={t.banner_url} alt="Banner" className="w-full h-full object-cover" />
                   </div>
                ) : (
                   <div className="h-32 w-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy size={64} />
                      </div>
                   </div>
                )}
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                      t.status === 'active' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {t.status || 'active'}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold mb-4 line-clamp-2 flex-1">{t.name}</h3>
                  
                  <div className="flex flex-col gap-2 text-gray-400 text-xs font-mono mb-4">
                    <div className="flex items-center gap-2 uppercase">
                      <ListChecks size={14} />
                      {t.format || 'unknown format'}
                    </div>
                    {t.location && (
                      <div className="flex items-center gap-2 uppercase">
                        📍 {t.location}
                      </div>
                    )}
                    {t.start_time && (
                      <div className="flex items-center gap-2 uppercase">
                        ⏰ {new Date(t.start_time).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center text-[#0a0a0a] font-bold text-sm gap-1 pt-4 border-t border-gray-100">
                    VIEW DETAILS <ChevronRight size={16} />
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-bold mb-6 tracking-tight">CREATE TOURNAMENT</h2>
              
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
                      <option value="11">First to 11</option>
                      <option value="11_win_by_2">11 (Win by 2)</option>
                      <option value="15">First to 15</option>
                      <option value="15_win_by_2">15 (Win by 2)</option>
                      <option value="21">First to 21</option>
                      <option value="25">First to 25</option>
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
