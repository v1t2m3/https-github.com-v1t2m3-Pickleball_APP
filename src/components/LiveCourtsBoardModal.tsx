import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Maximize, Minimize, Volume2, VolumeX, Trophy, Flame, Play, Shield, RefreshCw } from 'lucide-react';
import { Tournament, Match } from '../types';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../contexts/AuthContext';
import { playWhistleBurst } from '../lib/sound';

interface Props {
  tournament: Tournament;
  matches: Match[];
  onClose: () => void;
  onMatchUpdated?: (updated: Match) => void;
}

export default function LiveCourtsBoardModal({ tournament, matches: initialMatches, onClose, onMatchUpdated }: Props) {
  const { user, isAdmin } = useAuth();
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastAlertedMatchPoints = useRef<Record<number, boolean>>({});

  // Modern Web Guidance: Escape key closes modal dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isDoubles = tournament.match_type?.toLowerCase()?.includes('doubles') ?? true;

  // Listen to real-time socket events
  useEffect(() => {
    const socket = getSocket();

    const handleMatchUpdated = (updated: Match) => {
      setMatches(prev => {
        const index = prev.findIndex(m => m.id === updated.id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = { ...next[index], ...updated };
          return next;
        }
        return [...prev, updated];
      });
      if (onMatchUpdated) onMatchUpdated(updated);
    };

    socket.on('match_updated', handleMatchUpdated);
    socket.on('score_updated', handleMatchUpdated);

    return () => {
      socket.off('match_updated', handleMatchUpdated);
      socket.off('score_updated', handleMatchUpdated);
    };
  }, [onMatchUpdated]);

  // Keep local matches in sync with parent props
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      boardRef.current?.requestFullscreen().catch(err => {
        console.error('Fullscreen request error:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Exit fullscreen error:', err);
      });
    }
  };

  // Extract all distinct courts from matches
  const availableCourts = useMemo(() => {
    const courtsSet = new Set<string>();
    matches.forEach(m => {
      if (m.court) courtsSet.add(m.court);
    });
    return Array.from(courtsSet).sort();
  }, [matches]);

  // Filter live matches
  const liveMatches = useMemo(() => {
    let list = matches.filter(m => m.status === 'live');
    if (selectedCourtFilter !== 'all') {
      list = list.filter(m => m.court === selectedCourtFilter);
    }
    // Sort by court, then order
    return list.sort((a, b) => {
      if ((a.court || '') !== (b.court || '')) {
        return (a.court || '').localeCompare(b.court || '');
      }
      return (a.match_order || 1) - (b.match_order || 1);
    });
  }, [matches, selectedCourtFilter]);

  // Calculate Match / Championship Point info for each match
  const getPointMilestone = (m: Match) => {
    const activeFormat = m.scoring_format || tournament.scoring_format || '11_win_by_2';
    const target = activeFormat.includes('15') ? 15 : activeFormat.includes('21') ? 21 : activeFormat.includes('25') ? 25 : 11;
    const winBy2 = activeFormat.includes('win_by_2');

    let team1HasPoint = false;
    let team2HasPoint = false;

    if (m.status === 'live' && m.serving_team_id) {
      if (winBy2) {
        team1HasPoint = m.serving_team_id === m.team1_id && m.score_team1 >= target - 1 && m.score_team1 - m.score_team2 >= 1;
        team2HasPoint = m.serving_team_id === m.team2_id && m.score_team2 >= target - 1 && m.score_team2 - m.score_team1 >= 1;
      } else {
        team1HasPoint = m.serving_team_id === m.team1_id && m.score_team1 >= target - 1;
        team2HasPoint = m.serving_team_id === m.team2_id && m.score_team2 >= target - 1;
      }
    }

    const hasMilestone = team1HasPoint || team2HasPoint;
    const isFinals = (m.round || '').toLowerCase().includes('final') || (m.round || '').toLowerCase().includes('chung kết');
    const milestoneType: 'championship' | 'match' | 'game' | null = hasMilestone
      ? isFinals ? 'championship' : 'match'
      : null;

    return {
      hasMilestone,
      milestoneType,
      team1HasPoint,
      team2HasPoint,
      targetScore: target
    };
  };

  // Sound triggering on new match point
  useEffect(() => {
    if (!soundEnabled) return;
    liveMatches.forEach(m => {
      const { hasMilestone } = getPointMilestone(m);
      if (hasMilestone && !lastAlertedMatchPoints.current[m.id]) {
        playWhistleBurst(0.35);
        lastAlertedMatchPoints.current[m.id] = true;
      } else if (!hasMilestone) {
        lastAlertedMatchPoints.current[m.id] = false;
      }
    });
  }, [liveMatches, soundEnabled]);

  // Quick Start match as live (for admin/assigned referee)
  const handleQuickStart = async (matchId: number) => {
    try {
      const res = await api(`/tournaments/${tournament.id}/matches/${matchId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'live' })
      });
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'live' } : m));
    } catch (e: any) {
      alert(e.message || 'Lỗi khi bắt đầu trận đấu');
    }
  };

  const upcomingMatches = matches.filter(m => m.status === 'upcoming');

  return (
    <div
      ref={boardRef}
      className="fixed inset-0 z-50 bg-[#060709] text-white flex flex-col font-sans select-none overflow-hidden modal-contain-scroll"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-courts-heading"
    >
      {/* Top Navigation Bar */}
      <header className="px-3 sm:px-6 py-2.5 sm:py-3.5 bg-black/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                BẢNG ĐIỂM TRỰC TIẾP CÁC SÂN
              </h1>
              <span className="bg-[#D4FF00] text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline-block">
                LIVE SCOREBOARD
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-mono truncate max-w-xs sm:max-w-md">
              {tournament.name} • {liveMatches.length} trận đang diễn ra
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border ${
              soundEnabled
                ? 'bg-[#D4FF00] text-black border-[#D4FF00]'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
            }`}
            title={soundEnabled ? 'Tắt âm thanh còi thông báo' : 'Bật âm thanh còi thông báo Match Point'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden md:inline">{soundEnabled ? 'Còi: BẬT' : 'Còi: TẮT'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all active:scale-95 border border-white/10"
            title="Bật/Tắt toàn màn hình (Thích hợp cho TV / Màn hình LED)"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95"
            title="Đóng bảng điểm"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Court Filter Pills Bar */}
      {availableCourts.length > 0 && (
        <div className="px-3 sm:px-6 py-2 bg-white/[0.02] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mr-1 shrink-0">LỌC SÂN:</span>
          <button
            onClick={() => setSelectedCourtFilter('all')}
            className={`px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase transition-all shrink-0 ${
              selectedCourtFilter === 'all'
                ? 'bg-[#D4FF00] text-black shadow-sm'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            Tất cả ({liveMatches.length})
          </button>
          {availableCourts.map(court => {
            const countOnCourt = matches.filter(m => m.status === 'live' && m.court === court).length;
            return (
              <button
                key={court}
                onClick={() => setSelectedCourtFilter(court)}
                className={`px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase transition-all shrink-0 ${
                  selectedCourtFilter === court
                    ? 'bg-[#D4FF00] text-black shadow-sm'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                🏟️ {court} {countOnCourt > 0 && `(${countOnCourt})`}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Scoreboard Area */}
      <main className="flex-1 p-3 sm:p-6 overflow-y-auto no-scrollbar">
        {liveMatches.length > 0 ? (
          <div className={`grid gap-4 sm:gap-6 ${
            liveMatches.length === 1
              ? 'grid-cols-1 max-w-4xl mx-auto'
              : liveMatches.length === 2
                ? 'grid-cols-1 lg:grid-cols-2 max-w-6xl mx-auto'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          }`}>
            {liveMatches.map(m => {
              const { hasMilestone, milestoneType } = getPointMilestone(m);
              const isServing1 = m.serving_team_id === m.team1_id;
              const isServing2 = m.serving_team_id === m.team2_id;
              const servingScore = isServing1 ? m.score_team1 : isServing2 ? m.score_team2 : 0;
              const receivingScore = isServing1 ? m.score_team2 : isServing2 ? m.score_team1 : 0;
              const serverNum = m.server_number || 1;
              const serviceSide = (servingScore % 2 === 0) ? 'Bên Phải (Điểm chẵn)' : 'Bên Trái (Điểm lẻ)';

              return (
                <div
                  key={m.id}
                  className="bg-[#0e1014] rounded-3xl border-2 border-white/10 hover:border-[#D4FF00]/60 p-4 sm:p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300"
                >
                  {/* Point Milestone Banner */}
                  {milestoneType === 'championship' && (
                    <div className="absolute top-0 left-0 right-0 py-1 bg-amber-400 text-black text-[10px] font-bold uppercase tracking-wider text-center z-10">
                      Championship Point
                    </div>
                  )}
                  {milestoneType === 'match' && (
                    <div className="absolute top-0 left-0 right-0 py-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider text-center z-10">
                      Match Point
                    </div>
                  )}

                  {/* Header info bar */}
                  <div className={`flex items-center justify-between gap-2 pb-3 border-b border-white/10 ${hasMilestone ? 'pt-4' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="bg-[#D4FF00] text-black font-bold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                        {m.court || 'Sân đấu'}
                      </span>
                      <span className="text-[10px] sm:text-xs font-mono text-gray-400 truncate uppercase">
                        {m.group_name ? `${m.group_name}` : `Vòng ${m.round}`} • Trận {m.match_order || 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">LIVE</span>
                    </div>
                  </div>

                  {/* Two Teams Score Box */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 my-4 flex-1 items-stretch">
                    {/* Team 1 Box */}
                    <div className={`p-3 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                      isServing1
                        ? 'bg-white/[0.06] border-[#D4FF00]'
                        : 'bg-white/[0.02] border-white/5 opacity-80'
                    }`}>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">ĐỘI 1</span>
                          {isServing1 && (
                            <span className="inline-flex items-center gap-1 bg-[#D4FF00] text-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {isDoubles ? `Giao ${serverNum}` : 'Giao bóng'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base lg:text-lg font-black text-white line-clamp-2" title={m.team1_name || 'TBD'}>
                          {m.team1_name || 'TBD'}
                        </h3>
                      </div>

                      <div className="text-center my-2 sm:my-4">
                        <span className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter tabular-nums text-white">
                          {m.score_team1}
                        </span>
                      </div>

                      {isServing1 && (
                        <div className="text-[9px] text-[#D4FF00] font-mono text-center font-bold truncate">
                          {serviceSide}
                        </div>
                      )}
                    </div>

                    {/* Team 2 Box */}
                    <div className={`p-3 sm:p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                      isServing2
                        ? 'bg-white/[0.06] border-[#D4FF00]'
                        : 'bg-white/[0.02] border-white/5 opacity-80'
                    }`}>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">ĐỘI 2</span>
                          {isServing2 && (
                            <span className="inline-flex items-center gap-1 bg-[#D4FF00] text-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {isDoubles ? `Giao ${serverNum}` : 'Giao bóng'}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base lg:text-lg font-black text-white line-clamp-2" title={m.team2_name || 'TBD'}>
                          {m.team2_name || 'TBD'}
                        </h3>
                      </div>

                      <div className="text-center my-2 sm:my-4">
                        <span className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter tabular-nums text-white">
                          {m.score_team2}
                        </span>
                      </div>

                      {isServing2 && (
                        <div className="text-[9px] text-[#D4FF00] font-mono text-center font-bold truncate">
                          {serviceSide}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pickleball Referee Callout Bar */}
                  {m.serving_team_id ? (
                    <div className="py-2 px-3 bg-white/5 rounded-xl border border-white/10 text-center mb-3">
                      <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest block mb-0.5">
                        TIẾNG HÔ ĐIỂM TRỌNG TÀI
                      </span>
                      <div className="text-lg sm:text-xl font-black text-[#D4FF00] tracking-wider">
                        {servingScore} - {receivingScore} {isDoubles && `- ${serverNum}`}
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 px-3 bg-white/5 rounded-xl border border-white/10 text-center mb-3 text-[10px] text-gray-400 font-bold uppercase">
                      Đang chuẩn bị lượt phát bóng đầu tiên
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span className="truncate">
                      👮 Trọng tài: {m.referee_name || 'Chưa gán'}{m.referee2_name ? ` & ${m.referee2_name}` : ''}
                    </span>
                    <span className="shrink-0 uppercase font-bold text-white/50">
                      {isDoubles ? 'Đôi' : 'Đơn'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty Live Matches View */
          <div className="max-w-xl mx-auto py-12 text-center space-y-6">
            <div className="p-4 bg-white/5 rounded-full w-20 h-20 mx-auto flex items-center justify-center border border-white/10">
              <Trophy size={40} className="text-[#D4FF00]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                CHƯA CÓ TRẬN ĐẤU NÀO ĐANG DIỄN RA
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 font-medium">
                Hiện tại không có trận đấu nào ở trạng thái LIVE. Trọng tài hoặc Ban tổ chức có thể bấm "Bắt đầu trận đấu" để đưa bảng điểm lên màn hình.
              </p>
            </div>

            {/* List upcoming matches with Quick-Start button for Admin/Referee */}
            {upcomingMatches.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  CÁC TRẬN ĐẤU ĐANG CHỜ BẮT ĐẦU ({upcomingMatches.length})
                </span>
                <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                  {upcomingMatches.slice(0, 5).map(um => (
                    <div key={um.id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between gap-3 border border-white/5">
                      <div className="min-w-0">
                        <div className="text-[9px] text-[#D4FF00] font-bold uppercase">
                          {um.court ? `${um.court} • Trận ${um.match_order || 1}` : `Vòng ${um.round}`}
                        </div>
                        <div className="text-xs font-bold text-white truncate">
                          {um.team1_name || 'TBD'} vs {um.team2_name || 'TBD'}
                        </div>
                      </div>
                      {(isAdmin || user?.role === 'referee') && (
                        <button
                          onClick={() => handleQuickStart(um.id)}
                          className="px-3 py-1.5 bg-[#D4FF00] hover:bg-[#bce600] text-black font-black text-xs rounded-lg uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shrink-0 cursor-pointer"
                        >
                          <Play size={12} fill="black" /> BẮT ĐẦU
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
