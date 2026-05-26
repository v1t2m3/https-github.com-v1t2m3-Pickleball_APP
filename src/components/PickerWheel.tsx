import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trash2, Plus, Volume2, VolumeX, Shuffle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Choice {
  id: string;
  name: string;
  active: boolean;
  color?: string;
}

const getContrastColor = (hexcolor: string) => {
  let hex = hexcolor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#0a0a0a' : '#ffffff';
}

export default function PickerWheel({ onBack }: { onBack: () => void }) {
  const [choices, setChoices] = useState<Choice[]>([
    { id: '1', name: 'YES', active: true },
    { id: '2', name: 'NO', active: true },
    { id: '3', name: 'YES', active: true },
    { id: '4', name: 'NO', active: true },
    { id: '5', name: 'YES', active: true },
    { id: '6', name: 'NO', active: true },
  ]);

  const [newChoice, setNewChoice] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Color copy & paste states
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedChoiceId, setCopiedChoiceId] = useState<string | null>(null);

  const updateChoiceColor = (id: string, color: string) => {
    setChoices(prev => prev.map(c => c.id === id ? { ...c, color } : c));
  };

  const handleCopyColor = (id: string, color: string) => {
    try {
      navigator.clipboard.writeText(color);
    } catch (e) {
      console.warn("Clipboard access denied", e);
    }
    setCopiedColor(color);
    setCopiedChoiceId(id);
    setTimeout(() => {
      setCopiedChoiceId(null);
    }, 1500);
  };

  // Spin states
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Choice | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationAngleRef = useRef(0);
  const spinVelocityRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickAngleRef = useRef(0);

  const activeChoices = choices.filter(c => c.active);

  // Color palette for wheel segments (dark-neon aesthetic)
  const colors = [
    '#D4FF00', // Neon Yellow
    '#FF1493', // Deep Pink
    '#00FFFF', // Cyan
    '#FF8C00', // Dark Orange
    '#8A2BE2', // Blue Violet
    '#00FF00', // Green
    '#FF4500', // Orange Red
    '#1E90FF', // Dodger Blue
    '#FFD700', // Gold
    '#ADFF2F', // Green Yellow
  ];

  // Play sound tick
  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn("AudioContext block", e);
    }
  };

  // Play winner sound
  const playWinnerSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("AudioContext block", e);
    }
  };

  // Draw the wheel on canvas
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 15;

    ctx.clearRect(0, 0, width, height);

    if (activeChoices.length === 0) {
      // Draw placeholder circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e1e1f';
      ctx.fill();
      ctx.strokeStyle = '#333335';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#888888';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add options to spin!', centerX, centerY);
      return;
    }

    const arc = (2 * Math.PI) / activeChoices.length;
    const rotationAngle = rotationAngleRef.current;

    // Draw slices
    activeChoices.forEach((choice, i) => {
      const angle = rotationAngle + i * arc;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, angle, angle + arc);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = choice.color || colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text drawing
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      // Contrast text color based on segment color
      ctx.fillStyle = getContrastColor(choice.color || colors[i % colors.length]);
      ctx.font = '900 13px sans-serif';

      // Truncate text if too long
      let text = choice.name;
      if (text.length > 12) text = text.slice(0, 12) + '...';

      ctx.fillText(text, radius - 25, 0);
      ctx.restore();
    });

    // Outer ring decoration
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Small outer dots
    for (let i = 0; i < 24; i++) {
      const dotAngle = (i * 2 * Math.PI) / 24;
      const dotX = centerX + Math.cos(dotAngle) * (radius + 6);
      const dotY = centerY + Math.sin(dotAngle) * (radius + 6);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#D4FF00' : '#ffffff';
      ctx.fill();
    }

    // Draw Central Spin Button
    ctx.beginPath();
    ctx.arc(centerX, centerY, 45, 0, 2 * Math.PI);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pulse effect if not spinning
    if (!spinning) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, 48, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(212,255,0,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = '#D4FF00';
    ctx.font = '900 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', centerX, centerY - 1);
  };

  // Redraw when active choices change
  useEffect(() => {
    drawWheel();
  }, [choices]);

  // Initial draw
  useEffect(() => {
    drawWheel();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Spin trigger
  const spin = () => {
    if (spinning || activeChoices.length < 2) return;
    setSpinning(true);
    setWinner(null);
    setShowConfetti(false);

    // Initial random angular velocity
    spinVelocityRef.current = 0.5 + Math.random() * 0.4;
    lastTickAngleRef.current = rotationAngleRef.current;

    const arc = (2 * Math.PI) / activeChoices.length;

    const animate = () => {
      rotationAngleRef.current += spinVelocityRef.current;
      spinVelocityRef.current *= 0.986; // Friction (deceleration)

      // Sound ticks logic when passing segments
      const currentAngle = rotationAngleRef.current;
      const angleDiff = currentAngle - lastTickAngleRef.current;
      if (angleDiff >= arc) {
        playTickSound();
        lastTickAngleRef.current = currentAngle - (angleDiff % arc);
      }

      drawWheel();

      if (spinVelocityRef.current > 0.001) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Stopped
        setSpinning(false);
        spinVelocityRef.current = 0;

        // Calculate winning segment (Indicator is at 3 * Math.PI / 2 - TOP)
        const twoPI = 2 * Math.PI;
        const targetAngle = 1.5 * Math.PI;
        const normalizedAngle = (targetAngle - (rotationAngleRef.current % twoPI) + twoPI) % twoPI;
        const winnerIndex = Math.floor(normalizedAngle / arc);

        const selectedWinner = activeChoices[winnerIndex];
        setWinner(selectedWinner);
        setShowConfetti(true);
        playWinnerSound();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Add a single choice
  const handleAddChoice = () => {
    const text = newChoice.trim();
    if (!text) return;
    setChoices(prev => [
      ...prev,
      { id: Date.now().toString(), name: text, active: true }
    ]);
    setNewChoice('');
  };

  // Bulk import
  const handleBulkImport = () => {
    const lines = bulkInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;

    const newItems = lines.map((name, index) => ({
      id: (Date.now() + index).toString(),
      name,
      active: true
    }));

    setChoices(prev => [...prev, ...newItems]);
    setBulkInput('');
    setShowBulkModal(false);
  };

  // Remove winner from choices
  const handleRemoveWinner = () => {
    if (!winner) return;
    setChoices(prev => prev.filter(c => c.id !== winner.id));
    setWinner(null);
    setShowConfetti(false);
  };

  // Toggle active state
  const toggleChoice = (id: string) => {
    setChoices(prev =>
      prev.map(c => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  // Delete individual choice
  const deleteChoice = (id: string) => {
    setChoices(prev => prev.filter(c => c.id !== id));
  };

  // Shuffle list order
  const shuffleChoices = () => {
    setChoices(prev => [...prev].sort(() => 0.5 - Math.random()));
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col font-sans select-none overflow-x-hidden">
      {/* Header */}
      <header className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-95"
            disabled={spinning}
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <span className="text-[9px] font-black text-[#D4FF00] uppercase tracking-widest">Extension Tools</span>
            <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-white/90 flex items-center gap-1.5">
              🎲 SPIN THE LUCKY WHEEL
            </h1>
          </div>
        </div>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full active:scale-95 transition-all text-white/80"
          title={soundEnabled ? "Turn off sound" : "Turn on sound"}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: The Wheel Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 bg-white/5 border border-white/10 rounded-3xl relative min-h-[480px]">
          {/* Wheel Pointer Arrow */}
          <div className="absolute top-[8px] z-10 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[20px] border-t-[#D4FF00] filter drop-shadow-[0_4px_6px_rgba(212,255,0,0.4)]"></div>
          </div>

          <div className="relative aspect-square w-full max-w-[420px] active:scale-[0.99] transition-transform cursor-pointer" onClick={spin}>
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              className="w-full h-full filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            />
          </div>

          <button
            onClick={spin}
            disabled={spinning || activeChoices.length < 2}
            className={`mt-6 px-10 py-4 bg-[#D4FF00] text-black font-black uppercase tracking-wider rounded-2xl active:scale-95 transition-transform text-sm hover:opacity-90 disabled:opacity-30 disabled:scale-100 flex items-center gap-2 shadow-lg shadow-[#D4FF00]/10`}
          >
            🎲 START SPINNING
          </button>
        </div>

        {/* Right Col: Inputs & List */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-full min-h-[480px]">
          {/* Input Panel */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#D4FF00]">Add Options</h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter your options..."
                value={newChoice}
                onChange={e => setNewChoice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddChoice()}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-[#D4FF00] outline-none font-bold placeholder:text-white/20"
                disabled={spinning}
              />
              <button
                onClick={handleAddChoice}
                disabled={spinning}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl active:scale-95 transition-transform disabled:opacity-50"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowBulkModal(true)}
                disabled={spinning}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-white/80 active:scale-95"
              >
                📝 Import List
              </button>
              <button
                onClick={shuffleChoices}
                disabled={spinning}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-white/80 active:scale-95 flex items-center gap-1.5"
                title="Shuffle List"
              >
                <Shuffle size={14} /> Shuffle List
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col min-h-[300px] overflow-hidden">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-white/80">List ({choices.length})</h3>
                <span className="bg-white/10 text-white/60 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Spin: {activeChoices.length}
                </span>
              </div>
              {choices.length > 0 && (
                <button
                  onClick={() => setChoices([])}
                  disabled={spinning}
                  className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1 active:scale-95 disabled:opacity-50"
                >
                  <Trash2 size={13} /> Clear List
                </button>
              )}
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-text">
              {choices.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex justify-between items-center px-4 py-2.5 rounded-xl border transition-all ${c.active
                    ? 'bg-white/5 border-white/10 hover:border-white/20'
                    : 'bg-white/2 border-white/5 opacity-40'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={c.active}
                      onChange={() => toggleChoice(c.id)}
                      disabled={spinning}
                      className="accent-[#D4FF00] rounded cursor-pointer"
                    />

                    {/* Interactive Color Bubble wrapping input type=color */}
                    <div
                      className="relative w-5 h-5 rounded-full border border-white/25 cursor-pointer flex items-center justify-center overflow-hidden transition-all active:scale-95 shadow shrink-0 hover:scale-105"
                      style={{ backgroundColor: c.color || colors[i % colors.length] }}
                      title="Change color"
                    >
                      <input
                        type="color"
                        value={c.color || colors[i % colors.length]}
                        onChange={(e) => updateChoiceColor(c.id, e.target.value)}
                        disabled={spinning}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                      />
                    </div>

                    <span className="text-xs font-bold text-white/90 truncate max-w-[140px] sm:max-w-[180px]">
                      {c.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Copy Color Button */}
                    <button
                      onClick={() => handleCopyColor(c.id, c.color || colors[i % colors.length])}
                      disabled={spinning}
                      className="p-1.5 text-white/40 hover:text-[#D4FF00] rounded hover:bg-white/5 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center"
                      title="Copy color hex"
                    >
                      {copiedChoiceId === c.id ? (
                        <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      )}
                    </button>

                    {/* Paste Color Button */}
                    {copiedColor && (
                      <button
                        onClick={() => updateChoiceColor(c.id, copiedColor)}
                        disabled={spinning}
                        className="p-1.5 text-white/40 hover:text-cyan-400 rounded hover:bg-white/5 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center animate-pulse"
                        title="Paste copied color"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                        </svg>
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => deleteChoice(c.id)}
                      disabled={spinning}
                      className="p-1.5 text-white/40 hover:text-red-400 rounded hover:bg-white/5 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center"
                      title="Delete option"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {choices.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30 gap-2">
                  <HelpCircle size={32} />
                  <p className="text-xs font-bold uppercase tracking-wider">Empty List</p>
                  <p className="text-[10px] text-white/70">Enter your list above to start spinning.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Import Modal Dialog */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f0f11] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#D4FF00]">BULK IMPORT OPTIONS</h3>
                <p className="text-[10px] text-white/50 mt-1">Paste your list of options here. One option per line.</p>
              </div>

              <textarea
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
                placeholder="Example:&#10;Option A&#10;Option B&#10;Option C&#10;Option D"
                rows={8}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold focus:ring-1 focus:ring-[#D4FF00] outline-none placeholder:text-white/20 font-mono"
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl active:scale-95 transition-transform text-xs"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleBulkImport}
                  className="flex-1 py-3 bg-[#D4FF00] text-black font-black rounded-xl active:scale-95 transition-transform text-xs"
                >
                  IMPORT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Winner Celebration Modal */}
      <AnimatePresence>
        {winner && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
            {/* confetti particles using CSS animations */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(50)].map((_, idx) => {
                  const left = Math.random() * 100;
                  const delay = Math.random() * 3;
                  const duration = 2 + Math.random() * 3;
                  const scale = 0.5 + Math.random() * 1;
                  const color = colors[idx % colors.length];

                  return (
                    <div
                      key={idx}
                      className="absolute top-[-20px] w-3 h-6 opacity-80"
                      style={{
                        left: `${left}%`,
                        backgroundColor: color,
                        transform: `scale(${scale}) rotate(${Math.random() * 360}deg)`,
                        animation: `fall ${duration}s linear ${delay}s infinite`,
                        borderRadius: '3px'
                      }}
                    />
                  );
                })}
              </div>
            )}

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-b from-[#18181b] to-[#0a0a0c] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(212,255,0,0.15)] text-center space-y-6 relative overflow-hidden"
            >
              {/* Top cup / medal glow */}
              <div className="w-16 h-16 bg-[#D4FF00]/10 border border-[#D4FF00]/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <span className="text-3xl">🏆</span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black text-[#D4FF00] uppercase tracking-widest animate-pulse">
                  THE WINNER IS!
                </span>
                <h2 className="text-3xl font-black text-white break-words tracking-tight uppercase px-4">
                  {winner.name}
                </h2>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={handleRemoveWinner}
                  className="w-full py-3 bg-[#D4FF00] text-black font-black rounded-2xl active:scale-95 transition-transform text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4FF00]/10"
                >
                  🗑️ REMOVE FROM WHEEL
                </button>
                <button
                  onClick={() => { setWinner(null); setShowConfetti(false); }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl active:scale-95 transition-transform text-xs uppercase tracking-wider"
                >
                  CLOSE (KEEP TEAM)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded falling confetti CSS keyframes */}
      <style>{`
        @keyframes fall {
          0% {
            top: -20px;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            top: 105vh;
            transform: translateY(0) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
}
