import { useState, useEffect } from 'react';
import { Tournament } from '../../types';
import { api } from '../../lib/api';
import { Plus, Trash2, ListChecks, Calendar, RefreshCw } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { useToast } from '../../contexts/ToastContext';

export default function GroupsTab({ tournament, isOwner }: { tournament: Tournament; isOwner: boolean }) {
  const { showToast } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [standings, setStandings] = useState<Record<number, any[]>>({});
  
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [generating, setGenerating] = useState(false);

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

    // Listen to real-time events
    const socket = getSocket();
    const handleUpdate = () => {
      loadData();
    };

    socket.on('schedule_updated', handleUpdate);
    socket.on('match_updated', handleUpdate);

    return () => {
      socket.off('schedule_updated', handleUpdate);
      socket.off('match_updated', handleUpdate);
    };
  }, [tournament.id]);

  const handleCreateGroup = async () => {
    if (!newGroupName) return;
    try {
      await api(`/tournaments/${tournament.id}/groups`, {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName })
      });
      setNewGroupName('');
      showToast('Đã tạo bảng đấu mới thành công', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi tạo bảng đấu', 'error');
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('CẢNH BÁO: Xóa bảng đấu này sẽ đồng thời xóa tất cả các trận đấu thuộc bảng trong Lịch thi đấu (Schedule) và đặt lại nhánh đấu Knockout (Bracket). Bạn có chắc chắn muốn xóa?')) {
      return;
    }
    try {
      await api(`/tournaments/${tournament.id}/groups/${groupId}`, { method: 'DELETE' });
      showToast('Đã xóa bảng đấu và đồng bộ lại lịch thi đấu', 'info');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi xóa bảng đấu', 'error');
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
      showToast('Đã gán đội vào bảng thành công', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi gán đội vào bảng', 'error');
    }
  };

  const handleRemoveTeam = async (groupId: number, teamId: number) => {
    if (!confirm('Xóa đội này khỏi bảng sẽ xóa các trận đấu liên quan của đội trong bảng và đặt lại nhánh đấu Knockout. Bạn có chắc chắn?')) {
      return;
    }
    try {
      await api(`/tournaments/${tournament.id}/groups/${groupId}/teams/${teamId}`, { method: 'DELETE' });
      showToast('Đã xóa đội khỏi bảng đấu', 'info');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi xóa đội', 'error');
    }
  };

  const handleGenerateSchedule = async () => {
    if (groups.length === 0) {
      showToast('Chưa có bảng đấu nào để sinh lịch thi đấu.', 'info');
      return;
    }
    if (!confirm('Hệ thống sẽ sinh lịch thi đấu vòng tròn (Round-Robin) cho các đội trong từng bảng. Lịch thi đấu cũ sẽ được làm mới. Bạn có muốn tiếp tục?')) {
      return;
    }
    setGenerating(true);
    try {
      await api(`/tournaments/${tournament.id}/generate`, { method: 'POST' });
      showToast('Đã sinh lịch thi đấu vòng bảng thành công!', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Lỗi khi sinh lịch thi đấu', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const isRoundRobin = (tournament.format || '').toLowerCase().includes('round-robin');

  if (!isRoundRobin) {
    return (
      <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
        <p className="text-gray-400 font-medium">This tournament format does not use Group Stages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {isOwner && (
        <div className="flex flex-col md:flex-row gap-3 md:items-end justify-between bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Tạo Bảng Đấu Mới</label>
              <input 
                type="text" 
                placeholder="VD: Bảng A, Bảng B..." 
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 sm:py-3 text-sm focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
              />
            </div>
            <button 
              onClick={handleCreateGroup}
              className="w-full sm:w-auto bg-[#0a0a0a] text-white font-bold px-6 py-2.5 sm:py-3 rounded-xl hover:bg-[#1a1a1a] active:scale-95 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wide shrink-0"
            >
              <Plus size={16} /> THÊM BẢNG
            </button>
          </div>

          {groups.length > 0 && (
            <button
              onClick={handleGenerateSchedule}
              disabled={generating}
              className="w-full md:w-auto bg-[#D4FF00] hover:bg-[#bce600] text-black font-black px-6 py-2.5 sm:py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wide shrink-0 shadow-sm disabled:opacity-50"
              title="Tự động tạo các cặp đấu vòng tròn theo từng bảng đã tạo"
            >
              <Calendar size={16} /> {generating ? 'ĐANG KHỞI TẠO...' : 'SINH LỊCH VÒNG BẢNG'}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {groups.map(g => (
          <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#0a0a0a] text-white p-3.5 sm:p-4 flex justify-between items-center">
              <h3 className="font-black text-sm sm:text-base flex items-center gap-2 uppercase tracking-wide">
                <ListChecks size={18} className="text-[#D4FF00]" /> {g.name}
              </h3>
              {isOwner && (
                <button onClick={() => handleDeleteGroup(g.id)} className="p-1 text-red-400 hover:text-red-300 rounded active:scale-90 transition-transform">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            
            <div className="p-3 sm:p-4">
              {/* Standings Table */}
              <div 
                className="overflow-x-auto table-scroll-region no-scrollbar mb-4 sm:mb-6"
                tabIndex={0}
                role="region"
                aria-label={`Bảng xếp hạng ${g.name}`}
              >
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="text-[10px] sm:text-xs text-gray-400 uppercase bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 rounded-l-lg">Team</th>
                      <th className="px-1.5 sm:px-2 py-2 text-center" title="Matches Played">P</th>
                      <th className="px-1.5 sm:px-2 py-2 text-center" title="Wins">W</th>
                      <th className="px-1.5 sm:px-2 py-2 text-center" title="Losses">L</th>
                      <th className="px-1.5 sm:px-2 py-2 text-center" title="Point Difference">+/-</th>
                      <th className="px-2 sm:px-3 py-2 text-center rounded-r-lg font-black text-black">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(standings[g.id] || []).map((s, index) => (
                      <tr key={s.team_id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-bold flex items-center gap-1.5 min-w-[120px]">
                          <span className="text-gray-400 text-[10px] sm:text-xs w-4 shrink-0">{index + 1}.</span>
                          <span className="truncate">{s.team_name}</span>
                        </td>
                        <td className="px-1.5 sm:px-2 py-2.5 sm:py-3 text-center">{s.played}</td>
                        <td className="px-1.5 sm:px-2 py-2.5 sm:py-3 text-center text-green-600 font-bold">{s.wins}</td>
                        <td className="px-1.5 sm:px-2 py-2.5 sm:py-3 text-center text-red-500 font-medium">{s.losses}</td>
                        <td className="px-1.5 sm:px-2 py-2.5 sm:py-3 text-center font-mono text-[11px] sm:text-xs">{s.point_diff > 0 ? `+${s.point_diff}` : s.point_diff}</td>
                        <td className="px-2 sm:px-3 py-2.5 sm:py-3 text-center font-black text-black">{s.points}</td>
                      </tr>
                    ))}
                    {(!standings[g.id] || standings[g.id].length === 0) && g.teams?.map((t: any) => (
                      <tr key={t.id} className="border-b border-gray-50 last:border-0 group">
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium flex justify-between items-center min-w-[120px]">
                          <span className="truncate">{t.name}</span>
                          {isOwner && (
                            <button onClick={() => handleRemoveTeam(g.id, t.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                        <td className="px-1.5 sm:px-2 py-2.5 sm:py-3 text-center">-</td>
                        <td className="px-1.5 sm:px-2 py-2.5 sm:py-3 text-center">-</td>
                        <td className="px-1.5 sm:px-2 py-2.5 sm:py-3 text-center">-</td>
                        <td className="px-1.5 sm:px-2 py-2.5 sm:py-3 text-center">-</td>
                        <td className="px-2 sm:px-3 py-2.5 sm:py-3 text-center">-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Team to Group */}
              {isOwner && (
                <div className="flex flex-col sm:flex-row gap-2 border-t border-gray-100 pt-3">
                  <select 
                    value={selectedTeam} 
                    onChange={e => setSelectedTeam(e.target.value)}
                    className="flex-1 bg-gray-50 border-none rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-[#D4FF00] outline-none truncate"
                  >
                    <option value="">Select team to assign...</option>
                    {teams.filter(t => !g.teams?.find((gt:any) => gt.id === t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => handleAssignTeam(g.id)}
                    className="w-full sm:w-auto bg-[#D4FF00] text-black font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm hover:bg-[#bce600] active:scale-95 transition-all uppercase tracking-wide shrink-0"
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
