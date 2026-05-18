import { useState } from 'react';
import { Plus, UserMinus, UserPlus, Hash } from 'lucide-react';
import { Tournament, Participant } from '../../types';
import { api } from '../../lib/api';

interface Props {
  tournament: Tournament;
  participants: Participant[];
  isOwner: boolean;
}

export default function ParticipantsTab({ tournament, participants, isOwner }: Props) {
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      // Temporarily assuming API endpoint for adding participant
      // await api(`/tournaments/${tournament.id}/participants`, {
      //   method: 'POST',
      //   body: JSON.stringify({ name: newName, seed: participants.length + 1 })
      // });
      setNewName('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      // await api(`/tournaments/${tournament.id}/participants/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-bold tracking-tight">PLAYER ROSTER</h3>
            <span className="bg-[#0a0a0a] text-white px-3 py-1 rounded-full text-xs font-bold font-mono">
              {participants.length} TOTAL
            </span>
          </div>

          <div className="space-y-3">
            {participants.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <span className="font-bold text-lg">{p.name}</span>
                </div>
                {isOwner && (
                  <button 
                    onClick={() => handleRemove(p.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <UserMinus size={18} />
                  </button>
                )}
              </div>
            ))}
            {participants.length === 0 && (
              <div className="text-center py-12 text-gray-400 font-medium italic">
                No participants added yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="space-y-6">
          <div className="bg-[#D4FF00] rounded-3xl p-8 text-black">
            <h4 className="text-xl font-bold mb-4">ADD PLAYER</h4>
            <div className="space-y-4">
              <input 
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter player/team name"
                className="w-full bg-white border-none rounded-xl px-4 py-3 font-bold placeholder:text-black/30 outline-none ring-2 ring-transparent focus:ring-black transition-all"
              />
              <button 
                onClick={handleAdd}
                className="w-full bg-black text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              >
                <Plus size={20} />
                ADD TO ROSTER
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h4 className="text-lg font-bold mb-2">QUICK TIP</h4>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Add all participants before generating the bracket or schedule. You can seed players by the order you add them.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
