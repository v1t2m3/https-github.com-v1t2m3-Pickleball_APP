import { useState, useEffect } from 'react';
import { Tournament, Match } from '../../types';
import { Clock, Trophy, Settings, X, Building } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  tournament: Tournament;
  matches: Match[];
  isOwner: boolean;
  onReload?: () => void;
}

export default function ScheduleTab({ tournament, matches, isOwner, onReload }: Props) {
  const { user, isAdmin } = useAuth();
  
  // Grouping state for upcoming matches
  const [groupBy, setGroupBy] = useState<'none' | 'group' | 'court'>('none');

  // Referee and scheduling states
  const [users, setUsers] = useState<any[]>([]);
  const [selectedMatchForEdit, setSelectedMatchForEdit] = useState<Match | null>(null);
  const [editCourt, setEditCourt] = useState('');
  const [editOrder, setEditOrder] = useState('1');
  const [editRef1, setEditRef1] = useState('');
  const [editRef2, setEditRef2] = useState('');

  // Fetch users for referee assignment (Admin only)
  useEffect(() => {
    if (isAdmin) {
      api('/users')
        .then(res => setUsers(res))
        .catch(err => console.error(err));
    }
  }, [isAdmin]);

  const handleOpenScheduler = (m: Match) => {
    setSelectedMatchForEdit(m);
    setEditCourt(m.court || '');
    setEditOrder(m.match_order?.toString() || '1');
    setEditRef1(m.referee_id?.toString() || '');
    setEditRef2(m.referee2_id?.toString() || '');
  };

  const handleSaveScheduler = async () => {
    if (!selectedMatchForEdit) return;
    try {
      // 1. Save court and match_order
      await api(`/tournaments/${tournament.id}/matches/${selectedMatchForEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          court: editCourt || null,
          match_order: editOrder ? parseInt(editOrder) : null
        })
      });

      // 2. Save referee assignment
      await api(`/tournaments/${tournament.id}/matches/${selectedMatchForEdit.id}/assign-referee`, {
        method: 'PUT',
        body: JSON.stringify({
          referee_id: editRef1 ? parseInt(editRef1) : null,
          referee2_id: editRef2 ? parseInt(editRef2) : null
        })
      });

      setSelectedMatchForEdit(null);
      if (onReload) onReload();
    } catch (err) {
      console.error('Failed to save scheduling:', err);
    }
  };

  const refereeUsers = users.filter(u => u.role === 'referee' || u.role === 'admin');

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const finishedMatches = matches.filter(m => m.status === 'completed');

  const targetScore = tournament.scoring_format?.includes('15') ? 15 : tournament.scoring_format?.includes('21') ? 21 : 11;
  const isDoubles = tournament.match_type?.toLowerCase()?.includes('doubles') ?? true;

  // Group and sort upcoming matches by match_order
  const sortedUpcoming = [...upcomingMatches].sort((a, b) => (a.match_order || 1) - (b.match_order || 1));

  // Group finished matches by Bảng đấu
  const finishedGroupsMap = finishedMatches.reduce((map: { [key: string]: Match[] }, m) => {
    const key = m.group_name || 'Knockout / Giao lưu';
    if (!map[key]) map[key] = [];
    map[key].push(m);
    return map;
  }, {});

  return (
    <div className="space-y-12">
      {/* Live Matches Section */}
      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 className="text-2xl font-black tracking-tighter uppercase">LIVE SCORES</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map(m => {
              // Calculate Match Point logic
              const team1HasMatchPoint = m.serving_team_id === m.team1_id && m.score_team1 >= targetScore - 1 && m.score_team1 - m.score_team2 >= 1;
              const team2HasMatchPoint = m.serving_team_id === m.team2_id && m.score_team2 >= targetScore - 1 && m.score_team2 - m.score_team1 >= 1;
              const isMatchPoint = team1HasMatchPoint || team2HasMatchPoint;

              return (
                <div key={m.id} className="bg-[#0a0a0a] text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden border-2 border-[#D4FF00]">
                  {/* Match Point Pulse Indicator */}
                  {isMatchPoint && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.7)] z-10 border border-red-400">
                      🔥 MATCH POINT 🔥
                    </div>
                  )}

                  <div className="absolute top-0 right-0 py-2 px-4 bg-[#D4FF00] text-black font-black text-[10px] uppercase tracking-widest rounded-bl-xl flex items-center gap-2">
                    <span>{m.court ? `${m.court} - Trận ${m.match_order || 1}` : (m.group_name || `Vòng ${m.round}`)}</span>
                    {isAdmin && (
                      <button 
                        onClick={() => handleOpenScheduler(m)}
                        className="p-1 hover:bg-black/10 rounded text-black transition-colors"
                        title="Sắp xếp sân & Phân quyền"
                      >
                        <Settings size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-8 py-4 mt-2">
                    <div className="flex-1 text-center">
                      <div className="text-sm font-bold uppercase text-[#D4FF00] mb-2 flex items-center justify-center gap-1.5 truncate">
                        {m.team1_name || 'TBD'}
                        {m.serving_team_id === m.team1_id && (
                          <span className="inline-flex items-center gap-1 bg-[#D4FF00] text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(212,255,0,0.6)]">
                            🎾 {isDoubles && `Lượt ${m.server_number || 1}`}
                          </span>
                        )}
                      </div>
                      <div className="text-7xl font-black tracking-tighter tabular-nums">{m.score_team1}</div>
                    </div>

                    <div className="text-2xl font-black opacity-50 italic">VS</div>

                    <div className="flex-1 text-center">
                      <div className="text-sm font-bold uppercase text-[#D4FF00] mb-2 flex items-center justify-center gap-1.5 truncate">
                        {m.team2_name || 'TBD'}
                        {m.serving_team_id === m.team2_id && (
                          <span className="inline-flex items-center gap-1 bg-[#D4FF00] text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(212,255,0,0.6)]">
                            🎾 {isDoubles && `Lượt ${m.server_number || 1}`}
                          </span>
                        )}
                      </div>
                      <div className="text-7xl font-black tracking-tighter tabular-nums">{m.score_team2}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold tracking-widest opacity-60 uppercase">Match in Progress • Round {m.round}</span>
                    {(m.referee_name || m.referee2_name) && (
                      <span className="text-[9px] font-bold tracking-wider text-[#D4FF00]/80 uppercase">
                        👮 Trọng tài: {m.referee_name || 'N/A'}{m.referee2_name ? ` & ${m.referee2_name}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Upcoming Section with Filters */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="text-gray-400" size={24} />
            UPCOMING FIXTURES
          </h3>
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
            <span className="text-xs text-gray-500 font-bold px-2 uppercase tracking-wider hidden md:inline">Phân nhóm:</span>
            <button
              onClick={() => setGroupBy('none')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", groupBy === 'none' ? "bg-black text-white shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Tất cả
            </button>
            <button
              onClick={() => setGroupBy('group')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", groupBy === 'group' ? "bg-black text-white shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Bảng đấu
            </button>
            <button
              onClick={() => setGroupBy('court')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", groupBy === 'court' ? "bg-black text-white shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Sân đấu
            </button>
          </div>
        </div>

        {/* Grouped rendering */}
        {groupBy === 'none' ? (
          <div className="space-y-3">
            {sortedUpcoming.map(m => (
              <div key={m.id} className="bg-white border border-gray-100 p-6 rounded-2xl flex items-center justify-between hover:border-[#D4FF00] transition-all">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className="text-[10px] font-bold font-mono text-gray-400 w-16 uppercase">Round {m.round}</div>
                  <div className="flex items-center gap-3 truncate">
                    <span className="font-bold text-lg text-gray-900 truncate">{m.team1_name || 'TBD'}</span>
                    <span className="text-xs font-black italic opacity-20">VS</span>
                    <span className="font-bold text-lg text-gray-900 truncate">{m.team2_name || 'TBD'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {m.court && (
                    <span className="text-[10px] font-bold font-mono bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full uppercase">
                      🏟️ {m.court} - Trận {m.match_order || 1}
                    </span>
                  )}
                  {(m.referee_name || m.referee2_name) && (
                    <span className="text-[10px] font-bold font-mono bg-blue-50 text-blue-500 px-2.5 py-1 rounded-full uppercase max-w-[150px] truncate hidden md:inline">
                      👮 {m.referee_name}{m.referee2_name ? ` & ${m.referee2_name}` : ''}
                    </span>
                  )}
                  {isAdmin && (
                    <button 
                      onClick={() => handleOpenScheduler(m)}
                      className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                      title="Sắp xếp sân & Phân quyền"
                    >
                      <Settings size={18} />
                    </button>
                  )}
                  <span className="text-xs font-bold font-mono bg-gray-50 px-3 py-1 rounded-full text-gray-400 uppercase">WAITING</span>
                </div>
              </div>
            ))}
            {sortedUpcoming.length === 0 && <p className="text-center py-10 text-gray-400 font-medium">Không có trận đấu chờ nào.</p>}
          </div>
        ) : groupBy === 'group' ? (
          <div className="space-y-8">
            {Object.keys(sortedUpcoming.reduce((map: { [key: string]: Match[] }, m) => {
              const key = m.group_name || 'Knockout / Giao lưu';
              if (!map[key]) map[key] = [];
              map[key].push(m);
              return map;
            }, {})).map(groupName => {
              const groupMatches = sortedUpcoming.filter(m => (m.group_name || 'Knockout / Giao lưu') === groupName);
              return (
                <div key={groupName} className="space-y-3">
                  <div className="flex items-center gap-2 border-l-4 border-[#D4FF00] pl-3 mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-900">{groupName}</span>
                    <span className="text-[10px] font-bold text-gray-400">({groupMatches.length} trận)</span>
                  </div>
                  {groupMatches.map(m => (
                    <div key={m.id} className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between hover:border-[#D4FF00] transition-all">
                      <div className="flex items-center gap-6 flex-1 min-w-0">
                        <div className="text-[10px] font-bold font-mono text-gray-400 w-16 uppercase">Round {m.round}</div>
                        <div className="flex items-center gap-3 truncate">
                          <span className="font-bold text-lg text-gray-900 truncate">{m.team1_name || 'TBD'}</span>
                          <span className="text-xs font-black italic opacity-20">VS</span>
                          <span className="font-bold text-lg text-gray-900 truncate">{m.team2_name || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {m.court && (
                          <span className="text-[10px] font-bold font-mono bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full uppercase">
                            🏟️ {m.court} - Trận {m.match_order || 1}
                          </span>
                        )}
                        {(m.referee_name || m.referee2_name) && (
                          <span className="text-[10px] font-bold font-mono bg-blue-50 text-blue-500 px-2.5 py-1 rounded-full uppercase max-w-[150px] truncate hidden md:inline">
                            👮 {m.referee_name}{m.referee2_name ? ` & ${m.referee2_name}` : ''}
                          </span>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => handleOpenScheduler(m)}
                            className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                            title="Sắp xếp sân & Phân quyền"
                          >
                            <Settings size={18} />
                          </button>
                        )}
                        <span className="text-xs font-bold font-mono bg-gray-50 px-3 py-1 rounded-full text-gray-400 uppercase">WAITING</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {sortedUpcoming.length === 0 && <p className="text-center py-10 text-gray-400 font-medium">Không có trận đấu chờ nào.</p>}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(sortedUpcoming.reduce((map: { [key: string]: Match[] }, m) => {
              const key = m.court || 'Chưa phân sân';
              if (!map[key]) map[key] = [];
              map[key].push(m);
              return map;
            }, {})).sort().map(courtName => {
              const courtMatches = sortedUpcoming.filter(m => (m.court || 'Chưa phân sân') === courtName);
              return (
                <div key={courtName} className="space-y-3">
                  <div className="flex items-center gap-2 border-l-4 border-black pl-3 mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-900">{courtName}</span>
                    <span className="text-[10px] font-bold text-gray-400">({courtMatches.length} trận)</span>
                  </div>
                  {courtMatches.map(m => (
                    <div key={m.id} className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between hover:border-[#D4FF00] transition-all">
                      <div className="flex items-center gap-6 flex-1 min-w-0">
                        <div className="text-[10px] font-bold font-mono text-gray-400 w-16 uppercase">{m.group_name || 'Vòng ' + m.round}</div>
                        <div className="flex items-center gap-3 truncate">
                          <span className="font-bold text-lg text-gray-900 truncate">{m.team1_name || 'TBD'}</span>
                          <span className="text-xs font-black italic opacity-20">VS</span>
                          <span className="font-bold text-lg text-gray-900 truncate">{m.team2_name || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold font-mono bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full uppercase">
                          Trận {m.match_order || 1}
                        </span>
                        {(m.referee_name || m.referee2_name) && (
                          <span className="text-[10px] font-bold font-mono bg-blue-50 text-blue-500 px-2.5 py-1 rounded-full uppercase max-w-[150px] truncate hidden md:inline">
                            👮 {m.referee_name}{m.referee2_name ? ` & ${m.referee2_name}` : ''}
                          </span>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => handleOpenScheduler(m)}
                            className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all"
                            title="Sắp xếp sân & Phân quyền"
                          >
                            <Settings size={18} />
                          </button>
                        )}
                        <span className="text-xs font-bold font-mono bg-gray-50 px-3 py-1 rounded-full text-gray-400 uppercase">WAITING</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
            {sortedUpcoming.length === 0 && <p className="text-center py-10 text-gray-400 font-medium">Không có trận đấu chờ nào.</p>}
          </div>
        )}
      </section>

      {/* Final Results Grouped by Bảng đấu */}
      {finishedMatches.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-xl font-bold mb-6 tracking-tight flex items-center gap-2">
            <Trophy className="text-[#D4FF00]" size={24} />
            FINAL RESULTS
          </h3>
          
          <div className="space-y-8">
            {Object.keys(finishedGroupsMap).map(groupName => {
              const groupFinished = finishedGroupsMap[groupName];
              return (
                <div key={groupName} className="space-y-4">
                  <div className="flex items-center gap-2 border-l-4 border-[#D4FF00] pl-3 mb-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">{groupName}</h4>
                    <span className="text-[10px] font-bold text-gray-400">({groupFinished.length} trận đã đấu)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupFinished.map(m => {
                      const p1Won = m.score_team1 > m.score_team2;
                      const p2Won = m.score_team2 > m.score_team1;
                      return (
                        <div key={m.id} className="bg-white border border-gray-100 p-5 rounded-2xl flex flex-col justify-between hover:border-[#D4FF00] transition-colors relative">
                          <span className="text-[8px] font-bold tracking-widest text-gray-400 uppercase mb-2 block">
                            Round {m.round} {m.court ? `• ${m.court}` : ''}
                          </span>
                          <div className="flex flex-col gap-2 flex-1">
                            <div className={cn("flex justify-between items-center text-sm px-2.5 py-1.5 rounded-xl transition-all", p1Won && "bg-gray-50 border-l-4 border-[#D4FF00]")}>
                              <span className={cn("font-bold truncate", p1Won ? "text-black" : "text-gray-400")}>
                                {m.team1_name || 'TBD'}
                              </span>
                              <span className="font-black tabular-nums">{m.score_team1}</span>
                            </div>
                            <div className={cn("flex justify-between items-center text-sm px-2.5 py-1.5 rounded-xl transition-all", p2Won && "bg-gray-50 border-l-4 border-[#D4FF00]")}>
                              <span className={cn("font-bold truncate", p2Won ? "text-black" : "text-gray-400")}>
                                {m.team2_name || 'TBD'}
                              </span>
                              <span className="font-black tabular-nums">{m.score_team2}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Admin Scheduler Modal Dialog */}
      {selectedMatchForEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h4 className="text-lg font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-[#D4FF00] bg-black p-1 rounded-md" />
                Lập Lịch & Trọng Tài
              </h4>
              <button onClick={() => setSelectedMatchForEdit(null)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400">
                <X size={18} />
              </button>
            </div>

            {/* Match description */}
            <div className="bg-gray-50 p-4 rounded-2xl text-center space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {selectedMatchForEdit.group_name || 'Knockout / Giao lưu'} • Vòng {selectedMatchForEdit.round}
              </div>
              <div className="font-extrabold text-gray-900 text-base sm:text-lg">
                {selectedMatchForEdit.team1_name || 'TBD'} <span className="opacity-30 italic">VS</span> {selectedMatchForEdit.team2_name || 'TBD'}
              </div>
            </div>

            <div className="space-y-4">
              {/* Court Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Sân Đấu</label>
                <select
                  value={editCourt}
                  onChange={e => setEditCourt(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                >
                  <option value="">Chưa chọn sân</option>
                  <option value="Sân 1">Sân 1</option>
                  <option value="Sân 2">Sân 2</option>
                  <option value="Sân 3">Sân 3</option>
                  <option value="Sân 4">Sân 4</option>
                  <option value="Sân 5">Sân 5</option>
                </select>
              </div>

              {/* Match Order */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Thứ Tự Trận Đấu (Trận thứ m)</label>
                <input
                  type="number"
                  min="1"
                  value={editOrder}
                  onChange={e => setEditOrder(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold font-mono"
                  placeholder="Ví dụ: 1, 2, 8..."
                />
              </div>

              {/* Referee 1 */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Trọng Tài 1</label>
                <select
                  value={editRef1}
                  onChange={e => setEditRef1(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                >
                  <option value="">Chưa chọn trọng tài 1</option>
                  {refereeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* Referee 2 */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Trọng Tài 2 (Tối đa 2 người)</label>
                <select
                  value={editRef2}
                  onChange={e => setEditRef2(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                >
                  <option value="">Chưa chọn trọng tài 2</option>
                  {refereeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedMatchForEdit(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl active:scale-95 transition-transform"
              >
                HỦY BỎ
              </button>
              <button
                onClick={handleSaveScheduler}
                className="flex-1 py-3 bg-black hover:bg-neutral-900 text-white font-bold rounded-xl active:scale-95 transition-transform"
              >
                LƯU CẤU HÌNH
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
