/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FoodCategory = 'Burgers' | 'Pizzas' | 'Starters' | 'Desserts' | 'Drinks';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: FoodCategory;
  imageUrl: string;
  rating: number;
  prepTime: string; // e.g. "15 mins"
  spicy?: boolean;
  vegan?: boolean;
  popular?: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  notes?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string; // ISO String or clean relative display
  paymentMethod: 'Card' | 'Cash on Delivery';
  customerEmail?: string;
  paid?: boolean;
  tapChargeId?: string;
  paymentStatusDetail?: string;
}

export interface SalesStats {
  totalSales: number;
  activeOrders: number;
  revenueToday: number;
}

export interface Review {
  id: string;
  orderId: string;
  customerName: string;
  rating: number; // 1 to 5 stars
  comment: string;
  createdAt: string; // ISO string
  items?: string[]; // list of item names or food types for additional premium info
}
