/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, MapPin, Key, Image as ImageIcon, Sparkles, Check, Loader2 } from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { 
    username: string; 
    name: string; 
    role: 'customer' | 'employee'; 
    avatarUrl?: string; 
    phone?: string; 
    address?: string;
  } | null;
  onUpdateSuccess: (updatedUser: { 
    username: string; 
    name: string; 
    role: 'customer' | 'employee'; 
    avatarUrl?: string; 
    phone?: string; 
    address?: string;
  }) => void;
}

const PRESET_AVATARS = [
  {
    name: 'الذوّاق النبيل',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    tag: 'VIP'
  },
  {
    name: 'عشاق الترفل',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
    tag: 'Truffle'
  },
  {
    name: 'خبير اللحوم',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80',
    tag: 'Steak'
  },
  {
    name: 'ناقد الأطباق',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    tag: 'Critic'
  },
  {
    name: 'نجمة المطبخ',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    tag: 'Star'
  },
  {
    name: 'المتفائل الصغير',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
    tag: 'Gourmet'
  }
];

export default function AccountSettingsModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  onUpdateSuccess 
}: AccountSettingsModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Custom avatar input helper toggle
  const [isCustomAvatar, setIsCustomAvatar] = useState(false);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Hydrate fields upon opening
  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setAddress(currentUser.address || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setPassword('');

      // Check if current avatar is custom (not in presets)
      const isPreset = PRESET_AVATARS.some(av => av.url === currentUser.avatarUrl);
      if (currentUser.avatarUrl && !isPreset) {
        setIsCustomAvatar(true);
        setCustomAvatarInput(currentUser.avatarUrl);
      } else {
        setIsCustomAvatar(false);
        setCustomAvatarInput('');
      }
      
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentUser]);

  const handlePresetSelect = (url: string) => {
    setAvatarUrl(url);
    setIsCustomAvatar(false);
  };

  const handleCustomAvatarApply = () => {
    if (!customAvatarInput.trim() || !customAvatarInput.startsWith('http')) {
      setErrorMsg('فضلاً أدخل رابط صورة صحيح يبدأ بـ http أو https');
      return;
    }
    setAvatarUrl(customAvatarInput.trim());
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('فضلاً أدخل اسمك الكامل لتحديث البيانات');
      setIsLoading(false);
      return;
    }

    try {
      const { doc, updateDoc, getDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType, hashPassword } = await import('../lib/firebase');

      const colName = currentUser.role === 'customer' ? 'customers' : 'employees';
      const docRef = doc(db, colName, currentUser.username);

      // Verify the document actually exists first
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        setErrorMsg('لم يتم العثور على سجل حسابك في قاعدة البيانات الأساسية');
        setIsLoading(false);
        return;
      }

      const updates: Record<string, any> = {
        name: name.trim(),
        avatarUrl: avatarUrl.trim(),
        phone: phone.trim(),
        address: address.trim()
      };

      if (password.trim()) {
        if (password.length < 3) {
          setErrorMsg('كلمة المرور الجديدة يجب أن تحتوي على 3 خانات على الأقل');
          setIsLoading(false);
          return;
        }
        updates.password = await hashPassword(password);
      }

      // Perform update
      try {
        await updateDoc(docRef, updates);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `${colName}/${currentUser.username}`);
      }

      // Notify parent component to update state & localStorage
      const updatedUserPayload = {
        username: currentUser.username,
        name: name.trim(),
        role: currentUser.role,
        avatarUrl: avatarUrl.trim(),
        phone: phone.trim(),
        address: address.trim()
      };

      onUpdateSuccess(updatedUserPayload);
      setSuccessMsg('✨ تم تحديث حسابك الفاخر وتثبيته في السحابة بنجاح!');
      setPassword('');

      // Auto close after 1.5s
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setErrorMsg('عذراً، فشل تحديث البيانات في النظام. يرجى مراجعة الاتصال بالسحابة.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Backdrop blur safety sheet */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#050505]/80 backdrop-blur-md cursor-pointer"
          />

          {/* Luxury Settings Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-lg bg-[#0b0b0c] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 text-right overflow-hidden max-h-[90vh] overflow-y-auto"
            dir="rtl"
          >
            {/* Top decorative line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B00] via-amber-400 to-[#FF6B00]/40" />

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-white">إعدادات حسابك الفاخر</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-mono">L'ÉTOILE PRESTIGE PROFILE SETTINGS</p>
                </div>
              </div>
              <motion.button
                whileHover={{ rotate: 90 }}
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Active Avatar Live Preview */}
            <div className="flex flex-col items-center justify-center mb-8 bg-white/[0.01] border border-white/5 rounded-2xl p-4 gap-3 self-center">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-2 border-[#FF6B00] bg-black/40 overflow-hidden shadow-lg shadow-[#FF6B00]/15">
                  <img 
                    src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || currentUser.name)}&background=FF6B00&color=fff`} 
                    alt="Active Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-[#FF6B00] to-[#FF9D00] text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md border border-[#0b0b0c]">
                  نشطة
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-400 block font-mono">{currentUser.username}</span>
                <span className="text-[10px] text-amber-400/90 bg-amber-400/5 px-2.5 py-0.5 rounded-full border border-amber-400/10 inline-block mt-1">كبار الشخصيات VIP</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Profile Avatar Picker presets */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-300 block">اختر صورتك الرمزية المفضلة:</span>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((av, index) => {
                    const isSelected = avatarUrl === av.url && !isCustomAvatar;
                    return (
                      <motion.button
                        key={index}
                        type="button"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handlePresetSelect(av.url)}
                        className={`relative h-11 w-11 rounded-full overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-[#FF6B00] scale-105 shadow-[0_0_12px_rgba(255,107,0,0.5)]' : 'border-white/10 hover:border-white/30'
                        }`}
                        title={av.name}
                      >
                        <img 
                          src={av.url} 
                          alt={av.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#FF6B00]/40 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white stroke-[3.5]" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Custom Image URL Selector option */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomAvatar(!isCustomAvatar);
                      if (!isCustomAvatar) {
                        setCustomAvatarInput(avatarUrl.startsWith('http') && !PRESET_AVATARS.some(av => av.url === avatarUrl) ? avatarUrl : '');
                      }
                    }}
                    className="text-[10px] text-[#FF6B00] hover:underline flex items-center gap-1 font-semibold pr-1"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>{isCustomAvatar ? 'استخدام الصور الرمزية الجاهزة' : 'استخدام رابط صورة خارجي مخصص'}</span>
                  </button>

                  {isCustomAvatar && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 flex items-center gap-2"
                    >
                      <label htmlFor="custom-avatar-url" className="sr-only">رابط الصورة المخصص</label>
                      <input
                        id="custom-avatar-url"
                        type="url"
                        value={customAvatarInput}
                        onChange={(e) => setCustomAvatarInput(e.target.value)}
                        placeholder="أدخل رابط صورة صحيح (https://...)"
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF6B00]/40 font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleCustomAvatarApply}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10"
                      >
                        تطبيق
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Full Name field */}
              <div className="space-y-1.5">
                <label htmlFor="settings-name" className="text-xs font-bold text-gray-300 block flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>الاسم الكامل الفاخر:</span>
                </label>
                <input
                  id="settings-name"
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: إياد الخلفه"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              {/* Phone Field */}
              <div className="space-y-1.5">
                <label htmlFor="settings-phone" className="text-xs font-bold text-gray-300 block flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>رقم الهاتف الافتراضي للتسليم:</span>
                </label>
                <input
                  id="settings-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="مثال: +966 50 000 0000"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B00] transition-colors font-mono"
                  dir="ltr"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">يُدرج هذا الهاتف تلقائياً عند الدفع لتوفير وقتك.</span>
              </div>

              {/* Delivery Address Field */}
              <div className="space-y-1.5">
                <label htmlFor="settings-address" className="text-xs font-bold text-gray-300 block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>عنوان التوصيل المفضل:</span>
                </label>
                <textarea
                  id="settings-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="مثال: الرياض، حي الملقا، شارع الملك فهد، برج الرفاهية"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B00] transition-colors resize-none"
                />
                <span className="text-[10px] text-gray-500 block mt-0.5">يُعبأ هذا العنوان تلقائياً عند إجراء طلب وجباتك الفاخرة.</span>
              </div>

              {/* Password update field */}
              <div className="space-y-1.5">
                <label htmlFor="settings-password" className="text-xs font-bold text-gray-300 block flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>تغيير كلمة المرور الجديدة (اختياري):</span>
                </label>
                <input
                  id="settings-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="اتركها فارغة لإبقاء كلمة المرور الحالية دون تغيير"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              {/* Notifications Sheet messages */}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center"
                >
                  {errorMsg}
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold text-center"
                >
                  {successMsg}
                </motion.div>
              )}

              {/* Action Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className="flex-1 py-3.5 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] hover:from-[#FF8533] hover:to-[#FF9D00] text-white text-xs font-extrabold rounded-xl shadow-lg shadow-[#FF6B00]/15 hover:shadow-[#FF6B00]/25 transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>جاري حفظ وتحصين البيانات...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-white stroke-[3.5]" />
                      <span>حفظ التعديلات الفاخرة ✓</span>
                    </>
                  )}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold rounded-xl border border-white/10 cursor-pointer"
                >
                  إلغاء
                </motion.button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
