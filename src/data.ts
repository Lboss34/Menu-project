/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MenuItem, Order } from './types';

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'b1',
    name: 'Truffle Obsidian Smash',
    description: 'Double smash dry-aged beef patties, artisan Swiss gruyère, black truffle paste, wood-smoked onion jam, gold-dusted brioche bun.',
    price: 18.50,
    category: 'Burgers',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    prepTime: '15 mins',
    popular: true
  },
  {
    id: 'b2',
    name: 'Vibrant Avocado Lava',
    description: 'Crispy buttermilk organic chicken breast, crushed Hass avocado, spicy sriracha honey emulsion, pickled daikon, glowing chili butter.',
    price: 16.00,
    category: 'Burgers',
    imageUrl: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    prepTime: '20 mins',
    spicy: true
  },
  {
    id: 'p1',
    name: 'Neapolitan Truffle Gold',
    description: 'Wood-fired organic sourdough, fresh fior di latte, white truffle oil, shaved parmigiano, prosciutto di Parma, wild rosemary.',
    price: 22.00,
    category: 'Pizzas',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    prepTime: '18 mins',
    popular: true
  },
  {
    id: 'p2',
    name: 'Hot Honey Hellfire',
    description: 'Artisanal cup & char pepperoni, hot smoky nduja paste, roasted red jalapeños, smoked buffalo mozzarella, wild mountain honey drizzle.',
    price: 20.50,
    category: 'Pizzas',
    imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=600&q=80',
    rating: 4.7,
    prepTime: '15 mins',
    spicy: true
  },
  {
    id: 's1',
    name: 'Gold Coast Truffle Fries',
    description: 'Hand-cut russet potatoes tossed in infused black truffle oil, loaded with freshly grated Grana Padano, garlic confit, and garden chives.',
    price: 9.50,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    prepTime: '8 mins'
  },
  {
    id: 's2',
    name: 'Glazed Chili Pepper Riblets',
    description: 'Slow-smoked local baby back riblets tossed in a sticky, sweet-and-spicy sesame chili glaze and toasted black sesame seeds.',
    price: 13.00,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    rating: 4.6,
    prepTime: '12 mins',
    spicy: true
  },
  {
    id: 'd1',
    name: 'Lava Fudge & Smoke Bean',
    description: 'Decadent dark chocolate molten sponge cake with Madagascar vanilla bean gelato core, smoked sea-salt crystals, and pure gold flake.',
    price: 11.00,
    category: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    prepTime: '10 mins',
    popular: true
  },
  {
    id: 'd2',
    name: 'Pistachio Velvet Tiramisu',
    description: 'Velvety dynamic mascarpone cheese layers infused with double espresso, Sicilian pistachio cream, and delicate dark chocolate curls.',
    price: 12.50,
    category: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    prepTime: '7 mins'
  },
  {
    id: 'dr1',
    name: 'Neon Ember Mocktail',
    description: 'Sparkling blood orange nectar infused with house ginger extraction, fresh Moroccan mint, rosemary bark smoky bitters.',
    price: 8.00,
    category: 'Drinks',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    prepTime: '5 mins',
    popular: true
  },
  {
    id: 'dr2',
    name: 'Cold brew Grapefruit Tonic',
    description: 'Flash-chilled Ethiopian espresso, premium tonic water, caramelized fresh grapefruit squeeze, and organic raw honeycomb syrup.',
    price: 7.50,
    category: 'Drinks',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    rating: 4.7,
    prepTime: '4 mins'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'TX-4925',
    customerName: 'Alex Customer',
    phone: '+1 (555) 777-8888',
    address: '99 Emerald Boulevard, Villa 5',
    items: [
      { id: 'b1', name: 'Truffle Obsidian Smash', quantity: 1, price: 18.50 },
      { id: 'p1', name: 'Neapolitan Truffle Gold', quantity: 1, price: 22.00 }
    ],
    total: 40.50,
    status: 'Preparing',
    createdAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago
    paymentMethod: 'Card',
    notes: 'Please cook the burger medium-well.'
  },
  {
    id: 'TX-4921',
    customerName: 'Marcus Thorne',
    phone: '+1 (555) 891-2304',
    address: '742 Platinum Court, Penthouse B',
    items: [
      { id: 'b1', name: 'Truffle Obsidian Smash', quantity: 2, price: 18.50 },
      { id: 's1', name: 'Gold Coast Truffle Fries', quantity: 1, price: 9.50 },
      { id: 'dr1', name: 'Neon Ember Mocktail', quantity: 2, price: 8.00 }
    ],
    total: 62.50,
    status: 'Pending',
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 mins ago
    paymentMethod: 'Card',
    notes: 'Please separate truffle fries sauce.'
  },
  {
    id: 'TX-4919',
    customerName: 'Elena Rostova',
    phone: '+1 (555) 304-9211',
    address: '124 Luxury Boulevard, Apt 14D',
    items: [
      { id: 'p1', name: 'Neapolitan Truffle Gold', quantity: 1, price: 22.00 },
      { id: 'd1', name: 'Lava Fudge & Smoke Bean', quantity: 1, price: 11.00 }
    ],
    total: 33.00,
    status: 'Preparing',
    createdAt: new Date(Date.now() - 17 * 60 * 1000).toISOString(), // 17 mins ago
    paymentMethod: 'Card'
  },
  {
    id: 'TX-4890',
    customerName: 'Christopher Reynolds',
    phone: '+1 (555) 102-3928',
    address: '88 Gold Coast Circle',
    items: [
      { id: 'p2', name: 'Hot Honey Hellfire', quantity: 2, price: 20.50 },
      { id: 'b2', name: 'Vibrant Avocado Lava', quantity: 1, price: 16.00 },
      { id: 's1', name: 'Gold Coast Truffle Fries', quantity: 2, price: 9.50 },
      { id: 'dr2', name: 'Cold brew Grapefruit Tonic', quantity: 3, price: 7.50 }
    ],
    total: 98.50,
    status: 'Out for Delivery',
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(), // 32 mins ago
    paymentMethod: 'Cash on Delivery',
    notes: 'Call on arrival. Ring penthouse gate bell.'
  },
  {
    id: 'TX-4820',
    customerName: 'Sophia Vance',
    phone: '+1 (555) 441-9021',
    address: '19 Velvet Ridge Way',
    items: [
      { id: 'b1', name: 'Truffle Obsidian Smash', quantity: 1, price: 18.50 },
      { id: 'd2', name: 'Pistachio Velvet Tiramisu', quantity: 1, price: 12.50 }
    ],
    total: 31.00,
    status: 'Delivered',
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(), // 2 hours ago
    paymentMethod: 'Card'
  }
];

export const INITIAL_REVIEWS: any[] = [
  {
    id: 'R-7023',
    orderId: 'TX-4820',
    customerName: 'Amina Al-Mansoor',
    rating: 5,
    comment: 'سماش برجر بالتروفل هو أطيب ما تذوقت على الإطلاق! اللحم طري للغاية والخبز المطلي ببريق الذهب يبعث على البهجة. سأكرر الطلب بالتأكيد.',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4h ago
    items: ['Truffle Obsidian Smash', 'Pistachio Velvet Tiramisu']
  },
  {
    id: 'R-7019',
    orderId: 'TX-4112',
    customerName: 'سلمان الفهد',
    rating: 5,
    comment: 'البيتزا النابولية مطهوة على الحطب باحترافية تامة، الأطراف مقرمشة وحشوة التروفل غنية جداً. التوصيل كان سريعاً والوجبة ساخنة وكأنها خرجت للتو من الفرن.',
    createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(), // 20h ago
    items: ['Neapolitan Truffle Gold']
  },
  {
    id: 'R-7012',
    orderId: 'TX-3904',
    customerName: 'Youssef Al-Harbi',
    rating: 4,
    comment: 'أعجبني برجر الأفوكادو الحار جداً والمشروبات منعشة ولذيذة. تقييمي 5 للخدمة والسرعة، و 4 للأطعمة لمحبّي النكهة الحارة المتوازنة.',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), // 2 days ago
    items: ['Vibrant Avocado Lava', 'Neon Ember Mocktail']
  }
];

