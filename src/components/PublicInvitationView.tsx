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

  // RSVP Popup Modal Open State
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);

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
      const drawCanvas = () => {
        // Set high DPI canvas resolution
        const dpr = window.devicePixelRatio || 1;

        // Determine logical display dimensions using actual size capped at 1920px (width or height)
        const naturalWidth = img.naturalWidth || img.width || 1200;
        const naturalHeight = img.naturalHeight || img.height || 1200;

        let displayWidth = naturalWidth;
        let displayHeight = naturalHeight;

        if (displayWidth > 1920 || displayHeight > 1920) {
          if (displayWidth > displayHeight) {
            displayWidth = 1920;
            displayHeight = (1920 / naturalWidth) * naturalHeight;
          } else {
            displayHeight = 1920;
            displayWidth = (1920 / naturalHeight) * naturalWidth;
          }
        }

        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = '100%';
        canvas.style.maxWidth = `${displayWidth}px`;
        canvas.style.height = 'auto';

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

          // Construct canvas font string with quote wrapping for custom families
          const weight = field.fontWeight || 'normal';
          const size = field.fontSize || 20;
          const family = field.fontFamily || 'sans-serif';
          ctx.font = `${weight} ${size}px "${family}"`;

          ctx.textAlign = field.align || 'center';
          ctx.textBaseline = 'middle';

          ctx.fillText(textValue, xPos, yPos);
          ctx.restore();
        });
      };

      // Ensure that Google Web Fonts are ready before canvas drawing to prevent default font rendering fallback
      if (document.fonts) {
        document.fonts.ready.then(() => {
          drawCanvas();
        });
      } else {
        drawCanvas();
      }
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
      {/* Hidden preloader to force browser to load Google Web Fonts before drawing Canvas */}
      <div style={{ position: 'absolute', visibility: 'hidden', height: 0, width: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <span style={{ fontFamily: '"Bad Script"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Caveat"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Charm"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Cinzel"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Dancing Script"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Itim"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđ</span>
        <span style={{ fontFamily: '"Lobster"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Marck Script"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Pacifico"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Pattaya"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Playfair Display"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Satisfy"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Spectral"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
        <span style={{ fontFamily: '"Montserrat"' }}>aáàảãạăắằẳẵặâấầẩẫậeéèẻẽẹêếềểễệiíìỉĩịoóòỏõọôốồổỗộơớờởỡợuúùủũụưứừửữựyýỳỷỹỵđAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬEÉÈẺẼẸÊẾỀỂỄỆIÍÌỈĨỊOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÚÙỦŨỤƯỨỪỬỮỰYÝỲỶỸỴĐ</span>
      </div>

      {/* Header */}
      <header className="px-3 sm:px-6 py-2.5 sm:py-3.5 bg-white/5 border-b border-white/10 flex items-center justify-between sticky top-0 z-30 pt-safe">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#D4FF00] rounded-full flex items-center justify-center shrink-0">
            <span className="text-black text-xs sm:text-sm font-black">✉</span>
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-black text-[#D4FF00] uppercase tracking-widest block truncate">E-INVITATION</span>
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white/95 truncate">
              {template.name}
            </h1>
          </div>
        </div>
        <button
          onClick={onBack}
          className="px-3 py-1 sm:px-3.5 sm:py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95 shrink-0"
        >
          Đóng
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-8 flex flex-col items-center gap-6 sm:gap-8">
        
        {/* Card Full-Size Representation View */}
        <div className="w-full flex flex-col items-center bg-white/5 border border-white/10 rounded-3xl p-3 sm:p-6 shadow-xl relative overflow-visible">
          <span className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">THƯ MỜI CHÍNH THỨC</span>
          
          {/* Responsive container that fits screen and preserves aspect ratio */}
          <div className="w-full max-w-2xl flex justify-center p-0 sm:p-2">
            <div className="relative overflow-hidden shadow-2xl border border-white/10 rounded-2xl w-full flex justify-center bg-black/40">
              <canvas
                ref={canvasRef}
                className="block w-full h-auto max-w-full rounded-2xl"
              />
            </div>
          </div>

          {/* Pulse Glowing RSVP Activation Banner */}
          <div className="mt-8 w-full max-w-md flex flex-col items-center">
            <motion.button
              onClick={() => setIsRsvpOpen(true)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-4.5 px-6 bg-gradient-to-r from-[#D4FF00] via-[#E2FF33] to-[#D4FF00] text-black font-black text-xs sm:text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(212,255,0,0.15)] border border-[#E2FF33] transition-all flex items-center justify-center gap-3 relative overflow-hidden group cursor-pointer rsvp-glowing-trigger"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
              <span className="text-base sm:text-lg">✉</span>
              <span className="relative z-10 font-black">
                {submitted ? "Xem Phản Hồi RSVP Của Bạn" : "Phản Hồi Trạng Thái Tham Dự (RSVP)"}
              </span>
              <span className="text-[10px] font-mono bg-black/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider ml-1">
                {submitted ? (rsvpStatus === 'accepted' ? 'Đã Nhận' : 'Vắng') : 'Mở Form'}
              </span>
            </motion.button>
            <p className="text-[10px] text-white/40 uppercase tracking-widest text-center mt-2 font-black leading-none">
              {submitted ? "Cảm ơn quý anh/chị đã gửi phản hồi!" : "Vui lòng bấm nút trên để xác nhận thông tin với BTC"}
            </p>
          </div>
        </div>
      </div>

      {/* RSVP Popup Modal Dialog */}
      <AnimatePresence>
        {isRsvpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRsvpOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-[#0e0e11] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden z-10 flex flex-col"
            >
              {/* Close button */}
              <button
                onClick={() => setIsRsvpOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all text-white/60 hover:text-white cursor-pointer z-20"
              >
                <X size={16} strokeWidth={2.5} />
              </button>

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
                  <h2 className="text-2xl font-black tracking-tight mt-1 text-white/95">Kính gửi, {guest.name}!</h2>
                  <p className="text-xs text-white/50 leading-relaxed mt-1">Để BTC được trân trọng đón tiếp và phục vụ chu đáo, kính mong quý Anh/Chị phản hồi thông tin!</p>
                </div>

                {/* Status Selector Button group */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => !submitted && setRsvpStatus('accepted')}
                    disabled={submitted}
                    className={`py-4 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:scale-100 cursor-pointer ${
                      rsvpStatus === 'accepted'
                        ? 'bg-green-500/10 border-green-500 text-green-400 font-black'
                        : 'border-white/10 bg-white/2 hover:border-white/20 text-white/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rsvpStatus === 'accepted' ? 'bg-green-500 text-black' : 'bg-white/10'}`}>
                      <Check size={16} strokeWidth={3} />
                    </div>
                    Tham dự
                  </button>

                  <button
                    onClick={() => !submitted && setRsvpStatus('declined')}
                    disabled={submitted}
                    className={`py-4 px-3 rounded-2xl border-2 font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 transition-all active:scale-95 disabled:scale-100 cursor-pointer ${
                      rsvpStatus === 'declined'
                        ? 'bg-red-500/10 border-red-500 text-red-400 font-black'
                        : 'border-white/10 bg-white/2 hover:border-white/20 text-white/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rsvpStatus === 'declined' ? 'bg-red-500 text-white' : 'bg-white/10'}`}>
                      <X size={16} strokeWidth={3} />
                    </div>
                    Vắng mặt
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
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block mb-2">Tuỳ chọn</span>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
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
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Lời nhắn (Message)</span>
                      <span className="text-[9px] font-mono text-white/30">{comment.length}/50</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={50}
                        placeholder={submitted ? "Không để lại lời nhắn" : "Gửi lời nhắn ngắn tới BTC (tối đa 50 ký tự)..."}
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
                    className="w-full py-4 bg-[#D4FF00] text-black font-black text-xs uppercase tracking-wider rounded-2xl active:scale-95 transition-transform disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4FF00]/5 mt-4 cursor-pointer"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    ) : "Xác nhận & Gửi Phản Hồi"}
                  </button>
                )}

                {/* Submitted success state */}
                {submitted && (
                  <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl text-center space-y-1 mt-4">
                    <div className="text-xs font-bold text-green-400 uppercase tracking-wider">BTC đã nhận thông tin</div>
                    <div className="text-[10px] text-white/60">
                      Xin chân thành cảm ơn quý Anh/Chị đã phản hồi thông tin!
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded falling confetti CSS keyframes */}
      <style>{`
        .rsvp-glowing-trigger {
          animation: rsvp-glow-pulse 2.2s infinite ease-in-out;
        }
        @keyframes rsvp-glow-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 15px rgba(212, 255, 0, 0.25);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 35px rgba(212, 255, 0, 0.55);
          }
        }
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
