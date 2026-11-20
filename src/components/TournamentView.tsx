import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, Trophy, Settings, ChevronRight, Activity, ListChecks, Trash2, Tv } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tournament, Participant, Match } from '../types';

import ScheduleTab from './tabs/ScheduleTab';
import BracketTab from './tabs/BracketTab';
import RefereeTab from './tabs/RefereeTab';
import TeamsTab from './tabs/TeamsTab';
import GroupsTab from './tabs/GroupsTab';
import LiveCourtsBoardModal from './LiveCourtsBoardModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getSocket } from '../lib/socket';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  tournament: Tournament;
  onBack: () => void;
}

type Tab = 'teams' | 'groups' | 'schedule' | 'bracket' | 'referee';

export default function TournamentView({ tournament, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('teams');
  const [matches, setMatches] = useState<Match[]>([]);
  const [liveBoardOpen, setLiveBoardOpen] = useState(false);
  const { isAdmin, isReferee, hasPermission } = useAuth();
  const toast = useToast();

  const canScore = isAdmin || isReferee || hasPermission('matches:score');
  const canManageTeams = isAdmin || hasPermission('teams:manage');
  const canManageGroups = isAdmin || hasPermission('groups:manage');
  const canManageSchedule = isAdmin || hasPermission('schedule:manage');
  const canManageBracket = isAdmin || hasPermission('bracket:manage');

  const loadData = async () => {
    try {
      const mData = await api(`/tournaments/${tournament.id}/matches`);
      setMatches(mData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteThisTournament = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa giải đấu "${tournament.name}" không?\n\nToàn bộ dữ liệu trận đấu, bảng đấu, đội thi đấu sẽ bị xóa vĩnh viễn.`)) {
      return;
    }
    try {
      await api(`/tournaments/${tournament.id}`, { method: 'DELETE' });
      toast.success(`Đã xóa giải đấu "${tournament.name}" thành công!`);
      onBack();
    } catch (e: any) {
      console.error(e);
      toast.error(`Lỗi khi xóa giải đấu: ${e.message || "Không thể xóa giải đấu"}`);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time WebSocket events from Socket.io
    const socket = getSocket();
    const handleMatchUpdate = (updatedMatch: any) => {
      if (updatedMatch && (!updatedMatch.tournament_id || updatedMatch.tournament_id === parseInt(tournament.id))) {
        setMatches(prev => {
          const index = prev.findIndex(m => m.id === updatedMatch.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = { ...next[index], ...updatedMatch };
            return next;
          }
          return [...prev, updatedMatch];
        });
      }
    };

    socket.on('score_updated', handleMatchUpdate);
    socket.on('match_updated', handleMatchUpdate);

    // Low-frequency fallback poll (30s) instead of aggressive 5s polling
    const fallbackInterval = setInterval(loadData, 30000);

    return () => {
      socket.off('score_updated', handleMatchUpdate);
      socket.off('match_updated', handleMatchUpdate);
      clearInterval(fallbackInterval);
    };
  }, [tournament.id]);

  const isSocial = tournament.format === 'social';

  const isStaff = canScore || canManageTeams || canManageGroups || canManageSchedule || canManageBracket;

  const tabs = [
    { id: 'teams', label: 'Teams / Pairs', shortLabel: 'Teams', icon: Users },
    ...(!isSocial ? [{ id: 'groups', label: 'Groups & Standings', shortLabel: 'Groups', icon: ListChecks }] : []),
    { id: 'schedule', label: 'Schedule', shortLabel: 'Schedule', icon: Calendar },
    ...(!isSocial ? [{ id: 'bracket', label: 'Bracket', shortLabel: 'Bracket', icon: Trophy }] : []),
    ...(canScore ? [{ id: 'referee', label: 'Referee Hub', shortLabel: 'Referee', icon: Activity }] : []),
  ] as { id: Tab, label: string, shortLabel: string, icon: any }[];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Sub Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 pt-safe shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95 shrink-0"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                  {tournament.format || 'Format'}
                </span>
                {isStaff && (
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-[#D4FF00] px-2 py-0.5 rounded text-black font-mono">
                    Staff
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight uppercase truncate text-gray-900">
                {tournament.name}
              </h1>
            </div>
            {(isAdmin || hasPermission('tournaments:delete')) && (
              <button
                onClick={handleDeleteThisTournament}
                className="p-2 sm:px-3 sm:py-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all border border-red-200 shrink-0 flex items-center gap-1.5 text-xs font-bold active:scale-95"
                title="Xóa giải đấu này"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Xóa giải</span>
              </button>
            )}

            {matches.length > 0 && (
              <button
                onClick={() => setLiveBoardOpen(true)}
                className="px-3 py-1.5 bg-[#D4FF00] hover:bg-[#bce600] text-black font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Bật bảng điểm trực tiếp các sân"
              >
                <Tv size={15} />
                <span className="hidden sm:inline">Bảng Điểm Trực Tiếp</span>
              </button>
            )}
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 active:scale-95",
                  activeTab === tab.id
                    ? "bg-white text-black shadow-sm font-extrabold"
                    : "text-gray-500 hover:text-gray-900"
                )}
              >
                <tab.icon size={15} />
                <span className="inline sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-3 sm:p-6 pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >

            {activeTab === 'teams' && (
              <TeamsTab
                tournament={tournament}
                isOwner={canManageTeams}
              />
            )}
            {activeTab === 'groups' && (
              <GroupsTab
                tournament={tournament}
                isOwner={canManageGroups}
              />
            )}
            {activeTab === 'schedule' && (
              <ScheduleTab
                tournament={tournament}
                matches={matches}
                isOwner={canManageSchedule}
                onReload={loadData}
              />
            )}
            {activeTab === 'bracket' && (
              <BracketTab
                tournament={tournament}
                matches={matches}
                isOwner={canManageBracket}
                onReload={loadData}
              />
            )}
            {activeTab === 'referee' && canScore && (
              <RefereeTab
                tournament={tournament}
                matches={matches}
                onReload={loadData}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 pb-safe flex items-center justify-around shadow-2xl">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all select-none relative",
                isActive ? "text-[#D4FF00]" : "text-white/40 hover:text-white/70"
              )}
            >
              <tab.icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-bold tracking-tight">{tab.shortLabel}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] absolute -bottom-1" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Multi-Court Live Scoreboard Dashboard Modal */}
      {liveBoardOpen && (
        <LiveCourtsBoardModal
          tournament={tournament}
          matches={matches}
          onClose={() => setLiveBoardOpen(false)}
          onMatchUpdated={(updated) => {
            setMatches(prev => prev.map(m => m.id === updated.id ? updated : m));
          }}
        />
      )}
    </div>
  );
}
