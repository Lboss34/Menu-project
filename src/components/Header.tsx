/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Shield, User, Layers, LogOut, Award, ChefHat, Settings } from 'lucide-react';
import { CartItem } from '../types';

interface HeaderProps {
  currentView: 'customer' | 'admin';
  setView: (view: 'customer' | 'admin') => void;
  cart: CartItem[];
  setIsCartOpen: (open: boolean) => void;
  currentUser: { 
    username: string; 
    name: string; 
    role: 'customer' | 'employee'; 
    avatarUrl?: string; 
    phone?: string; 
    address?: string;
  } | null;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export default function Header({ 
  currentView, 
  setView, 
  cart, 
  setIsCartOpen, 
  currentUser, 
  onLogout,
  onOpenSettings
}: HeaderProps) {
  const totalCartItems = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full bg-black/40 backdrop-blur-md border-b border-white/10 shadow-lg px-4 md:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo - Rotated Gradient Box */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => {
            if (currentUser?.role === 'customer') {
              setView('customer');
            }
          }}
        >
          <div className="w-9 h-9 bg-gradient-to-tr from-[#FF6B00] to-[#FF9D00] rounded-lg rotate-12 flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.4)] transition-transform duration-300 hover:rotate-6">
            <span className="text-white font-extrabold text-xs tracking-tight">LUX</span>
          </div>
          <div>
            <span className="font-display font-black text-lg md:text-xl tracking-tight text-white block uppercase">
              L'Étoile<span className="text-[#FF6B00]">Bite</span>
            </span>
            <span className="font-mono text-[9px] text-[#FF6B00] uppercase tracking-[0.25em] font-semibold leading-none block">
              Gourmet Experience
            </span>
          </div>
        </motion.div>

        {/* Action Controls - Pill Toggles & Profile */}
        <div className="flex items-center space-x-3 md:space-x-4">
          
          {/* View Toggle - ONLY visible to staff/employees */}
          {currentUser?.role === 'employee' && (
            <div className="bg-white/5 p-1 rounded-full border border-white/10 flex items-center">
              <button
                onClick={() => setView('customer')}
                className={`relative px-3 py-1 text-[11px] font-bold rounded-full transition-all duration-300 flex items-center space-x-1 ${
                  currentView === 'customer'
                    ? 'bg-[#FF6B00] text-white shadow-lg'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>المعاينة</span>
              </button>
              <button
                id="admin-panel-toggle"
                onClick={() => setView('admin')}
                className={`relative px-3 py-1 text-[11px] font-bold rounded-full transition-all duration-300 flex items-center space-x-1 ${
                  currentView === 'admin'
                    ? 'bg-[#FF6B00] text-white shadow-lg'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>لوحة التحكم</span>
              </button>
            </div>
          )}

          {/* Prestige User Badge */}
          {currentUser && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/80">
              {currentUser.role === 'employee' ? (
                <>
                  <ChefHat className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-bold text-amber-400">الكادر التنفيذي:</span>
                </>
              ) : (
                <>
                  <Award className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span className="font-bold text-[#FF6B00]">ذواق متميز:</span>
                </>
              )}
              <span className="truncate max-w-[100px]">{currentUser.name}</span>
            </div>
          )}

          {/* Cart Icon for Customer View */}
          {currentView === 'customer' && currentUser?.role === 'customer' && (
            <motion.button
              onClick={() => setIsCartOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 rounded-full bg-white/5 border border-white/10 hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/30 transition-all text-white cursor-pointer"
              aria-label="Open your Cart"
            >
              <ShoppingBag className="w-4 h-4 text-gray-200" />
              {totalCartItems > 0 && (
                <motion.span
                  key={totalCartItems}
                  initial={{ scale: 0.4, rotate: -25 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 600, damping: 10 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#FF6B00] to-[#FF9D00] rounded-full flex items-center justify-center text-[9px] font-black text-white shadow-[0_0_10px_rgba(255,107,0,0.5)] border border-[#050505]"
                >
                  {totalCartItems}
                </motion.span>
              )}
            </motion.button>
          )}

          {/* Logout Trigger */}
          {currentUser && (
            <button
              onClick={onLogout}
              className="p-2 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 text-red-400 transition-all cursor-pointer flex items-center space-x-1 text-xs font-semibold px-3.5"
              title="تسجيل الخرج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          )}

          {/* Client Avatar indicator matching design HTML */}
          {currentUser && (
            <div className="hidden sm:flex items-center border-l border-white/10 pl-4 h-6 gap-2">
              {currentUser.role === 'customer' && onOpenSettings && (
                <motion.button
                  onClick={onOpenSettings}
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="p-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/30 transition-all text-gray-400 hover:text-[#FF6B00] cursor-pointer flex items-center justify-center"
                  title="إعدادات الحساب الفاخرة"
                >
                  <Settings className="w-3.5 h-3.5" />
                </motion.button>
              )}
              <button 
                type="button"
                className={`h-8 w-8 rounded-full border border-white/20 bg-white/5 overflow-hidden ${currentUser.role === 'customer' && onOpenSettings ? 'cursor-pointer hover:border-[#FF6B00]/50 transition-colors' : ''}`}
                onClick={() => currentUser.role === 'customer' && onOpenSettings?.()}
                aria-label="إعدادات الحساب"
              >
                <img 
                  src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=${currentUser.role === 'employee' ? 'D4AF37' : 'FF6B00'}&color=fff`} 
                  alt="Profile"
                  className="w-full h-full object-cover animate-fade-in"
                  referrerPolicy="no-referrer"
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
