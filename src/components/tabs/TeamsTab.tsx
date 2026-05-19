import { useState, useEffect } from 'react';
import { Tournament } from '../../types';
import { api } from '../../lib/api';
import { Plus, Trash2, Users, Building } from 'lucide-react';

export default function TeamsTab({ tournament, isOwner }: { tournament: Tournament; isOwner: boolean }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [newTeam, setNewTeam] = useState({ name: '', p1: '', p2: '' });
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const loadData = async () => {
    try {
      const p = await api(showAllPlayers ? '/players' : `/players?tournament_id=${tournament.id}`);
      setPlayers(p);
      const t = await api(`/tournaments/${tournament.id}/teams`);
      setTeams(t);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [showAllPlayers, tournament.id]);

  const handleCreateTeam = async () => {
    if (!newTeam.p1) return;
    try {
      await api(`/tournaments/${tournament.id}/teams`, {
        method: 'POST',
        body: JSON.stringify({
          name: newTeam.name,
          player1_id: parseInt(newTeam.p1),
          player2_id: newTeam.p2 ? parseInt(newTeam.p2) : null
        })
      });
      setNewTeam({ name: '', p1: '', p2: '' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api(`/tournaments/${tournament.id}/teams/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const isDoubles = tournament?.match_type?.toLowerCase()?.includes('doubles') || false;

  // Group teams by club / company / group
  const groupedTeams = teams.reduce((groups: { [key: string]: any[] }, t) => {
    const club = t.p1_club || t.p2_club || 'Tự do / Khác';
    if (!groups[club]) {
      groups[club] = [];
    }
    groups[club].push(t);
    return groups;
  }, {});

  // Sort club names alphabetically, keeping "Tự do / Khác" at the end
  const sortedClubs = Object.keys(groupedTeams).sort((a, b) => {
    if (a === 'Tự do / Khác') return 1;
    if (b === 'Tự do / Khác') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-8">
      {isOwner && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={20} /> {isDoubles ? 'PAIR PLAYERS (DOUBLES)' : 'REGISTER PLAYER (SINGLES)'}
          </h3>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select 
                value={newTeam.p1} 
                onChange={e => setNewTeam({...newTeam, p1: e.target.value})}
                className="bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none"
              >
                <option value="">Select Player 1</option>
                {players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.gender})</option>)}
              </select>

              {isDoubles && (
                <select 
                  value={newTeam.p2} 
                  onChange={e => setNewTeam({...newTeam, p2: e.target.value})}
                  className="bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none"
                >
                  <option value="">Select Player 2</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.gender})</option>)}
                </select>
              )}

              <input 
                type="text" 
                placeholder="Custom Team Name (Optional)" 
                value={newTeam.name}
                onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                className="bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none"
              />

              <button 
                onClick={handleCreateTeam}
                className="bg-[#0a0a0a] text-white font-bold py-3 rounded-xl hover:bg-[#1a1a1a] flex items-center justify-center gap-2"
              >
                <Plus size={18} /> {isDoubles ? 'CREATE PAIR' : 'REGISTER'}
              </button>
            </div>
            
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={showAllPlayers} 
                onChange={(e) => setShowAllPlayers(e.target.checked)}
                className="rounded border-gray-300 text-[#D4FF00] focus:ring-[#D4FF00] w-4 h-4 cursor-pointer"
              />
              Hiển thị tất cả VĐV hệ thống (Bỏ qua lọc theo Giải đấu)
            </label>
          </div>
        </div>
      )}

      <div className="space-y-10">
        {sortedClubs.map(clubName => {
          const clubTeams = groupedTeams[clubName];
          return (
            <div key={clubName} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <Building className="text-[#D4FF00] bg-black p-1.5 rounded-lg" size={28} />
                <div>
                  <h4 className="font-black text-base sm:text-lg uppercase tracking-tight text-gray-900">
                    {clubName === 'Tự do / Khác' ? '🌱 ' : '🏢 '}
                    {clubName}
                  </h4>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {clubTeams.length} cặp / đội tham gia
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clubTeams.map(t => (
                  <div key={t.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start hover:border-[#D4FF00] transition-colors relative overflow-hidden group">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg text-gray-900 truncate">{t.name}</div>
                      <div className="text-sm text-gray-500 mt-3 flex flex-col gap-1.5">
                        <span className="flex items-center gap-2 truncate">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          <span className="font-semibold text-gray-700">{t.p1_name}</span>
                          {t.p1_club && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{t.p1_club}</span>}
                        </span>
                        {t.p2_name && (
                          <span className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                            <span className="font-semibold text-gray-700">{t.p2_name}</span>
                            {t.p2_club && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{t.p2_club}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={() => handleDelete(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full active:scale-95 transition-transform">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {teams.length === 0 && (
           <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400">
             Chưa có cặp đấu / người chơi nào đăng ký tham gia giải đấu này.
           </div>
        )}
      </div>
    </div>
  );
}
