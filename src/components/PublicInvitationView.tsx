import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Calendar, MapPin, MessageSquare, AlertCircle } from 'lucide-react';

interface Guest {
  id: number;
  name: string;
  position: string;
  organization: string;
  phone: string;
  email: string;
  zalo: string;
  rsvp_status: 'pending' | 'accepted' | 'declined';
  rsvp_options: string[];
  rsvp_comment: string;
}

interface Template {
  id: number;
  name: string;
  background_url: string;
  config: {
    fields: Array<{
      id: string;
      label: string;
      x: number;
      y: number;
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
      color: string;
      align: 'left' | 'center' | 'right';
    }>;
    rsvpOptions: string[];
  };
}

interface Props {
  token: string;
  onBack: () => void;
}

export default function PublicInvitationView({ token, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);

  // RSVP Form States
  const [rsvpStatus, setRsvpStatus] = useState<'accepted' | 'declined' | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Colors for Confetti
  const colors = ['#D4FF00', '#00FFFF', '#FF1493', '#FF8C00', '#8A2BE2', '#00FF00'];

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api(`/invitations/public/${token}`);
      setGuest(data.guest);
      setTemplate(data.template);
      
      // Initialize form values from current DB status
      if (data.guest.rsvp_status !== 'pending') {
        setRsvpStatus(data.guest.rsvp_status);
        setSubmitted(true);
      }
      setSelectedOptions(data.guest.rsvp_options || []);
      setComment(data.guest.rsvp_comment || '');
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load invitation. The link might be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  // Render canvas once template and guest data is loaded
  useEffect(() => {
    if (!template || !guest || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    // Prefix relative upload path with full backend URL if needed
    const imageUrl = template.background_url.startsWith('http') 
      ? template.background_url 
      : template.background_url;
      
    img.src = imageUrl;
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Set high DPI canvas resolution
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // Determine logical display width
      const displayWidth = Math.min(rect.width || 600, 600);
      // Calculate aspect ratio
      const aspectRatio = img.height / img.width;
      const displayHeight = displayWidth * aspectRatio;

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      ctx.scale(dpr, dpr);

      // Draw background image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Draw all customized text fields
      template.config.fields.forEach(field => {
        const xPos = field.x * displayWidth;
        const yPos = field.y * displayHeight;

        // Map database value
        let textValue = '';
        if (field.id === 'name') textValue = guest.name || '';
        else if (field.id === 'position') textValue = guest.position || '';
        else if (field.id === 'organization') textValue = guest.organization || '';

        if (!textValue) return;

        ctx.save();
        ctx.fillStyle = field.color || '#ffffff';
        
        // Construct canvas font string
        const weight = field.fontWeight || 'normal';
        const size = field.fontSize || 20;
        const family = field.fontFamily || 'sans-serif';
        ctx.font = `${weight} ${size}px ${family}`;
        
        ctx.textAlign = field.align || 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(textValue, xPos, yPos);
        ctx.restore();
      });
    };

    img.onerror = () => {
      console.error("Failed to load invitation template backdrop image.");
    };
  }, [template, guest]);

  const handleToggleOption = (option: string) => {
    setSelectedOptions(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const handleSubmitRsvp = async () => {
    if (!rsvpStatus) return;
    try {
      setSubmitting(true);
      const updatedGuest = await api(`/invitations/public/${token}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({
          rsvp_status: rsvpStatus,
          rsvp_options: rsvpStatus === 'accepted' ? selectedOptions : [],
          rsvp_comment: comment
        })
      });
      setGuest(updatedGuest);
      setSubmitted(true);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to submit response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-[#D4FF00] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-mono text-sm tracking-wider uppercase text-white/50">Fetching your invitation...</p>
      </div>
    );
  }

  if (error || !guest || !template) {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex flex-col items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto animate-bounce" />
          <h2 className="text-xl font-bold uppercase tracking-tight">Access Error</h2>
          <p className="text-sm text-white/60 leading-relaxed">{error || "Something went wrong."}</p>
          <button 
            onClick={onBack}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  const rsvpOptions = template.config.rsvpOptions || [];

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col font-sans select-none overflow-x-hidden" ref={containerRef}>
      {/* Header */}
      <header className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#D4FF00] rounded-full flex items-center justify-center">
            <span className="text-black text-sm font-black">✉</span>
          </div>
          <div>
            <span className="text-[9px] font-black text-[#D4FF00] uppercase tracking-widest">E-INVITATION</span>
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white/95">
              {template.name}
            </h1>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all"
        >
          Close
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col md:grid md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Invitation Canvas rendering Card */}
        <div className="w-full md:col-span-6 flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-3xl p-4 shadow-xl">
          <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-3">Card Preview</span>
          <div className="relative w-full max-w-[420px] aspect-auto border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
            />
          </div>
        </div>

        {/* Right Column: RSVP interactive card */}
        <div className="w-full md:col-span-6 flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl relative overflow-hidden">
            {/* Confetti Animation when Accepted */}
            {submitted && rsvpStatus === 'accepted' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                {[...Array(30)].map((_, idx) => {
                  const left = Math.random() * 100;
                  const delay = Math.random() * 2;
                  const duration = 2 + Math.random() * 2;
                  const scale = 0.4 + Math.random() * 0.8;
                  const color = colors[idx % colors.length];
                  return (
                    <div
                      key={idx}
                      className="absolute top-[-20px] w-2.5 h-5 opacity-80"
                      style={{
                        left: `${left}%`,
                        backgroundColor: color,
                        transform: `scale(${scale}) rotate(${Math.random() * 360}deg)`,
                        animation: `rsvp-fall ${duration}s linear ${delay}s infinite`,
                        borderRadius: '2px'
                      }}
                    />
                  );
                })}
              </div>
            )}

            <div className="relative z-10 space-y-6">
              <div>
                <span className="text-[9px] font-black text-[#D4FF00] uppercase tracking-widest">RSVP STATUS</span>
                <h2 className="text-2xl font-black tracking-tight mt-1">Hello, {guest.name}!</h2>
                <p className="text-xs text-white/50 leading-relaxed mt-1">Please confirm your attendance status by selecting one of the choices below.</p>
              </div>

              {/* Status Selector Button group */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => !submitted && setRsvpStatus('accepted')}
                  disabled={submitted}
                  className={`py-4 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:scale-100 ${
                    rsvpStatus === 'accepted'
                      ? 'bg-green-500/10 border-green-500 text-green-400'
                      : 'border-white/10 bg-white/2 hover:border-white/20 text-white/60'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rsvpStatus === 'accepted' ? 'bg-green-500 text-black' : 'bg-white/10'}`}>
                    <Check size={16} strokeWidth={3} />
                  </div>
                  Will Attend
                </button>

                <button
                  onClick={() => !submitted && setRsvpStatus('declined')}
                  disabled={submitted}
                  className={`py-4 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:scale-100 ${
                    rsvpStatus === 'declined'
                      ? 'bg-red-500/10 border-red-500 text-red-400'
                      : 'border-white/10 bg-white/2 hover:border-white/20 text-white/60'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rsvpStatus === 'declined' ? 'bg-red-500 text-white' : 'bg-white/10'}`}>
                    <X size={16} strokeWidth={3} />
                  </div>
                  Declined
                </button>
              </div>

              {/* Dynamic Checkboxes - only visible when Will Attend is selected */}
              <AnimatePresence>
                {rsvpStatus === 'accepted' && rsvpOptions.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 overflow-hidden pt-1 border-t border-white/5"
                  >
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-2">Options & Preferences</span>
                    <div className="space-y-2">
                      {rsvpOptions.map((option, idx) => {
                        const checked = selectedOptions.includes(option);
                        return (
                          <div
                            key={idx}
                            onClick={() => !submitted && handleToggleOption(option)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                              submitted ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              checked
                                ? 'bg-[#D4FF00]/5 border-[#D4FF00]/30 hover:border-[#D4FF00]/40'
                                : 'bg-white/2 border-white/5 hover:border-white/10'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              disabled={submitted}
                              className="accent-[#D4FF00] rounded cursor-pointer pointer-events-none"
                            />
                            <span className="text-xs font-bold text-white/80 select-none">{option}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Comment text area input */}
              {rsvpStatus && (
                <div className="space-y-2 pt-1 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Short Comment (Message)</span>
                    <span className="text-[9px] font-mono text-white/30">{comment.length}/50</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={50}
                      placeholder={submitted ? "No comment" : "Leave a short message to the organizer (max 50 chars)..."}
                      value={comment}
                      onChange={e => !submitted && setComment(e.target.value)}
                      disabled={submitted}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-1 focus:ring-[#D4FF00] outline-none font-bold placeholder:text-white/25 disabled:opacity-60"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {rsvpStatus && !submitted && (
                <button
                  onClick={handleSubmitRsvp}
                  disabled={submitting}
                  className="w-full py-4 bg-[#D4FF00] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4FF00]/5 mt-4"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : "Confirm & Send Response"}
                </button>
              )}

              {/* Submitted success state */}
              {submitted && (
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-center space-y-1 mt-4">
                  <div className="text-xs font-bold text-green-400 uppercase tracking-wider">Response Received!</div>
                  <div className="text-[10px] text-white/60">
                    Thank you, your attendance status has been saved.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded falling confetti CSS keyframes */}
      <style>{`
        @keyframes rsvp-fall {
          0% {
            top: -20px;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            top: 105%;
            transform: translateY(0) rotate(720deg);
          }
        }
      `}</style>
    </div>
  );
}
