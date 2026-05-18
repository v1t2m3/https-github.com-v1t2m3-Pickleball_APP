import React, { useState, useEffect } from 'react';
import { X, Play, ShieldAlert, Award, RefreshCw, Layers } from 'lucide-react';
import { Tournament, Match } from '../types';
import { api } from '../lib/api';

interface Props {
  tournament: Tournament;
  onClose: () => void;
  onUpdate: () => void;
}

interface RankedPlaceholders {
  groupId: number;
  groupName: string;
  rank: number; // 1 or 2
  teamId: number | null;
  teamName: string;
}

export default function BracketBuilderModal({ tournament, onClose, onUpdate }: Props) {
  const [teams, setTeams] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [standings, setStandings] = useState<Record<number, any[]>>({});
  
  const [selectedRound, setSelectedRound] = useState<'Semifinals' | 'Quarterfinals' | 'Round of 16'>('Semifinals');
  const [matchups, setMatchups] = useState<Array<{ team1_id: string; team2_id: string }>>([
    { team1_id: '', team2_id: '' },
    { team1_id: '', team2_id: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch initial teams, groups, and standings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const t = await api(`/tournaments/${tournament.id}/teams`);
        setTeams(t);
        
        const formatLower = tournament.format?.toLowerCase() || '';
        const isCombine = formatLower.includes('round-robin & knockout') || formatLower.includes('combination');
        
        if (isCombine) {
          const g = await api(`/tournaments/${tournament.id}/groups`);
          setGroups(g);
          const s = await api(`/tournaments/${tournament.id}/matches/standings`);
          setStandings(s);
        }
      } catch (e) {
        console.error("Failed to load seeding data", e);
      }
    };
    fetchData();
  }, [tournament]);

  // Adjust matchup slots based on selected round
  useEffect(() => {
    let slotsCount = 2; // Semifinals default
    if (selectedRound === 'Quarterfinals') slotsCount = 4;
    if (selectedRound === 'Round of 16') slotsCount = 8;

    setMatchups(
      Array.from({ length: slotsCount }, (_, i) => {
        // Retain existing choices if possible
        return matchups[i] || { team1_id: '', team2_id: '' };
      })
    );
  }, [selectedRound]);

  const isCombine = (tournament.format?.toLowerCase() || '').includes('round-robin & knockout') || (tournament.format?.toLowerCase() || '').includes('combination');

  // Compute Ranked placeholders for Combination format
  const rankedPlaceholders: RankedPlaceholders[] = [];
  groups.forEach(g => {
    const groupStandings = standings[g.id] || [];
    // Rank 1
    const r1 = groupStandings[0];
    rankedPlaceholders.push({
      groupId: g.id,
      groupName: g.name,
      rank: 1,
      teamId: r1 ? r1.team_id : null,
      teamName: r1 ? r1.team_name : 'Chưa xác định'
    });
    // Rank 2
    const r2 = groupStandings[1];
    rankedPlaceholders.push({
      groupId: g.id,
      groupName: g.name,
      rank: 2,
      teamId: r2 ? r2.team_id : null,
      teamName: r2 ? r2.team_name : 'Chưa xác định'
    });
  });

  // Automatically seed (Nhất A vs Nhì B, Nhất B vs Nhì A, etc.)
  const handleAutoCrossSeed = () => {
    // Requires group standings to be resolved
    if (rankedPlaceholders.length === 0) {
      setErrorMsg("Chưa có danh sách bảng đấu hoặc chưa có kết quả để thực hiện chéo bảng.");
      return;
    }

    setErrorMsg('');
    const newMatchups = [...matchups];

    // Build map for easy lookup
    const findByGroupAndRank = (groupName: string, rank: number) => {
      const ph = rankedPlaceholders.find(x => x.groupName.toLowerCase().trim() === groupName.toLowerCase().trim() && x.rank === rank);
      return ph?.teamId ? String(ph.teamId) : '';
    };

    if (selectedRound === 'Semifinals') {
      // Slot 1: Nhất A vs Nhì B
      newMatchups[0] = {
        team1_id: findByGroupAndRank('Group A', 1) || findByGroupAndRank('A', 1),
        team2_id: findByGroupAndRank('Group B', 2) || findByGroupAndRank('B', 2)
      };
      // Slot 2: Nhất B vs Nhì A
      newMatchups[1] = {
        team1_id: findByGroupAndRank('Group B', 1) || findByGroupAndRank('B', 1),
        team2_id: findByGroupAndRank('Group A', 2) || findByGroupAndRank('A', 2)
      };
    } else if (selectedRound === 'Quarterfinals') {
      // 4 Groups: A, B, C, D
      // Slot 1: Nhất A vs Nhì B
      newMatchups[0] = {
        team1_id: findByGroupAndRank('Group A', 1) || findByGroupAndRank('A', 1),
        team2_id: findByGroupAndRank('Group B', 2) || findByGroupAndRank('B', 2)
      };
      // Slot 2: Nhất B vs Nhì A
      newMatchups[1] = {
        team1_id: findByGroupAndRank('Group B', 1) || findByGroupAndRank('B', 1),
        team2_id: findByGroupAndRank('Group A', 2) || findByGroupAndRank('A', 2)
      };
      // Slot 3: Nhất C vs Nhì D
      newMatchups[2] = {
        team1_id: findByGroupAndRank('Group C', 1) || findByGroupAndRank('C', 1),
        team2_id: findByGroupAndRank('Group D', 2) || findByGroupAndRank('D', 2)
      };
      // Slot 4: Nhất D vs Nhì C
      newMatchups[3] = {
        team1_id: findByGroupAndRank('Group D', 1) || findByGroupAndRank('D', 1),
        team2_id: findByGroupAndRank('Group C', 2) || findByGroupAndRank('C', 2)
      };
    }

    setMatchups(newMatchups);
  };

  // Perform random drawing
  const handleRandomDraw = () => {
    setErrorMsg('');
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const newMatchups = [...matchups];

    for (let i = 0; i < matchups.length; i++) {
      const t1 = shuffledTeams[i * 2];
      const t2 = shuffledTeams[i * 2 + 1];
      newMatchups[i] = {
        team1_id: t1 ? String(t1.id) : '',
        team2_id: t2 ? String(t2.id) : ''
      };
    }
    setMatchups(newMatchups);
  };

  const handleSelectChange = (slotIndex: number, side: 'team1' | 'team2', value: string) => {
    const updated = [...matchups];
    if (side === 'team1') {
      updated[slotIndex].team1_id = value;
    } else {
      updated[slotIndex].team2_id = value;
    }
    setMatchups(updated);
  };

  const handleSaveBracket = async () => {
    // Validate: All slots should ideally be filled
    const invalid = matchups.some(m => !m.team1_id); // Bye matches are allowed if team2 is empty, but team1 must be populated
    if (invalid) {
      setErrorMsg("Vui lòng chọn ít nhất Đội 1 cho tất cả các cặp đấu.");
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const formattedMatchups = matchups.map(m => ({
        round: selectedRound,
        team1_id: m.team1_id ? parseInt(m.team1_id) : null,
        team2_id: m.team2_id ? parseInt(m.team2_id) : null
      }));

      await api(`/tournaments/${tournament.id}/bracket/custom`, {
        method: 'POST',
        body: JSON.stringify({ matchups: formattedMatchups })
      });

      onUpdate();
      onClose();
    } catch (e) {
      console.error(e);
      setErrorMsg("Lỗi khi lưu sơ đồ nhánh đấu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#070708]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white text-gray-900 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <header className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <Layers className="text-[#D4FF00] bg-black p-1.5 rounded-xl" size={32} />
            <div>
              <h2 className="font-black text-lg uppercase tracking-tight">THIẾT LẬP BỐC THĂM / VẼ NHÁNH ĐẤU</h2>
              <p className="text-xs text-gray-400 font-medium">Bốc thăm chia hạt giống thủ công hoặc tự động chéo bảng</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100">
              <ShieldAlert size={16} /> {errorMsg}
            </div>
          )}

          {/* Configuration Controllers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Vòng đấu bắt đầu</label>
              <select 
                value={selectedRound}
                onChange={e => setSelectedRound(e.target.value as any)}
                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
              >
                <option value="Semifinals">Bán kết (Semifinals) - Top 4</option>
                <option value="Quarterfinals">Tứ kết (Quarterfinals) - Top 8</option>
                <option value="Round of 16">Vòng 1/8 (Round of 16) - Top 16</option>
              </select>
            </div>

            <div className="flex gap-3">
              {isCombine && (
                <button 
                  onClick={handleAutoCrossSeed}
                  className="flex-1 py-3 bg-black hover:bg-gray-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm"
                >
                  <Award size={14} className="text-[#D4FF00]" /> CHÉO BẢNG TỰ ĐỘNG
                </button>
              )}
              <button 
                onClick={handleRandomDraw}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <RefreshCw size={14} /> BỐC THĂM TỰ ĐỘNG
              </button>
            </div>
          </div>

          {/* Match Drawing Slots Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {matchups.map((m, index) => (
              <div key={index} className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4 relative">
                <span className="absolute top-3 left-4 text-[9px] font-black tracking-widest text-gray-300">CẶP ĐẤU {index + 1}</span>
                
                {/* Team 1 Selector */}
                <div className="pt-2">
                  <label className="text-[9px] font-bold text-gray-400 block mb-1">Đội 1 (Home)</label>
                  <select 
                    value={m.team1_id}
                    onChange={e => handleSelectChange(index, 'team1', e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                  >
                    <option value="">Chọn Đội 1...</option>
                    
                    {/* Ranked placeholders for transition format */}
                    {isCombine && rankedPlaceholders.map(p => (
                      <option key={`p1-${p.groupName}-${p.rank}`} value={p.teamId ? String(p.teamId) : ''}>
                        Nhất/Nhì: {p.groupName} - Nhất {p.rank} ({p.teamName})
                      </option>
                    ))}
                    
                    {/* Static registered teams fallback */}
                    <option disabled>──────────</option>
                    {teams.map(t => (
                      <option key={`t1-${t.id}`} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Team 2 Selector */}
                <div>
                  <label className="text-[9px] font-bold text-gray-400 block mb-1">Đội 2 (Away)</label>
                  <select 
                    value={m.team2_id}
                    onChange={e => handleSelectChange(index, 'team2', e.target.value)}
                    className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#D4FF00] outline-none font-bold"
                  >
                    <option value="">Chọn Đội 2 (Hoặc TRỐNG nếu Bye)...</option>
                    
                    {/* Ranked placeholders for transition format */}
                    {isCombine && rankedPlaceholders.map(p => (
                      <option key={`p2-${p.groupName}-${p.rank}`} value={p.teamId ? String(p.teamId) : ''}>
                        Nhất/Nhì: {p.groupName} - Nhất {p.rank} ({p.teamName})
                      </option>
                    ))}
                    
                    {/* Static registered teams fallback */}
                    <option disabled>──────────</option>
                    {teams.map(t => (
                      <option key={`t2-${t.id}`} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button 
            onClick={onClose}
            className="px-6 py-3 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-transform active:scale-95"
          >
            HỦY BỎ
          </button>
          <button 
            onClick={handleSaveBracket}
            disabled={loading}
            className="px-8 py-3 bg-[#D4FF00] hover:bg-[#bce600] text-black font-black rounded-xl text-sm flex items-center gap-2 transition-transform active:scale-95 shadow-sm"
          >
            <Play fill="black" size={16} /> {loading ? 'DANG KHỞI TẠO...' : 'LƯU NHÁNH ĐẤU'}
          </button>
        </footer>
      </div>
    </div>
  );
}
