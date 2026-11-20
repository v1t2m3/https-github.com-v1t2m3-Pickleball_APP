import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Activity, Lock, User, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  // Modern Web Guidance: Escape key closes modal dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      
      login(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0 modal-contain-scroll"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-dialog-title"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm backdrop-contain-scroll"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        className="relative w-full max-w-md bg-[#161719] border border-white/10 rounded-2xl p-7 shadow-xl overflow-hidden modal-contain-scroll"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors z-20 cursor-pointer"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center mb-7 relative z-10">
          <div className="w-12 h-12 bg-[#D4FF00] rounded-xl flex items-center justify-center mb-3 text-black">
            <Activity className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 id="login-dialog-title" className="text-xl font-bold tracking-tight text-white">Đăng nhập hệ thống</h2>
          <p className="text-sm text-gray-400 mt-1 text-center">Nhập tài khoản để quản lý giải đấu và chấm điểm</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl mb-5 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User size={16} className="text-gray-400" />
              </div>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tên đăng nhập"
                autoComplete="username"
                autoFocus
                required
                className="w-full bg-white/5 text-white border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] transition-colors placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock size={16} className="text-gray-400" />
              </div>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                autoComplete="current-password"
                required
                className="w-full bg-white/5 text-white border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00] transition-colors placeholder-gray-500"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#D4FF00] hover:bg-[#c2eb00] text-black rounded-xl font-bold text-sm tracking-wide transition-colors active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
        
        <div className="mt-5 text-center">
          <p className="text-xs text-gray-500">Phân quyền dành riêng cho ban tổ chức và trọng tài</p>
        </div>
      </motion.div>
    </div>
  );
}
