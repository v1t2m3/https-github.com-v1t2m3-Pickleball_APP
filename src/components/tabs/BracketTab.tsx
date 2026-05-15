import { Tournament, Match, Participant } from '../../types';
import { Trophy } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  tournament: Tournament;
  matches: Match[];
  participants: Participant[];
}

export default function BracketTab({ tournament, matches, participants }: Props) {
  const getParticipantName = (id: string) => participants.find(p => p.id === id)?.name || 'TBD';

  // Group matches by round
  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b);

  if (matches.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 italic text-gray-400 font-medium">
        Bracket will be generated once the tournament starts.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-8">
      <div className="flex gap-12 min-w-max p-4 justify-center">
        {rounds.map((round) => (
          <div key={round} className="w-72 space-y-8">
             <div className="text-center">
                <span className="text-[10px] font-black tracking-[.2em] uppercase text-gray-300 bg-gray-50 px-4 py-1 rounded-full border border-gray-100">
                    ROUND {round}
                </span>
             </div>
             
             <div className="space-y-6 flex flex-col justify-around h-full py-12">
               {matches.filter(m => m.round === round).map((m) => (
                 <div key={m.id} className="relative">
                    <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:border-[#D4FF00] hover:shadow-md transition-all group">
                       <div className={cn(
                         "flex items-center justify-between p-4 border-b border-gray-50",
                         m.winnerId === m.p1Id ? "bg-black text-[#D4FF00]" : "text-gray-900",
                         m.status === 'live' && "bg-red-50 text-red-600"
                       )}>
                          <span className="font-bold text-sm truncate">{getParticipantName(m.p1Id)}</span>
                          <span className="font-black tabular-nums">{m.p1Score}</span>
                       </div>
                       <div className={cn(
                         "flex items-center justify-between p-4",
                         m.winnerId === m.p2Id ? "bg-black text-[#D4FF00]" : "text-gray-900"
                       )}>
                          <span className="font-bold text-sm truncate">{getParticipantName(m.p2Id)}</span>
                          <span className="font-black tabular-nums">{m.p2Score}</span>
                       </div>

                       {m.status === 'live' && (
                         <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full animate-pulse uppercase tracking-tighter">
                            LIVE
                         </div>
                       )}
                    </div>
                 </div>
               ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
