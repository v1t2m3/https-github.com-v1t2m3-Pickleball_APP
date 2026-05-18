import { useState, useEffect } from 'react';
import { Tournament } from '../../types';
import { api } from '../../lib/api';
import { Plus, Trash2, ListChecks } from 'lucide-react';

export default function GroupsTab({ tournament, isOwner }: { tournament: Tournament; isOwner: boolean }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [standings, setStandings] = useState<Record<number, any[]>>({});
  
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');

  const loadData = async () => {
    try {
      const g = await api(`/tournaments/${tournament.id}/groups`);
      setGroups(g);
      const t = await api(`/tournaments/${tournament.id}/teams`);
      setTeams(t);
      const s = await api(`/tournaments/${tournament.id}/matches/standings`);
      setStandings(s);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName) return;
    try {
      await api(`/tournaments/${tournament.id}/groups`, {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName })
      });
      setNewGroupName('');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    try {
      await api(`/tournaments/${tournament.id}/groups/${groupId}`, { method: 'DELETE' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignTeam = async (groupId: number) => {
    if (!selectedTeam) return;
    try {
      await api(`/tournaments/${tournament.id}/groups/${groupId}/teams`, {
        method: 'POST',
        body: JSON.stringify({ team_id: parseInt(selectedTeam) })
      });
      setSelectedTeam('');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveTeam = async (groupId: number, teamId: number) => {
    try {
      await api(`/tournaments/${tournament.id}/groups/${groupId}/teams/${teamId}`, { method: 'DELETE' });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const isRoundRobin = tournament.format.toLowerCase().includes('round-robin');

  if (!isRoundRobin) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
        <p className="text-gray-400 font-medium">This tournament format does not use Group Stages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isOwner && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-end gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Create New Group</label>
            <input 
              type="text" 
              placeholder="e.g. Group A" 
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none"
            />
          </div>
          <button 
            onClick={handleCreateGroup}
            className="bg-[#0a0a0a] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1a1a1a] flex items-center gap-2"
          >
            <Plus size={18} /> ADD
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map(g => (
          <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#0a0a0a] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><ListChecks size={18} className="text-[#D4FF00]" /> {g.name}</h3>
              {isOwner && (
                <button onClick={() => handleDeleteGroup(g.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            
            <div className="p-4">
              {/* Standings Table */}
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 rounded-l-lg">Team</th>
                      <th className="px-2 py-2 text-center">P</th>
                      <th className="px-2 py-2 text-center">W</th>
                      <th className="px-2 py-2 text-center">L</th>
                      <th className="px-2 py-2 text-center">+/-</th>
                      <th className="px-2 py-2 text-center rounded-r-lg">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(standings[g.id] || []).map((s, index) => (
                      <tr key={s.team_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-bold flex items-center gap-2">
                          <span className="text-gray-400 text-xs w-4">{index + 1}.</span> {s.team_name}
                        </td>
                        <td className="px-2 py-3 text-center">{s.played}</td>
                        <td className="px-2 py-3 text-center text-green-600 font-medium">{s.wins}</td>
                        <td className="px-2 py-3 text-center text-red-600 font-medium">{s.losses}</td>
                        <td className="px-2 py-3 text-center">{s.point_diff > 0 ? `+${s.point_diff}` : s.point_diff}</td>
                        <td className="px-2 py-3 text-center font-bold">{s.points}</td>
                      </tr>
                    ))}
                    {(!standings[g.id] || standings[g.id].length === 0) && g.teams?.map((t: any) => (
                      <tr key={t.id} className="border-b border-gray-50 last:border-0 group">
                        <td className="px-4 py-3 font-medium flex justify-between items-center">
                          {t.name}
                          {isOwner && (
                            <button onClick={() => handleRemoveTeam(g.id, t.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-3 text-center">-</td>
                        <td className="px-2 py-3 text-center">-</td>
                        <td className="px-2 py-3 text-center">-</td>
                        <td className="px-2 py-3 text-center">-</td>
                        <td className="px-2 py-3 text-center">-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Team to Group */}
              {isOwner && (
                <div className="flex gap-2 border-t pt-4">
                  <select 
                    value={selectedTeam} 
                    onChange={e => setSelectedTeam(e.target.value)}
                    className="flex-1 bg-gray-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D4FF00] outline-none"
                  >
                    <option value="">Select team to assign...</option>
                    {teams.filter(t => !g.teams?.find((gt:any) => gt.id === t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => handleAssignTeam(g.id)}
                    className="bg-[#D4FF00] text-black font-bold px-4 rounded-lg text-sm hover:bg-[#bce600]"
                  >
                    Assign
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
