import { Tournament, Match } from '../../types';
import { Activity, Clock, Trophy } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  tournament: Tournament;
  matches: Match[];
  isOwner: boolean;
}

export default function ScheduleTab({ tournament, matches, isOwner }: Props) {

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const finishedMatches = matches.filter(m => m.status === 'completed');

  return (
    <div className="space-y-12">
      {/* Live Matches Section */}
      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 className="text-2xl font-black tracking-tighter uppercase">LIVE SCORES</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveMatches.map(m => (
              <div key={m.id} className="bg-[#0a0a0a] text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden border-2 border-[#D4FF00]">
                <div className="absolute top-0 right-0 py-2 px-4 bg-[#D4FF00] text-black font-black text-[10px] uppercase tracking-widest rounded-bl-xl">
                  {m.court || `Group ${m.group_id || ''}`}
                </div>
                
                <div className="flex items-center justify-between gap-8 py-4">
                  <div className="flex-1 text-center">
                    <div className="text-sm font-bold uppercase opacity-40 mb-2 truncate">{m.team1_name || 'TBD'}</div>
                    <div className="text-7xl font-black tracking-tighter tabular-nums">{m.score_team1}</div>
                  </div>
                  
                  <div className="text-2xl font-black opacity-20 italic">VS</div>
                  
                  <div className="flex-1 text-center">
                    <div className="text-sm font-bold uppercase opacity-40 mb-2 truncate">{m.team2_name || 'TBD'}</div>
                    <div className="text-7xl font-black tracking-tighter tabular-nums">{m.score_team2}</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
                  <span className="text-[10px] font-bold tracking-widest opacity-60 uppercase">Match in Progress • Round {m.round}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Section */}
      <section>
        <h3 className="text-xl font-bold mb-6 tracking-tight flex items-center gap-2">
          <Clock className="text-gray-400" size={24} />
          UPCOMING FIXTURES
        </h3>
        <div className="space-y-3">
          {upcomingMatches.map(m => (
            <div key={m.id} className="bg-white border border-gray-100 p-6 rounded-2xl flex items-center justify-between hover:border-[#D4FF00] transition-colors">
              <div className="flex items-center gap-6 flex-1">
                <div className="text-[10px] font-bold font-mono text-gray-400 w-16 uppercase">{m.round}</div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{m.team1_name || 'TBD'}</span>
                  <span className="text-xs font-black italic opacity-20">VS</span>
                  <span className="font-bold text-lg">{m.team2_name || 'TBD'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <span className="text-xs font-bold font-mono bg-gray-50 px-3 py-1 rounded-full text-gray-400 uppercase">WAITING</span>
              </div>
            </div>
          ))}
          {upcomingMatches.length === 0 && <p className="text-center py-10 text-gray-400 font-medium">No upcoming matches scheduled.</p>}
        </div>
      </section>

      {/* Final Results */}
      {finishedMatches.length > 0 && (
        <section>
          <h3 className="text-xl font-bold mb-6 tracking-tight flex items-center gap-2">
            <Trophy className="text-[#D4FF00]" size={24} />
            FINAL RESULTS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {finishedMatches.map(m => {
              const p1Won = m.score_team1 > m.score_team2;
              const p2Won = m.score_team2 > m.score_team1;
              return (
                <div key={m.id} className="bg-white border border-gray-100 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col gap-1 flex-1">
                    <div className={cn("flex justify-between items-center text-sm px-2 py-1 rounded", p1Won && "bg-gray-50 border-l-4 border-black")}>
                      <span className={cn("font-bold truncate", p1Won ? "text-black" : "text-gray-400")}>
                        {m.team1_name || 'TBD'}
                      </span>
                      <span className="font-black tabular-nums">{m.score_team1}</span>
                    </div>
                    <div className={cn("flex justify-between items-center text-sm px-2 py-1 rounded", p2Won && "bg-gray-50 border-l-4 border-black")}>
                      <span className={cn("font-bold truncate", p2Won ? "text-black" : "text-gray-400")}>
                        {m.team2_name || 'TBD'}
                      </span>
                      <span className="font-black tabular-nums">{m.score_team2}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  );
}
