import { useState, useEffect } from 'react';
import { Play, RotateCcw, Shield, CheckCircle, Trophy, Volume2, Layers } from 'lucide-react';
import { Tournament, Match } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../../lib/api';
import ScoringModal from '../ScoringModal';
import BracketBuilderModal from '../BracketBuilderModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  tournament: Tournament;
  matches: Match[];
}

export default function RefereeTab({ tournament, matches }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedScoringMatch, setSelectedScoringMatch] = useState<Match | null>(null);
  const [bracketBuilderOpen, setBracketBuilderOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
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
          referee_id: null
        })
      });
      alert("Khởi tạo trận đấu thành công! Trận đấu đã hiển thị live.");
      window.location.reload();
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
      window.location.reload(); // Quick refresh to show matches
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
    } catch (e) {
      console.error(e);
    }
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
               <p className="text-xs text-gray-400 font-medium">Bốc thăm ngẫu nhiên hoặc ghép cặp thủ công siêu tốc để bắt đầu trận đấu live ngay lập tức.</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Chọn Sân</label>
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Đội / Cặp Đấu 1</label>
              <select 
                value={selectedTeam1} 
                onChange={e => setSelectedTeam1(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00] font-bold text-sm truncate"
              >
                <option value="">-- Chọn Đội 1 --</option>
                {registeredTeams.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.p1_name} {t.p2_name ? `& ${t.p2_name}` : ''})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Đội / Cặp Đấu 2</label>
              <select 
                value={selectedTeam2} 
                onChange={e => setSelectedTeam2(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D4FF00] font-bold text-sm truncate"
              >
                <option value="">-- Chọn Đội 2 --</option>
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
                🎲 NGẪU NHIÊN
              </button>
              
              <button 
                onClick={handleCreateSocialMatch}
                disabled={loading}
                className="flex-1 py-3 bg-black hover:bg-gray-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                🚀 GHÉP TRẬN LIVE
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
                BỐC THĂM THỦ CÔNG / VẼ NHÁNH
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
              <h4 className="font-black text-sm uppercase tracking-tight text-gray-900">VẼ NHÁNH ĐẤU LOẠI TRỰC TIẾP (KNOCKOUT BRACKET)</h4>
              <p className="text-[10px] text-gray-400 font-medium">Tạo sơ đồ nhánh bán kết/tứ kết loại trực tiếp chéo bảng (Nhất bảng này gặp Nhì bảng kia) hoặc thủ công.</p>
            </div>
          </div>
          <button 
            onClick={() => setBracketBuilderOpen(true)}
            className="px-6 py-3.5 bg-[#D4FF00] hover:bg-[#bce600] text-black rounded-xl font-black text-xs hover:scale-105 transition-all shadow-sm shadow-[#D4FF00]/15 uppercase tracking-wider whitespace-nowrap"
          >
            VẼ NHÁNH ĐẤU KNOCKOUT
          </button>
        </div>
      )}

      {matches.length > 0 && (() => {
        const groups = Array.from(new Set(
          matches
            .filter(m => m.group_id)
            .map(m => JSON.stringify({ id: m.group_id, name: m.group_name || `Bảng ${m.group_id}` }))
        )).map(str => JSON.parse(str) as { id: number; name: string });

        const filteredMatches = matches.filter(m => {
          if (m.status === 'completed') return false;
          if (selectedGroup === 'all') return true;
          if (selectedGroup === 'knockout') return !m.group_id;
          return m.group_id?.toString() === selectedGroup;
        });

        return (
          <div className="grid grid-cols-1 gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-2xl font-black uppercase tracking-tighter">REFEREE DASHBOARD</h3>
              {groups.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lọc Bảng:</span>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="bg-white border border-gray-200 text-sm font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#D4FF00] shadow-sm cursor-pointer"
                  >
                    <option value="all">Tất cả bảng đấu</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id.toString()}>{g.name}</option>
                    ))}
                    {matches.some(m => !m.group_id) && (
                      <option value="knockout">Knockout / Nhánh đấu</option>
                    )}
                  </select>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              {filteredMatches.map(m => {
                const isServing1 = m.serving_team_id === m.team1_id;
                const isServing2 = m.serving_team_id === m.team2_id;
                const targetScore = tournament.scoring_format?.includes('15') ? 15 : tournament.scoring_format?.includes('21') ? 21 : 11;
                const isDoubles = tournament.match_type?.toLowerCase()?.includes('doubles') ?? true;

                const team1HasMatchPoint = m.status === 'live' && isServing1 && m.score_team1 >= targetScore - 1 && m.score_team1 - m.score_team2 >= 1;
                const team2HasMatchPoint = m.status === 'live' && isServing2 && m.score_team2 >= targetScore - 1 && m.score_team2 - m.score_team1 >= 1;

                return (
                <div key={m.id} className={cn(
                  "bg-white rounded-3xl p-6 md:p-8 border-2 shadow-sm transition-all",
                  m.status === 'live' ? "border-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.05)]" : "border-gray-100 opacity-70 hover:opacity-100"
                )}>
                  <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-center justify-between">
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
                               SERVING {isDoubles ? m.server_number : ''}
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
                               SERVING {isDoubles ? m.server_number : ''}
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
                    </div>

                    {/* Actions Column */}
                    <div className="w-full lg:w-80 flex flex-col gap-3">
                      {m.status === 'upcoming' ? (
                        <button 
                          onClick={() => startMatch(m.id)}
                          className="w-full py-5 bg-[#0a0a0a] text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-transform active:scale-95"
                        >
                          <Play fill="white" size={18} /> BẮT ĐẦU TRẬN ĐẤU
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => setSelectedScoringMatch(m)}
                            className="w-full py-5 bg-[#D4FF00] text-black rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-all uppercase tracking-wide shadow-md shadow-[#D4FF00]/10 border border-[#D4FF00]"
                          >
                            <Shield size={18} /> NHẬP ĐIỂM SỐ
                          </button>
                          
                          <button 
                            onClick={() => completeMatch(m.id)}
                            className="w-full py-3.5 bg-white/5 border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all uppercase"
                          >
                            <CheckCircle size={14} /> HOÀN THÀNH TRẬN ĐẤU
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )})}
              {filteredMatches.length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 text-gray-400 font-medium">
                  Không có trận đấu nào đang diễn ra ở bảng này.
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
          onUpdate={() => {}}
        />
      )}

      {bracketBuilderOpen && (
        <BracketBuilderModal
          tournament={tournament}
          onClose={() => setBracketBuilderOpen(false)}
          onUpdate={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
