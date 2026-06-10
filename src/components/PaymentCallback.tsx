import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');

  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState<boolean | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [statusDetail, setStatusDetail] = useState<string>('WAITING');

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setPaid(false);
      return;
    }

    // Set a timeout of 15 seconds to abort waiting if the webhook takes too long
    const timeoutId = setTimeout(() => {
      setLoading(false);
      if (paid === null) {
        setPaid(false);
        setStatusDetail('TIMEOUT');
      }
    }, 15000);

    // Subscribe to the order document real-time
    const unsubscribe = onSnapshot(
      doc(db, 'orders', orderId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setOrderDetails(data);
          
          if (data.paid) {
            setPaid(true);
            setLoading(false);
            setStatusDetail('CAPTURED');
            clearTimeout(timeoutId);
          } else if (data.paymentStatusDetail && data.paymentStatusDetail !== 'CAPTURED') {
            setStatusDetail(data.paymentStatusDetail);
            // Some non-captured final failure states
            if (['FAILED', 'CANCELLED', 'DECLINED', 'RESTRICTED'].includes(data.paymentStatusDetail)) {
              setPaid(false);
              setLoading(false);
              clearTimeout(timeoutId);
            }
          }
        } else {
          // Document does not exist yet
          console.log('[PaymentCallback] Order document does not exist yet...');
        }
      },
      (error) => {
        console.error('[PaymentCallback] Firestore subscription error:', error);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [orderId, paid]);

  return (
    <div id="payment-callback-view" className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#0A0A0A]">
      {/* Background radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF6B00]/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl relative z-10 text-center shadow-[0_30px_70px_rgba(0,0,0,0.8)]"
      >
        {loading ? (
          <div className="space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-white/5" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                className="absolute inset-0 rounded-full border-4 border-t-[#FF6B00] border-r-transparent border-b-transparent border-l-transparent"
              />
              <Loader2 className="w-8 h-8 text-[#FF6B00] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-white font-bold text-lg font-sans">تأكيد عملية الدفع</h3>
              <p className="text-gray-400 text-xs leading-relaxed max-w-xs mx-auto">
                نحن بانتظار استجابة بوابة الدفع الآمنة لتأكيد طلبك. فضلاً لا تغلق الصفحة...
              </p>
            </div>
            <div className="font-mono text-[10px] text-gray-500 bg-white/5 py-1 px-3 rounded-full inline-block">
              ORDER ID: {orderId}
            </div>
          </div>
        ) : paid ? (
          <div className="space-y-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-white font-bold text-xl font-sans">تم السداد بنجاح! 🎉</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                شكراً لثقتك بنا. تم استلام السداد وتأكيد طلبك بنجاح من المطبخ وعملية التحضير بدأت الآن.
              </p>
            </div>

            {orderDetails && (
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-right space-y-2.5">
                <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-gray-400">Order ID</span>
                  <span className="text-white font-mono font-bold">{orderId}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-gray-400">Customer Name</span>
                  <span className="text-white font-medium">{orderDetails.customerName}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1">
                  <span className="text-gray-400">Total Deducted</span>
                  <span className="text-[#FF6B00] font-mono">${orderDetails.total?.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full py-4 bg-[#FF6B00] hover:bg-[#FF8533] rounded-xl text-xs font-bold text-white shadow-[0_4px_2px_rgba(255,107,0,0.2)] transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>تابع تتبع طلباتك</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <XCircle className="w-16 h-16 text-red-500 mx-auto drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-white font-bold text-lg font-sans">تعذر تأكيد الدفع</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                {statusDetail === 'TIMEOUT' 
                  ? 'انتهت مهلة الانتظار قبل اكتمال إرسال التأكيد من البنك. إذا خصم المبلغ من حسابك، سيتم تفعيل الطلب تلقائياً.'
                  : 'لم يكتمل تفويض الدفع ببطاقتك، يرجى مراجعة رصيد الحساب أو الدفع بطريقة بديلة.'}
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                العودة للرئيسية وإنشاء طلب جديد
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
