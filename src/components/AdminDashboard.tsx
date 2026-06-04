/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DollarSign, 
  ShoppingBag, 
  Coins, 
  Search, 
  MapPin, 
  Phone, 
  Clock, 
  Eye, 
  CheckCircle, 
  Truck, 
  ChefHat, 
  AlertCircle,
  Inbox,
  X,
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  Check,
  Package,
  Layers,
  Sparkles,
  Flame,
  Star,
  Users
} from 'lucide-react';
import { Order, OrderStatus, MenuItem, FoodCategory, Review } from '../types';

interface AdminDashboardProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  menuItems: MenuItem[];
  onAddMenuItem: (item: MenuItem) => void;
  onUpdateMenuItem: (item: MenuItem) => void;
  onDeleteMenuItem: (itemId: string) => void;
  reviews: Review[];
  onDeleteReview: (reviewId: string) => void;
  customers?: { username: string; name: string; password?: string }[];
  employees?: { username: string; name: string; password?: string }[];
  onDeleteCustomer?: (username: string) => void;
  onDeleteEmployee?: (username: string) => void;
}

export default function AdminDashboard({ 
  orders, 
  onUpdateOrderStatus, 
  onDeleteOrder,
  menuItems,
  onAddMenuItem,
  onUpdateMenuItem,
  onDeleteMenuItem,
  reviews,
  onDeleteReview,
  customers = [],
  employees = [],
  onDeleteCustomer,
  onDeleteEmployee
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'reviews' | 'users'>('orders');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Menu Management modals
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form inputs state
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState(15.00);
  const [itemCategory, setItemCategory] = useState<FoodCategory>('Burgers');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemPrepTime, setItemPrepTime] = useState('15 mins');
  const [itemPopular, setItemPopular] = useState(false);
  const [itemSpicy, setItemSpicy] = useState(false);
  const [itemRating, setItemRating] = useState(4.8);

  // Automatic pre-filled high resolution food pictures matching category
  const categoryImages: Record<FoodCategory, string> = {
    Burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    Pizzas: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    Starters: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    Desserts: 'https://images.unsplash.com/photo-1511018556340-d16986a1c194?auto=format&fit=crop&w=600&q=80',
    Drinks: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'
  };

  // Sync inputs on edit selection
  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.name);
      setItemPrice(editingItem.price);
      setItemCategory(editingItem.category);
      setItemDescription(editingItem.description);
      setItemImageUrl(editingItem.imageUrl);
      setItemPrepTime(editingItem.prepTime);
      setItemPopular(editingItem.popular || false);
      setItemSpicy(editingItem.spicy || false);
      setItemRating(editingItem.rating || 4.8);
    } else {
      setItemName('');
      setItemPrice(15.00);
      setItemCategory('Burgers');
      setItemDescription('');
      setItemImageUrl('');
      setItemPrepTime('15-20 mins');
      setItemPopular(false);
      setItemSpicy(false);
      setItemRating(4.9);
    }
  }, [editingItem]);

  // Handler for adding/updating menu items
  const handleSaveMenuItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemDescription) return;

    // Use automatic clean Unsplash link if no image URL pasted
    const finalImageUrl = itemImageUrl.trim() || categoryImages[itemCategory];

    if (editingItem) {
      const updated: MenuItem = {
        ...editingItem,
        name: itemName,
        price: Number(itemPrice),
        category: itemCategory,
        description: itemDescription,
        imageUrl: finalImageUrl,
        prepTime: itemPrepTime,
        popular: itemPopular,
        spicy: itemSpicy,
        rating: itemRating
      };
      onUpdateMenuItem(updated);
      setEditingItem(null);
    } else {
      const newItem: MenuItem = {
        id: `M-${Math.floor(1000 + Math.random() * 9000)}`,
        name: itemName,
        price: Number(itemPrice),
        category: itemCategory,
        description: itemDescription,
        imageUrl: finalImageUrl,
        prepTime: itemPrepTime,
        popular: itemPopular,
        spicy: itemSpicy,
        rating: itemRating
      };
      onAddMenuItem(newItem);
      setIsAddingNew(false);
    }

    // Reset inputs
    setItemName('');
    setItemPrice(15.00);
    setItemDescription('');
    setItemImageUrl('');
    setItemPrepTime('15 mins');
    setItemPopular(false);
    setItemSpicy(false);
  };

  // Advanced Stats calculation for active statuses & ledger values
  const stats = useMemo(() => {
    const totalOrdersCount = orders.length;
    const revenueSum = orders.reduce((acc, curr) => acc + curr.total, 0);

    // Dynamic categorised counts required by user:
    const pendingCount = orders.filter(o => o.status === 'Pending').length;
    const preparingCount = orders.filter(o => o.status === 'Preparing').length;
    const deliveryCount = orders.filter(o => o.status === 'Out for Delivery').length;
    const deliveredCount = orders.filter(o => o.status === 'Delivered').length;

    return { 
      totalOrdersCount, 
      revenueSum,
      pendingCount, 
      preparingCount, 
      deliveryCount, 
      deliveredCount 
    };
  }, [orders]);

  // Filter & Search Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      const matchesSearch = 
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, statusFilter, searchQuery]);

  // Color mappings for helper states
  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return {
          bg: 'bg-orange-500/15 border-orange-500/30 text-orange-400',
          dot: 'bg-orange-400',
          label: 'بانتظار الموافق'
        };
      case 'Preparing':
        return {
          bg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
          dot: 'bg-purple-400',
          label: 'قيد الطهو والإعداد'
        };
      case 'Out for Delivery':
        return {
          bg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
          dot: 'bg-blue-400',
          label: 'خرج مع التوصيل'
        };
      case 'Delivered':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          label: 'تم التسليم بالهناء'
        };
    }
  };

  const parseTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      return `${diffHrs}h ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="bg-[#050505] text-gray-200 min-h-screen font-sans px-4 md:px-8 py-10 relative">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Upper Dashboard Navigation / Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="font-mono text-[10px] text-[#FF6B00] uppercase tracking-[0.25em] font-bold">L'Étoile Backoffice Control</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-white mt-1">
              الكونسول الإداري التنفيذي
            </h1>
          </div>

          {/* Control view tabs (Orders Hub vs Menu Manager) */}
          <div className="bg-white/5 p-1 rounded-full border border-white/10 flex items-center self-start md:self-center">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-5 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center space-x-2 space-x-reverse cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF9D00] text-white shadow-lg shadow-orange-500/20'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>إدارة الطلبات الحية ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-5 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center space-x-2 space-x-reverse cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF9D00] text-white shadow-lg shadow-orange-500/20'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>قائمة الطعام والأكلات ({menuItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-5 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center space-x-2 space-x-reverse cursor-pointer ${
                activeTab === 'reviews'
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF9D00] text-white shadow-lg shadow-orange-500/20'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>التقييمات الفاخرة ({reviews.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-5 py-2 text-xs font-bold rounded-full transition-all duration-300 flex items-center space-x-2 space-x-reverse cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF9D00] text-white shadow-lg shadow-orange-500/20'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>الحسابات المسجلة ({customers.length + employees.length})</span>
            </button>
          </div>
        </div>

        {/* 1. Multi-Status Counter (Required by user) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Box 1: Unreceived / Pending */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex flex-col justify-between shadow-xl relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-orange-400 font-mono tracking-widest uppercase font-bold">الطلبات غير المستلمة</span>
              <Inbox className="w-4 h-4 text-orange-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-mono font-extrabold text-white">{stats.pendingCount}</span>
              <p className="text-[10.5px] text-gray-400 mt-1">بانتظار مراجعة وقبول الطاهي</p>
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 bg-orange-400/5 rounded-full blur-xl pointer-events-none" />
          </motion.div>

          {/* Box 2: Preparing */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex flex-col justify-between shadow-xl relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-purple-400 font-mono tracking-widest uppercase font-bold">قيد الطبخ</span>
              <ChefHat className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-mono font-extrabold text-white">{stats.preparingCount}</span>
              <p className="text-[10.5px] text-gray-400 mt-1">يجري إعدادها بعناية الآن</p>
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-400/5 rounded-full blur-xl pointer-events-none" />
          </motion.div>

          {/* Box 3: Out for Delivery */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex flex-col justify-between shadow-xl relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-blue-400 font-mono tracking-widest uppercase font-bold">قيد التوصيل</span>
              <Truck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-mono font-extrabold text-white">{stats.deliveryCount}</span>
              <p className="text-[10.5px] text-gray-400 mt-1">مع السائقين في الطريق</p>
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400/5 rounded-full blur-xl pointer-events-none" />
          </motion.div>

          {/* Box 4: Delivered */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-between shadow-xl relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase font-bold">تم التوصيل</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-4">
              <span className="text-3xl font-mono font-extrabold text-white">{stats.deliveredCount}</span>
              <p className="text-[10.5px] text-gray-400 mt-1">تم تسليمها للعملاء مسبقاً</p>
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-400/5 rounded-full blur-xl pointer-events-none" />
          </motion.div>

        </div>

        {/* OVERHEAD REVENUE LEDGER BAR */}
        <div className="p-4 bg-white/[0.015] border border-white/5 rounded-xl flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2">
          <span>إجمالي التدفق المالي المجدول للتحصيل (الدفع بعد الاستلام):</span>
          <span className="text-lg font-mono font-bold text-white flex items-center space-x-1 space-x-reverse">
            <Coins className="w-4 h-4 text-[#FF6B00]" />
            <span>${stats.revenueSum.toFixed(2)}</span>
          </span>
        </div>

        {/* TAB CONTENT 1: LIVE ORDERS LIST */}
        {activeTab === 'orders' && (
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex items-center space-x-1.5 space-x-reverse overflow-x-auto pb-1 scrollbar-hide">
                {['All', 'Pending', 'Preparing', 'Out for Delivery', 'Delivered'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status as OrderStatus | 'All')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === status 
                        ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF9D00] text-white shadow-lg' 
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {status === 'All' ? 'جميع الطلبات' : status === 'Pending' ? 'لم تُستلم' : status === 'Preparing' ? 'قيد الطبخ' : status === 'Out for Delivery' ? 'قيد التوصيل' : 'تم التوصيل'}
                  </button>
                ))}
              </div>

              {/* In-Console Search */}
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="ابحث برقم الفاتورة، اسم المشتري..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-white text-right"
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-right border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-gray-500 font-mono uppercase tracking-wider bg-white/[0.01]">
                    <th className="py-4 px-4 text-right">رقم الفاتورة</th>
                    <th className="py-4 px-4 text-right">معلومات المشتري</th>
                    <th className="py-4 px-4 text-right">الوجبات الفاخرة المطلوبة</th>
                    <th className="py-4 px-4 text-right">الحساب الإجمالي</th>
                    <th className="py-4 px-4 text-center">حالة الطلبية (تغيير فوري)</th>
                    <th className="py-4 px-4 text-left">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <Inbox className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                          <h4 className="font-display font-semibold text-white/80">لم يتم العثور على أي طلبيات</h4>
                          <p className="text-gray-500 text-xs mt-1">لا توجد سجلات مطابقة للفلاتر النشطة حالياً.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const statusStyle = getStatusStyle(order.status);
                        return (
                          <motion.tr
                            layout
                            key={order.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b border-white/5 hover:bg-white/[0.015] transition-colors group text-sm"
                          >
                            {/* ID */}
                            <td className="py-4 px-4 font-mono text-xs font-bold text-gray-400 group-hover:text-[#FF6B00] transition-colors text-right">
                              {order.id}
                              <span className="block text-[9px] text-gray-600 font-normal mt-0.5">{parseTime(order.createdAt)}</span>
                            </td>

                            {/* Recipient info */}
                            <td className="py-4 px-4 text-right">
                              <span className="block text-white font-bold">{order.customerName}</span>
                              <span className="block text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px] flex items-center justify-end gap-1">
                                <span className="truncate">{order.address}</span>
                                <MapPin className="w-3 h-3 text-[#FF6B00] flex-shrink-0" />
                              </span>
                            </td>

                            {/* Delicacies */}
                            <td className="py-4 px-4 text-right">
                              <div className="flex flex-wrap gap-1 justify-end max-w-[280px]">
                                {order.items.map((item, idx) => (
                                  <span 
                                    key={idx} 
                                    className="bg-white/5 border border-white/10 text-gray-300 text-[10px] px-2 py-0.5 rounded"
                                  >
                                    {item.name} <strong className="text-[#FF6B00]">x{item.quantity}</strong>
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Total */}
                            <td className="py-4 px-4 font-mono font-bold text-white text-right">
                              ${order.total.toFixed(2)}
                            </td>

                            {/* Status and dropdown change action */}
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center">
                                <div className="bg-[#050505] rounded-xl border border-white/10 p-1 flex space-x-1 space-x-reverse">
                                  {(['Pending', 'Preparing', 'Out for Delivery', 'Delivered'] as OrderStatus[]).map((st) => (
                                    <button
                                      key={st}
                                      title={`تعيين كـ: ${st}`}
                                      onClick={() => onUpdateOrderStatus(order.id, st)}
                                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                        order.status === st
                                          ? st === 'Pending' ? 'bg-orange-600 text-white shadow-sm'
                                            : st === 'Preparing' ? 'bg-purple-600 text-white shadow-sm'
                                            : st === 'Out for Delivery' ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-emerald-600 text-white shadow-sm'
                                          : 'text-gray-500 hover:text-white hover:bg-white/5'
                                      }`}
                                    >
                                      {st === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                                      {st === 'Preparing' && <ChefHat className="w-3.5 h-3.5" />}
                                      {st === 'Out for Delivery' && <Truck className="w-3.5 h-3.5" />}
                                      {st === 'Delivered' && <CheckCircle className="w-3.5 h-3.5" />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>

                            {/* Action detailed inspect */}
                            <td className="py-4 px-4 text-left">
                              <div className="flex items-center justify-start space-x-2">
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="p-2 bg-white/5 border border-white/15 hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/40 rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer"
                                  title="تفاصيل الطلبية"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB CONTENT 3: REVIEWS LIST */}
        {activeTab === 'reviews' && (
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
            <div>
              <h3 className="font-display font-bold text-lg text-white">إدارة تقييمات وملاحظات المستهلكين</h3>
              <p className="text-xs text-gray-400 select-none">تابع وانشر أو احذف تعليقات زبائن المطعم لضمان أعلى مستوى من الرفاهية والجودة</p>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-xl">
                <Star className="w-12 h-12 text-gray-600 mx-auto mb-3 animate-pulse" />
                <h4 className="text-white/80 font-bold text-base">لا توجد تقييمات حية حالياً</h4>
                <p className="text-gray-500 text-xs mt-1">عند تفعيل تسليم الطلبيات سيظهر تفاعل وبناء تقييم الزوار هنا.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {reviews.map((rev) => (
                    <motion.div
                      layout
                      key={rev.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#FF6B00]/20 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <div className="w-8 h-8 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center font-bold text-sm text-[#FF6B00]">
                              {rev.customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-white">{rev.customerName}</h4>
                              <span className="text-[10px] text-gray-500 font-mono">Invoice Ref: {rev.orderId}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 space-x-reverse">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star 
                                key={s} 
                                className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`} 
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-gray-300 bg-black/35 p-3 rounded-lg border border-white/5 text-right font-medium leading-relaxed" dir="rtl">
                          "{rev.comment}"
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-1 leading-none">
                          {rev.items?.map((it, idx) => (
                            <span key={idx} className="text-[10px] bg-white/5 text-gray-400 border border-white/5 px-2 py-0.5 rounded">
                              {it}
                            </span>
                          ))}
                        </div>
                        
                        <button
                          onClick={() => {
                            if (confirm('هل ترغب حقاً في إخفاء أو إزالة هذا التقييم المنشور من واجهات العملاء؟')) {
                              onDeleteReview(rev.id);
                            }
                          }}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 space-x-reverse align-middle self-end sm:set-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>إزالة التقييم</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT 4: REGISTERED ACCOUNTS AND EMAILS (Answer to "وين اشوف الايميلات المسجلة؟") */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-bold text-lg text-white">تفقد وحذف الحسابات والبريد المسجل</h3>
              <p className="text-xs text-gray-400 select-none">
                هنا يمكنك استعراض وفحص جميع العملاء والمشرفين المسجلين وحذف أي حساب للمحافظة على الخصوصية.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Box A: Customers (العملاء المسجلين) */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] px-3 py-1 rounded-full font-bold">
                    العملاء ({customers.length})
                  </span>
                  <h4 className="font-bold text-sm text-white">العملاء والذواقة</h4>
                </div>

                {customers.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-xs">
                    لا يوجد أي عميل مسجل حالياً في قاعدة البيانات.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {customers.map((cust) => (
                      <div 
                        key={cust.username} 
                        className="bg-black/30 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-3 text-right"
                      >
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من رغبتك في حذف حساب العميل ${cust.name} (${cust.username}) نهائياً من النظام؟`)) {
                              onDeleteCustomer?.(cust.username);
                            }
                          }}
                          className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold"
                          title="حذف حساب العميل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الحساب</span>
                        </button>

                        <div>
                          <h5 className="font-bold text-xs text-white">{cust.name}</h5>
                          <span className="text-[11px] text-gray-400 font-mono block select-all mt-0.5" title="البريد الإلكتروني المسجل">
                            {cust.username}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Box B: Employees (المشرفون والموظفون) */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 px-3 py-1 rounded-full font-bold">
                    الموظفون والمشرفون ({employees.length})
                  </span>
                  <h4 className="font-bold text-sm text-white">طاقم المطبخ والخدمة الكلي</h4>
                </div>

                {employees.length === 0 ? (
                  <div className="py-10 text-center text-gray-500 text-xs">
                    لا يوجد أي مشرف أو موظف مسجل حالياً.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {employees.map((emp) => (
                      <div 
                        key={emp.username} 
                        className="bg-black/30 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-3 text-right"
                      >
                        <button
                          disabled={emp.username === 'admin'}
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف حساب المشرف ${emp.name} (${emp.username})؟`)) {
                              onDeleteEmployee?.(emp.username);
                            }
                          }}
                          className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed text-red-500 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold"
                          title={emp.username === 'admin' ? 'لا يمكن حذف الحساب الجذري الحارس' : 'حذف الملف الإداري'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الحساب</span>
                        </button>

                        <div>
                          <h5 className="font-bold text-xs text-white">
                            {emp.name} {emp.username === 'admin' && <strong className="text-amber-500 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded mr-1">الحساب التجريبي الجذري</strong>}
                          </h5>
                          <span className="text-[11px] text-gray-400 font-mono block select-all mt-0.5" title="معرّف الموظف">
                            {emp.username}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* TAB CONTENT 2: MENU CATALOG CRUD MANAGER (Highly Requested by user) */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            
            {/* Toolbar for CRUD */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-white">إدارة مأكولات قائمة الطعام</h3>
                <p className="text-xs text-gray-400 select-none">قم بالفحص، التعديل الفوري، إيقافت البيع أو إضافات الأصناف</p>
              </div>

              <button
                onClick={() => setIsAddingNew(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#FF6B00] to-[#FF9D00] hover:scale-[1.03] active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 space-x-reverse cursor-pointer shadow-lg shadow-orange-500/10 text-glow-orange"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة وجبة أو صنف جديد كلياً 🍳</span>
              </button>
            </div>

            {/* Grid display of existing menu items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-[#FF6B00]/30 transition-all duration-300"
                >
                  <div className="relative h-44 overflow-hidden bg-black">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent" />
                    
                    <span className="absolute top-3 right-3 bg-black/80 border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold text-[#FF6B00]">
                      {item.category}
                    </span>

                    <span className="absolute bottom-3 left-3 bg-black/60 border border-white/20 px-2 py-0.5 rounded text-[10px] text-gray-300 font-mono flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-[#FF6B00]" />
                      <span>{item.prepTime}</span>
                    </span>
                  </div>

                  <div className="p-5 flex-grow space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-display font-black text-base text-white group-hover:text-[#FF6B00] transition-colors">
                        {item.name}
                      </h4>
                      <span className="text-md font-mono font-bold text-[#FF6B00]">${item.price.toFixed(2)}</span>
                    </div>

                    <p className="text-[11.5px] text-gray-400 line-clamp-2 leading-relaxed text-right">{item.description}</p>
                    
                    {/* Item parameters indicators */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.popular && (
                        <span className="bg-[#FF6B00]/15 text-[#FF6B00] text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 fill-current" /> نجم الوجبات
                        </span>
                      )}
                      {item.spicy && (
                        <span className="bg-red-500/15 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5 fill-current" /> حارة ومتبلة
                        </span>
                      )}
                      <span className="bg-amber-500/10 text-amber-500 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" /> {item.rating}
                      </span>
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="p-4 bg-white/[0.015] border-t border-white/5 flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 border border-white/10 hover:border-[#FF6B00]/40 bg-white/5 hover:bg-[#FF6B00]/10 rounded-xl text-yellow-500 hover:text-white transition-all cursor-pointer text-xs flex items-center gap-1.5 font-bold"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>تعديل السعر</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('هل أنت متأكد من رغبتك في حذف هذا الطبق الفاخر نهائياً من المنيو؟')) {
                          onDeleteMenuItem(item.id);
                        }
                      }}
                      className="p-2 border border-red-500/20 hover:border-red-500/50 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 hover:text-red-300 transition-all cursor-pointer text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* 3. Detailed Inspect Overlay Modal for Orders */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-lg bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden text-sm max-h-[90vh] overflow-y-auto"
            >
              <div className="h-1 bg-[#FF6B00] absolute top-0 inset-x-0" />
              
              <div className="flex justify-between items-start mb-6">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="text-right">
                  <span className="font-mono text-[9px] text-[#FF6B00] uppercase font-bold tracking-widest leading-none block">تفاصيل الفاتورة الفاخرة</span>
                  <h3 className="font-display font-black text-xl text-white mt-1">{selectedOrder.id}</h3>
                  <span className="text-[10px] text-gray-500 block font-mono mt-0.5">وقت الطلب: {new Date(selectedOrder.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Order recipient details */}
              <div className="space-y-4 text-xs text-right">
                
                {/* Client Info Grid */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl grid grid-cols-2 gap-4">
                  <div className="text-right col-span-1">
                    <span className="text-gray-500 block uppercase font-mono text-[9px] mb-0.5">المشتري</span>
                    <strong className="text-white text-sm">{selectedOrder.customerName}</strong>
                  </div>
                  <div className="text-right col-span-1">
                    <span className="text-gray-500 block uppercase font-mono text-[9px] mb-0.5">رقم الجوال</span>
                    <strong className="text-white text-sm flex items-center justify-end gap-1">
                      <span>{selectedOrder.phone}</span>
                      <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
                    </strong>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-gray-500 block uppercase font-mono text-[9px] mb-0.5">موقع التوصيل الفاخر</span>
                    <span className="text-gray-300 font-medium leading-relaxed block">{selectedOrder.address}</span>
                  </div>
                </div>

                {/* Items breakdown list */}
                <div className="space-y-2 text-right">
                  <span className="text-gray-500 block uppercase font-mono text-[9px]">مكونات الطلب</span>
                  <div className="space-y-1.5 p-3.5 bg-white/5 rounded-xl border border-white/10">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-gray-300">
                        <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                        <span>{item.name} <strong className="text-[#FF6B00] text-[11px]">x{item.quantity}</strong></span>
                      </div>
                    ))}
                    
                    <div className="border-t border-dashed border-white/10 pt-2 mt-2 flex justify-between font-bold text-white text-md">
                      <span className="text-[#FF6B00] font-mono">${selectedOrder.total.toFixed(2)}</span>
                      <span>الحساب الإجمالي</span>
                    </div>
                  </div>
                </div>

                {/* Preparation notes / Special instructions */}
                {selectedOrder.notes && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-right">
                    <span className="text-[#FF6B00] font-mono text-[9px] uppercase font-bold block mb-1">تعليمات المطبخ الخاصة</span>
                    <p className="text-gray-300 italic">"{selectedOrder.notes}"</p>
                  </div>
                )}

                {/* Extra info flags */}
                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] font-mono text-right">
                  <div className="flex items-center space-x-2 justify-end text-gray-400">
                    <span className="text-white font-medium flex items-center gap-1">
                      <span>{selectedOrder.paymentMethod === 'Cash on Delivery' ? 'دفع عند الاستلام' : selectedOrder.paymentMethod}</span>
                      <CreditCard className="w-3.5 h-3.5 text-[#FF6B00]" />
                    </span>
                    <span className="text-gray-500 text-[10px]">:الدفع</span>
                  </div>
                  <div className="flex items-center space-x-2 justify-end text-gray-400">
                    <span className="font-bold underline text-[#FF6B00]">{selectedOrder.status}</span>
                    <span className="text-gray-500 text-[10px]">:الحالة الحالية</span>
                  </div>
                </div>

                {/* Status Quick Operations inside modal */}
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <span className="text-gray-500 block uppercase font-mono text-[9px] text-right">مسار دورة المطبخ والتحضير</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Pending', 'Preparing', 'Out for Delivery', 'Delivered'] as OrderStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          onUpdateOrderStatus(selectedOrder.id, st);
                          // Keep modal sync
                          setSelectedOrder((prev) => prev ? { ...prev, status: st } : null);
                        }}
                        className={`py-2 px-1 rounded-lg text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          selectedOrder.status === st
                            ? 'bg-[#FF6B00] border-transparent text-white shadow'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {st === 'Pending' ? 'غير مستلم' : st === 'Preparing' ? 'طبخ' : st === 'Out for Delivery' ? 'توصيل' : 'تم التسليم'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Order Cancellation / Removal */}
                <div className="flex justify-start pt-2">
                  <button
                    onClick={() => {
                      if (confirm('هل ترغب حقاً في حذف أو أرشفة سجل هذا الطلب نهائياً؟')) {
                        onDeleteOrder(selectedOrder.id);
                        setSelectedOrder(null);
                      }
                    }}
                    className="text-xs text-red-400/80 hover:text-red-400 underline font-medium cursor-pointer"
                  >
                    أرشفة وحذف سجل الطلب نهائياً
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. CRUD FORMS MODAL SIDEBAR (Addition or Modification) */}
      <AnimatePresence>
        {(isAddingNew || editingItem) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAddingNew(false); setEditingItem(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-lg bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-amber-500 to-[#FF6B00] absolute top-0 inset-x-0" />
              
              <div className="flex justify-between items-start mb-6">
                <button
                  onClick={() => { setIsAddingNew(false); setEditingItem(null); }}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white cursor-pointer transition-all text-xs"
                >
                  إلغاء التعديل
                </button>
                <div className="text-right">
                  <h3 className="font-display font-black text-lg text-white">
                    {editingItem ? 'تعديل بيانات الوجبة' : 'إضافة طبق فاخر للمنيو'}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">يرجى ملء مواصفات الصنف ومستويات الأسعار والصور</p>
                </div>
              </div>

              <form onSubmit={handleSaveMenuItemSubmit} className="space-y-4 text-right overflow-y-auto max-h-[75vh] px-1">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5 font-bold">اسم الوجبة</label>
                  <input 
                    type="text" 
                    required
                    value={itemName} 
                    onChange={(e) => setItemName(e.target.value)} 
                    placeholder="مثال: ترابل ترافل سماش برجر"
                    className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs text-white text-right focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                  />
                </div>

                {/* Price & Prep time row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5 font-bold">وقت التحضير المعتاد</label>
                    <input 
                      type="text" 
                      required
                      value={itemPrepTime} 
                      onChange={(e) => setItemPrepTime(e.target.value)} 
                      placeholder="مثال: 12 mins"
                      className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5 font-bold">السعر المقدر بالدولار ($)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={itemPrice} 
                      onChange={(e) => setItemPrice(Number(e.target.value))} 
                      className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs text-white text-center font-mono focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                    />
                  </div>
                </div>

                {/* Category Choose */}
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5 font-bold">فئة المأكولات</label>
                  <select 
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as FoodCategory)}
                    className="w-full bg-black/90 border border-white/10 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF6B00] text-center"
                  >
                    <option value="Burgers">برجر (Burgers)</option>
                    <option value="Pizzas">بيتزا (Pizzas)</option>
                    <option value="Starters">مقبلات وسلطات (Starters)</option>
                    <option value="Desserts">حلويات فاخرة (Desserts)</option>
                    <option value="Drinks">مشروبات وسقيا (Drinks)</option>
                  </select>
                </div>

                {/* Image URL text */}
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5 font-bold">رابط صورة الوجبة (اختياري)</label>
                  <input 
                    type="url" 
                    value={itemImageUrl} 
                    onChange={(e) => setItemImageUrl(e.target.value)} 
                    placeholder="https://images.unsplash.com/... (سيتم تطبيق صورة تلقائية ممتازة إذا تُرك الحقل فارغاً)"
                    className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-[10px] text-left text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                  />
                  <p className="text-[9px] text-gray-500 mt-1">تلميح: إذا تُرك فارغاً ، فسيحاول النظام تلقائياً اختيار صورة عالية الجودة ومطبوخة بعناية بناءً على خيار الفئة المحدد أعلاه لراحة عملك.</p>
                </div>

                {/* Rich Description */}
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5 font-bold">وصف الوجبة الفاخرة</label>
                  <textarea 
                    rows={3}
                    required
                    value={itemDescription} 
                    onChange={(e) => setItemDescription(e.target.value)} 
                    placeholder="اكتب تفاصيل المكونات والنكهات الفاخرة لإغراء المشتري..."
                    className="w-full bg-white/5 border border-white/10 p-2.5 rounded-xl text-xs text-white text-right focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                  />
                </div>

                {/* Checkboxes popular / spicy */}
                <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
                  <label className="flex items-center justify-end space-x-2 space-x-reverse text-gray-300 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={itemSpicy}
                      onChange={(e) => setItemSpicy(e.target.checked)}
                      className="rounded border-white/10 bg-white/5 text-[#FF6B00] focus:ring-[#FF6B00]"
                    />
                    <span>الوجبة حارة ومتبلة (Spicy Map)</span>
                  </label>

                  <label className="flex items-center justify-end space-x-2 space-x-reverse text-gray-300 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={itemPopular}
                      onChange={(e) => setItemPopular(e.target.checked)}
                      className="rounded border-white/10 bg-white/5 text-[#FF6B00] focus:ring-[#FF6B00]"
                    />
                    <span>تمييز كوجبة الأكثر مبيعاً (Popular)</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-[#FF6B00] to-[#FF9D00] hover:scale-[1.01] active:scale-[0.99] text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer block text-center"
                >
                  {editingItem ? 'حفظ وحقن التعديلات الفورية 💾' : 'حقن الطبق الجديد ونشرة بالمنيو 🚀'}
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
