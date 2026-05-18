import { useState, useEffect } from 'react';
import { Tournament } from '../../types';
import { api } from '../../lib/api';
import { Plus, Trash2, Users } from 'lucide-react';

export default function TeamsTab({ tournament, isOwner }: { tournament: Tournament; isOwner: boolean }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [newTeam, setNewTeam] = useState({ name: '', p1: '', p2: '' });

  const loadData = async () => {
    try {
      const p = await api('/players');
      setPlayers(p);
      const t = await api(`/tournaments/${tournament.id}/teams`);
      setTeams(t);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  return (
    <div className="space-y-8">
      {isOwner && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={20} /> {isDoubles ? 'PAIR PLAYERS (DOUBLES)' : 'REGISTER PLAYER (SINGLES)'}
          </h3>
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
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map(t => (
          <div key={t.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-start hover:border-[#D4FF00] transition-colors">
            <div>
              <div className="font-bold text-lg">{t.name}</div>
              <div className="text-sm text-gray-500 mt-2 flex flex-col gap-1">
                <span className="flex items-center gap-2">👤 {t.p1_name}</span>
                {t.p2_name && <span className="flex items-center gap-2">👤 {t.p2_name}</span>}
              </div>
            </div>
            {isOwner && (
              <button onClick={() => handleDelete(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
        {teams.length === 0 && (
           <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400">
             No teams/players registered yet.
           </div>
        )}
      </div>
    </div>
  );
}
