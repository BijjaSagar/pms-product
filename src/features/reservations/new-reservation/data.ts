import { store } from '../../../data/store';
import type { OutletCatalogItem, RoomCategoryOption } from './types';

/** The property's bookable room types (active, with at least one bookable room), from the store's real inventory. */
export function roomCategoriesFromStore(): RoomCategoryOption[] {
  const bookable = new Set(
    store
      .rooms()
      .filter((room) => room.isActive)
      .map((room) => room.roomTypeId),
  );
  return store
    .roomTypes()
    .filter((type) => type.isActive && bookable.has(type.id))
    .map((type) => ({
      id: type.id,
      name: type.name,
      baseRate: Number(type.baseRate),
      maxAdults: type.maxAdults,
      maxChildren: type.maxChildren,
      desc: type.description ?? '',
    }));
}

/** Stands in for a room type while a property has none, so the form can still render. */
export const NO_ROOM_CATEGORY: RoomCategoryOption = {
  id: '',
  name: 'No room types',
  baseRate: 0,
  maxAdults: 2,
  maxChildren: 0,
  desc: '',
};

export const MEAL_PLANS = [
  { code: 'EP', label: 'EP · Room only' },
  { code: 'CP', label: 'CP · Bed & breakfast' },
  { code: 'MAP', label: 'MAP · Half board' },
  { code: 'AP', label: 'AP · Full board' },
];

export const RATE_PLANS = [
  'Best Available Rates'
];

export const OUTLET_CATALOG: OutletCatalogItem[] = [
  { id: 'rest-breakfast', outletId: 'restaurant', outletName: 'Restaurant', name: 'Breakfast package', description: 'Breakfast for one guest', unitPrice: 450 },
  { id: 'rest-dinner', outletId: 'restaurant', outletName: 'Restaurant', name: 'Dinner package', description: 'Set dinner for one guest', unitPrice: 850 },
  { id: 'bar-minibar', outletId: 'bar', outletName: 'Bar', name: 'Minibar bundle', description: 'Standard minibar selection', unitPrice: 650 },
  { id: 'laundry-service', outletId: 'laundry', outletName: 'Laundry', name: 'Laundry service', description: 'Per-bag laundry service', unitPrice: 350 },
  { id: 'spa-session', outletId: 'spa', outletName: 'Spa', name: 'Spa session', description: '60-minute wellness treatment', unitPrice: 2500 },
  { id: 'airport-transfer', outletId: 'transport', outletName: 'Transport', name: 'Airport transfer', description: 'One-way hotel transfer', unitPrice: 1200 },
];
