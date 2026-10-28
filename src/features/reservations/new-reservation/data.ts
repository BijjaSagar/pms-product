import type { OutletCatalogItem } from './types';

export const FALLBACK_ROOM_CATEGORIES = [
  { id: 'standard', name: 'Standard', baseRate: 3500, maxAdults: 2, maxChildren: 1, desc: 'Comfortable essentials for a relaxed stay.' },
  { id: 'deluxe', name: 'Deluxe', baseRate: 4500, maxAdults: 2, maxChildren: 2, desc: 'A spacious room with premium amenities.' },
  { id: 'superior', name: 'Superior', baseRate: 5500, maxAdults: 3, maxChildren: 1, desc: 'A bright room with upgraded views.' },
  { id: 'executive', name: 'Executive', baseRate: 6500, maxAdults: 2, maxChildren: 2, desc: 'A refined room for work and longer stays.' },
  { id: 'family', name: 'Family Suite', baseRate: 8000, maxAdults: 4, maxChildren: 2, desc: 'Connected space for a family stay.' },
  { id: 'suite', name: 'Panorama Suite', baseRate: 12000, maxAdults: 2, maxChildren: 2, desc: 'A premium suite with separate living space.' },
];

export const MEAL_PLANS = [
  { code: 'EP', label: 'EP · Room only', surcharge: 0 },
  { code: 'CP', label: 'CP · Bed & breakfast', surcharge: 450 },
  { code: 'MAP', label: 'MAP · Half board', surcharge: 950 },
  { code: 'AP', label: 'AP · Full board', surcharge: 1400 },
];

export const RATE_PLANS = [
  'Best Available Rates'
];

export const SAMPLE_GUEST_DATABASE = [
  { id: 'g-1023', name: 'Aarav Iyer', phone: '+91 98765 43210', email: 'aarav.iyer@example.com', gst: '27AABCT1234A1Z5', companyName: 'TechCorp Solutions', city: 'Mumbai', vip: false },
  { id: 'g-1001', name: 'Amelia Hart', phone: '+44 7700 900123', email: 'amelia.hart@example.com', gst: '', companyName: '', city: 'London', vip: true },
  { id: 'g-1002', name: 'Daniel Okafor', phone: '+234 803 555 0110', email: 'daniel.okafor@example.com', gst: '', companyName: '', city: 'Lagos', vip: false },
  { id: 'g-1004', name: 'Wei Chen', phone: '+86 138 0013 8000', email: 'wei.chen@example.com', gst: '27AAACG1234A1Z5', companyName: 'Global Trade Co', city: 'Shanghai', vip: true },
];

export const OUTLET_NAMES = ['Restaurant', 'Bar', 'Laundry', 'Spa', 'Transport'] as const;

export const OUTLET_CATALOG: OutletCatalogItem[] = [
  { id: 'rest-breakfast', outletId: 'restaurant', outletName: 'Restaurant', name: 'Breakfast package', description: 'Breakfast for one guest', unitPrice: 450 },
  { id: 'rest-dinner', outletId: 'restaurant', outletName: 'Restaurant', name: 'Dinner package', description: 'Set dinner for one guest', unitPrice: 850 },
  { id: 'bar-minibar', outletId: 'bar', outletName: 'Bar', name: 'Minibar bundle', description: 'Standard minibar selection', unitPrice: 650 },
  { id: 'laundry-service', outletId: 'laundry', outletName: 'Laundry', name: 'Laundry service', description: 'Per-bag laundry service', unitPrice: 350 },
  { id: 'spa-session', outletId: 'spa', outletName: 'Spa', name: 'Spa session', description: '60-minute wellness treatment', unitPrice: 2500 },
  { id: 'airport-transfer', outletId: 'transport', outletName: 'Transport', name: 'Airport transfer', description: 'One-way hotel transfer', unitPrice: 1200 },
];
