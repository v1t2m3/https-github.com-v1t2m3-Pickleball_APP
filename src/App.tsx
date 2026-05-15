/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { db, auth } from './lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { Trophy, Calendar, ListChecks, Users, Plus, LogIn, ChevronRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Tournament, TournamentType } from './types';
import TournamentView from './components/TournamentView';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTournament, setNewTournament] = useState({ name: '', type: 'knockout' as TournamentType });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      setTournaments(data);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleCreateTournament = async () => {
    if (!user || !newTournament.name) return;
    try {
      const docRef = await addDoc(collection(db, 'tournaments'), {
        ...newTournament,
        status: 'open',
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setIsCreating(false);
      setNewTournament({ name: '', type: 'knockout' });
    } catch (error) {
      console.error("Create failed", error);
    }
  };

  if (selectedTournament) {
    return (
      <TournamentView 
        tournament={selectedTournament} 
        onBack={() => setSelectedTournament(null)} 
        isOwner={user?.uid === selectedTournament.ownerId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans">
      {/* Header */}
      <header className="bg-[#0a0a0a] text-white px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#D4FF00] rounded-full flex items-center justify-center">
            <Activity className="text-black w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">PICKLEBALL PRO</h1>
        </div>
        
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono opacity-60 hidden sm:inline">{user.email}</span>
            <button 
              onClick={() => auth.signOut()}
              className="px-3 py-1 text-xs font-semibold uppercase tracking-wider border border-white/20 rounded-full hover:bg-white/10 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="flex items-center gap-2 px-4 py-2 bg-[#D4FF00] text-black rounded-full font-bold text-sm hover:scale-105 transition-transform"
          >
            <LogIn size={16} />
            LOGIN
          </button>
        )}
      </header>

      <main className="max-w-5xl mx-auto p-6">
        <section className="mb-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-4xl font-bold tracking-tighter mb-2">ACTIVE TOURNAMENTS</h2>
              <p className="text-gray-500 font-medium">Join or manage your pickleball events effortlessly.</p>
            </div>
            {user && (
              <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white rounded-xl font-bold hover:bg-[#1a1a1a] transition-colors"
              >
                <Plus size={20} />
                NEW TOURNAMENT
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => (
              <motion.div 
                key={t.id}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedTournament(t)}
                className="group cursor-pointer bg-white border border-gray-200 p-6 rounded-2xl hover:border-[#D4FF00] hover:shadow-xl transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Trophy size={64} />
                </div>
                
                <div className="mb-4">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full",
                    t.status === 'active' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {t.status}
                  </span>
                </div>

                <h3 className="text-2xl font-bold mb-4 pr-12 line-clamp-2">{t.name}</h3>
                
                <div className="flex items-center gap-4 text-gray-400 text-xs font-mono">
                  <div className="flex items-center gap-1 uppercase">
                    <ListChecks size={14} />
                    {t.type}
                  </div>
                  {t.ownerId === user?.uid && (
                    <div className="bg-[#D4FF00] text-black px-2 py-0.5 rounded font-bold">YOURS</div>
                  )}
                </div>

                <div className="mt-6 flex items-center text-[#0a0a0a] font-bold text-sm gap-1">
                  VIEW DETAILS <ChevronRight size={16} />
                </div>
              </motion.div>
            ))}
            
            {tournaments.length === 0 && !isCreating && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                <p className="text-gray-400 font-medium">No tournaments available. Create one to get started!</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-3xl font-bold mb-6 tracking-tight">CREATE TOURNAMENT</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Tournament Name</label>
                  <input 
                    type="text"
                    value={newTournament.name}
                    onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                    placeholder="e.g. Summer Smash 2024"
                    className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-[#D4FF00] transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">Format</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['knockout', 'round-robin'] as TournamentType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewTournament({ ...newTournament, type })}
                        className={cn(
                          "px-4 py-3 rounded-xl font-bold text-sm border-2 transition-all capitalize",
                          newTournament.type === type 
                            ? "bg-[#D4FF00]/10 border-[#D4FF00] text-black" 
                            : "border-gray-100 hover:border-gray-200 text-gray-400"
                        )}
                      >
                        {type.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="flex-1 px-6 py-4 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleCreateTournament}
                    className="flex-1 px-6 py-4 bg-[#0a0a0a] text-white rounded-xl font-bold hover:bg-[#1a1a1a] transition-colors"
                  >
                    CREATE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
