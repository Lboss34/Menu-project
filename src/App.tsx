/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import CustomerView from './components/CustomerView';
import AdminDashboard from './components/AdminDashboard';
import AuthScreen from './components/AuthScreen';
import AccountSettingsModal from './components/AccountSettingsModal';
import PaymentCallback from './components/PaymentCallback';
import { CartItem, Order, OrderStatus, MenuItem, Review } from './types';
import { INITIAL_ORDERS, MENU_ITEMS, INITIAL_REVIEWS } from './data';

interface LiveToast {
  id: string;
  title: string;
  message: string;
  status: OrderStatus;
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive currentView from active route URL path dynamically to prevent bypass/manipulation
  const currentView = location.pathname.startsWith('/admin') ? 'admin' : 'customer';

  const setView = (view: 'customer' | 'admin') => {
    navigate(view === 'admin' ? '/admin' : '/');
  };
  
  // Real-time Auth User Session
  const [currentUser, setCurrentUser] = useState<{ 
    username: string; 
    name: string; 
    role: 'customer' | 'employee';
    avatarUrl?: string;
    phone?: string;
    address?: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('etoile_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dynamic Foods Menu Manage State synchronized with cloud Firestore
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('etoile_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [dbCustomers, setDbCustomers] = useState<{ username: string; name: string; password?: string }[]>([]);
  const [dbEmployees, setDbEmployees] = useState<{ username: string; name: string; password?: string }[]>([]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const [prevOrders, setPrevOrders] = useState<Order[]>([]);

  // Seed prevOrders initially
  useEffect(() => {
    if (orders.length > 0 && prevOrders.length === 0) {
      setPrevOrders(orders);
    }
  }, [orders]);

  // Sync session to local storage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('etoile_session', JSON.stringify(currentUser));
        // Redirect employee directly to executive panel
        if (location.pathname === '/login' || location.pathname === '/') {
          if (currentUser.role === 'employee') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
      } else {
        localStorage.removeItem('etoile_session');
      }
    } catch (e) {
      console.warn(e);
    }
  }, [currentUser]);

  // Sync cart to local storage (safe device-local persistence)
  useEffect(() => {
    try {
      localStorage.setItem('etoile_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [cart]);

  // LIve REAL-TIME FIRESTORE SUBSCRIPTIONS
  // 1. Live subscribe to menuItems
  useEffect(() => {
    let unsubscribe = () => {};
    async function initCollection() {
      try {
        const { collection, onSnapshot, getDocs, setDoc, doc } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');

        const colRef = collection(db, 'menuItems');
        const snap = await getDocs(colRef);
        if (snap.empty) {
          // Pre-seed items inside cloud database
          for (const item of MENU_ITEMS) {
            await setDoc(doc(db, 'menuItems', item.id), item);
          }
        }

        unsubscribe = onSnapshot(colRef, (snapshot) => {
          const items: MenuItem[] = [];
          snapshot.forEach((doc) => {
            items.push(doc.data() as MenuItem);
          });
          setMenuItems(items);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'menuItems');
        });
      } catch (e) {
        console.error('Error on menuItems sync:', e);
      }
    }
    initCollection();
    return () => unsubscribe();
  }, []);

  // 2. Live subscribe to orders
  useEffect(() => {
    let unsubscribe = () => {};
    async function initCollection() {
      try {
        const { collection, onSnapshot, getDocs, setDoc, doc } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');

        const colRef = collection(db, 'orders');
        const snap = await getDocs(colRef);
        if (snap.empty) {
          // Pre-seed default orders inside cloud database
          for (const ord of INITIAL_ORDERS) {
            await setDoc(doc(db, 'orders', ord.id), ord);
          }
        }

        unsubscribe = onSnapshot(colRef, (snapshot) => {
          const ords: Order[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as Order;
            if (data.paymentMethod === 'Card' && !data.paid && data.status === 'Pending') {
              return;
            }
            ords.push(data);
          });
          // Sort descending by date
          ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(ords);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'orders');
        });
      } catch (e) {
        console.error('Error on orders sync:', e);
      }
    }
    initCollection();
    return () => unsubscribe();
  }, []);

  // 3. Live subscribe to reviews
  useEffect(() => {
    let unsubscribe = () => {};
    async function initCollection() {
      try {
        const { collection, onSnapshot, getDocs, setDoc, doc } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');

        const colRef = collection(db, 'reviews');
        const snap = await getDocs(colRef);
        if (snap.empty) {
          // Pre-seed default reviews inside cloud database
          for (const rev of INITIAL_REVIEWS) {
            await setDoc(doc(db, 'reviews', rev.id), rev);
          }
        }

        unsubscribe = onSnapshot(colRef, (snapshot) => {
          const revs: Review[] = [];
          snapshot.forEach((doc) => {
            revs.push(doc.data() as Review);
          });
          // Sort descending by date
          revs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setReviews(revs);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'reviews');
        });
      } catch (e) {
        console.error('Error on reviews sync:', e);
      }
    }
    initCollection();
    return () => unsubscribe();
  }, []);

  // 0. Seed Demo Accounts initially if missing in Firestore
  useEffect(() => {
    async function seedDemoAccounts() {
      try {
        const { getDoc, doc, setDoc, updateDoc } = await import('firebase/firestore');
        const { db, hashPassword } = await import('./lib/firebase');

        const defaultHash = await hashPassword('123');

        // Seed customer 'alex'
        const custDocRef = doc(db, 'customers', 'alex');
        const custSnap = await getDoc(custDocRef);
        if (!custSnap.exists()) {
          await setDoc(custDocRef, {
            username: 'alex',
            password: defaultHash,
            name: 'Alex Customer'
          });
        } else if (custSnap.data()?.password === '123') {
          await updateDoc(custDocRef, { password: defaultHash });
        }

        // Seed employee 'staff'
        const staffDocRef = doc(db, 'employees', 'staff');
        const staffSnap = await getDoc(staffDocRef);
        if (!staffSnap.exists()) {
          await setDoc(staffDocRef, {
            username: 'staff',
            password: defaultHash,
            name: 'Alex Chef'
          });
        } else if (staffSnap.data()?.password === '123') {
          await updateDoc(staffDocRef, { password: defaultHash });
        }

        // Seed employee 'admin'
        const adminDocRef = doc(db, 'employees', 'admin');
        const adminSnap = await getDoc(adminDocRef);
        if (!adminSnap.exists()) {
          await setDoc(adminDocRef, {
            username: 'admin',
            password: defaultHash,
            name: 'Master Chef Chef'
          });
        } else if (adminSnap.data()?.password === '123') {
          await updateDoc(adminDocRef, { password: defaultHash });
        }
      } catch (err) {
        console.warn('Non-blocking: Failed to seed or secure demo accounts in Firestore:', err);
      }
    }
    seedDemoAccounts();
  }, []);

  // 4. Live subscribe to customers collection in Firestore
  useEffect(() => {
    if (currentUser?.role !== 'employee') {
      setDbCustomers([]);
      return;
    }
    let unsubscribe = () => {};
    async function initCollection() {
      try {
        const { collection, onSnapshot } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');

        const colRef = collection(db, 'customers');
        unsubscribe = onSnapshot(colRef, (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data());
          });
          setDbCustomers(list);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'customers');
        });
      } catch (e) {
        console.error('Error on customers subscription:', e);
      }
    }
    initCollection();
    return () => unsubscribe();
  }, [currentUser?.role]);

  // 5. Live subscribe to employees collection in Firestore
  useEffect(() => {
    if (currentUser?.role !== 'employee') {
      setDbEmployees([]);
      return;
    }
    let unsubscribe = () => {};
    async function initCollection() {
      try {
        const { collection, onSnapshot } = await import('firebase/firestore');
        const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');

        const colRef = collection(db, 'employees');
        unsubscribe = onSnapshot(colRef, (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((doc) => {
            list.push(doc.data());
          });
          setDbEmployees(list);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'employees');
        });
      } catch (e) {
        console.error('Error on employees subscription:', e);
      }
    }
    initCollection();
    return () => unsubscribe();
  }, [currentUser?.role]);

  // REAL-TIME NOTIFICATIONS TRIGGER (Detect status updates in customer-facing active orders)
  useEffect(() => {
    if (currentUser?.role !== 'customer' || prevOrders.length === 0) {
      setPrevOrders(orders);
      return;
    }

    orders.forEach((newOrder) => {
      // Check if it belongs to current customer
      const isMyOrder = newOrder.customerName.toLowerCase() === currentUser?.name.toLowerCase();
      if (!isMyOrder) return;

      const oldOrder = prevOrders.find((o) => o.id === newOrder.id);
      if (oldOrder && oldOrder?.status !== newOrder.status) {
        // Status updated! Compile translation message
        let titleAr = '';
        let descAr = '';
        switch (newOrder.status) {
          case 'Preparing':
            titleAr = '🍳 تم استلام طلبك ومباشرة الطبخ';
            descAr = `الوجبة الفاخرة للطلب ${newOrder.id} الآن قيد التحضير بعناية فائقة بواسطة الطهاة.`;
            break;
          case 'Out for Delivery':
            titleAr = '🛵 خرجت الوجبة للتوصيل';
            descAr = `بشرى سارة! طلبك ${newOrder.id} الآن قيد التوصيل الفاخر وسيصلك بأقرب فرصة.`;
            break;
          case 'Delivered':
            titleAr = '🍽️ تم توصيل طلبك بنجاح';
            descAr = `تم تسليم طلبك ${newOrder.id}. يسعدنا جداً خدمتك، بالصحة والعافية وممتنون لاختيارك!`;
            break;
          case 'Pending':
            titleAr = '⌛ طلبك مسجل وقيد الانتظار';
            descAr = `طلبك ${newOrder.id} مسجل في النظام بنجاح، بانتظار موافقة الطاهي لبدء الطبخ.`;
            break;
        }

        const toastId = Math.random().toString();
        setToasts((prev) => [...prev, { id: toastId, title: titleAr, message: descAr, status: newOrder.status }]);
        
        // Auto remove toast
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 6500);
      }
    });

    setPrevOrders(orders);
  }, [orders, currentUser]);

  const handlePlaceOrder = async (newOrderData: Omit<Order, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      const response = await fetch('/api/orders/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: newOrderData.customerName,
          phone: newOrderData.phone,
          address: newOrderData.address,
          notes: newOrderData.notes || '',
          items: newOrderData.items.map(it => ({ id: it.id, name: it.name, quantity: it.quantity })),
          paymentMethod: newOrderData.paymentMethod,
          customerEmail: newOrderData.customerEmail || ''
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشلت عملية تقديم الطلب الآمنة من جهة السيرفر.');
      }

      const responseData = await response.json();
      const orderId = responseData.orderId;

      // Save placed order ID to local storage device tracking
      try {
        const existing = localStorage.getItem('etoile_placed_order_ids');
        const ids = existing ? JSON.parse(existing) : [];
        if (!ids.includes(orderId)) {
          ids.push(orderId);
          localStorage.setItem('etoile_placed_order_ids', JSON.stringify(ids));
        }
      } catch (e) {
        console.warn('Failed to save to local tracking IDs list', e);
      }

      // If the backend sent a payment url (Tap Payments), redirect user immediately
      if (responseData.paymentUrl) {
        window.location.href = responseData.paymentUrl;
        return true;
      }

      return true;
    } catch (err) {
      console.error('Error placing secure order:', err);
      alert(err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء إرسال طلبك.');
      return false;
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      try {
        await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `orders/${orderId}`);
      }
    } catch (err) {
      console.error(err);
    }

    // If order is updated, check if status became Out for Delivery or Delivered
    if (newStatus === 'Out for Delivery') {
      // Fire-and-forget background transit notification email
      setTimeout(async () => {
        const orderToNotify = orders.find((o) => o.id === orderId);
        if (!orderToNotify) return;

        try {
          const res = await fetch('/api/orders/notify-transit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order: orderToNotify }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            console.log(`[Order Transit Notification Email] Triggered for ${orderId}`);
          }
        } catch (e) {
          console.warn('[Order Transit Notification Email] Failed to connect to server:', e);
        }
      }, 500);
    } else if (newStatus === 'Delivered') {
      // Fire-and-forget background delivery notification email
      setTimeout(async () => {
        const orderToNotify = orders.find((o) => o.id === orderId);
        if (!orderToNotify) return;

        try {
          const res = await fetch('/api/orders/notify-delivery', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ order: orderToNotify }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            console.log(`[Order Delivered Notification Email] Triggered for ${orderId}`);
          }
        } catch (e) {
          console.warn('[Order Delivered Notification Email] Failed to connect to server:', e);
        }
      }, 500);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      try {
        await deleteDoc(doc(db, 'orders', orderId));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.DELETE, `orders/${orderId}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReview = async (review: Review) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      try {
        await setDoc(doc(db, 'reviews', review.id), review);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.CREATE, `reviews/${review.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      try {
        await deleteDoc(doc(db, 'reviews', reviewId));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.DELETE, `reviews/${reviewId}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCustomer = async (username: string) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      try {
        await deleteDoc(doc(db, 'customers', username));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.DELETE, `customers/${username}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteEmployee = async (username: string) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      try {
        await deleteDoc(doc(db, 'employees', username));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.DELETE, `employees/${username}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSuccess = (userSession: { 
    username: string; 
    name: string; 
    role: 'customer' | 'employee';
    avatarUrl?: string;
    phone?: string;
    address?: string;
  }) => {
    setCurrentUser(userSession);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('customer');
  };

  // Menu Catalog Operations passed to Admin Console
  const handleAddMenuItem = async (item: MenuItem) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      try {
        await setDoc(doc(db, 'menuItems', item.id), item);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.CREATE, `menuItems/${item.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateMenuItem = async (updatedItem: MenuItem) => {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      try {
        await setDoc(doc(db, 'menuItems', updatedItem.id), updatedItem);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `menuItems/${updatedItem.id}`);
      }
    } catch (err) {
      console.error(err);
    }
    // Also update any matching item info in the cart to prevent price mismatch or stale info
    setCart((prev) => prev.map((cartItem) => {
      if (cartItem.menuItem.id === updatedItem.id) {
        return { ...cartItem, menuItem: updatedItem };
      }
      return cartItem;
    }));
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db, handleFirestoreError, OperationType } = await import('./lib/firebase');
      try {
        await deleteDoc(doc(db, 'menuItems', itemId));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.DELETE, `menuItems/${itemId}`);
      }
    } catch (err) {
      console.error(err);
    }
    // Remove deleted items from the active cart
    setCart((prev) => prev.filter((cartItem) => cartItem.menuItem.id !== itemId));
  };

  // If no active session, show the glorious Auth Gate Portal via secure routing
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<AuthScreen onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="bg-[#050505] min-h-screen text-gray-200 selection:bg-brand-orange selection:text-white flex flex-col antialiased relative">
      
      {/* Account Settings Dialog Modal for Customers */}
      <AccountSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onUpdateSuccess={(updatedUser) => {
          setCurrentUser(updatedUser);
        }}
      />
      
      {/* Real-time Toasts Layer */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="pointer-events-auto bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4.5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex gap-3 relative overflow-hidden glow-orange"
            >
              <div className="absolute top-0 inset-y-0 left-0 w-1 bg-[#FF6B00]" />
              <div className="flex-1">
                <h4 className="text-white text-xs font-bold leading-tight font-sans text-right">{toast.title}</h4>
                <p className="text-[10.5px] text-gray-400 mt-1.5 leading-relaxed text-right font-sans">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dynamic Header */}
      <Header 
        currentView={currentView} 
        setView={setView} 
        cart={cart} 
        setIsCartOpen={setIsCartOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Transitions Container */}
      <main className="flex-grow relative">
        <AnimatePresence mode="wait">
          <Routes>
            {/* Customer Route: Home catalog */}
            <Route 
              path="/" 
              element={
                <motion.div
                  key="customer-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <CustomerView 
                    cart={cart}
                    setCart={setCart}
                    isCartOpen={isCartOpen}
                    setIsCartOpen={setIsCartOpen}
                    onPlaceOrder={handlePlaceOrder}
                    menuItems={menuItems}
                    orders={orders}
                    currentUser={currentUser}
                    reviews={reviews}
                    onAddReview={handleAddReview}
                    onDeleteOrder={handleDeleteOrder}
                  />
                </motion.div>
              } 
            />

            {/* Customer Route: Checkout Selection */}
            <Route 
              path="/checkout" 
              element={
                <motion.div
                  key="checkout-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <CustomerView 
                    cart={cart}
                    setCart={setCart}
                    isCartOpen={isCartOpen}
                    setIsCartOpen={setIsCartOpen}
                    onPlaceOrder={handlePlaceOrder}
                    menuItems={menuItems}
                    orders={orders}
                    currentUser={currentUser}
                    reviews={reviews}
                    onAddReview={handleAddReview}
                    onDeleteOrder={handleDeleteOrder}
                  />
                </motion.div>
              } 
            />

            {/* Tap Payments Callback Route */}
            <Route 
              path="/payment-callback" 
              element={
                <motion.div
                  key="payment-callback-panel"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <PaymentCallback />
                </motion.div>
              }
            />

            {/* Protected Route for Admin/Executive Dashboard */}
            <Route 
              path="/admin" 
              element={
                currentUser.role === 'employee' ? (
                  <motion.div
                    key="admin-panel"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <AdminDashboard 
                      orders={orders}
                      onUpdateOrderStatus={handleUpdateOrderStatus}
                      onDeleteOrder={handleDeleteOrder}
                      menuItems={menuItems}
                      onAddMenuItem={handleAddMenuItem}
                      onUpdateMenuItem={handleUpdateMenuItem}
                      onDeleteMenuItem={handleDeleteMenuItem}
                      reviews={reviews}
                      onDeleteReview={handleDeleteReview}
                      customers={dbCustomers}
                      employees={dbEmployees}
                      onDeleteCustomer={handleDeleteCustomer}
                      onDeleteEmployee={handleDeleteEmployee}
                    />
                  </motion.div>
                ) : (
                  // Unauthorized block - redirect safely back to homepage
                  <Navigate to="/" replace />
                )
              } 
            />

            {/* Redirect if logged in visiting login page */}
            <Route path="/login" element={<Navigate to={currentUser.role === 'employee' ? '/admin' : '/'} replace />} />

            {/* Handle missing routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
