import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Shield, CheckCircle, Undo2, Settings, Trophy, HelpCircle, Lock } from 'lucide-react';
import { Tournament, Match } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  tournament: Tournament;
  match: Match;
  onClose: () => void;
  onUpdate: () => void;
}

interface MatchState {
  score1: number;
  score2: number;
  servingTeamId: number | null;
  serverNumber: number;
}

export default function ScoringModal({ tournament, match, onClose, onUpdate }: Props) {
  const { user, isAdmin } = useAuth();
  const isAssigned = isAdmin || match.referee_id === user?.id || match.referee2_id === user?.id;

  // Parsing target score and rules
  const activeFormat = match.scoring_format || tournament.scoring_format || '11_win_by_2';
  const targetScore = activeFormat.includes('15') ? 15 : activeFormat.includes('21') ? 21 : activeFormat.includes('25') ? 25 : 11;
  const winBy2 = activeFormat.includes('win_by_2');
  const isDoubles = tournament.match_type?.toLowerCase()?.includes('doubles') ?? true;
  const isFinals = (match.round || '').toLowerCase().includes('final') || (match.round || '').toLowerCase().includes('chung kết');

  // Local Match States for Optimistic UI updates
  const [score1, setScore1] = useState(match.score_team1);
  const [score2, setScore2] = useState(match.score_team2);
  const [servingTeamId, setServingTeamId] = useState<number | null>(match.serving_team_id || null);
  const [serverNumber, setServerNumber] = useState(match.server_number || 1);
  const [status, setStatus] = useState(match.status);

  // Mode settings
  const [manualMode, setManualMode] = useState(false);
  const [history, setHistory] = useState<MatchState[]>([]);
  const [saving, setSaving] = useState(false);

  // Modern Web Guidance: Dismiss modal dialog on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Capture current state to history stack before making changes
  const saveToHistory = () => {
    const currentState: MatchState = {
      score1,
      score2,
      servingTeamId,
      serverNumber
    };
    setHistory(prev => [...prev, currentState]);
  };

  // Push state updates to backend asynchronously (Optimistic update)
  const pushUpdate = async (updatedFields: Partial<Match> & { serving_team_id?: number | null }) => {
    setSaving(true);
    try {
      await api(`/tournaments/${tournament.id}/matches/${match.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedFields)
      });
      onUpdate();
    } catch (e) {
      console.error("Failed to sync score to backend", e);
    } finally {
      setSaving(false);
    }
  };

  // Auto-scoring logic when serving team wins rally
  const handleServingTeamWins = () => {
    if (!servingTeamId) return;
    saveToHistory();

    if (servingTeamId === match.team1_id) {
      const nextScore = score1 + 1;
      setScore1(nextScore);
      pushUpdate({ score_team1: nextScore });
    } else {
      const nextScore = score2 + 1;
      setScore2(nextScore);
      pushUpdate({ score_team2: nextScore });
    }
  };

  // Auto-scoring logic on Fault (rally lost by serving team)
  const handleFault = () => {
    if (!servingTeamId) return;
    saveToHistory();

    if (isDoubles) {
      if (serverNumber === 1) {
        // Change to server 2
        setServerNumber(2);
        pushUpdate({ server_number: 2 });
      } else {
        // Side out: change serving team, reset server to 1
        const nextServingTeam = servingTeamId === match.team1_id ? match.team2_id : match.team1_id;
        setServingTeamId(nextServingTeam);
        setServerNumber(1);
        pushUpdate({ serving_team_id: nextServingTeam, server_number: 1 });
      }
    } else {
      // Singles rules: immediate side out
      const nextServingTeam = servingTeamId === match.team1_id ? match.team2_id : match.team1_id;
      setServingTeamId(nextServingTeam);
      setServerNumber(1);
      pushUpdate({ serving_team_id: nextServingTeam, server_number: 1 });
    }
  };

  // Undo last action
  const handleUndo = () => {
    if (history.length === 0) return;
    const prevState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    setScore1(prevState.score1);
    setScore2(prevState.score2);
    setServingTeamId(prevState.servingTeamId);
    setServerNumber(prevState.serverNumber);

    pushUpdate({
      score_team1: prevState.score1,
      score_team2: prevState.score2,
      serving_team_id: prevState.servingTeamId ?? undefined,
      server_number: prevState.serverNumber
    });
  };

  // Manual modifications
  const adjustScoreManual = (team: 1 | 2, delta: number) => {
    saveToHistory();
    if (team === 1) {
      const nextScore = Math.max(0, score1 + delta);
      setScore1(nextScore);
      pushUpdate({ score_team1: nextScore });
    } else {
      const nextScore = Math.max(0, score2 + delta);
      setScore2(nextScore);
      pushUpdate({ score_team2: nextScore });
    }
  };

  const setServingTeamManual = (teamId: number | null) => {
    saveToHistory();
    setServingTeamId(teamId);
    pushUpdate({ serving_team_id: teamId ?? undefined });
  };

  const setServerNumberManual = (num: number) => {
    saveToHistory();
    setServerNumber(num);
    pushUpdate({ server_number: num });
  };

  const handleSubmitResult = async () => {
    if (confirm("Xác nhận kết thúc trận đấu và lưu kết quả?")) {
      try {
        await api(`/tournaments/${tournament.id}/matches/${match.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'completed' })
        });
        onUpdate();
        onClose();
      } catch (e) {
        alert("Lỗi khi kết thúc trận đấu");
      }
    }
  };

  // Match Point conditions
  // Target score e.g. 11, must win by 2.
  const isMatchPoint = (team: 1 | 2) => {
    if (status !== 'live' || !servingTeamId) return false;

    if (winBy2) {
      if (team === 1 && servingTeamId === match.team1_id) {
        return score1 >= targetScore - 1 && score1 - score2 >= 1;
      }
      if (team === 2 && servingTeamId === match.team2_id) {
        return score2 >= targetScore - 1 && score2 - score1 >= 1;
      }
    } else {
      if (team === 1 && servingTeamId === match.team1_id) {
        return score1 >= targetScore - 1;
      }
      if (team === 2 && servingTeamId === match.team2_id) {
        return score2 >= targetScore - 1;
      }
    }
    return false;
  };

  const team1HasMatchPoint = isMatchPoint(1);
  const team2HasMatchPoint = isMatchPoint(2);

  return (
    <div 
      className="fixed inset-0 bg-[#070708] text-white z-50 flex flex-col font-sans select-none overflow-hidden modal-contain-scroll"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoring-match-title"
    >
      {/* Header */}
      <header className="px-3 sm:px-6 py-2.5 sm:py-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between sticky top-0 z-10 pt-safe">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95 shrink-0"
            aria-label="Đóng bảng ghi điểm"
          >
            <X size={22} />
          </button>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-[#D4FF00] uppercase tracking-wider block truncate">{tournament.name}</span>
            <h1 id="scoring-match-title" className="text-xs sm:text-sm font-bold uppercase tracking-tight text-white/90 truncate">{match.round} • {isDoubles ? 'Doubles' : 'Singles'}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            onClick={() => setManualMode(!manualMode)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all active:scale-95 ${manualMode ? 'bg-[#D4FF00] text-black font-black' : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
          >
            <Settings size={13} /> {manualMode ? 'MANUAL' : 'AUTO'}
          </button>

          <div className="text-[9px] sm:text-[10px] font-mono opacity-50">
            {saving ? 'SYNC...' : 'SYNCED'}
          </div>
        </div>
      </header>

      {/* Landscape Rotation Suggestion Tooltip (only visible on mobile portrait) */}
      <div className="block landscape:hidden bg-[#D4FF00]/10 border-b border-[#D4FF00]/20 text-center py-1.5 sm:py-2 px-3 text-[9px] sm:text-[10px] font-black text-[#D4FF00] tracking-wider uppercase">
        🔄 XOAY NGANG ĐIỆN THOẠI ĐỂ CÓ GIAO DIỆN BẢNG ĐIỂM TỐT NHẤT
      </div>

      {/* Main Score Area */}
      <main className="flex-1 flex flex-col justify-around p-3 sm:p-6 gap-3 sm:gap-6 overflow-y-auto no-scrollbar">

        {/* Setup Serving State Banner if uninitialized */}
        {!servingTeamId && status === 'live' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 text-center max-w-md mx-auto w-full">
            <Trophy className="mx-auto text-[#D4FF00] mb-2 sm:mb-3" size={28} />
            <h3 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">CHỌN ĐỘI PHÁT BÓNG TRƯỚC</h3>
            <p className="text-[11px] sm:text-xs text-white/50 mb-4 sm:mb-6">Trọng tài hãy chọn đội và lượt phát bóng để bắt đầu chế độ tự động tính điểm.</p>
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <button
                onClick={() => { setServingTeamManual(match.team1_id); setServerNumberManual(isDoubles ? 2 : 1); }}
                className="w-full py-2.5 sm:py-3 bg-[#D4FF00] text-black font-black rounded-xl text-xs sm:text-sm uppercase tracking-wide active:scale-95 transition-transform"
              >
                {match.team1_name || 'Home Team'} Phát Bóng {isDoubles && '(Server 2)'}
              </button>
              <button
                onClick={() => { setServingTeamManual(match.team2_id); setServerNumberManual(isDoubles ? 2 : 1); }}
                className="w-full py-2.5 sm:py-3 bg-white/10 text-white font-bold rounded-xl text-xs sm:text-sm uppercase tracking-wide hover:bg-white/20 active:scale-95 transition-transform"
              >
                {match.team2_name || 'Away Team'} Phát Bóng {isDoubles && '(Server 2)'}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Display Grid */}
        {(servingTeamId || !status || status !== 'live') && (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-6 max-w-5xl mx-auto w-full flex-1 items-stretch">

            {/* Team 1 Score Card */}
            <div className={`relative rounded-2xl p-3 sm:p-6 md:p-8 border-2 transition-all flex flex-col justify-between items-center ${servingTeamId === match.team1_id
                ? 'bg-white/[0.04] border-[#D4FF00]'
                : 'bg-white/[0.01] border-white/5 opacity-70'
              }`}>
              {/* Match Point Alert */}
              {team1HasMatchPoint && (
                <div className={`absolute -top-3 px-2.5 sm:px-4 py-0.5 sm:py-1 font-bold text-[8px] sm:text-[10px] tracking-wider rounded-full ${
                  isFinals ? 'bg-amber-400 text-black' : 'bg-red-600 text-white'
                }`}>
                  {isFinals ? 'CHAMPIONSHIP POINT' : 'MATCH POINT'}
                </div>
              )}

              <div className="text-center w-full min-w-0">
                <span className="text-[8px] sm:text-xs uppercase text-white/40 tracking-wider font-bold block mb-0.5 sm:mb-1">HOME TEAM</span>
                <h2 className="text-xs sm:text-base md:text-xl font-black line-clamp-2 max-w-xs mx-auto px-1">{match.team1_name || 'TBD'}</h2>
              </div>

              {/* Serving Indicator details */}
              <div className="flex items-center gap-1 sm:gap-2 my-1 sm:my-3">
                {servingTeamId === match.team1_id && (
                  <div className="flex items-center gap-1 bg-[#D4FF00]/15 border border-[#D4FF00]/40 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[#D4FF00] text-[8px] sm:text-xs font-black uppercase relative">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#D4FF00] inline-block"></span>
                    <span className="ml-1">SERVICE {isDoubles ? serverNumber : ''}</span>
                  </div>
                )}
              </div>

              {/* Big Score Display */}
              <div className="text-center my-1 sm:my-4">
                <div className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter tabular-nums text-white">
                  {score1}
                </div>
              </div>

              {/* Manual Control Buttons */}
              {manualMode ? (
                <div className="flex gap-2 sm:gap-4 mt-1 sm:mt-2 w-full justify-center">
                  <button
                    onClick={() => adjustScoreManual(1, -1)}
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 font-black flex items-center justify-center text-sm sm:text-lg active:scale-90 transition-transform"
                  >-</button>
                  <button
                    onClick={() => adjustScoreManual(1, 1)}
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/15 border border-white/20 hover:bg-white/25 font-black flex items-center justify-center text-sm sm:text-lg active:scale-90 transition-transform text-[#D4FF00]"
                  >+</button>
                </div>
              ) : (
                <div className="h-2 sm:h-8"></div>
              )}
            </div>

            {/* Team 2 Score Card */}
            <div className={`relative rounded-2xl p-3 sm:p-6 md:p-8 border-2 transition-all flex flex-col justify-between items-center ${servingTeamId === match.team2_id
                ? 'bg-white/[0.04] border-[#D4FF00]'
                : 'bg-white/[0.01] border-white/5 opacity-80'
              }`}>
              {/* Match Point Alert */}
              {team2HasMatchPoint && (
                <div className={`absolute -top-3 px-2.5 sm:px-4 py-0.5 sm:py-1 font-bold text-[8px] sm:text-[10px] tracking-wider rounded-full ${
                  isFinals ? 'bg-amber-400 text-black' : 'bg-red-600 text-white'
                }`}>
                  {isFinals ? 'CHAMPIONSHIP POINT' : 'MATCH POINT'}
                </div>
              )}

              <div className="text-center w-full min-w-0">
                <span className="text-[8px] sm:text-xs uppercase text-white/40 tracking-wider font-bold block mb-0.5 sm:mb-1">AWAY TEAM</span>
                <h2 className="text-xs sm:text-base md:text-xl font-black line-clamp-2 max-w-xs mx-auto px-1">{match.team2_name || 'TBD'}</h2>
              </div>

              {/* Serving Indicator details */}
              <div className="flex items-center gap-1 sm:gap-2 my-1 sm:my-3">
                {servingTeamId === match.team2_id && (
                  <div className="flex items-center gap-1 bg-[#D4FF00]/15 border border-[#D4FF00]/40 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[#D4FF00] text-[8px] sm:text-xs font-black uppercase relative">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#D4FF00] inline-block"></span>
                    <span className="ml-1">SERVICE {isDoubles ? serverNumber : ''}</span>
                  </div>
                )}
              </div>

              {/* Big Score Display */}
              <div className="text-center my-1 sm:my-4">
                <div className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tighter tabular-nums text-white">
                  {score2}
                </div>
              </div>

              {/* Manual Control Buttons */}
              {manualMode ? (
                <div className="flex gap-2 sm:gap-4 mt-1 sm:mt-2 w-full justify-center">
                  <button
                    onClick={() => adjustScoreManual(2, -1)}
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 font-black flex items-center justify-center text-sm sm:text-lg active:scale-90 transition-transform"
                  >-</button>
                  <button
                    onClick={() => adjustScoreManual(2, 1)}
                    className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/15 border border-white/20 hover:bg-white/25 font-black flex items-center justify-center text-sm sm:text-lg active:scale-90 transition-transform text-[#D4FF00]"
                  >+</button>
                </div>
              ) : (
                <div className="h-2 sm:h-8"></div>
              )}
            </div>

            {/* Official Pickleball Referee Callout Display Box */}
            {servingTeamId && (
              <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 text-center max-w-md mx-auto w-full my-1 sm:my-2 shadow-inner">
                <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                  TIẾNG HÔ ĐIỂM TRỌNG TÀI
                </span>
                <div className="text-2xl sm:text-4xl font-black text-[#D4FF00] tracking-wider py-0.5 sm:py-1">
                  {servingTeamId === match.team1_id
                    ? `${score1} - ${score2}${isDoubles ? ` - ${serverNumber}` : ''}`
                    : `${score2} - ${score1}${isDoubles ? ` - ${serverNumber}` : ''}`}
                </div>
                <span className="text-[10px] sm:text-xs text-white/70 font-mono">
                  Vị trí phát bóng: <strong className="text-[#D4FF00]">
                    {((servingTeamId === match.team1_id ? score1 : score2) % 2 === 0) ? 'Ô Bên Phải (Điểm chẵn)' : 'Ô Bên Trái (Điểm lẻ)'}
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Manual Mode Extra Overrides */}
      {manualMode && servingTeamId && isAssigned && (
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-white/[0.02] border-t border-white/5 flex flex-wrap gap-2 sm:gap-4 items-center justify-center text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 px-3 py-1.5 rounded-xl">
            <span className="font-bold text-[10px] sm:text-xs opacity-60">GIAO BÓNG:</span>
            <button
              onClick={() => setServingTeamManual(match.team1_id)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs uppercase transition-all ${servingTeamId === match.team1_id ? 'bg-[#D4FF00] text-black font-black' : 'bg-white/10'}`}
            >
              {match.team1_name?.split('/')?.[0] || 'Home'}
            </button>
            <button
              onClick={() => setServingTeamManual(match.team2_id)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs uppercase transition-all ${servingTeamId === match.team2_id ? 'bg-[#D4FF00] text-black font-black' : 'bg-white/10'}`}
            >
              {match.team2_name?.split('/')?.[0] || 'Away'}
            </button>
          </div>

          {isDoubles && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white/5 px-3 py-1.5 rounded-xl">
              <span className="font-bold text-[10px] sm:text-xs opacity-60">LƯỢT:</span>
              <button
                onClick={() => setServerNumberManual(1)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs transition-all ${serverNumber === 1 ? 'bg-[#D4FF00] text-black font-black' : 'bg-white/10'}`}
              >
                1
              </button>
              <button
                onClick={() => setServerNumberManual(2)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] sm:text-xs transition-all ${serverNumber === 2 ? 'bg-[#D4FF00] text-black font-black' : 'bg-white/10'}`}
              >
                2
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Action Controllers Bottom Bar */}
      <footer className="p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] bg-white/5 border-t border-white/10 flex flex-col gap-2 sm:gap-3 sticky bottom-0">
        {!isAssigned ? (
          <div className="w-full py-3.5 sm:py-4 bg-red-950/60 border border-red-500/40 text-red-200 text-xs sm:text-sm font-bold text-center rounded-xl flex items-center justify-center gap-2">
            <Lock size={16} />
            <span>Chế độ chỉ xem: Bạn không được phân công làm trọng tài cho trận này ({match.referee_name || 'N/A'}).</span>
          </div>
        ) : (
          <>
            {/* Core Scoring Actions Row (Side-by-side) */}
            {status === 'live' && servingTeamId && !manualMode && (
              <div className="flex gap-2 sm:gap-3 w-full">
                {/* Rally Won Button */}
                <button
                  onClick={handleServingTeamWins}
                  className="flex-[2] py-3.5 sm:py-4 bg-[#D4FF00] hover:bg-[#bce600] text-black font-black text-xs sm:text-sm md:text-base rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg shadow-[#D4FF00]/15 cursor-pointer"
                >
                  <span>+1 ĐIỂM (GIAO THẮNG)</span>
                </button>

                {/* Fault Sideout Button */}
                <button
                  onClick={handleFault}
                  className="flex-1 py-3.5 sm:py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs sm:text-sm md:text-base rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>LỖI / ĐỔI BÊN</span>
                </button>
              </div>
            )}

            {status === 'upcoming' && (
              <div className="w-full py-3 sm:py-4 text-center text-white/50 text-xs sm:text-sm font-bold bg-white/5 border border-white/10 rounded-xl">
                TRẬN ĐẤU CHƯA BẮT ĐẦU
              </div>
            )}

            {/* Secondary Actions Row (Side-by-side) */}
            <div className="flex gap-2 sm:gap-3 w-full justify-between items-center">
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex-1 py-2 sm:py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-white/80 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer disabled:cursor-not-allowed"
              >
                <Undo2 size={14} /> HOÀN TÁC
              </button>

              {status === 'live' && (
                <button
                  onClick={handleSubmitResult}
                  className="flex-1 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
                >
                  <CheckCircle size={14} /> KẾT THÚC
                </button>
              )}
            </div>
          </>
        )}
      </footer>
    </div>
  );
}
