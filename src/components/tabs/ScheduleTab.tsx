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
  const [editScoringFormat, setEditScoringFormat] = useState('');

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
    setEditScoringFormat(m.scoring_format || '');
  };

  const handleSaveScheduler = async () => {
    if (!selectedMatchForEdit) return;
    try {
      // 1. Save court, match_order and scoring_format
      await api(`/tournaments/${tournament.id}/matches/${selectedMatchForEdit.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          court: editCourt || null,
          match_order: editOrder ? parseInt(editOrder) : null,
          scoring_format: editScoringFormat || null
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

  const getMatchPointInfo = (m: Match, tournamentScoring: string) => {
    const activeFormat = m.scoring_format || tournamentScoring || '11_win_by_2';
    const target = activeFormat.includes('15') ? 15 : activeFormat.includes('21') ? 21 : activeFormat.includes('25') ? 25 : 11;
    const winBy2 = activeFormat.includes('win_by_2');

    let team1HasMatchPoint = false;
    let team2HasMatchPoint = false;

    if (winBy2) {
      team1HasMatchPoint = m.serving_team_id === m.team1_id && m.score_team1 >= target - 1 && m.score_team1 - m.score_team2 >= 1;
      team2HasMatchPoint = m.serving_team_id === m.team2_id && m.score_team2 >= target - 1 && m.score_team2 - m.score_team1 >= 1;
    } else {
      team1HasMatchPoint = m.serving_team_id === m.team1_id && m.score_team1 >= target - 1;
      team2HasMatchPoint = m.serving_team_id === m.team2_id && m.score_team2 >= target - 1;
    }

    return {
      isMatchPoint: team1HasMatchPoint || team2HasMatchPoint,
      team1HasMatchPoint,
      team2HasMatchPoint,
      targetScore: target,
      winBy2
    };
  };

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

  const renderUpcomingMatchCard = (m: Match) => (
    <div key={m.id} className="bg-white border border-gray-100 p-3.5 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#D4FF00] hover:shadow-md transition-all">
      <div className="flex-1 min-w-0">
        {/* Top meta row on mobile */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-wider">
            Round {m.round} {m.group_name ? `• ${m.group_name}` : ''}
          </span>
          <div className="flex items-center gap-1.5 sm:hidden">
            {m.court && (
              <span className="text-[9px] font-bold font-mono bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full uppercase">
                🏟️ {m.court} - T{m.match_order || 1}
              </span>
            )}
            <span className="text-[9px] font-bold font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase">
              WAITING
            </span>
          </div>
        </div>

        {/* Match teams */}
        <div className="flex items-center gap-2 sm:gap-3 py-0.5">
          <span className="font-bold text-sm sm:text-base text-gray-900 truncate flex-1 min-w-0">{m.team1_name || 'TBD'}</span>
          <span className="text-xs font-black italic opacity-25 px-1 shrink-0">VS</span>
          <span className="font-bold text-sm sm:text-base text-gray-900 truncate flex-1 min-w-0 text-right sm:text-left">{m.team2_name || 'TBD'}</span>
        </div>

        {/* Referee badge */}
        {(m.referee_name || m.referee2_name) && (
          <div className="text-[10px] font-bold font-mono text-blue-600 mt-1.5 flex items-center gap-1 truncate">
            <span>👮 Trọng tài:</span>
            <span className="truncate">{m.referee_name}{m.referee2_name ? ` & ${m.referee2_name}` : ''}</span>
          </div>
        )}
      </div>

      {/* Desktop badges & action button */}
      <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-50">
        <div className="hidden sm:flex items-center gap-2">
          {m.court && (
            <span className="text-[10px] font-bold font-mono bg-yellow-50 text-yellow-700 px-2.5 py-1 rounded-full uppercase">
              🏟️ {m.court} - Match {m.match_order || 1}
            </span>
          )}
          <span className="text-xs font-bold font-mono bg-gray-100 px-3 py-1 rounded-full text-gray-500 uppercase">
            WAITING
          </span>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenScheduler(m)}
            className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all ml-auto sm:ml-0"
            title="Sắp xếp sân & Phân quyền"
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 sm:space-y-12">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {liveMatches.map(m => {
              // Calculate Match Point logic
              const matchPointInfo = getMatchPointInfo(m, tournament.scoring_format || '11_win_by_2');
              const { isMatchPoint, team1HasMatchPoint, team2HasMatchPoint } = matchPointInfo;

              return (
                <div key={m.id} className="bg-[#0a0a0a] text-white rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden border-2 border-[#D4FF00]">
                  {/* Match Point Pulse Indicator */}
                  {isMatchPoint && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-red-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-full animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.7)] z-10 border border-red-400">
                      🔥 MATCH POINT 🔥
                    </div>
                  )}

                  <div className="absolute top-0 right-0 py-1.5 px-3 sm:py-2 sm:px-4 bg-[#D4FF00] text-black font-black text-[9px] sm:text-[10px] uppercase tracking-widest rounded-bl-xl flex items-center gap-1.5 sm:gap-2">
                    <span>{m.court ? `${m.court} - Match ${m.match_order || 1}` : (m.group_name || `Round ${m.round}`)}</span>
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

                  <div className="flex items-center justify-between gap-3 sm:gap-8 py-3 sm:py-4 mt-2">
                    <div className="flex-1 text-center min-w-0">
                      <div className="text-xs sm:text-sm font-bold uppercase text-[#D4FF00] mb-1 sm:mb-2 flex items-center justify-center gap-1 truncate px-1">
                        <span className="truncate">{m.team1_name || 'TBD'}</span>
                        {m.serving_team_id === m.team1_id && (
                          <span className="inline-flex items-center gap-0.5 bg-[#D4FF00] text-black text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 animate-pulse shadow-[0_0_8px_rgba(212,255,0,0.6)]">
                            🎾 {isDoubles && `L${m.server_number || 1}`}
                          </span>
                        )}
                      </div>
                      <div className="text-5xl sm:text-7xl font-black tracking-tighter tabular-nums">{m.score_team1}</div>
                    </div>

                    <div className="text-xl sm:text-2xl font-black opacity-40 italic shrink-0">VS</div>

                    <div className="flex-1 text-center min-w-0">
                      <div className="text-xs sm:text-sm font-bold uppercase text-[#D4FF00] mb-1 sm:mb-2 flex items-center justify-center gap-1 truncate px-1">
                        <span className="truncate">{m.team2_name || 'TBD'}</span>
                        {m.serving_team_id === m.team2_id && (
                          <span className="inline-flex items-center gap-0.5 bg-[#D4FF00] text-black text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 animate-pulse shadow-[0_0_8px_rgba(212,255,0,0.6)]">
                            🎾 {isDoubles && `L${m.server_number || 1}`}
                          </span>
                        )}
                      </div>
                      <div className="text-5xl sm:text-7xl font-black tracking-tighter tabular-nums">{m.score_team2}</div>
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/10 flex flex-col items-center gap-0.5 sm:gap-1">
                    <span className="text-[9px] sm:text-[10px] font-bold tracking-widest opacity-60 uppercase">Match in Progress • Round {m.round}</span>
                    {(m.referee_name || m.referee2_name) && (
                      <span className="text-[8px] sm:text-[9px] font-bold tracking-wider text-[#D4FF00]/90 uppercase truncate max-w-full">
                        👮 Referee: {m.referee_name || 'N/A'}{m.referee2_name ? ` & ${m.referee2_name}` : ''}
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
            <span className="text-xs text-gray-500 font-bold px-2 uppercase tracking-wider hidden md:inline">Group:</span>
            <button
              onClick={() => setGroupBy('none')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", groupBy === 'none' ? "bg-black text-white shadow-sm" : "text-gray-500 hover:text-black")}
            >
              All
            </button>
            <button
              onClick={() => setGroupBy('group')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", groupBy === 'group' ? "bg-black text-white shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Groups
            </button>
            <button
              onClick={() => setGroupBy('court')}
              className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", groupBy === 'court' ? "bg-black text-white shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Courts
            </button>
          </div>
        </div>

        {/* Grouped rendering */}
        {groupBy === 'none' ? (
          <div className="space-y-3">
            {sortedUpcoming.map(m => renderUpcomingMatchCard(m))}
            {sortedUpcoming.length === 0 && <p className="text-center py-10 text-gray-400 font-medium">No upcoming matches.</p>}
          </div>
        ) : groupBy === 'group' ? (
          <div className="space-y-6 sm:space-y-8">
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
                    <span className="text-[10px] font-bold text-gray-400">({groupMatches.length} Matches)</span>
                  </div>
                  {groupMatches.map(m => renderUpcomingMatchCard(m))}
                </div>
              );
            })}
            {sortedUpcoming.length === 0 && <p className="text-center py-10 text-gray-400 font-medium">No upcoming matches.</p>}
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
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
                  {courtMatches.map(m => renderUpcomingMatchCard(m))}
                </div>
              );
            })}
            {sortedUpcoming.length === 0 && <p className="text-center py-10 text-gray-400 font-medium">No upcoming matches.</p>}
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
                    <span className="text-[10px] font-bold text-gray-500">({groupFinished.length} matches played)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupFinished.map(m => {
                      const p1Won = m.score_team1 > m.score_team2;
                      const p2Won = m.score_team2 > m.score_team1;
                      return (
                        <div key={m.id} className="bg-white border border-gray-100 p-5 rounded-2xl flex flex-col justify-between hover:border-[#D4FF00] transition-colors relative">
                          <span className="text-[8px] font-bold tracking-widest text-gray-500 uppercase mb-2 block">
                            Round {m.round} {m.court ? `• ${m.court}` : ''}
                          </span>
                          <div className="flex flex-col gap-2 flex-1">
                            <div className={cn("flex justify-between items-center text-sm px-2.5 py-1.5 rounded-xl transition-all", p1Won && "bg-[#D4FF00] border-l-4 border-black", p2Won && "bg-gray-100")}>
                              <span className={cn("font-bold truncate", p1Won ? "text-black" : "text-gray-400")}>
                                {m.team1_name || 'TBD'}
                              </span>
                              <span className="font-black tabular-nums">{m.score_team1}</span>
                            </div>
                            <div className={cn("flex justify-between items-center text-sm px-2.5 py-1.5 rounded-xl transition-all", p2Won && "bg-[#D4FF00] border-l-4 border-black", p1Won && "bg-gray-100")}>
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
                Schedule & Referee
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
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Court</label>
                <select
                  value={editCourt}
                  onChange={e => setEditCourt(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                >
                  <option value="">No court</option>
                  <option value="Court 1">Court 1</option>
                  <option value="Court 2">Court 2</option>
                  <option value="Court 3">Court 3</option>
                  <option value="Court 4">Court 4</option>
                  <option value="Court 5">Court 5</option>
                </select>
              </div>

              {/* Match Order */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Match Order (Match No.)</label>
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
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Referee 1</label>
                <select
                  value={editRef1}
                  onChange={e => setEditRef1(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                >
                  <option value="">No referee 1</option>
                  {refereeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* Referee 2 */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Referee 2 (Max 2 person)</label>
                <select
                  value={editRef2}
                  onChange={e => setEditRef2(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                >
                  <option value="">No referee 2</option>
                  {refereeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* Scoring Format */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500">Scoring Format</label>
                <select
                  value={editScoringFormat}
                  onChange={e => setEditScoringFormat(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold text-sm"
                >
                  <option value="">Mặc định (Kế thừa giải đấu: {
                    tournament.scoring_format === '11' ? 'Chạm 11 (First to 11)' :
                    tournament.scoring_format === '11_win_by_2' ? 'Chạm 11 cách 2 (11 Win by 2)' :
                    tournament.scoring_format === '15' ? 'Chạm 15 (First to 15)' :
                    tournament.scoring_format === '15_win_by_2' ? 'Chạm 15 cách 2 (15 Win by 2)' :
                    tournament.scoring_format === '21' ? 'Chạm 21 (First to 21)' :
                    tournament.scoring_format === '21_win_by_2' ? 'Chạm 21 cách 2 (21 Win by 2)' :
                    tournament.scoring_format === '25' ? 'Chạm 25 (First to 25)' :
                    tournament.scoring_format === '25_win_by_2' ? 'Chạm 25 cách 2 (25 Win by 2)' :
                    tournament.scoring_format || '11_win_by_2'
                  })</option>
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

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedMatchForEdit(null)}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl active:scale-95 transition-transform"
              >
                CANCEL
              </button>
              <button
                onClick={handleSaveScheduler}
                className="flex-1 py-3 bg-black hover:bg-neutral-900 text-white font-bold rounded-xl active:scale-95 transition-transform"
              >
                SAVE CONFIGURATION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
