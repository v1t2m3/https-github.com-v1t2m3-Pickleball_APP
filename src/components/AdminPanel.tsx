import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Users, Shield, ArrowLeft, Trash2, Edit2, Plus, Trophy, ChevronRight, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { Tournament } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  onBack: () => void;
  onManageTournament?: (t: Tournament) => void;
}

export default function AdminPanel({ onBack, onManageTournament }: Props) {
  const [activeTab, setActiveTab] = useState<'users' | 'players' | 'tournaments'>('users');
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

  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'referee' });
  const [newPlayer, setNewPlayer] = useState({ name: '', phone: '', level: 'Beginner', birth_year: '', gender: 'M', team_name: '', tournament_id: '' });

  const fetchData = async () => {
    try {
      const u = await api('/users');
      setUsers(u);
      const p = await api('/players');
      setPlayers(p);
      const t = await api('/tournaments');
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
      await api('/users', { method: 'POST', body: JSON.stringify(newUser) });
      setNewUser({ username: '', password: '', role: 'referee' });
      fetchData();
      alert("User created successfully!");
    } catch (e: any) {
      console.error(e);
      alert("Failed to create user: " + (e.message || "Unknown error"));
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
          tournament_id: newPlayer.tournament_id ? parseInt(newPlayer.tournament_id) : null
        }) 
      });
      setNewPlayer({ name: '', phone: '', level: 'Beginner', birth_year: '', gender: 'M', team_name: '', tournament_id: '' });
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
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={cn("px-6 py-3 rounded-xl font-bold flex items-center gap-2", activeTab === 'users' ? 'bg-[#D4FF00] text-black' : 'bg-white text-gray-500 hover:bg-gray-50')}
          >
            <Shield size={18} /> USERS (Admin/Referee)
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={cn("px-6 py-3 rounded-xl font-bold flex items-center gap-2", activeTab === 'players' ? 'bg-[#D4FF00] text-black' : 'bg-white text-gray-500 hover:bg-gray-50')}
          >
            <Users size={18} /> GLOBAL PLAYERS
          </button>
          <button
            onClick={() => setActiveTab('tournaments')}
            className={cn("px-6 py-3 rounded-xl font-bold flex items-center gap-2", activeTab === 'tournaments' ? 'bg-[#D4FF00] text-black' : 'bg-white text-gray-500 hover:bg-gray-50')}
          >
            <Trophy size={18} /> TOURNAMENTS
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-2xl font-bold">SYSTEM USERS</h3>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                {users.map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <div className="font-bold text-lg">{u.username}</div>
                      <div className="text-xs font-mono uppercase tracking-widest text-gray-400">{u.role}</div>
                    </div>
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="bg-[#0a0a0a] text-white p-6 rounded-2xl sticky top-24">
                <h3 className="text-xl font-bold mb-4">ADD NEW USER</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#D4FF00]" />
                  <input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#D4FF00]" />
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-white/10 border-none rounded-xl px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#D4FF00]">
                    <option value="referee" className="text-black">Referee</option>
                    <option value="admin" className="text-black">Admin</option>
                  </select>
                  <button onClick={handleCreateUser} className="w-full bg-[#D4FF00] text-black font-bold py-3 rounded-xl hover:bg-[#bce600] flex items-center justify-center gap-2">
                    <Plus size={18} /> CREATE USER
                  </button>
                </div>
              </div>
            </div>
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
                    <button onClick={() => handleDeletePlayer(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                      <Trash2 size={18} />
                    </button>
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
                  <select 
                    value={newPlayer.tournament_id} 
                    onChange={e => setNewPlayer({...newPlayer, tournament_id: e.target.value})} 
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00] text-sm"
                  >
                    <option value="">Không liên kết (VĐV chung hệ thống)</option>
                    {tournaments.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
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
                          <option value="11_win_by_2">First to 11 (Win by 2)</option>
                          <option value="15_win_by_2">First to 15 (Win by 2)</option>
                          <option value="21_win_by_2">First to 21 (Win by 2)</option>
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
          </div>
        )}
      </div>
    </div>
  );
}
