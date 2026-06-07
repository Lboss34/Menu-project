/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  Star, 
  Clock, 
  Search, 
  Sparkles, 
  Flame, 
  ShieldCheck, 
  CreditCard, 
  Truck, 
  CheckCircle, 
  ArrowLeft,
  X,
  ChefHat,
  Inbox
} from 'lucide-react';
import { MenuItem, CartItem, Order, FoodCategory, Review, OrderStatus } from '../types';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const categoryEmojis: Record<string, string> = {
  All: '🍽️',
  Burgers: '🍔',
  Pizzas: '🍕',
  Starters: '🥗',
  Desserts: '🍰',
  Drinks: '🍹'
};

interface CustomerViewProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  onPlaceOrder: (order: Omit<Order, 'id' | 'createdAt'>) => void;
  menuItems: MenuItem[];
  orders: Order[];
  currentUser: { 
    username: string; 
    name: string; 
    role: 'customer' | 'employee';
    avatarUrl?: string;
    phone?: string;
    address?: string;
  } | null;
  reviews: Review[];
  onAddReview: (review: Review) => void;
  onDeleteOrder: (orderId: string) => void;
}

interface OrderRatingFormProps {
  order: Order;
  onAddReview: (review: Review) => void;
  onDeleteOrder: (orderId: string) => void;
}

function OrderRatingForm({ order, onAddReview, onDeleteOrder }: OrderRatingFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);

    const newReview: Review = {
      id: `R-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: order.id,
      customerName: order.customerName,
      rating: rating,
      comment: comment,
      createdAt: new Date().toISOString(),
      items: order.items.map(i => i.name)
    };

    onAddReview(newReview);
    
    setTimeout(() => {
      onDeleteOrder(order.id);
      setSubmitting(false);
    }, 450);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-right">
      <div className="flex items-center space-x-2 space-x-reverse justify-start">
        <span className="text-xs text-gray-300">تقييمك الشخصي:</span>
        <div className="flex items-center space-x-0.5 space-x-reverse">
          {[1, 2, 3, 4, 5].map((star) => (
            <motion.button
              type="button"
              key={star}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(null)}
              className="text-amber-400 p-0.5 cursor-pointer focus:outline-none"
            >
              <Star 
                className={`w-5 h-5 transition-all duration-150 ${
                  star <= (hoverRating ?? rating)
                    ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' 
                    : 'text-white/20'
                }`} 
              />
            </motion.button>
          ))}
        </div>
        <span className="text-xs font-mono font-black text-amber-400">({rating} / 5)</span>
      </div>

      <div className="relative">
        <textarea
          required
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="كيف كانت تجربتك مع هذه الوجبة الفاخرة؟ شاركنا رأيك الصادق لتحسين الطهي..."
          className="w-full bg-black/40 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00]/40 text-xs text-white placeholder-gray-500 focus:border-[#FF6B00]/40 transition-colors resize-none text-right"
          dir="rtl"
        />
      </div>

      <div className="flex items-center justify-end">
        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: submitting ? 1 : 1.02 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
          className="px-5 py-2.5 bg-[#FF6B00] hover:bg-[#FF8533] text-white text-[11px] font-bold rounded-xl shadow-lg shadow-[#FF6B00]/20 hover:shadow-[#FF6B00]/30 transition-all cursor-pointer flex items-center justify-center space-x-1.5 space-x-reverse disabled:opacity-40"
        >
          {submitting ? (
            <>
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>جاري إرسال تقييمك...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>إرسال وتطهير قائمة التتبع ✓</span>
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}

export default function CustomerView({ 
  cart, 
  setCart, 
  isCartOpen, 
  setIsCartOpen, 
  onPlaceOrder,
  menuItems,
  orders,
  currentUser,
  reviews,
  onAddReview,
  onDeleteOrder
}: CustomerViewProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState('');
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  // Checkout Form State - defaulted to Cash on Delivery
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'Cash on Delivery'>('Cash on Delivery');

  // Synchronize router state with checkout step
  useEffect(() => {
    if (location.pathname === '/checkout') {
      setIsCheckoutStep(true);
      setIsCartOpen(true);
    } else {
      setIsCheckoutStep(false);
    }
  }, [location.pathname, setIsCartOpen]);

  // Auto-feed user session fields
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name);
      setCustomerEmail(currentUser.username);
      if (currentUser.phone) {
        setCustomerPhone(currentUser.phone);
      }
      if (currentUser.address) {
        setDeliveryAddress(currentUser.address);
      }
    }
  }, [currentUser]);

  // Filter items dynamically
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, menuItems]);

  // Filter and sort active tracking orders for the logged-in customer
  const myOrders = useMemo(() => {
    if (!currentUser) return [];
    
    // If the logged-in user is an employee/admin, do not display active tracking lists in "المعاينة" (Preview)
    if (currentUser.role === 'employee') return [];
    
    // Retrieve device-specific order tracking IDs
    let localSavedIds: string[] = [];
    try {
      const saved = localStorage.getItem('etoile_placed_order_ids');
      if (saved) {
        localSavedIds = JSON.parse(saved);
      }
    } catch (e) {
      console.warn(e);
    }

    return orders.filter((order) => {
      const matchesUser = order.customerName.toLowerCase() === currentUser.name.toLowerCase();
      const matchesLocalId = localSavedIds.includes(order.id);
      return matchesUser || matchesLocalId;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, currentUser]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) => 
          i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const handleAddToCartWithAnimation = (item: MenuItem) => {
    addToCart(item);
    setAddingItemId(item.id);
    setTimeout(() => {
      setAddingItemId((prev) => (prev === item.id ? null : prev));
    }, 1200);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev.map((i) => {
        if (i.menuItem.id === itemId) {
          const newQty = i.quantity + delta;
          return { ...i, quantity: newQty };
        }
        return i;
      }).filter((i) => i.quantity > 0);
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItem.id !== itemId));
  };

  const subtotal = useMemo(() => {
    return cart.reduce((acc, curr) => acc + curr.menuItem.price * curr.quantity, 0);
  }, [cart]);

  const deliveryFee = subtotal > 40 ? 0 : 4.50;
  const grandTotal = subtotal + deliveryFee;

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryAddress) return;

    const orderItems = cart.map(item => ({
      id: item.menuItem.id,
      name: item.menuItem.name,
      quantity: item.quantity,
      price: item.menuItem.price
    }));

    // Trigger local callback to append order and sync dashboard
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId = `TX-${randomSuffix}`;
    
    onPlaceOrder({
      customerName,
      phone: customerPhone,
      address: deliveryAddress,
      notes: deliveryNotes,
      items: orderItems,
      total: grandTotal,
      status: 'Pending',
      paymentMethod,
      customerEmail: customerEmail.trim() || currentUser?.username || ''
    });

    setLastPlacedOrderId(newId);
    setOrderCompleted(true);
    setIsCheckoutStep(false);
    setCart([]); // Clear cart
  };

  const handleClosedSuccess = () => {
    setOrderCompleted(false);
    setIsCartOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setDeliveryNotes('');
    if (location.pathname === '/checkout') {
      navigate('/');
    }
  };

  const scrollToMenu = () => {
    const element = document.getElementById('menu-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#050505] text-gray-200 min-h-screen font-sans pb-16">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-24 flex items-center px-4 md:px-8 border-b border-white/10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#241308] via-[#050505] to-[#050505]">
        
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-[#FF6B00]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[200px] h-[200px] md:w-[400px] md:h-[400px] bg-white/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center space-x-2 bg-[#FF6B00]/10 border border-[#FF6B00]/25 px-3 py-1.5 rounded-full text-[#FF6B00]">
              <Sparkles className="w-4 h-4" />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold">Introducing Gold Standard Dining</span>
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight">
              Epicurean Masterpieces, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF9D00] text-glow-orange">
                Delivered in Luxury
              </span>
            </h1>
            
            <p className="text-gray-400 text-base md:text-lg max-w-lg leading-relaxed">
              Indulge in artisanal burgers, wood-fired truffle pizzas, and golden desserts from Chef-owner L'Étoile. Taste pure luxury, delivered straight to your doorstep.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
              <button
                onClick={scrollToMenu}
                className="px-8 py-4 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white font-medium text-center shadow-[0_4px_25px_rgba(255,107,0,0.3)] hover:shadow-[0_4px_35px_rgba(255,107,0,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer text-glow-orange"
              >
                Order Culinary Masterworks
              </button>
              
              <div className="flex items-center space-x-3 justify-center sm:justify-start">
                <div className="flex -space-x-3">
                  {['reviewer-a', 'reviewer-b', 'reviewer-c', 'reviewer-d'].map((reviewerId, i) => (
                    <div key={reviewerId} className="w-8 h-8 rounded-full border-2 border-[#07070a] overflow-hidden bg-gray-800">
                      <img 
                        src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80&sig=${i}`} 
                        alt="User review" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-left">
                  <div className="flex items-center text-gold-400">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-mono text-xs font-bold ml-1">4.9 / 5</span>
                  </div>
                  <span className="text-xs text-gray-400">From 10,000+ Gourmands</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hero Decorative Plate */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative flex justify-center"
          >
            <div className="relative w-80 h-80 sm:w-96 sm:h-96 md:w-[480px] md:h-[480px] rounded-full p-2 bg-gradient-to-tr from-[#FF6B00]/40 to-transparent flex items-center justify-center glow-orange">
              <div className="absolute inset-0 bg-[#050505] rounded-full -z-10" />
              {/* Dynamic Rotating Plate Image */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
                className="w-full h-full rounded-full overflow-hidden border border-white/10 relative"
              >
                <img 
                  src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80" 
                  alt="Epicurean Burger" 
                  className="w-full h-full object-cover select-none scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/75 via-transparent to-[#050505]/10" />
              </motion.div>

              {/* Floating Review Label */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute bottom-6 right-2 border border-white/10 py-2 px-4 rounded-2xl shadow-2xl flex items-center space-x-3 glassmorphism max-w-[200px]"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-brand-orange" />
                </div>
                <div>
                  <span className="block text-[11px] text-gray-400 font-medium leading-none">Best Seller Today</span>
                  <span className="block text-xs font-bold text-white mt-1 leading-none">Truffle Smash</span>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 2. Dynamic Menu & Discover Section */}
      <section id="menu-section" className="max-w-7xl mx-auto px-4 md:px-8 pt-16">
        
        {/* Live Order Journey Stepper Tracker */}
        {myOrders.length > 0 && (
          <div className="mb-14 bg-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B00] via-amber-500 to-[#FF6B00]/20" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-mono text-[10px] text-[#FF6B00] uppercase tracking-widest font-bold">مركز تتبع الطلبات المباشر</span>
                </div>
                <h3 className="font-display font-extrabold text-xl md:text-2xl text-white mt-1">مسيرة أطباقك الفاخرة</h3>
                <p className="text-xs text-gray-400 mt-0.5">تابع تقدم تحضير وتوصيل وجباتك الطازجة مباشرةً من المطبخ</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 py-1.5 px-3 rounded-lg text-xs font-mono text-gray-300">
                نشط حالياً: <strong className="text-[#FF6B00]">{myOrders.filter(o => o.status !== 'Delivered').length} طلبات</strong>
              </div>
            </div>

            <div className="space-y-8 divide-y divide-white/5">
              {myOrders.map((order, oIdx) => {
                // Steps configurations
                const steps = [
                  { status: 'Pending', labelAr: 'مستلم ومسجل', labelEn: 'Order Received', desc: 'بانتظار موافقة الطاهي لبدء الطبخ' },
                  { status: 'Preparing', labelAr: 'قيد الطبخ والتحضير', labelEn: 'Preparing', desc: 'إعداد وجبتكم بأيدي طهاتنا المتميزين' },
                  { status: 'Out for Delivery', labelAr: 'قيد التوصيل الفاخر', labelEn: 'In Transit', desc: 'طلبك مع السائق الشريك في طريقه إليك' },
                  { status: 'Delivered', labelAr: 'تم التوصيل بنجاح', labelEn: 'Delivered', desc: 'بالهناء والعافية والصحة' }
                ];

                const getCurrentStepIndex = (status: OrderStatus) => {
                  switch (status) {
                    case 'Pending': return 0;
                    case 'Preparing': return 1;
                    case 'Out for Delivery': return 2;
                    case 'Delivered': return 3;
                    default: return 0;
                  }
                };

                const currentStepIdx = getCurrentStepIndex(order.status);

                return (
                  <div key={order.id} className={`pt-6 ${oIdx === 0 ? 'pt-0' : ''} space-y-6`}>
                    {/* Order Meta Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-3 space-x-reverse font-sans">
                        <span className="font-mono font-black text-sm text-[#FF6B00] bg-[#FF6B00]/10 border border-[#FF6B00]/25 px-2.5 py-1 rounded-lg">
                          {order.id}
                        </span>
                        <span className="text-gray-400 font-medium">
                          {new Date(order.createdAt).toLocaleTimeString('ar-SA')}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-300 font-bold font-mono">${order.total.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">طريقة الدفع وطبقة الأمان:</span>
                        <span className="font-bold text-[#FF6B00] bg-[#FF6B00]/5 border border-[#FF6B00]/20 px-2 py-0.5 rounded text-[10px]">
                          {order.paymentMethod === 'Cash on Delivery' ? 'الدفع نقداً بعد الاستلام' : 'بطاقة ائتمان'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Stepper Row */}
                    <div className="relative pt-4 pb-2">
                      {/* Desktop Connecting Line */}
                      <div className="absolute top-[26px] left-[6%] right-[6%] h-1 bg-white/5 rounded hidden md:block z-0" />
                      {/* Highlight Active Line */}
                      <div 
                        className="absolute top-[26px] left-[6%] h-1 bg-gradient-to-r from-[#FF6B00] to-[rgb(234,179,8)] rounded hidden md:block z-0 shadow-[0_0_10px_rgba(255,107,0,0.5)] transition-all duration-1000" 
                        style={{ width: `${(currentStepIdx / 3) * 88}%` }}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                        {steps.map((step, idx) => {
                          const isCompleted = idx < currentStepIdx;
                          const isActive = idx === currentStepIdx;

                          let stepIcon = <Clock className="w-5 h-5" />;
                          if (idx === 1) stepIcon = <ChefHat className="w-5 h-5" />;
                          if (idx === 2) stepIcon = <Truck className="w-5 h-5" />;
                          if (idx === 3) stepIcon = <CheckCircle className="w-5 h-5" />;

                          return (
                            <div key={step.status} className="flex md:flex-col items-center gap-4 md:gap-2 text-right md:text-center">
                              
                              {/* Circle Orb */}
                              <div className="relative">
                                <motion.div
                                  animate={isActive ? { scale: [1, 1.1, 1], boxShadow: ['0 0 10px rgba(255,107,0,0.2)', '0 0 25px rgba(255,107,0,0.6)', '0 0 10px rgba(255,107,0,0.2)'] } : {}}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 relative ${
                                    isActive 
                                      ? 'bg-[#050505] border-[#FF6B00] text-[#FF6B00]' 
                                      : isCompleted 
                                      ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-[0_0_15px_rgba(255,107,0,0.2)]'
                                      : 'bg-[#050505] border-white/15 text-gray-500'
                                  }`}
                                >
                                  {stepIcon}
                                </motion.div>
                                
                                {/* Mobile connecting line (vertical) under the circle */}
                                {idx < 3 && (
                                  <div className={`absolute top-12 left-6 -translate-x-1/2 w-0.5 h-7 md:hidden z-0 transition-colors duration-500 ${
                                    idx < currentStepIdx ? 'bg-[#FF6B00]' : 'bg-white/10'
                                  }`} />
                                )}
                                
                                {/* Glow indicator line on mobile */}
                                {isActive && (
                                  <span className="absolute -inset-1 rounded-full bg-[#FF6B00]/20 blur-md -z-10 animate-pulse" />
                                )}
                              </div>

                              {/* Step labels */}
                              <div className="space-y-0.5 flex-1 md:flex-initial">
                                <span className={`block font-bold text-xs ${isActive ? 'text-[#FF6B00]' : isCompleted ? 'text-white' : 'text-gray-500'}`}>
                                  {step.labelAr}
                                </span>
                                <span className="block text-[10px] text-gray-400 font-mono tracking-wide uppercase">
                                  {step.labelEn}
                                </span>
                                <span className={`block text-[10px] ${isActive ? 'text-white/80 animate-pulse font-medium' : 'text-gray-500'}`}>
                                  {step.desc}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary details list */}
                    <div className="bg-white/[0.015] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item) => (
                          <span key={item.id || item.name} className="bg-white/5 border border-white/10 px-2 py-1 rounded text-[10.5px] text-gray-300">
                            {item.name} <strong className="text-[#FF6B00]">x{item.quantity}</strong>
                          </span>
                        ))}
                      </div>
                      <div className="text-gray-400">
                        موقع التوصيل الفاخر: <strong className="text-white">{order.address}</strong>
                      </div>
                    </div>

                    {order.status === 'Delivered' && (
                      <div className="relative overflow-hidden rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-5 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 text-right w-full">
                            <span className="inline-flex items-center space-x-1 space-x-reverse bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-emerald-400 text-[10px] font-bold">
                              <Star className="w-3 h-3 fill-current animate-spin-slow" />
                              <span>تهانينا! تم توصيل طلبك بنجاح</span>
                            </span>
                            <h4 className="font-display font-bold text-sm text-white mt-2">تفعيل تقييم التجربة الطهوية الفاخرة</h4>
                            <p className="text-[11px] text-gray-400">شاركنا رأيك في الوجبة الفاخرة التي أعدّها طاهينا؛ وتلقائياً سنقوم بتنظيف قائمة التتبع لتنعم بواجهة نظيفة.</p>
                          </div>
                        </div>
                        <OrderRatingForm 
                          order={order}
                          onAddReview={onAddReview}
                          onDeleteOrder={onDeleteOrder}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Interactive Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-2">
            <span className="font-mono text-xs text-[#FF6B00] font-bold uppercase tracking-[0.25em]">Our Offerings</span>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white">
              Savor the Culinary Artistry
            </h2>
          </div>

          {/* Search Box */}
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search dishes, descriptions, secrets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 focus:border-[#FF6B00]/40 text-sm transition-all text-white placeholder-gray-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-10 -mx-4 px-4 scrollbar-hide">
          {['All', 'Burgers', 'Pizzas', 'Starters', 'Desserts', 'Drinks'].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as FoodCategory | 'All')}
              className={`px-5 py-3 rounded-xl text-xs font-display font-bold transition-all duration-300 flex-shrink-0 cursor-pointer flex items-center space-x-2 ${
                selectedCategory === category 
                  ? 'bg-white/10 border border-[#FF6B00]/40 text-[#FF6B00] shadow-[0_0_15px_rgba(255,107,0,0.15)] scale-[1.02]' 
                  : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              <span className="text-sm">{categoryEmojis[category]}</span>
              <span>{category === 'All' ? 'All Selection' : category}</span>
            </button>
          ))}
        </div>

        {/* Menu Listings */}
        <AnimatePresence mode="popLayout">
          {filteredMenuItems.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 px-4 glassmorphism rounded-2xl max-w-xl mx-auto"
            >
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-white font-display font-bold text-lg mb-1">No delicacies found</h3>
              <p className="text-gray-400 text-sm">We couldn't find any dishes matching "{searchQuery}". Try browsing categories!</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} 
                className="mt-6 px-5 py-2.5 bg-brand-orange/10 border border-brand-orange/20 rounded-xl text-xs text-brand-orange font-semibold hover:bg-brand-orange/20 transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            </motion.div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredMenuItems.map((item) => (
                <motion.article
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  whileHover={{ y: -8, boxShadow: '0 12px 30px rgba(255, 107, 0, 0.15)' }}
                  key={item.id}
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group flex flex-col h-full hover:border-[#FF6B00]/40 hover:bg-white/10 transition-all cursor-pointer duration-300"
                >
                  {/* Image wrapper */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-90" />
                    
                    {/* Floating Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                       {item.popular && (
                        <span className="bg-gradient-to-r from-[#FF6B00] to-[#FF9D00] text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider flex items-center space-x-1 shadow-[0_0_15px_rgba(255,107,0,0.25)]">
                          <Sparkles className="w-3 h-3 fill-current" />
                          <span>Etoile Star</span>
                        </span>
                      )}
                      {item.spicy && (
                        <span className="bg-[#ea4335] text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider flex items-center space-x-1 shadow-md w-max">
                          <Flame className="w-3 h-3 fill-current" />
                          <span>Spicy</span>
                        </span>
                      )}
                    </div>

                    <span className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm border border-white/10 py-1 px-3 rounded-lg text-xs font-mono font-medium text-gray-300 flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-[#FF6B00]" />
                      <span>{item.prepTime}</span>
                    </span>
                  </div>

                  {/* Body Info */}
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-[#FF6B00] uppercase font-bold tracking-wider">{item.category}</span>
                        <div className="flex items-center text-[#FF9D00] text-xs">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="font-mono font-bold ml-1">{item.rating}</span>
                        </div>
                      </div>
                      
                      <h3 className="font-display font-extrabold text-lg text-white group-hover:text-[#FF6B00] transition-colors">
                        {item.name}
                      </h3>
                      
                      <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-6 mt-4 border-t border-white/10">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-gray-500 uppercase font-mono block">Price</span>
                        <span className="font-mono font-bold text-lg text-white">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.93 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCartWithAnimation(item);
                        }}
                        className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all duration-300 flex items-center space-x-1.5 space-x-reverse cursor-pointer relative overflow-hidden ${
                          addingItemId === item.id
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-505 border-transparent text-white scale-105 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                            : 'bg-white/10 hover:bg-[#FF6B00] border border-white/10 hover:border-transparent text-white hover:shadow-[0_0_15px_rgba(255,107,0,0.3)]'
                        }`}
                      >
                        {addingItemId === item.id ? (
                          <motion.div 
                            initial={{ scale: 0.7, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            className="flex items-center space-x-1 space-x-reverse"
                          >
                            <span className="w-2 h-2 rounded-full bg-white block animate-ping" />
                            <span>تمت الإضافة ✓</span>
                          </motion.div>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>إضافة للسلة</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </section>

      {/* 2.5 Gourmet Testimonials Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 border-t border-white/5">
        <div className="space-y-2 text-center mb-12">
          <span className="font-mono text-xs text-[#FF6B00] font-bold uppercase tracking-[0.25em]">Gourmet Voice</span>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white">
            همسات التقييم والتجربة الفاخرة
          </h2>
          <p className="text-xs text-gray-400 max-w-lg mx-auto leading-relaxed">
            مشاركات حقيقية وتجارب مخملية من كبار الذواقة الذين تذوقوا أطباقنا الفاخرة وعبروا عن شغفهم.
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl max-w-md mx-auto">
            <span className="text-3xl">⭐</span>
            <p className="text-xs text-gray-400 mt-2">لا توجد تقييمات منشورة حتى الآن. كن أول من يضيف لمسته!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {reviews.map((rev) => (
                <motion.div
                  layout
                  key={rev.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#FF6B00]/40 transition-all duration-300 group overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-tr from-[#FF6B00]/5 to-transparent rounded-full blur-xl pointer-events-none" />
                  
                  <div className="space-y-3">
                    {/* Stars row & info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-0.5 space-x-reverse">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`} 
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[9px] text-gray-500">{new Date(rev.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>

                    {/* Gourmet Comment */}
                    <p className="text-xs text-gray-300 leading-relaxed italic text-right font-medium" dir="rtl">
                      "{rev.comment}"
                    </p>
                  </div>

                  {/* Items list & signature */}
                  <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
                    {rev.items && rev.items.length > 0 && (
                      <div className="flex flex-wrap gap-1 leading-none justify-end">
                        {rev.items.map((it) => (
                          <span key={it} className="text-[9.5px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded border border-white/5">
                            {it}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#FF6B00] font-mono uppercase bg-[#FF6B00]/5 border border-[#FF6B00]/10 px-1.5 py-0.5 rounded font-black">
                        {rev.id}
                      </span>
                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        <span className="text-xs font-semibold text-white">{rev.customerName}</span>
                        <div className="w-5 h-5 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[10px] font-black text-[#FF6B00]">
                          {rev.customerName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* 3. Floating Sidebar Cart & Advanced Checkout */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { 
                if (!orderCompleted) {
                  setIsCartOpen(false); 
                  if (location.pathname === '/checkout') navigate('/');
                } 
              }}
              className="absolute inset-0 bg-[#000000a0] backdrop-blur-md"
            />
            {/* Sidebar drawer container */}
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-screen max-w-md bg-black/40 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col justify-between"
              >
                {/* Header of Drawer */}
                {(() => {
                  let pickerTitle = 'Your Order Selection';
                  if (isCheckoutStep) pickerTitle = 'Secure Checkout';
                  else if (orderCompleted) pickerTitle = 'Order Acknowledged';

                  return (
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ShoppingBag className="w-5 h-5 text-[#FF6B00]" />
                        <span className="font-display font-bold text-lg text-white">
                          {pickerTitle}
                        </span>
                      </div>
                      {!orderCompleted && (
                        <button
                          onClick={() => {
                            setIsCartOpen(false);
                            if (location.pathname === '/checkout') navigate('/');
                          }}
                          className="p-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 transition-colors text-gray-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* Body Content */}
                <div className="flex-grow overflow-y-auto px-6 py-4">
                  {orderCompleted ? (
                    /* SUCCESS STATE */
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="pt-10 text-center flex flex-col items-center justify-center space-y-6"
                    >
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF6B00] to-[#FF9D00] p-[1px] flex items-center justify-center shadow-[0_0_25px_rgba(255,107,0,0.4)]">
                        <div className="w-full h-full bg-[#050505] rounded-full flex items-center justify-center">
                          <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="font-mono text-[10px] text-[#FF6B00] uppercase font-bold tracking-[0.2em]">Order Confirmed</span>
                        <h3 className="font-display text-2xl font-extrabold text-white">Chef owner notified!</h3>
                        <p className="text-gray-400 text-xs max-w-xs mx-auto leading-relaxed">
                          Your order has been logged instantly in our system. You can switch to the <strong className="text-[#FF6B00] font-bold">Admin Panel</strong> to track this order live!
                        </p>
                      </div>

                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl w-full text-left">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-gray-500 font-mono">Invoice Identifier</span>
                          <span className="text-xs font-mono font-bold text-white text-glow-orange">{lastPlacedOrderId}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-500 font-mono">Status Tracker</span>
                          <span className="bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Pending Approval
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleClosedSuccess}
                        className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#FF8533] text-white rounded-xl text-xs font-bold shadow-[0_4px_15px_rgba(255,107,0,0.25)] hover:shadow-[0_4px_25px_rgba(255,107,0,0.4)] transition-all cursor-pointer"
                      >
                        Fulfill Another Desire
                      </button>
                    </motion.div>
                  ) : isCheckoutStep ? (
                    /* STEP 2: CHECKOUT FORM */
                    <motion.form 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onSubmit={handleCheckoutSubmit}
                      className="space-y-5"
                    >
                      <button
                        type="button"
                        onClick={() => setIsCheckoutStep(false)}
                        className="flex items-center space-x-1.5 text-xs text-gray-400 hover:text-white transition-colors py-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to selection</span>
                      </button>

                      <div className="space-y-4 pt-2">
                        {/* Name */}
                        <div>
                          <label htmlFor="cust-checkout-name" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Your Name *</label>
                          <input 
                            id="cust-checkout-name"
                            type="text" 
                            required
                            placeholder="John Doe"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white focus:border-[#FF6B00]/60 transition-colors"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label htmlFor="cust-checkout-email" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">البريد الإلكتروني للإشعارات / Notification Email *</label>
                          <input 
                            id="cust-checkout-email"
                            type="email" 
                            required
                            placeholder="client@domain.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white focus:border-[#FF6B00]/60 transition-colors"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label htmlFor="cust-checkout-phone" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Phone Number *</label>
                          <input 
                            id="cust-checkout-phone"
                            type="tel" 
                            required
                            placeholder="+1 (555) 000-0000"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white focus:border-[#FF6B00]/60 transition-colors"
                          />
                        </div>

                        {/* Address */}
                        <div>
                          <label htmlFor="cust-checkout-address" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Delivery Address *</label>
                          <textarea 
                            id="cust-checkout-address"
                            required
                            rows={2}
                            placeholder="Street, Penthouse Suite, Gate Code, City"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white resize-none focus:border-[#FF6B00]/60 transition-colors"
                          />
                        </div>

                        {/* Notes */}
                        <div>
                          <label htmlFor="cust-checkout-notes" className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-medium">Chef Preparation Notes (Optional)</label>
                          <textarea 
                            id="cust-checkout-notes"
                            rows={2}
                            placeholder="Allergies, door codes, delivery preferences..."
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-sm text-white resize-none focus:border-[#FF6B00]/60 transition-colors"
                          />
                        </div>

                        {/* Payment Selection */}
                        <div>
                          <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5 font-bold">Secure Payment Method</span>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                               type="button"
                               onClick={() => setPaymentMethod('Card')}
                               className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                                 paymentMethod === 'Card'
                                   ? 'bg-white/10 border-[#FF6B00] text-white shadow-lg'
                                   : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                               }`}
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>Crypto / Card</span>
                            </button>
                            <button
                               type="button"
                               onClick={() => setPaymentMethod('Cash on Delivery')}
                               className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                                 paymentMethod === 'Cash on Delivery'
                                   ? 'bg-white/10 border-[#FF6B00] text-white shadow-lg'
                                   : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                               }`}
                            >
                              <Truck className="w-4 h-4" />
                              <span>Cash on Arrival</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display final totals */}
                      <div className="pt-4 border-t border-white/10 text-xs space-y-2">
                        <div className="flex justify-between text-gray-400">
                          <span>Culinary Subtotal</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Secure Safe Delivery</span>
                          <span>{deliveryFee === 0 ? 'Complimentary' : `$${deliveryFee.toFixed(2)}`}</span>
                        </div>
                        <div className="flex justify-between text-white font-bold text-sm pt-1 border-t border-dashed border-white/10">
                          <span>Grand Total Due</span>
                          <span className="text-[#FF6B00] font-mono font-bold">${grandTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-4 bg-[#FF6B00] hover:bg-[#FF8533] rounded-xl text-xs font-bold text-white shadow-[0_4px_20px_rgba(255,107,0,0.3)] hover:shadow-[0_4px_30px_rgba(255,107,0,0.45)] transition-all cursor-pointer block text-center"
                      >
                        Transmit Order to Kitchen
                      </button>
                    </motion.form>
                  ) : (
                    /* STEP 1: CART LIST */
                    <div className="space-y-4">
                      {cart.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-gray-650 border border-white/10">
                            <ShoppingBag className="w-5 h-5 text-white/50" />
                          </div>
                          <p className="text-gray-400 text-xs">Your basket is currently empty. Explore the gourmet selection!</p>
                          <button
                            onClick={() => setIsCartOpen(false)}
                            className="text-xs text-[#FF6B00] font-semibold hover:underline cursor-pointer border border-[#FF6B00]/20 rounded-xl px-4 py-2 hover:bg-[#FF6B00]/10"
                          >
                            Explore Menu
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">Your Selection ({cart.length} item{cart.length > 1 ? 's' : ''})</p>
                          <div className="space-y-3 pr-1">
                            <AnimatePresence initial={false}>
                              {cart.map((item) => (
                                <motion.div
                                  layout
                                  key={item.menuItem.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, x: -50 }}
                                  className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center space-x-3 group hover:border-[#FF6B00]/30 transition-colors"
                                >
                                  <img 
                                    src={item.menuItem.imageUrl} 
                                    alt={item.menuItem.name} 
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="flex-grow min-w-0">
                                    <span className="block text-xs font-bold text-white truncate">{item.menuItem.name}</span>
                                    <span className="font-mono text-xs text-[#FF9D00] block mt-0.5">${(item.menuItem.price * item.quantity).toFixed(2)}</span>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center bg-black/50 rounded-lg border border-white/10 p-0.5">
                                      <button 
                                        onClick={() => updateQuantity(item.menuItem.id, -1)}
                                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="px-2 font-mono text-xs text-white min-w-[16px] text-center">{item.quantity}</span>
                                      <button 
                                        onClick={() => updateQuantity(item.menuItem.id, 1)}
                                        className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <button 
                                      onClick={() => removeFromCart(item.menuItem.id)}
                                      className="p-2 text-gray-500 hover:text-[#FF6B00] hover:bg-[#FF6B00]/5 rounded-lg transition-all cursor-pointer"
                                      title="Remove from selection"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Totals (Only in selection step) */}
                {!orderCompleted && cart.length > 0 && !isCheckoutStep && (
                  <div className="p-6 border-t border-white/10 bg-black/40 backdrop-blur-md space-y-4">
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>Items Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Safe Delivery Fee</span>
                        <span>{deliveryFee === 0 ? 'Complimentary' : `$${deliveryFee.toFixed(2)}`}</span>
                      </div>
                      {subtotal < 40 && (
                        <div className="p-2 rounded bg-white/5 text-[#FF9D00]/80 text-[10px] text-center border border-white/10">
                          Add <strong>${(40 - subtotal).toFixed(2)}</strong> more for <strong>Complimentary Delivery</strong>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-dashed border-white/10">
                        <span>Grand Total Due</span>
                        <span className="text-[#FF6B00] font-bold font-mono text-sm">${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsCheckoutStep(true);
                        navigate('/checkout');
                      }}
                      className="w-full py-4 bg-[#FF6B00] hover:bg-[#FF8533] rounded-xl text-xs font-bold text-white shadow-[0_4px_20px_rgba(255,107,0,0.3)] hover:shadow-[0_4px_30px_rgba(255,107,0,0.45)] hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center space-x-2 animate-pulse"
                    >
                      <span>Proceed with Delivery</span>
                      <Truck className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
