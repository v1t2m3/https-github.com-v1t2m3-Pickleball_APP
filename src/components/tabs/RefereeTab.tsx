import { useState } from 'react';
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
      {matches.length === 0 && (
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

      {matches.length > 0 && (
        <div className="grid grid-cols-1 gap-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase tracking-tighter">REFEREE DASHBOARD</h3>
          </div>
          
          <div className="space-y-6">
            {matches.filter(m => m.status !== 'completed').map(m => {
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
          </div>
        </div>
      )}

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
