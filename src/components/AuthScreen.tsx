/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  User, 
  Key, 
  ShieldCheck, 
  Sparkles, 
  ChefHat, 
  ShoppingBag, 
  Eye, 
  EyeOff,
  ArrowRight,
  Flame,
  Check
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: { 
    username: string; 
    name: string; 
    role: 'customer' | 'employee';
    avatarUrl?: string;
    phone?: string;
    address?: string;
  }) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [activePort, setActivePort] = useState<'customer' | 'employee'>('customer');
  const [isLogin, setIsLogin] = useState(true);
  
  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  
  // Visual states
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Email verification additional states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Password Reset states
  const [resetState, setResetState] = useState<'idle' | 'request' | 'verify' | 'new-password'>('idle');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!username.trim() || !password.trim()) {
      setErrorMsg('فضلاً املأ جميع الحقول المطلوبة');
      return;
    }

    if (!isLogin && activePort === 'customer' && !fullName.trim()) {
      setErrorMsg('فضلاً أدخل اسمك الكامل للتسجيل');
      return;
    }

    if (!isLogin && activePort === 'employee' && !fullName.trim()) {
      setErrorMsg('فضلاً أدخل اسمك الكامل للتسجيل');
      return;
    }

    setIsLoading(true);

    if (isLogin) {
      // REAL-TIME FIRESTORE LOGIN PROCESS
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType } = await import('../lib/firebase');
        
        const collName = activePort === 'customer' ? 'customers' : 'employees';
        const docRef = doc(db, collName, username.toLowerCase().trim());
        
        let docSnap;
        try {
          docSnap = await getDoc(docRef);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.GET, `${collName}/${username}`);
        }

        if (docSnap && docSnap.exists()) {
          const userData = docSnap.data();
          const { hashPassword } = await import('../lib/firebase');
          const hashedPassword = await hashPassword(password);
          
          if (userData.password === password || userData.password === hashedPassword) {
            setSuccessMsg('تم تسجيل الدخول بنجاح! في طريقنا للمطبخ...');
            setTimeout(() => {
              onLoginSuccess({
                username: userData.username,
                name: userData.name,
                role: activePort,
                avatarUrl: userData.avatarUrl,
                phone: userData.phone,
                address: userData.address
              });
            }, 1000);
          } else {
            setErrorMsg('كلمة المرور المدخلة غير صحيحة');
            setIsLoading(false);
          }
        } else {
          setErrorMsg('لم يتم العثور على هذا المستخدم في نظامنا السحابي');
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('حدث خطأ أثناء الاتصال بالنظام السحابي للمطعم');
        setIsLoading(false);
      }
    } else {
      // SIGNUP PROCESS
      if (activePort === 'customer') {
        // Validate if username is indeed a valid email format
        const isEmail = /\S+@\S+\.\S+/.test(username.trim());
        if (!isEmail) {
          setErrorMsg('فضلاً أدخل بريداً إلكترونياً صحيحاً لإتمام تفعيل حسابك (مثال: Client@example.com)');
          setIsLoading(false);
          return;
        }

        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db, handleFirestoreError, OperationType } = await import('../lib/firebase');
          const docRef = doc(db, 'customers', username.toLowerCase().trim());
          
          let docSnap;
          try {
            // Guarantee that Firestore lookup never hangs the UI by racing it against a fast 2.5s timeout
            docSnap = await Promise.race([
              getDoc(docRef),
              new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Firestore check timed out')), 2500))
            ]);
          } catch (dbErr) {
            console.warn('[Firestore Non-blocking Warning] Customer verification check timed out or errored:', dbErr);
            // We allow proceeding since the backend endpoint will also do security validation
          }

          if (docSnap && docSnap.exists()) {
            setErrorMsg('البريد الإلكتروني هذا مسجل مسبقاً، يرجى تسجيل الدخول أو استخدام بريد آخر');
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error('[Signup Check Error]', err);
        }

        try {
          const response = await fetch('/api/auth/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: username.toLowerCase().trim(),
              fullName: fullName.trim(),
              password
            })
          });

          const data = await response.json();
          if (response.ok && data.success) {
            setIsVerifying(true);
            if (data.simulated) {
              setSuccessMsg(`⚠️ تم تفعيل محاكاة البريد بنجاح! رمز التفعيل الخاص بك هو: ${data.code}`);
              setVerificationCode(data.code || '');
            } else {
              setSuccessMsg('تم إرسال رمز التحقق بنجاح لبريدك السحابي الحقيقي! يرجى التحقق من بريدك الإلكتروني.');
            }
          } else {
            setErrorMsg(data.error || 'فشل إرسال كود التحقق لبريدك الإلكتروني، يرجى المحاولة لاحقاً');
          }
        } catch (err) {
          setErrorMsg('فشل الاتصال بالخادم لإرسال كود التحقق الفاخر. يرجى التحقق من الاتصال');
        } finally {
          setIsLoading(false);
        }
      } else {
        // EMPLOYEE SIGNUP (REAL-TIME SATELLITE CONNECTION)
        try {
          const { doc, getDoc, setDoc } = await import('firebase/firestore');
          const { db, handleFirestoreError, OperationType, hashPassword } = await import('../lib/firebase');

          if (securityCode !== 'etoile123' && securityCode !== '1234') {
            setErrorMsg('رمز المرور الأمني للموظفين غير صحيح. يرجى توفير الرمز الصحيح لتوثيق صلاحياتك');
            setIsLoading(false);
            return;
          }

          const docRef = doc(db, 'employees', username.toLowerCase().trim());
          let docSnap;
          try {
            docSnap = await getDoc(docRef);
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.GET, `employees/${username}`);
          }

          if (docSnap && docSnap.exists()) {
            setErrorMsg('اسم المستخدم هذا مسجل مسبقاً في النظام الفاخر، اختر اسماً آخر');
            setIsLoading(false);
            return;
          }

          const hashedPassword = await hashPassword(password);
          const newUser = {
            username: username.toLowerCase().trim(),
            password: hashedPassword,
            name: fullName.trim()
          };

          try {
            await setDoc(docRef, newUser);
          } catch (dbErr) {
            handleFirestoreError(dbErr, OperationType.WRITE, `employees/${newUser.username}`);
          }

          setSuccessMsg('تم إنشاء حساب الموظف بنجاح في قاعدة البيانات الحقيقية! جاري تسجيل دخولك...');
          setTimeout(() => {
            onLoginSuccess({
              username: newUser.username,
              name: newUser.name,
              role: 'employee'
            });
          }, 1200);
        } catch (err: any) {
          setErrorMsg('حدث خطأ أثناء كتابة ملف الموظف في النظام السحابي');
          setIsLoading(false);
        }
      }
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setErrorMsg('الرجاء كتابة البريد الإلكتروني للمتابعة.');
      return;
    }
    
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('../lib/firebase');
      
      const collName = activePort === 'customer' ? 'customers' : 'employees';
      const docRef = doc(db, collName, resetEmail.toLowerCase().trim());
      
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.GET, `${collName}/${resetEmail}`);
      }

      if (!docSnap || !docSnap.exists()) {
        setErrorMsg('عذراً، هذا البريد غير مسجل كعميل أو موظف لدينا.');
        setIsLoading(false);
        return;
      }

      // If exists, make the API request to send email
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.toLowerCase().trim() })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(data.message);
        setResetState('verify');
        if (data.simulated && data.codeHint) {
          setResetCode(data.codeHint);
        }
      } else {
        setErrorMsg(data.error || 'عذراً، فشل إرسال رمز الأمان. تأكد من الاتصال.');
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء الاتصال بالخادم لمغادرة أوراق الاسترداد.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim()) {
       setErrorMsg('الرجاء كتابة رمز التحقق المستلم.');
       return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail.toLowerCase().trim(),
          code: resetCode.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(data.message);
        setResetState('new-password');
      } else {
        setErrorMsg(data.error || 'رمز الاستعادة غير صحيح أو منتهي الصلاحية.');
      }
    } catch (err) {
      setErrorMsg('حدث خطأ أثناء الاتصال بنظام الأمان والمصادقة للتحقق.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || newPassword.length < 3) {
      setErrorMsg('يجب أن تحتوي كلمة المرور الجديدة على 3 خانات على الأقل.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db, hashPassword } = await import('../lib/firebase');

      const hashedPassword = await hashPassword(newPassword);
      const collName = activePort === 'customer' ? 'customers' : 'employees';
      const docRef = doc(db, collName, resetEmail.toLowerCase().trim());

      await updateDoc(docRef, { password: hashedPassword });

      setSuccessMsg('✨ تم تأمين وتفعيل كلمة المرور الجديدة في حسابك بنجاح!');
      
      setTimeout(() => {
        setResetState('idle');
        setUsername(resetEmail);
        setIsLogin(true);
        setPassword('');
        setResetEmail('');
        setResetCode('');
        setNewPassword('');
        setErrorMsg('');
        setSuccessMsg('');
      }, 1500);

    } catch (err) {
      console.error(err);
      setErrorMsg('حدث خطأ أثناء حفظ كلمة المرور الجديدة في النظام السحابي.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!verificationCode.trim()) {
      setErrorMsg('الرجاء كتابة رمز التحقق لتفعيل بريدك الإلكتروني.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: username.toLowerCase().trim(),
          code: verificationCode.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(data.message || 'تم التحقق من بريدك الفاخر بنجاح!');
        
        // Persist verified user inside Firestore database customers records
        const { doc, setDoc } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType, hashPassword } = await import('../lib/firebase');
        
        const hashedPassword = await hashPassword(password);
        const newUser = {
          username: username.toLowerCase().trim(),
          password: hashedPassword,
          name: fullName.trim()
        };

        try {
          await setDoc(doc(db, 'customers', newUser.username), newUser);
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, `customers/${newUser.username}`);
        }

        setTimeout(() => {
          onLoginSuccess({
            username: newUser.username,
            name: newUser.name,
            role: 'customer'
          });
        }, 1200);
      } else {
        setErrorMsg(data.error || 'رمز التحقق المدخل غير صحيح! يرجى مراجعته وإعادة المحاولة.');
      }
    } catch (err) {
      setErrorMsg('فشل الاتصال بالخادم للتحقق من الكود المكتوب.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden select-none font-sans">
      {/* Dynamic Background Mesh Glows */}
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-[#FF6B00]/10 blur-[130px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        
        {/* Brand Banner - Rotated Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="w-16 h-16 bg-gradient-to-tr from-[#FF6B00] to-[#FF9D00] rounded-2xl rotate-12 flex items-center justify-center shadow-[0_0_25px_rgba(255,107,0,0.45)] mb-4"
          >
            <span className="text-white font-black text-2xl tracking-tighter">LUX</span>
          </motion.div>
          <motion.h1 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="font-display font-black text-3xl text-white block uppercase tracking-[0.05em]"
          >
            L'ÉTOILE<span className="text-[#FF6B00]">BITE</span>
          </motion.h1>
          <span className="font-mono text-[10px] text-white/40 uppercase tracking-[0.3em] font-medium block mt-1">
            Gourmet Experience & Haute Cuisine
          </span>
        </div>

        {/* Floating Luxury Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="glassmorphism rounded-3xl p-8 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          {/* Card Accent Slider Line */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-[#FF6B00] to-transparent" />

          {/* Secure Gate Selector Tabs */}
          <div className="bg-white/5 p-1 rounded-full border border-white/10 flex items-center mb-8">
            <button
              onClick={() => {
                setActivePort('customer');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 ${
                activePort === 'customer'
                  ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/20'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>عملاء المطعم</span>
            </button>
            <button
              onClick={() => {
                setActivePort('employee');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center space-x-2 ${
                activePort === 'employee'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>طاقم الموظفين</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {resetState === 'request' ? (
              <motion.div
                key="reset-request-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="text-right"
                dir="rtl"
              >
                {/* Request Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 justify-start">
                    <Sparkles className="w-5 h-5 text-[#FF6B00]" />
                    <span>نسيت كلمة المرور</span>
                  </h2>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed text-right">
                    أدخل البريد الإلكتروني المسجل لدينا وسنرسل لك رمز تحقق سريع لإعادة تعيين كلمة المرور بكل أمان وضمان سريّ للبيانات.
                  </p>
                </div>

                {/* Status Alerts */}
                {errorMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6"
                  >
                    <Flame className="w-4 h-4 flex-shrink-0 text-red-500" />
                    <p>{errorMsg}</p>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6"
                  >
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    <p>{successMsg}</p>
                  </motion.div>
                )}

                <form onSubmit={handleResetRequest} className="space-y-4">
                  <div className="space-y-1.5 font-sans">
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold text-right">البريد الإلكتروني المسجل</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input 
                        type="email"
                        required
                        placeholder="example@domain.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={isLoading}
                        className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white focus:border-[#FF6B00]/40 transition-all placeholder:text-white/20"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl text-xs font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-orange-500 hover:to-amber-500 shadow-orange-500/10"
                  >
                    <span>{isLoading ? 'جاري التحقق وإرسال الرمز...' : 'إرسال رمز التوثيق الفاخر'}</span>
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                <div className="mt-6 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setResetState('idle');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-white/40 hover:text-white transition-colors duration-300 cursor-pointer"
                  >
                    تذكرت كلمة المرور؟ <strong className="text-[#FF6B00] hover:underline">الرجوع لتسجيل الدخول</strong>
                  </button>
                </div>
              </motion.div>
            ) : resetState === 'verify' ? (
              <motion.div
                key="reset-verify-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="text-right"
                dir="rtl"
              >
                {/* Verify Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 justify-start">
                    <Key className="w-5 h-5 text-[#FF6B00] animate-bounce" />
                    <span>رمز استعادة الأمان</span>
                  </h2>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed text-right">
                    الرجاء إدخال الرمز المكون من 6 أرقام المرسل إلى: <strong className="font-mono text-white">{resetEmail}</strong> لتأكيد ملكيتك المباشرة للحساب وسحب الأمان.
                  </p>
                </div>

                {/* Status Alerts */}
                {errorMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6"
                  >
                    <Flame className="w-4 h-4 flex-shrink-0 text-red-500" />
                    <p>{errorMsg}</p>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6"
                  >
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    <p>{successMsg}</p>
                  </motion.div>
                )}

                <form onSubmit={handleResetVerify} className="space-y-4">
                  <div className="space-y-1.5 font-sans">
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold text-right">رمز التحقق (6 أرقام)</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input 
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                        disabled={isLoading}
                        className="w-full bg-white/5 border border-white/10 py-4.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-2xl font-black font-mono tracking-[1em] text-center text-[#FF6B00] focus:border-[#FF6B00]/40 transition-all placeholder:text-white/10 pl-4"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl text-xs font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-orange-500 hover:to-amber-500 shadow-orange-500/10"
                  >
                    <span>{isLoading ? 'جاري توثيق الرمز...' : 'تأكيد الرمز ومتابعة الاسترداد'}</span>
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                <div className="mt-6 text-center text-xs flex justify-between items-center text-gray-400">
                  <button
                    type="button"
                    onClick={() => {
                      setResetState('request');
                      setResetCode('');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="hover:text-white transition-colors cursor-pointer text-[11px] underline"
                  >
                    تغيير البريد الإلكتروني
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsLoading(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                      try {
                        const response = await fetch('/api/auth/reset-password-request', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: resetEmail.toLowerCase().trim() })
                        });
                        const data = await response.json();
                        if (response.ok && data.success) {
                          setSuccessMsg('✨ تم إعادة إرسال الرمز مجدداً إلى بريدك بنجاح!');
                          if (data.simulated && data.codeHint) {
                            setResetCode(data.codeHint);
                          }
                        } else {
                          setErrorMsg(data.error);
                        }
                      } catch {
                        setErrorMsg('فشل الاتصال بالخادم لإعادة الإرسال.');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="text-[#FF6B00] hover:underline cursor-pointer font-bold text-[11px]"
                  >
                    إعادة إرسال الرمز؟
                  </button>
                </div>
              </motion.div>
            ) : resetState === 'new-password' ? (
              <motion.div
                key="reset-new-password-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="text-right"
                dir="rtl"
              >
                {/* Reset Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2 justify-start">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>كلمة المرور الجديدة</span>
                  </h2>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed text-right">
                    تم التحقق من هويتك بنجاح! نرجو كتابة كلمة المرور الجديدة الفاخرة لتثبيتها في حسابك الآمن.
                  </p>
                </div>

                {/* Status Alerts */}
                {errorMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6"
                  >
                    <Flame className="w-4 h-4 flex-shrink-0 text-red-500" />
                    <p>{errorMsg}</p>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6"
                  >
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    <p>{successMsg}</p>
                  </motion.div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5 font-sans">
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold text-right">كلمة المرور الجديدة</label>
                    <div className="relative font-sans">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input 
                        type={showNewPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full bg-white/5 border border-white/10 pl-11 pr-12 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white focus:border-[#FF6B00]/40 transition-all placeholder:text-white/20"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl text-xs font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer bg-gradient-to-r from-emerald-600 to-[#FF6B00] hover:from-[#FF6B00] hover:to-[#FF8533]"
                  >
                    <span>{isLoading ? 'جاري تثبيت الرمز...' : 'تثبيت وتأمين كلمة المرور الجديدة 🌟'}</span>
                    {!isLoading && <Check className="w-4 h-4" />}
                  </button>
                </form>
              </motion.div>
            ) : isVerifying ? (
              <motion.div
                key="verification-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
              >
                {/* Verification Header */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-[#FF6B00] animate-bounce" />
                    <span>تأكيد الحساب الفاخر</span>
                  </h2>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed text-right">
                    لقد أرسلنا رمز تحقق أمني لبريدك الإلكتروني <strong>{username}</strong>. يرجى كتابة الرمز أدناه لتفعيل حسابك وتفعيل صلاحيات الذواقة بالكامل.
                  </p>
                </div>

                {/* Status / Notifications */}
                {errorMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6"
                  >
                    <Flame className="w-4 h-4 flex-shrink-0 text-red-500" />
                    <p>{errorMsg}</p>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6 animate-pulse"
                  >
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    <p>{successMsg}</p>
                  </motion.div>
                )}

                {/* Verification Form */}
                <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold">رمز التفعيل المكون من 6 أرقام</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input 
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        disabled={isLoading}
                        className="w-full bg-white/5 border border-white/10 py-4.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-2xl font-black font-mono tracking-[1em] text-center text-[#FF6B00] focus:border-[#FF6B00]/40 transition-all placeholder:text-white/10 pl-4"
                      />
                    </div>
                  </div>

                  {/* Submit Validation Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl text-xs font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer bg-gradient-to-r from-[#FF6B00] to-orange-500 hover:from-orange-500 hover:to-amber-500 shadow-orange-500/10"
                  >
                    <span>{isLoading ? 'جاري توثيق الرمز وتفعيل الحساب...' : 'تأكيد الحساب والولوج'}</span>
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                {/* Back Button to cancel/edit signup */}
                <div className="mt-6 text-center text-xs">
                  <button
                    onClick={() => {
                      setIsVerifying(false);
                      setErrorMsg('');
                      setSuccessMsg('');
                      setVerificationCode('');
                    }}
                    className="text-white/40 hover:text-white transition-colors duration-300 cursor-pointer"
                  >
                    مواجهة بريد إلكتروني بديل؟ <strong className="text-[#FF6B00] hover:underline">رجوع لتعديل البيانات</strong>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`${activePort}-${isLogin}`}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
              >
                {/* Form Title */}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {activePort === 'customer' ? (
                      <>
                        <Sparkles className="w-5 h-5 text-[#FF6B00]" />
                        <span>{isLogin ? 'بوابة الذواقة - ورود' : 'الانضمام كذواق جديد'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 text-amber-500" />
                        <span>{isLogin ? 'تسجيل دخول الموظفين' : 'بناء ملف موظف جديد'}</span>
                      </>
                    )}
                  </h2>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">
                    {isLogin 
                      ? 'أهلاً بك مجدداً في محراب التميز الغذائي. سجل دخولك للمتابعة.' 
                      : 'ابدأ دورتك الفاخرة بالانضمام لمنظومتنا المتكاملة كعميل أو طاهٍ.'}
                  </p>
                </div>

                {/* Notification Toasts / Errors */}
                {errorMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6"
                  >
                    <Flame className="w-4 h-4 flex-shrink-0 animate-bounce text-red-500" />
                    <p>{errorMsg}</p>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2 mb-6 animate-pulse"
                  >
                    <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                    <p>{successMsg}</p>
                  </motion.div>
                )}

                {/* Core Form */}
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  
                  {/* Full name on registration */}
                  {!isLogin && (
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold">الاسم الكامل / Full Name</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input 
                          type="text"
                          placeholder="الأستاذ / الشيف..."
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={isLoading}
                          className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white focus:border-[#FF6B00]/40 transition-all placeholder:text-white/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold">
                      {activePort === 'customer' ? 'البريد الإلكتروني / Email Address' : 'اسم المستخدم / Username'}
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input 
                        type="text"
                        placeholder={activePort === 'customer' ? "example@domain.com" : "e.g. alex"}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                        className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white focus:border-[#FF6B00]/40 transition-all placeholder:text-white/20"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold">كلمة المرور / Password</label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetState('request');
                            setResetEmail(username || '');
                            setErrorMsg('');
                            setSuccessMsg('');
                          }}
                          className="text-[10px] text-[#FF6B00] hover:underline cursor-pointer"
                        >
                          نسيت كلمة المرور؟
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input 
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full bg-white/5 border border-white/10 pl-11 pr-12 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white focus:border-[#FF6B00]/40 transition-all placeholder:text-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-white/30 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Secure Security Code field only on Staff Registration */}
                  {!isLogin && activePort === 'employee' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-mono text-white/50 uppercase tracking-wider font-bold">رمز الموظف الأمني / Passcode</label>
                        <span className="text-[10px] text-amber-500/80">(Demo Code is `etoile123` or `1234`)</span>
                      </div>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                        <input 
                          type="password"
                          placeholder="أدخل رمز توثيق الموظفين"
                          value={securityCode}
                          onChange={(e) => setSecurityCode(e.target.value)}
                          disabled={isLoading}
                          className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm text-white focus:border-amber-500/40 transition-all placeholder:text-white/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3.5 mt-2 rounded-xl text-xs font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer ${
                      activePort === 'customer'
                        ? 'bg-[#FF6B00] hover:bg-[#FF8533] shadow-[#FF6B00]/10 hover:shadow-[#FF8533]/25'
                        : 'bg-amber-600 hover:bg-amber-500'
                    }`}
                  >
                    <span>{isLoading ? 'جاري التحقق من أوراق الاعتماد...' : isLogin ? 'ولوج آمن للمخدّم' : 'إنشاء حساب جديد كلياً'}</span>
                    {!isLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>

                {/* Switch signup/login */}
                <div className="mt-6 text-center text-xs">
                  <span className="text-white/40">
                    {isLogin ? 'ليس لديك حساب حتى الآن؟' : 'هل تمتلك حساباً مسبقاً؟'}
                  </span>{' '}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[#FF6B00] font-bold hover:underline cursor-pointer ml-1"
                  >
                    {isLogin ? 'أنشئ حساباً الآن' : 'سجل دخولك'}
                  </button>
                </div>

                {/* Demo Assist Box */}
                <div className="mt-8 p-3 bg-white/5 rounded-xl border border-white/10 text-[10px] text-white/40 font-mono text-center">
                  <span>مفتاح الدخول التجريبي: <strong>123</strong> | الموظف: <strong>staff</strong> | العميل: <strong>alex</strong></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
