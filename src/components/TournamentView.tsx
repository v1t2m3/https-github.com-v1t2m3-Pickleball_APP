import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { ArrowLeft, Users, Calendar, Trophy, Settings, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tournament, Participant, Match } from '../types';
import ParticipantsTab from './tabs/ParticipantsTab';
import ScheduleTab from './tabs/ScheduleTab';
import BracketTab from './tabs/BracketTab';
import RefereeTab from './tabs/RefereeTab';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  tournament: Tournament;
  onBack: () => void;
  isOwner: boolean;
}

type Tab = 'participants' | 'schedule' | 'bracket' | 'referee';

export default function TournamentView({ tournament, onBack, isOwner }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('participants');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const pRef = collection(db, 'tournaments', tournament.id, 'participants');
    const mRef = collection(db, 'tournaments', tournament.id, 'matches');

    const unsubP = onSnapshot(pRef, (s) => {
      setParticipants(s.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant)));
    });

    const unsubM = onSnapshot(mRef, (s) => {
      setMatches(s.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)));
    });

    return () => {
      unsubP();
      unsubM();
    };
  }, [tournament.id]);

  const tabs = [
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'bracket', label: 'Bracket', icon: Trophy },
    ...(isOwner ? [{ id: 'referee', label: 'Referee Hub', icon: Activity }] : []),
  ] as { id: Tab, label: string, icon: any }[];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Sub Header */}
      <div className="bg-white border-bottom border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                  {tournament.type}
                </span>
                {isOwner && <span className="text-[10px] font-bold uppercase tracking-widest bg-[#D4FF00] px-2 py-0.5 rounded italic">Admin</span>}
              </div>
              <h1 className="text-2xl font-bold tracking-tight uppercase">{tournament.name}</h1>
            </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  activeTab === tab.id 
                    ? "bg-white text-black shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'participants' && (
              <ParticipantsTab 
                tournament={tournament} 
                participants={participants} 
                isOwner={isOwner} 
              />
            )}
            {activeTab === 'schedule' && (
              <ScheduleTab 
                tournament={tournament} 
                matches={matches} 
                participants={participants}
                isOwner={isOwner} 
              />
            )}
            {activeTab === 'bracket' && (
              <BracketTab 
                tournament={tournament} 
                matches={matches} 
                participants={participants}
              />
            )}
            {activeTab === 'referee' && isOwner && (
              <RefereeTab 
                tournament={tournament} 
                matches={matches} 
                participants={participants} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
