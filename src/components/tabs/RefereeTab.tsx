import { useState, useEffect } from 'react';
import { Play, RotateCcw, Shield, CheckCircle, Trophy, Volume2, Layers, Lock } from 'lucide-react';
import { Tournament, Match } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import ScoringModal from '../ScoringModal';
import BracketBuilderModal from '../BracketBuilderModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  tournament: Tournament;
  matches: Match[];
  onReload?: () => void;
}

export default function RefereeTab({ tournament, matches, onReload }: Props) {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedScoringMatch, setSelectedScoringMatch] = useState<Match | null>(null);
  const [bracketBuilderOpen, setBracketBuilderOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  const [selectedTeam1, setSelectedTeam1] = useState<string>('');
  const [selectedTeam2, setSelectedTeam2] = useState<string>('');
  const [selectedCourt, setSelectedCourt] = useState<string>('Sân 1');
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([]);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const t = await api(`/tournaments/${tournament.id}/teams`);
        setRegisteredTeams(t);
      } catch (e) {
        console.error(e);
      }
    };
    if (tournament.format === 'social') {
      loadTeams();
    }
  }, [tournament.id, tournament.format]);

  const handleRandomMatch = () => {
    if (registeredTeams.length < 2) {
      alert("Cần tối thiểu 2 đội/cặp đấu đăng ký để bốc thăm ngẫu nhiên!");
      return;
    }
    const shuffled = [...registeredTeams].sort(() => 0.5 - Math.random());
    setSelectedTeam1(shuffled[0].id.toString());
    setSelectedTeam2(shuffled[1].id.toString());
  };

  const handleCreateSocialMatch = async () => {
    if (!selectedTeam1 || !selectedTeam2) {
      alert("Vui lòng chọn đầy đủ cả hai đội/cặp đấu!");
      return;
    }
    if (selectedTeam1 === selectedTeam2) {
      alert("Đội 1 và Đội 2 không thể giống nhau!");
      return;
    }
    setLoading(true);
    try {
      await api(`/tournaments/${tournament.id}/matches`, {
        method: 'POST',
        body: JSON.stringify({
          court: selectedCourt,
          round: 'Social Play',
          team1_id: parseInt(selectedTeam1),
          team2_id: parseInt(selectedTeam2),
          group_id: null,
          is_third_place: false,
          referee_id: null,
          status: 'live'
        })
      });
      alert("Khởi tạo trận đấu thành công! Trận đấu đã hiển thị live.");
      if (onReload) {
        onReload();
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      console.error(e);
      alert("Khởi tạo trận đấu thất bại: " + (e.message || "Lỗi không xác định"));
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    setLoading(true);
    try {
      await api(`/tournaments/${tournament.id}/generate`, { method: 'POST' });
      if (onReload) {
        onReload();
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      console.error(e);
      alert("Failed to generate schedule: " + (e.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const completeMatch = async (matchId: number) => {
    try {
      await api(`/tournaments/${tournament.id}/matches/${matchId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' })
      });
      if (onReload) onReload();
    } catch (e) {
      console.error(e);
    }
  };

  const startMatch = async (matchId: number) => {
    try {
      await api(`/tournaments/${tournament.id}/matches/${matchId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'live' })
      });
      if (onReload) onReload();
    } catch (e) {
      console.error(e);
    }
  };

  // Check if standard referee is assigned to the match
  const isAssignedReferee = (m: Match) => {
    if (isAdmin) return true; // Admin has master override access
    if (!user) return false;
    return m.referee_id === user.id || m.referee2_id === user.id;
  };

  const formatLower = tournament.format?.toLowerCase() || '';
  const isCombineFormat = formatLower.includes('round-robin & knockout') || formatLower.includes('combination');
  const isKnockout = formatLower.includes('knockout') || formatLower.includes('single elimination');

  return (
    <div className="space-y-8">
      {tournament.format === 'social' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <Trophy className="text-purple-600 bg-purple-100 p-2 rounded-2xl" size={42} />
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-gray-900">SOCIAL MATCHMAKER & RANDOM SEED 🎲</h3>
              <p className="text-xs text-gray-400 font-medium">Randomly select or manually pair teams to start live matches immediately.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Select Court</label>
              <select
                value={selectedCourt}
                onChange={e => setSelectedCourt(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00] font-bold text-sm"
              >
                <option value="Sân 1">Sân 1</option>
                <option value="Sân 2">Sân 2</option>
                <option value="Sân 3">Sân 3</option>
                <option value="Sân 4">Sân 4</option>
                <option value="Sân 5">Sân 5</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Team / Pair 1</label>
              <select
                value={selectedTeam1}
                onChange={e => setSelectedTeam1(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00] font-bold text-sm truncate"
              >
                <option value="">-- Select Team 1 --</option>
                {registeredTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.p1_name} {t.p2_name ? `& ${t.p2_name}` : ''})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Team / Pair 2</label>
              <select
                value={selectedTeam2}
                onChange={e => setSelectedTeam2(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00] font-bold text-sm truncate"
              >
                <option value="">-- Select Team 2 --</option>
                {registeredTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.p1_name} {t.p2_name ? `& ${t.p2_name}` : ''})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRandomMatch}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md shadow-indigo-500/10"
              >
                🎲 RANDOM
              </button>

              <button
                onClick={handleCreateSocialMatch}
                disabled={loading}
                className="flex-1 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                🚀 CREATE LIVE MATCH
              </button>
            </div>
          </div>
        </div>
      )}

      {matches.length === 0 && tournament.format !== 'social' && (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 space-y-6">
          <Layers className="mx-auto text-gray-300" size={48} />
          <h3 className="text-3xl font-black mb-2 uppercase tracking-tight">TOURNAMENT SETUP</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium text-sm">
            {isKnockout
              ? "Hãy bốc thăm hạt giống thủ công để vẽ nhánh đấu tùy chọn, hoặc click sinh lịch tự động ngẫu nhiên."
              : "Khởi tạo bảng đấu và lịch thi đấu vòng bảng. (Quản trị viên có thể chia bảng và gán đội thủ công ở tab Groups trước)."
            }
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={generateSchedule}
              disabled={loading}
              className="px-8 py-4 bg-[#D4FF00] hover:bg-[#bce600] text-black rounded-2xl font-black text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 uppercase tracking-tight shadow-sm"
            >
              {loading ? 'GENERATING...' : isKnockout ? 'SINH NHÁNH ĐẤU TỰ ĐỘNG' : 'SINH LỊCH VÒNG BẢNG'}
            </button>

            {isKnockout && (
              <button
                onClick={() => setBracketBuilderOpen(true)}
                className="px-8 py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 uppercase tracking-tight shadow-sm"
              >
                MANUAL DRAWING / DRAW BRACKET
              </button>
            )}
          </div>
        </div>
      )}

      {matches.length > 0 && isCombineFormat && (
        <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="text-[#D4FF00] bg-black p-2 rounded-2xl" size={40} />
            <div>
              <h4 className="font-black text-sm uppercase tracking-tight text-gray-900">DRAW KNOCKOUT BRACKET</h4>
              <p className="text-[10px] text-gray-400 font-medium">Create a knockout bracket for the semifinals/quarterfinals, crossing over between groups (Winner of this group meets Runner-up of that group) or manually.</p>
            </div>
          </div>
          <button
            onClick={() => setBracketBuilderOpen(true)}
            className="px-6 py-3.5 bg-[#D4FF00] hover:bg-[#bce600] text-black rounded-xl font-black text-xs hover:scale-105 transition-all shadow-sm shadow-[#D4FF00]/15 uppercase tracking-wider whitespace-nowrap"
          >
            DRAW KNOCKOUT BRACKET
          </button>
        </div>
      )}

      {matches.length > 0 && (() => {
        const groups = Array.from(new Set(
          matches
            .filter(m => m.group_id)
            .map(m => JSON.stringify({ id: m.group_id, name: m.group_name || `Bảng ${m.group_id}` }))
        )).map(str => JSON.parse(str) as { id: number; name: string });

        // Filter active matches by both Group and Court selection
        const filteredMatches = matches.filter(m => {
          if (m.status === 'completed') return false;

          // Group filter
          const matchesGroup = selectedGroup === 'all' ||
            (selectedGroup === 'knockout' && !m.group_id) ||
            (m.group_id?.toString() === selectedGroup);

          // Court filter
          const matchesCourt = selectedCourtFilter === 'all' ||
            (selectedCourtFilter === 'none' && !m.court) ||
            (m.court === selectedCourtFilter);

          return matchesGroup && matchesCourt;
        });

        // Sort ascending by match_order so the court referee knows which match is next
        const sortedMatches = [...filteredMatches].sort((a, b) => (a.match_order || 1) - (b.match_order || 1));

        return (
          <div className="grid grid-cols-1 gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <h3 className="text-2xl font-black uppercase tracking-tighter">REFEREE DASHBOARD</h3>

              <div className="flex flex-wrap items-center gap-3">
                {/* Court Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lọc Sân:</span>
                  <select
                    value={selectedCourtFilter}
                    onChange={(e) => setSelectedCourtFilter(e.target.value)}
                    className="bg-white border border-gray-200 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#D4FF00] shadow-sm cursor-pointer"
                  >
                    <option value="all">All Courts</option>
                    <option value="Sân 1">Court 1</option>
                    <option value="Sân 2">Court 2</option>
                    <option value="Sân 3">Court 3</option>
                    <option value="Sân 4">Court 4</option>
                    <option value="Sân 5">Court 5</option>
                    <option value="none">Unassigned</option>
                  </select>
                </div>

                {/* Group Filter */}
                {groups.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter Group:</span>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="bg-white border border-gray-200 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#D4FF00] shadow-sm cursor-pointer"
                    >
                      <option value="all">All Groups</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id.toString()}>{g.name}</option>
                      ))}
                      {matches.some(m => !m.group_id) && (
                        <option value="knockout">Knockout / Bracket</option>
                      )}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {sortedMatches.map(m => {
                const isServing1 = m.serving_team_id === m.team1_id;
                const isServing2 = m.serving_team_id === m.team2_id;
                const targetScore = tournament.scoring_format?.includes('15') ? 15 : tournament.scoring_format?.includes('21') ? 21 : 11;
                const isDoubles = tournament.match_type?.toLowerCase()?.includes('doubles') ?? true;

                const team1HasMatchPoint = m.status === 'live' && isServing1 && m.score_team1 >= targetScore - 1 && m.score_team1 - m.score_team2 >= 1;
                const team2HasMatchPoint = m.status === 'live' && isServing2 && m.score_team2 >= targetScore - 1 && m.score_team2 - m.score_team1 >= 1;

                const isAssigned = isAssignedReferee(m);

                return (
                  <div key={m.id} className={cn(
                    "rounded-3xl p-6 md:p-8 border-2 shadow-sm transition-all relative overflow-hidden",
                    m.status === 'live' ? "bg-black border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.05)]" : "bg-white border-gray-100 opacity-80 hover:opacity-100"
                  )}>
                    {/* Sân & Thứ tự label */}
                    <div className="absolute top-0 right-0 py-1.5 px-3 text-gray-700 font-extrabold text-[9px] uppercase tracking-wider rounded-bl-xl border-l border-b border-gray-200">
                      {m.court ? `${m.court} - Trận ${m.match_order || 1}` : (m.group_name || `Round ${m.round}`)}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-center justify-between mt-2">
                      {/* Read-Only Scores Dashboard */}
                      <div className="flex-1 w-full space-y-4">
                        {/* Player 1 Card */}
                        <div className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all",
                          isServing1 ? "bg-[#D4FF00]/5 border-[#D4FF00]/30" : "bg-gray-50 border-transparent"
                        )}>
                          <div className="flex items-center gap-3">
                            {isServing1 && (
                              <div className="flex items-center gap-1 bg-[#D4FF00] text-black px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                                SERVE {isDoubles ? m.server_number : ''}
                              </div>
                            )}
                            <span className="text-lg font-bold uppercase truncate max-w-[200px] sm:max-w-xs">{m.team1_name || 'TBD'}</span>
                            {team1HasMatchPoint && (
                              <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[9px] tracking-widest rounded-full animate-pulse">
                                MATCH POINT
                              </span>
                            )}
                          </div>
                          <span className="text-4xl font-black tabular-nums">{m.score_team1}</span>
                        </div>

                        {/* Player 2 Card */}
                        <div className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border transition-all",
                          isServing2 ? "bg-[#D4FF00]/5 border-[#D4FF00]/30" : "bg-gray-50 border-transparent"
                        )}>
                          <div className="flex items-center gap-3">
                            {isServing2 && (
                              <div className="flex items-center gap-1 bg-[#D4FF00] text-black px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                                SERVE {isDoubles ? m.server_number : ''}
                              </div>
                            )}
                            <span className="text-lg font-bold uppercase truncate max-w-[200px] sm:max-w-xs">{m.team2_name || 'TBD'}</span>
                            {team2HasMatchPoint && (
                              <span className="px-2 py-0.5 bg-red-600 text-white font-black text-[9px] tracking-widest rounded-full animate-pulse">
                                MATCH POINT
                              </span>
                            )}
                          </div>
                          <span className="text-4xl font-black tabular-nums">{m.score_team2}</span>
                        </div>

                        {/* Assigned Referee Indicator */}
                        {(m.referee_name || m.referee2_name) && (
                          <div className="text-[10px] font-bold text-gray-400 uppercase pl-1">
                            👮 REFEREE: {m.referee_name || 'N/A'}{m.referee2_name ? ` & ${m.referee2_name}` : ''}
                          </div>
                        )}
                      </div>

                      {/* Actions Column */}
                      <div className="w-full lg:w-80 flex flex-col gap-3">
                        {!isAssigned ? (
                          <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-2xl text-center space-y-2">
                            <Lock className="mx-auto" size={24} />
                            <div className="text-xs font-black uppercase tracking-wider">NOT ASSIGNED</div>
                            <div className="text-[10px] opacity-80">Referee not assigned to this match. Please contact Admin.</div>
                          </div>
                        ) : m.status === 'upcoming' ? (
                          <button
                            onClick={() => startMatch(m.id)}
                            className="w-full py-5 bg-[#0a0a0a] text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-transform active:scale-95"
                          >
                            <Play fill="white" size={18} /> START MATCH
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setSelectedScoringMatch(m)}
                              className="w-full py-5 bg-[#D4FF00] text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-all uppercase tracking-wide shadow-md shadow-[#D4FF00]/10 border border-[#D4FF00]"
                            >
                              <Shield size={18} /> ENTER SCORE
                            </button>

                            <button
                              onClick={() => completeMatch(m.id)}
                              className="w-full py-3.5 bg-white/5 border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all uppercase"
                            >
                              <CheckCircle size={14} /> COMPLETE MATCH
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {sortedMatches.length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 text-gray-400 font-medium">
                  No matches are waiting or live in this group/court.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {selectedScoringMatch && (
        <ScoringModal
          tournament={tournament}
          match={selectedScoringMatch}
          onClose={() => setSelectedScoringMatch(null)}
          onUpdate={() => {
            if (onReload) onReload();
          }}
        />
      )}

      {bracketBuilderOpen && (
        <BracketBuilderModal
          tournament={tournament}
          onClose={() => setBracketBuilderOpen(false)}
          onUpdate={() => {
            if (onReload) {
              onReload();
            } else {
              window.location.reload();
            }
          }}
        />
      )}
    </div>
  );
}
