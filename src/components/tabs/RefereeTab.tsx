import { useState } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { Play, RotateCcw, ChevronUp, ChevronDown, CheckCircle, Trash2 } from 'lucide-react';
import { Tournament, Match, Participant } from '../../types';
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

export default function RefereeTab({ tournament, matches, participants }: Props) {
  const [loading, setLoading] = useState(false);

  const generateSchedule = async () => {
    if (participants.length < 2) return;
    setLoading(true);
    try {
      // Simple logic for Demo: Create Round 1 Knockout matches
      const sorted = [...participants].sort((a, b) => (a.seed || 0) - (b.seed || 0));
      for (let i = 0; i < sorted.length; i += 2) {
        if (i + 1 < sorted.length) {
          await addDoc(collection(db, 'tournaments', tournament.id, 'matches'), {
            p1Id: sorted[i].id,
            p2Id: sorted[i + 1].id,
            p1Score: 0,
            p2Score: 0,
            status: 'upcoming',
            round: 1,
            group: 'Court ' + (Math.floor(i/2) + 1)
          });
        }
      }
      await updateDoc(doc(db, 'tournaments', tournament.id), { status: 'active' });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateScore = async (matchId: string, p1Delta: number, p2Delta: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    try {
      await updateDoc(doc(db, 'tournaments', tournament.id, 'matches', matchId), {
        p1Score: Math.max(0, match.p1Score + p1Delta),
        p2Score: Math.max(0, match.p2Score + p2Delta),
        status: 'live'
      });
    } catch (e) {
      console.error(e);
    }
  };

  const completeMatch = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const winnerId = match.p1Score > match.p2Score ? match.p1Id : match.p2Id;
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id, 'matches', matchId), {
        status: 'completed',
        winnerId: winnerId
      });
    } catch (e) {
      console.error(e);
    }
  };

  const startMatch = async (matchId: string) => {
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id, 'matches', matchId), {
        status: 'live'
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getParticipantName = (id: string) => participants.find(p => p.id === id)?.name || 'TBD';

  return (
    <div className="space-y-8">
      {matches.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
          <h3 className="text-3xl font-black mb-4">TOURNAMENT SETUP</h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium">
            Once you have added all participants, click below to generate the opening round matches.
          </p>
          <button 
            onClick={generateSchedule}
            disabled={loading || participants.length < 2}
            className="px-10 py-5 bg-[#D4FF00] text-black rounded-2xl font-black text-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 uppercase tracking-tighter"
          >
            {loading ? 'GENERATING...' : 'GENERATE ROUND 1'}
          </button>
          {participants.length < 2 && <p className="mt-4 text-red-500 text-sm font-bold">Minimum 2 participants required.</p>}
        </div>
      )}

      {matches.length > 0 && (
        <div className="grid grid-cols-1 gap-8">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black uppercase tracking-tighter">REFEREE DASHBOARD</h3>
          </div>
          
          <div className="space-y-6">
            {matches.filter(m => m.status !== 'completed').map(m => (
              <div key={m.id} className={cn(
                "bg-white rounded-3xl p-8 border-2 shadow-sm transition-all",
                m.status === 'live' ? "border-red-500" : "border-gray-100 opacity-60"
              )}>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex-1 w-full space-y-8">
                     {/* Player 1 */}
                     <div className="flex items-center justify-between bg-gray-50 p-6 rounded-2xl">
                       <span className="text-xl font-bold uppercase">{getParticipantName(m.p1Id)}</span>
                       <div className="flex items-center gap-4">
                         <button 
                            onClick={() => updateScore(m.id, -1, 0)}
                            className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors"
                         ><ChevronDown /></button>
                         <span className="text-6xl font-black tabular-nums w-16 text-center">{m.p1Score}</span>
                         <button 
                            onClick={() => updateScore(m.id, 1, 0)}
                            className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 transition-transform active:scale-95"
                         ><ChevronUp /></button>
                       </div>
                     </div>

                     <div className="h-[2px] bg-gray-100 relative">
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-xs font-black italic text-gray-300">VS</span>
                     </div>

                     {/* Player 2 */}
                     <div className="flex items-center justify-between bg-gray-50 p-6 rounded-2xl">
                       <span className="text-xl font-bold uppercase">{getParticipantName(m.p2Id)}</span>
                       <div className="flex items-center gap-4">
                         <button 
                            onClick={() => updateScore(m.id, 0, -1)}
                            className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors"
                         ><ChevronDown /></button>
                         <span className="text-6xl font-black tabular-nums w-16 text-center">{m.p2Score}</span>
                         <button 
                            onClick={() => updateScore(m.id, 0, 1)}
                            className="w-12 h-12 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 transition-transform active:scale-95"
                         ><ChevronUp /></button>
                       </div>
                     </div>
                  </div>

                  <div className="w-full md:w-64 space-y-3">
                    {m.status === 'upcoming' ? (
                      <button 
                        onClick={() => startMatch(m.id)}
                        className="w-full py-6 bg-[#0a0a0a] text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-colors"
                      >
                        <Play fill="white" size={20} /> START MATCH
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => completeMatch(m.id)}
                          className="w-full py-6 bg-red-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-red-600 transition-all uppercase"
                        >
                          <CheckCircle size={20} /> SUBMIT RESULT
                        </button>
                         <div className="flex gap-2">
                            <button 
                                onClick={() => updateDoc(doc(db, 'tournaments', tournament.id, 'matches', m.id), { p1Score: 0, p2Score: 0, status: 'upcoming' })}
                                className="flex-1 py-3 bg-gray-100 text-gray-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                            >
                                <RotateCcw size={14} /> RESET
                            </button>
                         </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
