import { useState, useEffect } from 'react';
import { Tournament, Match } from '../../types';
import { Trophy, Sparkles, Layers, Settings, X, Shield, Medal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import BracketBuilderModal from '../BracketBuilderModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  tournament: Tournament;
  matches: Match[];
  isOwner?: boolean;
  onReload?: () => void;
}

export default function BracketTab({ tournament, matches, isOwner, onReload }: Props) {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bracketBuilderOpen, setBracketBuilderOpen] = useState(false);

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
      onReload?.();
    } catch (err) {
      console.error('Failed to save scheduling:', err);
    }
  };

  const refereeUsers = users.filter(u => u.role === 'referee' || u.role === 'admin');

  // Group matches by round (filtering out group stage matches)
  const knockoutMatches = matches.filter(m => !m.group_id);

  // Sort rounds logically: Round of 16 -> Quarterfinals -> Semifinals -> Finals -> Third Place
  const roundOrder = ['Round of 16', 'Quarterfinals', 'Semifinals', 'Finals', 'Third Place'];
  const rounds = Array.from(new Set(knockoutMatches.map(m => m.round))).sort((a, b) => {
    let idxA = roundOrder.indexOf(a);
    let idxB = roundOrder.indexOf(b);
    if (idxA === -1) idxA = 99;
    if (idxB === -1) idxB = 99;
    return idxA - idxB;
  });

  const handleAutoGenerate = async () => {
    if (!confirm("Hệ thống sẽ tự động tổng hợp kết quả Nhất & Nhì của các bảng hiện tại để sinh nhánh đấu. Bạn có muốn tiếp tục?")) {
      return;
    }
    setLoading(true);
    try {
      await api(`/tournaments/${tournament.id}/bracket/generate-auto`, {
        method: 'POST'
      });
      onReload?.();
    } catch (e: any) {
      alert(e.message || "Lỗi khi tự động khởi tạo nhánh đấu. Hãy đảm bảo đã chia bảng đấu hợp lệ.");
    } finally {
      setLoading(false);
    }
  };

  const isCombineFormat = (tournament.format?.toLowerCase() || '').includes('round-robin') || (tournament.format?.toLowerCase() || '').includes('combination');

  if (knockoutMatches.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        {isOwner && isCombineFormat ? (
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6 text-center">
            <div className="inline-flex p-4 bg-[#D4FF00]/10 text-black rounded-full mb-2">
              <Trophy size={40} className="text-black" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">KHỞI TẠO NHÁNH ĐẤU KNOCKOUT</h3>
              <p className="text-sm text-gray-400 font-medium max-w-lg mx-auto">
                Vòng bảng đang diễn ra. Khi các trận đấu vòng bảng kết thúc, bạn có thể tự động ghép cặp chéo hạt giống hoặc cấu hình phân hạt giống thủ công.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button
                onClick={handleAutoGenerate}
                disabled={loading}
                className="px-6 py-4 bg-[#D4FF00] hover:bg-[#bce600] text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all disabled:opacity-50 shadow-sm uppercase tracking-wider"
              >
                <Sparkles size={16} /> {loading ? 'ĐANG KHỞI TẠO...' : 'TỰ ĐỘNG GHÉP CẶP CHÉO'}
              </button>
              <button
                onClick={() => setBracketBuilderOpen(true)}
                className="px-6 py-4 bg-black hover:bg-gray-800 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-sm uppercase tracking-wider"
              >
                <Layers size={16} /> THỦ CÔNG CHỌN CẶP ĐẤU
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center">
            <Trophy size={48} className="text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-1">CHƯA KHỞI TẠO NHÁNH ĐẤU</h3>
            <p className="text-sm text-gray-400 font-medium">
              Sơ đồ thi đấu Knockout sẽ tự động xuất hiện tại đây ngay khi Ban tổ chức tiến hành khởi tạo nhánh đấu.
            </p>
          </div>
        )}

        {bracketBuilderOpen && (
          <BracketBuilderModal
            tournament={tournament}
            onClose={() => setBracketBuilderOpen(false)}
            onUpdate={() => onReload?.()}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optional control menu for quick overrides */}
      {isOwner && (
        <div className="flex justify-end gap-3 max-w-6xl mx-auto px-4">
          <button
            onClick={() => setBracketBuilderOpen(true)}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 uppercase"
          >
            <Layers size={12} /> THIẾT LẬP LẠI SƠ ĐỒ NHÁNH
          </button>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-hidden pb-8">
        <div className="flex gap-12 min-w-max p-4 justify-center">
          {rounds.map((round) => (
            <div key={round} className="w-72 space-y-8">
              <div className="text-center flex flex-col items-center gap-2">
                <span className="text-[10px] font-black tracking-[.2em] uppercase text-black bg-[#D4FF00] px-4 py-1.5 rounded-full border border-black/10 shadow-sm">
                  {round}
                </span>
                {round.toLowerCase().includes('final') && !round.toLowerCase().includes('semifinal') && !round.toLowerCase().includes('quarterfinal') && (
                  <div className="flex flex-col items-center mt-1 animate-bounce">
                    <Trophy className="text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]" size={30} fill="#b0b906ff" />
                    <span className="text-[10px] font-extrabold text-[#FFD700] uppercase tracking-wider mt-0.5">CHAMPIONSHIP</span>
                  </div>
                )}
                {round.toLowerCase().includes('third') && (
                  <div className="flex flex-col items-center mt-1 animate-pulse">
                    <Medal className="text-[#CD7F32] drop-shadow-[0_0_8px_rgba(205,127,50,0.4)]" size={30} fill="#ca7219ff" />
                    <span className="text-[10px] font-extrabold text-[#CD7F32] uppercase tracking-wider mt-0.5">3RD PLACE</span>
                  </div>
                )}
              </div>

              <div className="space-y-6 flex flex-col justify-around h-full py-12">
                {knockoutMatches.filter(m => m.round === round).map((m) => {
                  const p1Won = m.status === 'completed' && m.score_team1 > m.score_team2;
                  const p2Won = m.status === 'completed' && m.score_team2 > m.score_team1;

                  return (
                    <div key={m.id} className="relative">
                      <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:border-[#D4FF00] hover:shadow-md transition-all group relative">

                        {/* Court & Order label */}
                        {m.court ? (
                          <div className="bg-gray-50 border-b border-gray-100 py-1.5 px-3 text-gray-500 font-extrabold text-[9px] uppercase tracking-wider flex justify-between items-center">
                            <span>🏟️ {m.court} - Match {m.match_order || 1}</span>
                            {isOwner && (
                              <button
                                onClick={() => handleOpenScheduler(m)}
                                className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-black transition-colors"
                                title="Assign court & referee"
                              >
                                <Settings size={10} />
                              </button>
                            )}
                          </div>
                        ) : (
                          isOwner && (
                            <div className="bg-gray-50/50 border-b border-gray-50 py-1 px-3 text-gray-300 font-bold text-[8px] uppercase tracking-wider flex justify-between items-center">
                              <span>No court</span>
                              <button
                                onClick={() => handleOpenScheduler(m)}
                                className="p-0.5 hover:bg-gray-200 rounded text-gray-400 hover:text-black transition-colors"
                                title="Assign court & referee"
                              >
                                <Settings size={10} />
                              </button>
                            </div>
                          )
                        )}

                        <div className={cn(
                          "flex items-center justify-between p-4 border-b border-gray-50",
                          p1Won ? "bg-black text-[#D4FF00]" : "text-gray-900"
                        )}>
                          <span className="font-bold text-sm truncate">{m.team1_name || 'TBD'}</span>
                        </div>
                        <div className={cn(
                          "flex items-center justify-between p-4",
                          p2Won ? "bg-black text-[#D4FF00]" : "text-gray-900"
                        )}>
                          <span className="font-bold text-sm truncate">{m.team2_name || 'TBD'}</span>
                        </div>

                        {/* Referee Indicator */}
                        {(m.referee_name || m.referee2_name) && (
                          <div className="bg-gray-50 border-t border-gray-50 py-1 px-3 text-gray-500 font-bold text-[9px] uppercase tracking-wider truncate">
                            👮 Trọng tài: {m.referee_name || 'N/A'}{m.referee2_name ? ` & ${m.referee2_name}` : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {bracketBuilderOpen && (
        <BracketBuilderModal
          tournament={tournament}
          onClose={() => setBracketBuilderOpen(false)}
          onUpdate={() => onReload?.()}
        />
      )}

      {/* Admin Scheduler Modal Dialog */}
      {selectedMatchForEdit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-6 text-gray-900">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h4 className="text-lg font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
                <Settings size={20} className="text-[#D4FF00] bg-black p-1 rounded-md" />
                Thiết lập Sân & Trọng tài
              </h4>
              <button onClick={() => setSelectedMatchForEdit(null)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400">
                <X size={18} />
              </button>
            </div>

            {/* Match description */}
            <div className="bg-gray-50 p-4 rounded-2xl text-center space-y-1">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Vòng {selectedMatchForEdit.round}
              </div>
              <div className="font-extrabold text-gray-900 text-base sm:text-lg">
                {selectedMatchForEdit.team1_name || 'TBD'} <span className="opacity-30 italic">VS</span> {selectedMatchForEdit.team2_name || 'TBD'}
              </div>
            </div>

            <div className="space-y-4">
              {/* Court Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">Court</label>
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
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">Thứ tự trận (Match No.)</label>
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
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">Trọng tài chính</label>
                <select
                  value={editRef1}
                  onChange={e => setEditRef1(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                >
                  <option value="">Không phân trọng tài 1</option>
                  {refereeUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>

              {/* Referee 2 */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-gray-500 block">Trọng tài phụ</label>
                <select
                  value={editRef2}
                  onChange={e => setEditRef2(e.target.value)}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                >
                  <option value="">Không phân trọng tài 2</option>
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
