import React, { useState, useEffect, useRef } from 'react';
import { Match, Tournament } from '../types';
import { api } from '../lib/api';
import { Maximize2, Minimize2, Volume2, VolumeX, X, ArrowLeftRight, Trophy } from 'lucide-react';
import { playScoreSound, playGamePointWhistle, playMatchPointWhistle, playWhistleBurst } from '../lib/sound';
import confetti from 'canvas-confetti';

interface Props {
  match: Match;
  tournament: Tournament;
  onClose: () => void;
  onMatchUpdated?: (updatedMatch: Match) => void;
}

export default function CourtScoreboardModal({ match: initialMatch, tournament, onClose, onMatchUpdated }: Props) {
  const [match, setMatch] = useState<Match>(initialMatch);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Parse scoring target
  const getTargetScore = () => {
    const fmt = match.scoring_format || tournament.scoring_format || '11_win_by_2';
    if (fmt.startsWith('15')) return 15;
    if (fmt.startsWith('21')) return 21;
    if (fmt.startsWith('25')) return 25;
    return 11;
  };

  const targetScore = getTargetScore();
  const winBy2 = (match.scoring_format || tournament.scoring_format || '11_win_by_2').includes('win_by_2');

  const s1 = match.score_team1 || 0;
  const s2 = match.score_team2 || 0;

  // Determine Game Point or Match Point condition
  const isTeam1GamePoint = s1 >= targetScore - 1 && (!winBy2 || s1 - s2 >= 1);
  const isTeam2GamePoint = s2 >= targetScore - 1 && (!winBy2 || s2 - s1 >= 1);
  const isGamePoint = (isTeam1GamePoint || isTeam2GamePoint) && match.status !== 'completed';

  const isCompleted = match.status === 'completed';
  const winnerTeam = s1 > s2 ? match.team1_name : match.team2_name;

  // Track previous state for sound alerts
  const prevGamePointRef = useRef(false);
  const prevCompletedRef = useRef(false);

  useEffect(() => {
    if (soundEnabled && isGamePoint && !prevGamePointRef.current && !isCompleted) {
      playGamePointWhistle();
    }
    prevGamePointRef.current = isGamePoint;

    if (soundEnabled && isCompleted && !prevCompletedRef.current) {
      playMatchPointWhistle();
      try {
        confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 } });
      } catch (e) {}
    }
    prevCompletedRef.current = isCompleted;
  }, [isGamePoint, isCompleted, soundEnabled]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Modern Web Guidance: Escape key closes modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleUpdateScore = async (newScore1: number, newScore2: number) => {
    const clamped1 = Math.max(0, newScore1);
    const clamped2 = Math.max(0, newScore2);
    if (clamped1 === s1 && clamped2 === s2) return;

    if (soundEnabled) {
      playScoreSound();
    }

    try {
      setUpdating(true);
      const isFin = (clamped1 >= targetScore && (!winBy2 || clamped1 - clamped2 >= 2)) ||
                    (clamped2 >= targetScore && (!winBy2 || clamped2 - clamped1 >= 2));

      const updated = await api(`/tournaments/${tournament.id}/matches/${match.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          score_team1: clamped1,
          score_team2: clamped2,
          status: isFin ? 'completed' : 'live'
        })
      });

      setMatch(updated);
      if (onMatchUpdated) onMatchUpdated(updated);
    } catch (e: any) {
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleServer = async () => {
    if (soundEnabled) playWhistleBurst(0.15, 30);
    const nextServingId = match.serving_team_id === match.team1_id ? match.team2_id : match.team1_id;
    const nextServerNum = match.server_number === 1 ? 2 : 1;

    try {
      const updated = await api(`/tournaments/${tournament.id}/matches/${match.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          serving_team_id: nextServingId,
          server_number: nextServerNum
        })
      });
      setMatch(updated);
      if (onMatchUpdated) onMatchUpdated(updated);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#050507] text-white flex flex-col font-sans select-none overflow-hidden modal-contain-scroll"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoreboard-title"
    >
      {/* Top Bar Navigation */}
      <header className="px-4 sm:px-8 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#D4FF00] animate-pulse"></div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4FF00] block">
              BẢNG ĐIỂM SÂN ĐẤU (LED SCOREBOARD) • {match.court || 'SÂN TRUNG TÂM'}
            </span>
            <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-white/90">
              {match.round} • {tournament.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playScoreSound();
            }}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-[#D4FF00]/10 border-[#D4FF00]/40 text-[#D4FF00]'
                : 'bg-white/5 border-white/10 text-white/40'
            }`}
            title={soundEnabled ? 'Tắt tiếng còi trọng tài' : 'Bật tiếng còi trọng tài'}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-white/80 hover:text-white"
            title="Toàn màn hình (F11)"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* Exit */}
          <button
            onClick={onClose}
            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-all text-red-400 hover:text-white"
            title="Đóng bảng điểm"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Scoreboard Area */}
      <main className="flex-1 p-3 sm:p-8 flex flex-col justify-center items-center max-w-7xl mx-auto w-full">
        {/* Game Point / Victory Alert Banner */}
        {isCompleted ? (
          <div className="mb-4 sm:mb-6 px-5 py-2 bg-emerald-500/15 border border-emerald-500/40 rounded-full flex items-center gap-2">
            <Trophy className="text-[#D4FF00] w-5 h-5" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#D4FF00]">
              Chiến thắng: {winnerTeam}
            </span>
          </div>
        ) : isGamePoint ? (
          <div className="mb-4 sm:mb-6 px-5 py-2 bg-amber-500/15 border border-amber-500/40 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300">
              Game Point / Match Point
            </span>
          </div>
        ) : null}

        {/* 2-Column Split Score Display */}
        <div className="grid grid-cols-2 gap-3 sm:gap-8 w-full flex-1 items-stretch">
          {/* Team 1 Box */}
          <div className={`flex flex-col items-center justify-between p-4 sm:p-8 rounded-2xl border transition-colors ${
            match.serving_team_id === match.team1_id
              ? 'bg-white/[0.04] border-[#D4FF00]'
              : 'bg-white/[0.02] border-white/10'
          }`}>
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-mono uppercase tracking-widest text-white/50">ĐỘI 1</span>
                {match.serving_team_id === match.team1_id && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D4FF00] text-black text-[10px] sm:text-xs font-black uppercase tracking-wider">
                    GIAO BÓNG #{match.server_number || 1}
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-3xl md:text-4xl font-black mt-2 tracking-tight text-white line-clamp-2">
                {match.team1_name || 'Đội 1'}
              </h3>
            </div>

            {/* Giant Score Digit */}
            <div className="my-auto py-2">
              <span className="text-7xl sm:text-9xl md:text-[13rem] font-black font-mono leading-none tracking-tighter text-[#D4FF00] tabular-nums">
                {s1}
              </span>
            </div>

            {/* Quick Touch Scoring Controls */}
            <div className="flex items-center gap-2 sm:gap-3 w-full max-w-xs mt-2">
              <button
                disabled={updating || isCompleted}
                onClick={() => handleUpdateScore(s1 - 1, s2)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl font-black text-sm uppercase transition-all active:scale-95 disabled:opacity-30"
              >
                -1
              </button>
              <button
                disabled={updating || isCompleted}
                onClick={() => handleUpdateScore(s1 + 1, s2)}
                className="flex-[2] py-4 bg-[#D4FF00] hover:bg-[#bce600] text-black rounded-2xl font-black text-lg uppercase transition-all active:scale-95 shadow-lg shadow-[#D4FF00]/20 disabled:opacity-30 cursor-pointer"
              >
                +1 Điểm
              </button>
            </div>
          </div>

          {/* Team 2 Box */}
          <div className={`flex flex-col items-center justify-between p-4 sm:p-8 rounded-2xl border transition-colors ${
            match.serving_team_id === match.team2_id
              ? 'bg-white/[0.04] border-[#00ffff]'
              : 'bg-white/[0.02] border-white/10'
          }`}>
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-mono uppercase tracking-widest text-white/50">ĐỘI 2</span>
                {match.serving_team_id === match.team2_id && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#00ffff] text-black text-[10px] sm:text-xs font-black uppercase tracking-wider">
                    GIAO BÓNG #{match.server_number || 1}
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-3xl md:text-4xl font-black mt-2 tracking-tight text-white line-clamp-2">
                {match.team2_name || 'Đội 2'}
              </h3>
            </div>

            {/* Giant Score Digit */}
            <div className="my-auto py-2">
              <span className="text-7xl sm:text-9xl md:text-[13rem] font-black font-mono leading-none tracking-tighter text-[#00ffff] tabular-nums">
                {s2}
              </span>
            </div>

            {/* Quick Touch Scoring Controls */}
            <div className="flex items-center gap-2 sm:gap-3 w-full max-w-xs mt-2">
              <button
                disabled={updating || isCompleted}
                onClick={() => handleUpdateScore(s1, s2 - 1)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/15 border border-white/10 rounded-2xl font-black text-sm uppercase transition-all active:scale-95 disabled:opacity-30"
              >
                -1
              </button>
              <button
                disabled={updating || isCompleted}
                onClick={() => handleUpdateScore(s1, s2 + 1)}
                className="flex-[2] py-4 bg-[#00ffff] hover:bg-[#00d4d4] text-black rounded-2xl font-black text-lg uppercase transition-all active:scale-95 shadow-lg shadow-[#00ffff]/20 disabled:opacity-30 cursor-pointer"
              >
                +1 Điểm
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Umpire Actions */}
        <div className="mt-4 sm:mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleToggleServer}
            disabled={isCompleted}
            className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ArrowLeftRight size={16} /> Đổi lượt giao bóng (Side Out)
          </button>
          
          <span className="text-xs font-mono uppercase tracking-widest text-white/40 px-3">
            Thể thức: Chạm {targetScore} {winBy2 ? '(cách 2 điểm)' : ''}
          </span>
        </div>
      </main>
    </div>
  );
}
