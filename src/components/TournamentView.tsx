import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Calendar, Trophy, Settings, ChevronRight, Activity, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tournament, Participant, Match } from '../types';

import ScheduleTab from './tabs/ScheduleTab';
import BracketTab from './tabs/BracketTab';
import RefereeTab from './tabs/RefereeTab';
import TeamsTab from './tabs/TeamsTab';
import GroupsTab from './tabs/GroupsTab';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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
  const { isAdmin, isReferee, hasPermission } = useAuth();

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

  useEffect(() => {
    loadData();
    // Poll for updates every 5 seconds as a simple real-time alternative
    const intervalId = setInterval(loadData, 5000);
    return () => clearInterval(intervalId);
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
    </div>
  );
}
