import { useState, useMemo, useCallback } from 'react';
import * as Lucide from 'lucide-react';
import { Modal } from '../components/overlays';
import { toast } from '../components/toastStore';
import { folioApi, frontDeskApi } from '../lib/api/pms';
import { useApiResource } from '../lib/api/useApiResource';
import { formatINR, formatNumber } from '../utils';

// Types
export interface BillingTransaction {
  id: string;
  date: string;
  time: string;
  rawDate: string;
  category: 'room' | 'food' | 'service' | 'spa' | 'transport' | 'minibar' | 'payment' | 'other';
  title: string;
  detail: string;
  reference: string;
  charge: number;
  credit: number;
  balance: number;
  iconType: 'room' | 'breakfast' | 'lunch' | 'spa' | 'car' | 'dinner' | 'minibar' | 'card' | 'other';
  backendId?: string;
  isVoided?: boolean;
}

export interface GuestBillingData {
  id: string;
  guestId: string;
  name: string;
  avatarInitials: string;
  status: 'In-house' | 'Checked-out' | 'Reserved';
  phone: string;
  email: string;
  stayDates: string;
  fromDate: string;
  toDate: string;
  nights: number;
  room: string;
  roomNumber: string;
  roomType: string;
  occupancy: string;
  adults: number;
  children: number;
  reservationCode: string;
  reservationStatus: 'Confirmed' | 'Checked-in' | 'Pending';
  folioStatus: 'Open' | 'Settled';
  currency: string;
  currencyCode: string;
  transactions: BillingTransaction[];
  payments: Array<{
    id: string;
    date: string;
    amount: number;
    method: string;
    ref: string;
    status: 'Received' | 'Refunded';
    cardLast4?: string;
  }>;
  summary: {
    roomCharges: number;
    extraServices: number;
    foodBeverage: number;
    otherCharges: number;
    subtotal: number;
    discount: number;
    taxesAndFees: number;
    gstAmount: number;
    occupancyTax: number;
    totalAmount: number;
    paymentsReceived: number;
    outstandingBalance: number;
  };
  backendFolioId?: string;
}

// Preset Guests Data (Aarav Iyer matches screenshot 100%)
const PRESET_GUESTS: GuestBillingData[] = [
  {
    id: 'aarav-iyer',
    guestId: 'G-1023',
    name: 'Aarav Iyer',
    avatarInitials: 'AI',
    status: 'In-house',
    phone: '+91 98765 43210',
    email: 'aarav.iyer@example.com',
    stayDates: 'Oct 13, 2026 → Oct 17, 2026 (4 nights)',
    fromDate: '2026-10-13',
    toDate: '2026-10-17',
    nights: 4,
    room: 'Room 201 • Deluxe',
    roomNumber: '201',
    roomType: 'Deluxe',
    occupancy: '2 Adults • 0 Children',
    adults: 2,
    children: 0,
    reservationCode: 'RSV-20261013-001',
    reservationStatus: 'Confirmed',
    folioStatus: 'Open',
    currency: '₹',
    currencyCode: 'INR',
    transactions: [
      {
        id: 'tx-1',
        date: '13 Oct 2026',
        time: '02:15 PM',
        rawDate: '2026-10-13',
        category: 'room',
        title: 'Room Charge - Deluxe',
        detail: 'Room 201 (1 night)',
        reference: 'AUTO',
        charge: 4000.0,
        credit: 0,
        balance: 4000.0,
        iconType: 'room',
      },
      {
        id: 'tx-2',
        date: '13 Oct 2026',
        time: '02:16 PM',
        rawDate: '2026-10-13',
        category: 'service',
        title: 'Breakfast',
        detail: '2 guests × ₹350',
        reference: 'SVC-1001',
        charge: 700.0,
        credit: 0,
        balance: 4700.0,
        iconType: 'breakfast',
      },
      {
        id: 'tx-3',
        date: '14 Oct 2026',
        time: '12:30 PM',
        rawDate: '2026-10-14',
        category: 'food',
        title: 'Restaurant - Lunch',
        detail: 'Room 201',
        reference: 'POS-4589',
        charge: 1250.0,
        credit: 0,
        balance: 5950.0,
        iconType: 'lunch',
      },
      {
        id: 'tx-4',
        date: '14 Oct 2026',
        time: '08:45 PM',
        rawDate: '2026-10-14',
        category: 'spa',
        title: 'Spa Treatment',
        detail: 'Aarav Iyer',
        reference: 'SPA-0201',
        charge: 2000.0,
        credit: 0,
        balance: 7950.0,
        iconType: 'spa',
      },
      {
        id: 'tx-5',
        date: '15 Oct 2026',
        time: '10:10 AM',
        rawDate: '2026-10-15',
        category: 'transport',
        title: 'Airport Transfer',
        detail: 'Drop service',
        reference: 'SVC-2034',
        charge: 1200.0,
        credit: 0,
        balance: 9150.0,
        iconType: 'car',
      },
      {
        id: 'tx-6',
        date: '15 Oct 2026',
        time: '07:40 PM',
        rawDate: '2026-10-15',
        category: 'food',
        title: 'Restaurant - Dinner',
        detail: 'Room 201',
        reference: 'POS-4678',
        charge: 1680.0,
        credit: 0,
        balance: 10830.0,
        iconType: 'dinner',
      },
      {
        id: 'tx-7',
        date: '16 Oct 2026',
        time: '09:00 AM',
        rawDate: '2026-10-16',
        category: 'service',
        title: 'Breakfast',
        detail: '2 guests × ₹350',
        reference: 'SVC-1001',
        charge: 700.0,
        credit: 0,
        balance: 11530.0,
        iconType: 'breakfast',
      },
      {
        id: 'tx-8',
        date: '16 Oct 2026',
        time: '06:25 PM',
        rawDate: '2026-10-16',
        category: 'minibar',
        title: 'Minibar',
        detail: 'Room 201',
        reference: 'MINI-014',
        charge: 480.0,
        credit: 0,
        balance: 12010.0,
        iconType: 'minibar',
      },
      {
        id: 'tx-9',
        date: '17 Oct 2026',
        time: '10:15 AM',
        rawDate: '2026-10-17',
        category: 'payment',
        title: 'Payment - Card',
        detail: 'VISA **** 4242',
        reference: 'PAY-0012',
        charge: 0,
        credit: 5000.0,
        balance: 7010.0,
        iconType: 'card',
      },
    ],
    payments: [
      {
        id: 'pm-1',
        date: '17 Oct 2026, 10:15 AM',
        amount: 5000.0,
        method: 'Card (VISA **** 4242)',
        ref: 'PAY-0012',
        status: 'Received',
        cardLast4: '4242',
      },
    ],
    summary: {
      roomCharges: 12000.0,
      extraServices: 3800.0,
      foodBeverage: 2930.0,
      otherCharges: 480.0,
      subtotal: 19210.0,
      discount: 0.0,
      taxesAndFees: 2305.2,
      gstAmount: 1921.2,
      occupancyTax: 384.0,
      totalAmount: 21515.2,
      paymentsReceived: 5000.0,
      outstandingBalance: 16515.2,
    },
  },
  {
    id: 'amelia-hart',
    guestId: 'G-1048',
    name: 'Amelia Hart',
    avatarInitials: 'AH',
    status: 'In-house',
    phone: '+1 415 555 0192',
    email: 'amelia.hart@example.com',
    stayDates: 'Oct 14, 2026 → Oct 18, 2026 (4 nights)',
    fromDate: '2026-10-14',
    toDate: '2026-10-18',
    nights: 4,
    room: 'Room 204 • Suite',
    roomNumber: '204',
    roomType: 'Suite',
    occupancy: '1 Adult • 0 Children',
    adults: 1,
    children: 0,
    reservationCode: 'RSV-20261014-002',
    reservationStatus: 'Confirmed',
    folioStatus: 'Open',
    currency: '₹',
    currencyCode: 'INR',
    transactions: [
      {
        id: 'ah-1',
        date: '14 Oct 2026',
        time: '01:00 PM',
        rawDate: '2026-10-14',
        category: 'room',
        title: 'Room Charge - Suite',
        detail: 'Room 204 (1 night)',
        reference: 'AUTO',
        charge: 8000.0,
        credit: 0,
        balance: 8000.0,
        iconType: 'room',
      },
      {
        id: 'ah-2',
        date: '14 Oct 2026',
        time: '08:30 PM',
        rawDate: '2026-10-14',
        category: 'spa',
        title: 'Spa Treatment - Aromatherapy',
        detail: 'Amelia Hart',
        reference: 'SPA-0312',
        charge: 3500.0,
        credit: 0,
        balance: 11500.0,
        iconType: 'spa',
      },
      {
        id: 'ah-3',
        date: '15 Oct 2026',
        time: '09:15 AM',
        rawDate: '2026-10-15',
        category: 'service',
        title: 'Room Service - Breakfast',
        detail: 'Continental platter',
        reference: 'SVC-1045',
        charge: 850.0,
        credit: 0,
        balance: 12350.0,
        iconType: 'breakfast',
      },
      {
        id: 'ah-4',
        date: '15 Oct 2026',
        time: '02:00 PM',
        rawDate: '2026-10-15',
        category: 'payment',
        title: 'Payment - Card',
        detail: 'Mastercard **** 8812',
        reference: 'PAY-0034',
        charge: 0,
        credit: 8000.0,
        balance: 4350.0,
        iconType: 'card',
      },
    ],
    payments: [
      {
        id: 'pm-ah1',
        date: '15 Oct 2026, 02:00 PM',
        amount: 8000.0,
        method: 'Card (Mastercard **** 8812)',
        ref: 'PAY-0034',
        status: 'Received',
        cardLast4: '8812',
      },
    ],
    summary: {
      roomCharges: 8000.0,
      extraServices: 4350.0,
      foodBeverage: 0.0,
      otherCharges: 0.0,
      subtotal: 12350.0,
      discount: 0.0,
      taxesAndFees: 1482.0,
      gstAmount: 1235.0,
      occupancyTax: 247.0,
      totalAmount: 13832.0,
      paymentsReceived: 8000.0,
      outstandingBalance: 5832.0,
    },
  },
  {
    id: 'sofia-lind',
    guestId: 'G-1015',
    name: 'Sofia Lind',
    avatarInitials: 'SL',
    status: 'In-house',
    phone: '+46 8 123 4567',
    email: 'sofia.lind@example.com',
    stayDates: 'Oct 12, 2026 → Oct 16, 2026 (4 nights)',
    fromDate: '2026-10-12',
    toDate: '2026-10-16',
    nights: 4,
    room: 'Room 305 • Superior',
    roomNumber: '305',
    roomType: 'Superior',
    occupancy: '2 Adults • 1 Child',
    adults: 2,
    children: 1,
    reservationCode: 'RSV-20261012-003',
    reservationStatus: 'Confirmed',
    folioStatus: 'Open',
    currency: '₹',
    currencyCode: 'INR',
    transactions: [
      {
        id: 'sl-1',
        date: '12 Oct 2026',
        time: '03:00 PM',
        rawDate: '2026-10-12',
        category: 'room',
        title: 'Room Charge - Superior',
        detail: 'Room 305 (1 night)',
        reference: 'AUTO',
        charge: 5500.0,
        credit: 0,
        balance: 5500.0,
        iconType: 'room',
      },
      {
        id: 'sl-2',
        date: '13 Oct 2026',
        time: '07:30 PM',
        rawDate: '2026-10-13',
        category: 'food',
        title: 'Buffet Dinner',
        detail: 'Family table (3 pax)',
        reference: 'POS-4890',
        charge: 2400.0,
        credit: 0,
        balance: 7900.0,
        iconType: 'dinner',
      },
      {
        id: 'sl-3',
        date: '14 Oct 2026',
        time: '11:00 AM',
        rawDate: '2026-10-14',
        category: 'payment',
        title: 'Payment - Transfer',
        detail: 'Bank Transfer (IMPS)',
        reference: 'PAY-0089',
        charge: 0,
        credit: 6000.0,
        balance: 1900.0,
        iconType: 'card',
      },
    ],
    payments: [
      {
        id: 'pm-sl1',
        date: '14 Oct 2026, 11:00 AM',
        amount: 6000.0,
        method: 'Bank Transfer (IMPS)',
        ref: 'PAY-0089',
        status: 'Received',
      },
    ],
    summary: {
      roomCharges: 5500.0,
      extraServices: 0.0,
      foodBeverage: 2400.0,
      otherCharges: 0.0,
      subtotal: 7900.0,
      discount: 0.0,
      taxesAndFees: 948.0,
      gstAmount: 790.0,
      occupancyTax: 158.0,
      totalAmount: 8848.0,
      paymentsReceived: 6000.0,
      outstandingBalance: 2848.0,
    },
  },
  {
    id: 'daniel-okafor',
    guestId: 'G-1002',
    name: 'Daniel Okafor',
    avatarInitials: 'DO',
    status: 'In-house',
    phone: '+44 20 7946 0912',
    email: 'daniel.okafor@example.com',
    stayDates: 'Oct 11, 2026 → Oct 19, 2026 (8 nights)',
    fromDate: '2026-10-11',
    toDate: '2026-10-19',
    nights: 8,
    room: 'Room 501 • Penthouse',
    roomNumber: '501',
    roomType: 'Penthouse',
    occupancy: '2 Adults • 2 Children',
    adults: 2,
    children: 2,
    reservationCode: 'RSV-20261011-004',
    reservationStatus: 'Confirmed',
    folioStatus: 'Settled',
    currency: '₹',
    currencyCode: 'INR',
    transactions: [
      {
        id: 'do-1',
        date: '11 Oct 2026',
        time: '02:00 PM',
        rawDate: '2026-10-11',
        category: 'room',
        title: 'Room Charge - Penthouse',
        detail: 'Room 501 (1 night)',
        reference: 'AUTO',
        charge: 15000.0,
        credit: 0,
        balance: 15000.0,
        iconType: 'room',
      },
      {
        id: 'do-2',
        date: '11 Oct 2026',
        time: '04:00 PM',
        rawDate: '2026-10-11',
        category: 'payment',
        title: 'Payment - Card',
        detail: 'Amex **** 1009',
        reference: 'PAY-0099',
        charge: 0,
        credit: 17100.0,
        balance: 0.0,
        iconType: 'card',
      },
    ],
    payments: [
      {
        id: 'pm-do1',
        date: '11 Oct 2026, 04:00 PM',
        amount: 17100.0,
        method: 'Amex (**** 1009)',
        ref: 'PAY-0099',
        status: 'Received',
        cardLast4: '1009',
      },
    ],
    summary: {
      roomCharges: 15000.0,
      extraServices: 0.0,
      foodBeverage: 0.0,
      otherCharges: 0.0,
      subtotal: 15000.0,
      discount: 0.0,
      taxesAndFees: 2100.0,
      gstAmount: 1800.0,
      occupancyTax: 300.0,
      totalAmount: 17100.0,
      paymentsReceived: 17100.0,
      outstandingBalance: 0.0,
    },
  },
];

export function Billing() {
  // Load in-house stays from backend if available
  const loadStays = useCallback(async () => {
    try {
      const res = await frontDeskApi.inHouse();
      return res.data || [];
    } catch {
      return [];
    }
  }, []);

  const resource = useApiResource(loadStays);

  // Guest list state with presets
  const [guests, setGuests] = useState<GuestBillingData[]>(PRESET_GUESTS);
  const [selectedGuestId, setSelectedGuestId] = useState<string>('aarav-iyer');

  // Synchronize backend in-house stays if available
  const [prevStays, setPrevStays] = useState(resource.data);
  if (resource.data !== prevStays) {
    setPrevStays(resource.data);
    const stays = resource.data;
    if (stays && stays.length > 0) {
      const existingCodes = new Set(guests.map((g) => g.reservationCode));
      const backendGuests: GuestBillingData[] = stays
        .filter((stay) => stay.folioId && !existingCodes.has(stay.bookingCode || stay.id))
        .map((stay) => {
          const initials = stay.guestName
            ? stay.guestName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : 'GH';
          return {
            id: stay.id,
            guestId: stay.guestId || `G-${stay.id.slice(0, 4)}`,
            name: stay.guestName || 'In-House Guest',
            avatarInitials: initials,
            status: 'In-house',
            phone: '+91 98765 00000',
            email: 'guest@example.com',
            stayDates: `${stay.checkInDate} → ${stay.checkOutDate}`,
            fromDate: stay.checkInDate,
            toDate: stay.checkOutDate,
            nights: 1,
            room: `Room ${stay.roomNumber || '—'}`,
            roomNumber: stay.roomNumber || '—',
            roomType: 'Deluxe',
            occupancy: '1 Adult • 0 Children',
            adults: 1,
            children: 0,
            reservationCode: stay.bookingCode || stay.id,
            reservationStatus: 'Confirmed',
            folioStatus: 'Open',
            currency: '₹',
            currencyCode: 'INR',
            transactions: [],
            payments: [],
            summary: {
              roomCharges: 0,
              extraServices: 0,
              foodBeverage: 0,
              otherCharges: 0,
              subtotal: 0,
              discount: 0,
              taxesAndFees: 0,
              gstAmount: 0,
              occupancyTax: 0,
              totalAmount: 0,
              paymentsReceived: 0,
              outstandingBalance: 0,
            },
            backendFolioId: stay.folioId || undefined,
          };
        });
      if (backendGuests.length > 0) {
        setGuests((prev) => [...prev, ...backendGuests]);
      }
    }
  }

  // Currently active guest
  const currentGuest = useMemo(() => {
    return guests.find((g) => g.id === selectedGuestId) || guests[0];
  }, [guests, selectedGuestId]);

  // Main navigation tabs
  const [activeTab, setActiveTab] = useState<
    'Guest Folio' | 'Room Folios (1)' | 'Other Folios (0)' | 'Payments' | 'Statements' | 'History'
  >('Guest Folio');

  // Table filters
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [fromDate, setFromDate] = useState<string>('13-10-2026');
  const [toDate, setToDate] = useState<string>('17-10-2026');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [taxesExpanded, setTaxesExpanded] = useState<boolean>(true);

  // Modals state
  const [postChargeModalOpen, setPostChargeModalOpen] = useState(false);
  const [postChargeData, setPostChargeData] = useState({
    title: '',
    category: 'service' as BillingTransaction['category'],
    amount: '',
    reference: '',
    detail: '',
  });

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'Card (VISA **** 4242)',
    ref: 'PAY-1001',
  });

  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountData, setDiscountData] = useState({
    type: 'amount' as 'percent' | 'amount',
    value: '',
    reason: '',
  });

  const [splitFolioModalOpen, setSplitFolioModalOpen] = useState(false);
  const [splitMethod, setSplitMethod] = useState<'percent' | 'items'>('percent');
  const [splitPercent, setSplitPercent] = useState('50');

  const [settleFolioModalOpen, setSettleFolioModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [voidModalOpen, setVoidModalOpen] = useState<{ id: string; title: string } | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);



  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return currentGuest.transactions.filter((tx) => {
      // Category filter
      if (categoryFilter !== 'All') {
        if (categoryFilter === 'Room charges' && tx.category !== 'room') return false;
        if (categoryFilter === 'Extra Services' && tx.category !== 'service' && tx.category !== 'spa' && tx.category !== 'transport') return false;
        if (categoryFilter === 'Food & Beverage' && tx.category !== 'food') return false;
        if (categoryFilter === 'Other charges' && tx.category !== 'minibar' && tx.category !== 'other') return false;
        if (categoryFilter === 'Payments & Credits' && tx.category !== 'payment') return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(query);
        const matchDetail = tx.detail.toLowerCase().includes(query);
        const matchRef = tx.reference.toLowerCase().includes(query);
        if (!matchTitle && !matchDetail && !matchRef) return false;
      }
      return true;
    });
  }, [currentGuest.transactions, categoryFilter, searchQuery]);

  // Toggle selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTxIds(filteredTransactions.map((t) => t.id));
    } else {
      setSelectedTxIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedTxIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Helper to recompute totals for the active guest
  const recalculateGuestTotals = (updatedGuest: GuestBillingData): GuestBillingData => {
    let roomTotal = 0;
    let extraServicesTotal = 0;
    let foodBeverageTotal = 0;
    let otherTotal = 0;
    let runningBalance = 0;

    const newTransactions = updatedGuest.transactions.map((tx) => {
      if (!tx.isVoided) {
        if (tx.category === 'room') roomTotal += tx.charge;
        else if (tx.category === 'service' || tx.category === 'spa' || tx.category === 'transport') extraServicesTotal += tx.charge;
        else if (tx.category === 'food') foodBeverageTotal += tx.charge;
        else if (tx.category === 'minibar' || tx.category === 'other') otherTotal += tx.charge;

        runningBalance += tx.charge - tx.credit;
      }
      return {
        ...tx,
        balance: runningBalance,
      };
    });

    const subtotal = roomTotal + extraServicesTotal + foodBeverageTotal + otherTotal;
    const discount = updatedGuest.summary.discount;
    const taxableAmount = Math.max(0, subtotal - discount);
    const gstAmount = Number((taxableAmount * 0.1).toFixed(2));
    const occupancyTax = Number((taxableAmount * 0.02).toFixed(2));
    const taxesAndFees = Number((gstAmount + occupancyTax).toFixed(2));
    const totalAmount = Number((taxableAmount + taxesAndFees).toFixed(2));
    const paymentsReceived = updatedGuest.payments.reduce((acc, p) => acc + p.amount, 0);
    const outstandingBalance = Number((totalAmount - paymentsReceived).toFixed(2));

    return {
      ...updatedGuest,
      transactions: newTransactions,
      folioStatus: outstandingBalance <= 0 ? 'Settled' : 'Open',
      summary: {
        ...updatedGuest.summary,
        roomCharges: roomTotal,
        extraServices: extraServicesTotal,
        foodBeverage: foodBeverageTotal,
        otherCharges: otherTotal,
        subtotal,
        taxesAndFees,
        gstAmount,
        occupancyTax,
        totalAmount,
        paymentsReceived,
        outstandingBalance,
      },
    };
  };

  // Action: Add Charge
  const handlePostCharge = async () => {
    const num = parseFloat(postChargeData.amount);
    if (!postChargeData.title.trim()) {
      toast('Please enter a charge description', { tone: 'warning' });
      return;
    }
    if (isNaN(num) || num <= 0) {
      toast('Please enter a valid amount', { tone: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentGuest.backendFolioId) {
        await folioApi.postItem(currentGuest.backendFolioId, {
          type: 'INCIDENTAL',
          description: postChargeData.title,
          quantity: '1',
          unitAmount: num.toFixed(2),
        });
      }

      const now = new Date();
      const dateStr = `${now.getDate()} Oct ${now.getFullYear()}`;
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let iconType: BillingTransaction['iconType'] = 'other';
      if (postChargeData.category === 'room') iconType = 'room';
      else if (postChargeData.category === 'food') iconType = 'lunch';
      else if (postChargeData.category === 'spa') iconType = 'spa';
      else if (postChargeData.category === 'transport') iconType = 'car';
      else if (postChargeData.category === 'minibar') iconType = 'minibar';
      else if (postChargeData.category === 'service') iconType = 'breakfast';

      const newTx: BillingTransaction = {
        id: `tx-${Date.now()}`,
        date: dateStr,
        time: timeStr,
        rawDate: now.toISOString().split('T')[0],
        category: postChargeData.category,
        title: postChargeData.title,
        detail: postChargeData.detail || `Room ${currentGuest.roomNumber}`,
        reference: postChargeData.reference || `SVC-${Math.floor(1000 + Math.random() * 9000)}`,
        charge: num,
        credit: 0,
        balance: 0,
        iconType,
      };

      setGuests((prev) =>
        prev.map((g) => {
          if (g.id === currentGuest.id) {
            const updated = {
              ...g,
              transactions: [...g.transactions, newTx],
            };
            return recalculateGuestTotals(updated);
          }
          return g;
        }),
      );

      toast('Charge posted successfully', {
        detail: `${postChargeData.title} · ${formatINR(num)} posted to Room ${currentGuest.roomNumber}`,
        tone: 'success',
      });
      setPostChargeModalOpen(false);
      setPostChargeData({ title: '', category: 'service', amount: '', reference: '', detail: '' });
    } catch {
      toast('Failed to post charge', { tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Add Payment
  const handleRecordPayment = async () => {
    const num = parseFloat(paymentData.amount);
    if (isNaN(num) || num <= 0) {
      toast('Please enter a valid payment amount', { tone: 'warning' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentGuest.backendFolioId) {
        await folioApi.payment(currentGuest.backendFolioId, {
          amount: num.toFixed(2),
          method: 'CARD_TERMINAL',
        });
      }

      const now = new Date();
      const dateStr = `${now.getDate()} Oct ${now.getFullYear()}`;
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newPayment = {
        id: `pm-${Date.now()}`,
        date: `${dateStr}, ${timeStr}`,
        amount: num,
        method: paymentData.method,
        ref: paymentData.ref,
        status: 'Received' as const,
      };

      const newTx: BillingTransaction = {
        id: `tx-${Date.now()}`,
        date: dateStr,
        time: timeStr,
        rawDate: now.toISOString().split('T')[0],
        category: 'payment',
        title: `Payment - ${paymentData.method.split(' ')[0]}`,
        detail: paymentData.method,
        reference: paymentData.ref,
        charge: 0,
        credit: num,
        balance: 0,
        iconType: 'card',
      };

      setGuests((prev) =>
        prev.map((g) => {
          if (g.id === currentGuest.id) {
            const updated = {
              ...g,
              transactions: [...g.transactions, newTx],
              payments: [newPayment, ...g.payments],
            };
            return recalculateGuestTotals(updated);
          }
          return g;
        }),
      );

      toast('Payment recorded successfully', {
        detail: `${formatINR(num)} received via ${paymentData.method} (${paymentData.ref})`,
        tone: 'success',
      });
      setPaymentModalOpen(false);
      setPaymentData({
        amount: '',
        method: 'Card (VISA **** 4242)',
        ref: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    } catch {
      toast('Failed to record payment', { tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Void Charge
  const handleVoidCharge = () => {
    if (!voidModalOpen) return;
    if (!voidReason.trim()) {
      toast('Please provide a reason to void this item', { tone: 'warning' });
      return;
    }

    setGuests((prev) =>
      prev.map((g) => {
        if (g.id === currentGuest.id) {
          const updated = {
            ...g,
            transactions: g.transactions.filter((t) => t.id !== voidModalOpen.id),
          };
          return recalculateGuestTotals(updated);
        }
        return g;
      }),
    );

    toast('Charge voided', {
      detail: `${voidModalOpen.title} voided: "${voidReason}"`,
      tone: 'success',
    });
    setVoidModalOpen(null);
    setVoidReason('');
  };

  // Action: Apply Discount
  const handleApplyDiscount = () => {
    const val = parseFloat(discountData.value);
    if (isNaN(val) || val <= 0) {
      toast('Please enter a valid discount value', { tone: 'warning' });
      return;
    }

    let discountAmount = val;
    if (discountData.type === 'percent') {
      discountAmount = (currentGuest.summary.subtotal * val) / 100;
    }

    setGuests((prev) =>
      prev.map((g) => {
        if (g.id === currentGuest.id) {
          const updated = {
            ...g,
            summary: {
              ...g.summary,
              discount: discountAmount,
            },
          };
          return recalculateGuestTotals(updated);
        }
        return g;
      }),
    );

    toast('Discount applied', {
      detail: `${formatINR(discountAmount)} applied to Folio ${currentGuest.reservationCode}`,
      tone: 'success',
    });
    setDiscountModalOpen(false);
    setDiscountData({ type: 'amount', value: '', reason: '' });
  };

  // Action: Settle Folio
  const handleSettleFolio = () => {
    const bal = currentGuest.summary.outstandingBalance;
    if (bal <= 0) {
      toast('Folio is already fully settled', { tone: 'info' });
      setSettleFolioModalOpen(false);
      return;
    }

    const now = new Date();
    const dateStr = `${now.getDate()} Oct ${now.getFullYear()}`;
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ref = `PAY-SETTLE-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment = {
      id: `pm-settle-${Date.now()}`,
      date: `${dateStr}, ${timeStr}`,
      amount: bal,
      method: 'Card Terminal (Settlement)',
      ref,
      status: 'Received' as const,
    };

    const newTx: BillingTransaction = {
      id: `tx-settle-${Date.now()}`,
      date: dateStr,
      time: timeStr,
      rawDate: now.toISOString().split('T')[0],
      category: 'payment',
      title: 'Payment - Final Settlement',
      detail: 'Card Terminal settlement',
      reference: ref,
      charge: 0,
      credit: bal,
      balance: 0,
      iconType: 'card',
    };

    setGuests((prev) =>
      prev.map((g) => {
        if (g.id === currentGuest.id) {
          const updated = {
            ...g,
            transactions: [...g.transactions, newTx],
            payments: [newPayment, ...g.payments],
          };
          return recalculateGuestTotals(updated);
        }
        return g;
      }),
    );

    toast('Folio settled successfully', {
      detail: `Full balance of ${formatINR(bal)} cleared. Folio marked as Settled.`,
      tone: 'success',
    });
    setSettleFolioModalOpen(false);
  };

  // Render category icon badge for table
  const renderItemIcon = (type: BillingTransaction['iconType']) => {
    switch (type) {
      case 'room':
        return (
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
            <Lucide.BedDouble size={18} />
          </div>
        );
      case 'breakfast':
        return (
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
            <Lucide.Coffee size={18} />
          </div>
        );
      case 'lunch':
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <Lucide.Utensils size={18} />
          </div>
        );
      case 'spa':
        return (
          <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center flex-shrink-0">
            <Lucide.Sparkles size={18} />
          </div>
        );
      case 'car':
        return (
          <div className="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center flex-shrink-0">
            <Lucide.Car size={18} />
          </div>
        );
      case 'dinner':
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
            <Lucide.UtensilsCrossed size={18} />
          </div>
        );
      case 'minibar':
        return (
          <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
            <Lucide.Package size={18} />
          </div>
        );
      case 'card':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Lucide.CreditCard size={18} />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-muted-surface text-ink-secondary border border-border flex items-center justify-center flex-shrink-0">
            <Lucide.FileText size={18} />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* 1. TOP HEADER & GUEST SELECTOR */}
      <div className="flex flex-col gap-4">
        {/* Title & Action Buttons Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-ink flex items-center gap-2.5">
              <Lucide.ReceiptText className="text-primary" size={28} />
              <span>Folios & Billing</span>
            </h1>
            <p className="text-xs text-ink-secondary mt-1">
              View, manage and settle guest folios, post charges and generate invoices
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => window.print()}
              className="pms-btn-ghost px-3.5 py-2 text-sm font-medium flex items-center gap-2"
            >
              <Lucide.Printer size={15} />
              <span>Print Folio</span>
            </button>
            <button
              type="button"
              onClick={() => setEmailModalOpen(true)}
              className="pms-btn-ghost px-3.5 py-2 text-sm font-medium flex items-center gap-2"
            >
              <Lucide.Mail size={15} />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => setPostChargeModalOpen(true)}
              className="pms-btn-primary px-4 py-2 text-sm font-semibold flex items-center gap-2"
            >
              <Lucide.Plus size={16} />
              <span>Add Charge</span>
              <Lucide.ChevronDown size={14} className="opacity-70" />
            </button>
          </div>
        </div>

        {/* PROMINENT GUEST SELECT BOX AT THE TOP (User requested) */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-xs"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
              style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}
            >
              <Lucide.UserCheck size={18} />
            </div>
            <div>
              <label htmlFor="top-guest-select" className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                Select Guest / Folio
              </label>
              <span className="text-xs text-ink-secondary font-medium">
                Choose an in-house guest to manage charges &amp; invoices
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-[280px] sm:min-w-[360px]">
              <select
                id="top-guest-select"
                value={selectedGuestId}
                onChange={(e) => setSelectedGuestId(e.target.value)}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border font-bold text-ink text-[13px] shadow-xs cursor-pointer appearance-none transition-all"
                style={{
                  background: 'var(--color-page)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {guests.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} · Room {g.roomNumber} ({g.roomType}) — {g.reservationCode}
                  </option>
                ))}
              </select>
              <Lucide.ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            </div>

            <span
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
              style={{
                background: 'var(--color-muted-surface)',
                color: 'var(--color-primary)',
                borderColor: 'var(--color-border)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>In-house ({guests.length})</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. GUEST & STAY SUMMARY BANNER (Matching reference 100%) */}
      <div
        className="rounded-2xl border p-4 sm:p-5 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-5 items-center"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Left Column: Avatar & Guest Profile */}
        <div className="md:col-span-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-xs">
            {currentGuest.avatarInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-ink truncate">{currentGuest.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                {currentGuest.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink-secondary mt-1.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Lucide.Phone size={13} className="text-ink-muted" />
                <span>{currentGuest.phone}</span>
              </span>
              <span className="flex items-center gap-1">
                <Lucide.Mail size={13} className="text-ink-muted" />
                <span>{currentGuest.email}</span>
              </span>
              <span className="flex items-center gap-1">
                <Lucide.User size={13} className="text-ink-muted" />
                <span>{currentGuest.guestId}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Center Column: Stay Details */}
        <div className="md:col-span-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-5 flex flex-col gap-1.5 text-xs text-ink-secondary" style={{ borderColor: 'var(--color-divider)' }}>
          <p className="font-semibold text-ink-muted text-[11px] uppercase tracking-wider">Stay Details</p>
          <div className="flex items-center gap-2 text-ink">
            <Lucide.Calendar size={14} className="text-ink-muted flex-shrink-0" />
            <span className="font-medium">{currentGuest.stayDates}</span>
          </div>
          <div className="flex items-center gap-2 text-ink">
            <Lucide.BedDouble size={14} className="text-ink-muted flex-shrink-0" />
            <span className="font-medium">{currentGuest.room}</span>
          </div>
          <div className="flex items-center gap-2 text-ink">
            <Lucide.Users size={14} className="text-ink-muted flex-shrink-0" />
            <span className="font-medium">{currentGuest.occupancy}</span>
          </div>
        </div>

        {/* Right Column: Reservation & Status */}
        <div className="md:col-span-3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-5 flex flex-col justify-center gap-2" style={{ borderColor: 'var(--color-divider)' }}>
          <div>
            <p className="font-semibold text-ink-muted text-[11px] uppercase tracking-wider">Reservation</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-ink text-sm sm:text-[15px]">{currentGuest.reservationCode}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>{currentGuest.reservationStatus}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast(`Opening details for ${currentGuest.reservationCode}`, { tone: 'info' })}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 w-fit mt-0.5"
          >
            <span>View reservation</span>
            <Lucide.ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* 3. NAVIGATION TABS */}
      <div className="border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {(
            [
              'Guest Folio',
              'Room Folios (1)',
              'Other Folios (0)',
              'Payments',
              'Statements',
              'History',
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors relative ${
                  isActive ? 'text-primary' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                <span>{tab}</span>
                {isActive ? (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: 'var(--color-primary)' }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT: GUEST FOLIO VIEW */}
      {activeTab === 'Guest Folio' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: CHARGES & TRANSACTIONS TABLE (~68%) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Filters Bar above table */}
            <div
              className="p-3 rounded-2xl border shadow-xs flex flex-wrap items-center justify-between gap-3"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
                {/* Category Select */}
                <div className="relative min-w-[130px]">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 rounded-xl border text-xs font-bold text-ink cursor-pointer appearance-none shadow-xs"
                    style={{ background: 'var(--color-page)', borderColor: 'var(--color-border)' }}
                  >
                    <option value="All">All charges</option>
                    <option value="Room charges">Room charges</option>
                    <option value="Extra Services">Extra Services</option>
                    <option value="Food &amp; Beverage">Food &amp; Beverage</option>
                    <option value="Other charges">Other charges</option>
                    <option value="Payments &amp; Credits">Payments &amp; Credits</option>
                  </select>
                  <Lucide.ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                </div>

                {/* From Date */}
                <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                  <span>From</span>
                  <div className="relative">
                    <input
                      type="text"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="pl-3 pr-7 py-1.5 rounded-xl border text-xs font-semibold text-ink w-[110px]"
                      style={{ background: 'var(--color-page)', borderColor: 'var(--color-border)' }}
                    />
                    <Lucide.Calendar size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  </div>
                </div>

                {/* To Date */}
                <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium">
                  <span>To</span>
                  <div className="relative">
                    <input
                      type="text"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="pl-3 pr-7 py-1.5 rounded-xl border text-xs font-semibold text-ink w-[110px]"
                      style={{ background: 'var(--color-page)', borderColor: 'var(--color-border)' }}
                    />
                    <Lucide.Calendar size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative flex-1 min-w-[180px]">
                  <Lucide.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search description or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl border text-xs text-ink placeholder:text-ink-muted shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                    style={{ background: 'var(--color-page)', borderColor: 'var(--color-border)' }}
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                    >
                      <Lucide.X size={12} />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* More Filters button */}
              <button
                type="button"
                onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
                className={`pms-btn-ghost px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 ${
                  moreFiltersOpen ? 'bg-primary/10 text-primary border-primary/30' : ''
                }`}
              >
                <Lucide.SlidersHorizontal size={13} />
                <span>More filters</span>
              </button>
            </div>

            {/* More filters drawer panel if toggled */}
            {moreFiltersOpen ? (
              <div
                className="p-3.5 rounded-2xl border text-xs flex flex-wrap items-center gap-4 animate-in fade-in"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
              >
                <span className="font-bold text-ink">Active filters:</span>
                <span className="text-ink-secondary">Showing charges for stay period 13-10-2026 to 17-10-2026.</span>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('All');
                    setSearchQuery('');
                  }}
                  className="text-primary font-semibold hover:underline ml-auto"
                >
                  Reset all filters
                </button>
              </div>
            ) : null}

            {/* Charges Table Card */}
            <div
              className="rounded-2xl border shadow-xs overflow-hidden"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr
                      className="border-b text-[11px] font-bold uppercase tracking-wider text-ink-muted bg-slate-50/90"
                      style={{ borderColor: 'var(--color-divider)' }}
                    >
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={
                            selectedTxIds.length > 0 &&
                            selectedTxIds.length === filteredTransactions.length
                          }
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3 font-bold">Date</th>
                      <th className="py-2.5 px-3 font-bold">Description</th>
                      <th className="py-2.5 px-3 font-bold">Reference</th>
                      <th className="py-2.5 px-3 font-bold text-right">Charges ({currentGuest.currency})</th>
                      <th className="py-2.5 px-3 font-bold text-right">Credits ({currentGuest.currency})</th>
                      <th className="py-2.5 px-3 font-bold text-right">Balance ({currentGuest.currency})</th>
                      <th className="py-2.5 px-3 font-bold text-center w-12">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-ink" style={{ borderColor: 'var(--color-divider)' }}>
                    {filteredTransactions.map((tx) => {
                      const isSelected = selectedTxIds.includes(tx.id);
                      return (
                        <tr
                          key={tx.id}
                          className={`transition-colors hover:bg-black/[0.015] ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(tx.id)}
                              className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>

                          {/* Date & Time */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-ink text-[12.5px]">{tx.date}</div>
                            <div className="text-[11px] text-ink-muted font-medium">{tx.time}</div>
                          </td>

                          {/* Description with Icon */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-3">
                              {renderItemIcon(tx.iconType)}
                              <div>
                                <div className="font-bold text-ink text-[13px]">{tx.title}</div>
                                <div className="text-[11.5px] text-ink-muted">{tx.detail}</div>
                              </div>
                            </div>
                          </td>

                          {/* Reference */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-ink-secondary bg-muted-surface border border-border/40 px-2 py-0.5 rounded">
                              {tx.reference}
                            </span>
                          </td>

                          {/* Charges */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-semibold text-ink text-[13px]">
                            {tx.charge > 0 ? formatNumber(tx.charge) : '—'}
                          </td>

                          {/* Credits */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-semibold text-emerald-600 text-[13px]">
                            {tx.credit > 0 ? formatNumber(tx.credit) : '—'}
                          </td>

                          {/* Running Balance */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-ink text-[13px]">
                            {formatNumber(tx.balance)}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="relative inline-block text-left group">
                              <button
                                type="button"
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-ink hover:bg-black/5 transition-colors"
                              >
                                <Lucide.MoreVertical size={16} />
                              </button>
                              <div className="hidden group-hover:flex flex-col absolute right-0 top-full z-20 w-36 bg-surface rounded-xl border border-border shadow-lg py-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => toast(`Item details: ${tx.title} (${tx.reference})`, { tone: 'info' })}
                                  className="w-full text-left px-3 py-1.5 hover:bg-page font-medium text-ink flex items-center gap-2"
                                >
                                  <Lucide.FileText size={13} />
                                  <span>View Details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => window.print()}
                                  className="w-full text-left px-3 py-1.5 hover:bg-page font-medium text-ink flex items-center gap-2"
                                >
                                  <Lucide.Printer size={13} />
                                  <span>Receipt</span>
                                </button>
                                {tx.category !== 'payment' ? (
                                  <button
                                    type="button"
                                    onClick={() => setVoidModalOpen({ id: tx.id, title: tx.title })}
                                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 font-medium flex items-center gap-2 border-t border-border/50"
                                  >
                                    <Lucide.AlertCircle size={13} />
                                    <span>Void Charge</span>
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-ink-muted">
                          No transactions found matching the selected filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {/* Table Footer: Add Manual Charge & Pagination */}
              <div
                className="p-3.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs"
                style={{ background: 'var(--color-surface)', borderColor: 'var(--color-divider)' }}
              >
                <div>
                  <button
                    type="button"
                    onClick={() => setPostChargeModalOpen(true)}
                    className="pms-btn-ghost px-3.5 py-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5 flex items-center gap-1.5"
                  >
                    <Lucide.Plus size={14} />
                    <span>Add manual charge</span>
                  </button>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5 text-ink-muted font-medium">
                    <span>Rows per page</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(Number(e.target.value))}
                      className="rounded-lg border px-2 py-1 text-xs font-semibold text-ink"
                      style={{ background: 'var(--color-page)', borderColor: 'var(--color-border)' }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="w-7 h-7 rounded-lg border flex items-center justify-center text-ink-muted hover:text-ink disabled:opacity-40"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <Lucide.ChevronLeft size={14} />
                    </button>
                    {[1, 2, 3].map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                          currentPage === page
                            ? 'bg-primary text-white shadow-xs'
                            : 'border text-ink hover:bg-black/5'
                        }`}
                        style={{
                          borderColor: currentPage === page ? 'transparent' : 'var(--color-border)',
                          background: currentPage === page ? 'var(--color-primary)' : 'transparent',
                        }}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                      className="w-7 h-7 rounded-lg border flex items-center justify-center text-ink-muted hover:text-ink"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <Lucide.ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: FOLIO SUMMARY & ACTIONS (~32%) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Card 1: Folio Summary */}
            <div
              className="rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col gap-4"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                <h3 className="font-bold text-ink text-base">Folio Summary</h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    currentGuest.folioStatus === 'Settled'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      currentGuest.folioStatus === 'Settled' ? 'bg-blue-600' : 'bg-emerald-600'
                    }`}
                  />
                  <span>{currentGuest.folioStatus}</span>
                </span>
              </div>

              {/* Department Breakdown */}
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-secondary">
                    <Lucide.BedDouble size={14} className="text-ink-muted" />
                    <span>Room Charges</span>
                  </span>
                  <span className="font-bold text-ink text-sm">
                    {formatINR(currentGuest.summary.roomCharges)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-secondary">
                    <Lucide.Sparkles size={14} className="text-ink-muted" />
                    <span>Extra Services</span>
                  </span>
                  <span className="font-bold text-ink text-sm">
                    {formatINR(currentGuest.summary.extraServices)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-secondary">
                    <Lucide.UtensilsCrossed size={14} className="text-ink-muted" />
                    <span>Food &amp; Beverage</span>
                  </span>
                  <span className="font-bold text-ink text-sm">
                    {formatINR(currentGuest.summary.foodBeverage)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink-secondary">
                    <Lucide.Package size={14} className="text-ink-muted" />
                    <span>Other Charges</span>
                  </span>
                  <span className="font-bold text-ink text-sm">
                    {formatINR(currentGuest.summary.otherCharges)}
                  </span>
                </div>
              </div>

              {/* Subtotal & Taxes */}
              <div className="border-t pt-3 flex flex-col gap-2 text-xs" style={{ borderColor: 'var(--color-divider)' }}>
                <div className="flex items-center justify-between text-ink font-semibold">
                  <span>Subtotal</span>
                  <span className="text-sm font-bold">{formatINR(currentGuest.summary.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-ink-secondary">
                  <span>Discount</span>
                  <span className="font-semibold text-rose-600">
                    -{formatINR(currentGuest.summary.discount)}
                  </span>
                </div>

                {/* Taxes & Fees with accordion */}
                <div>
                  <button
                    type="button"
                    onClick={() => setTaxesExpanded(!taxesExpanded)}
                    className="w-full flex items-center justify-between text-ink-secondary hover:text-ink font-medium"
                  >
                    <span className="flex items-center gap-1.5">
                      <Lucide.ShieldCheck size={14} className="text-ink-muted" />
                      <span>Taxes &amp; Fees</span>
                    </span>
                    <span className="flex items-center gap-1 font-bold text-ink text-xs">
                      <span>{formatINR(currentGuest.summary.taxesAndFees)}</span>
                      {taxesExpanded ? <Lucide.ChevronUp size={13} /> : <Lucide.ChevronDown size={13} />}
                    </span>
                  </button>

                  {taxesExpanded ? (
                    <div className="mt-2 pl-5 pr-1 flex flex-col gap-1 text-[11px] text-ink-muted">
                      <div className="flex items-center justify-between">
                        <span>GST (12%)</span>
                        <span className="font-semibold text-ink-secondary">
                          {formatINR(currentGuest.summary.gstAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Hotel Occupancy Tax (2%)</span>
                        <span className="font-semibold text-ink-secondary">
                          {formatINR(currentGuest.summary.occupancyTax)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Total Amount Box (Soft green-tinted card) */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 border-l-4 border-l-emerald-600 flex items-center justify-between">
                <span className="font-bold text-ink text-sm">Total Amount</span>
                <span className="font-bold text-ink text-lg tracking-tight">
                  {formatINR(currentGuest.summary.totalAmount)}
                </span>
              </div>

              {/* Payments & Outstanding Balance */}
              <div className="flex flex-col gap-2 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <Lucide.CheckCircle2 size={14} />
                    <span>Payments Received</span>
                  </span>
                  <span className="font-bold text-emerald-700 text-sm">
                    -{formatINR(currentGuest.summary.paymentsReceived)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--color-divider)' }}>
                  <span className="flex items-center gap-1.5 font-bold text-rose-600 text-xs uppercase tracking-wider">
                    <Lucide.AlertCircle size={14} />
                    <span>Outstanding Balance</span>
                  </span>
                  <span className="font-bold text-rose-600 text-lg">
                    {formatINR(currentGuest.summary.outstandingBalance)}
                  </span>
                </div>
              </div>

              {/* CTA Buttons Side-by-Side */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleFolioModalOpen(true)}
                  className="pms-btn-primary w-full py-2.5 text-xs font-bold"
                >
                  Settle Folio
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceModalOpen(true)}
                  className="pms-btn-ghost w-full py-2.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5"
                >
                  Generate Invoice
                </button>
              </div>
            </div>

            {/* Card 2: Payment Details */}
            <div
              className="rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col gap-3.5"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-ink text-sm">Payment Details</h4>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentData({
                      amount: currentGuest.summary.outstandingBalance > 0 ? String(currentGuest.summary.outstandingBalance) : '',
                      method: 'Card (VISA **** 4242)',
                      ref: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
                    });
                    setPaymentModalOpen(true);
                  }}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Lucide.Plus size={13} />
                  <span>Add Payment</span>
                </button>
              </div>

              {/* Payment item tile */}
              {currentGuest.payments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border p-3 flex items-center justify-between gap-3 text-xs"
                  style={{ background: 'var(--color-page)', borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <Lucide.CreditCard size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-[12.5px]">{p.date}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100/70 text-emerald-800">
                          <span className="w-1 h-1 rounded-full bg-emerald-600" />
                          <span>{p.status}</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        <span>{p.method}</span>
                        <span className="mx-1.5">·</span>
                        <span className="font-mono">Ref: {p.ref}</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-ink text-sm whitespace-nowrap">
                    {formatINR(p.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Card 3: Quick Actions */}
            <div
              className="rounded-2xl border p-4 sm:p-5 shadow-xs flex flex-col gap-3"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            >
              <h4 className="font-bold text-ink text-sm">Quick Actions</h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPostChargeModalOpen(true)}
                  className="pms-btn-ghost px-2 py-2 text-[11.5px] font-semibold flex flex-col items-center justify-center gap-1 hover:border-primary/40"
                >
                  <Lucide.Zap size={15} className="text-primary" />
                  <span>Post Charge</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountModalOpen(true)}
                  className="pms-btn-ghost px-2 py-2 text-[11.5px] font-semibold flex flex-col items-center justify-center gap-1 hover:border-primary/40"
                >
                  <Lucide.Tag size={15} className="text-amber-600" />
                  <span>Apply Discount</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitFolioModalOpen(true)}
                  className="pms-btn-ghost px-2 py-2 text-[11.5px] font-semibold flex flex-col items-center justify-center gap-1 hover:border-primary/40"
                >
                  <Lucide.Split size={15} className="text-purple-600" />
                  <span>Split Folio</span>
                </button>
              </div>
            </div>

            {/* Card 4: Info Note */}
            <div
              className="rounded-2xl border p-3.5 flex items-start gap-2.5 text-xs"
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))',
                borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                color: 'var(--color-ink-secondary)',
              }}
            >
              <Lucide.Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                All charges, taxes and totals are calculated based on hotel configuration and tax rules.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* OTHER TABS CONTENT (Room Folios, Payments, Statements, History) */}
      {activeTab === 'Room Folios (1)' ? (
        <div className="p-6 rounded-2xl border bg-surface flex flex-col gap-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink text-base">Room Folio 1 — {currentGuest.room}</h3>
              <p className="text-xs text-ink-muted">Master room tariff and lodging charges for {currentGuest.stayDates}</p>
            </div>
            <span className="font-bold text-primary text-base">{formatINR(currentGuest.summary.roomCharges)}</span>
          </div>
          <div className="border rounded-xl p-4 text-xs flex flex-col gap-2" style={{ borderColor: 'var(--color-divider)' }}>
            <div className="flex justify-between py-1 border-b" style={{ borderColor: 'var(--color-divider)' }}>
              <span className="font-medium text-ink">Room Tariff (Deluxe King, {currentGuest.nights} nights)</span>
              <span className="font-bold text-ink">{formatINR(currentGuest.summary.roomCharges)}</span>
            </div>
            <div className="flex justify-between py-1 text-ink-muted">
              <span>Nightly Rate</span>
              <span>{formatINR(currentGuest.summary.roomCharges / currentGuest.nights)} / night</span>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'Payments' ? (
        <div className="rounded-2xl border bg-surface p-5 shadow-xs flex flex-col gap-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink text-base">Payment Transactions &amp; Vouchers</h3>
              <p className="text-xs text-ink-muted">All successful receipts and settlement transactions on record</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPaymentData({
                  amount: String(currentGuest.summary.outstandingBalance),
                  method: 'Card (VISA **** 4242)',
                  ref: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
                });
                setPaymentModalOpen(true);
              }}
              className="pms-btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5"
            >
              <Lucide.Plus size={14} />
              <span>Record Payment</span>
            </button>
          </div>

          <div className="divide-y border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-divider)' }}>
            {currentGuest.payments.map((pm) => (
              <div key={pm.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-ink">{pm.method}</div>
                  <div className="text-ink-muted text-[11px] mt-0.5">{pm.date} · Ref: {pm.ref}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700 text-sm">{formatINR(pm.amount)}</div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    Download Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'Statements' ? (
        <div className="rounded-2xl border bg-surface p-6 shadow-xs flex flex-col gap-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink text-base">Guest Account Statement</h3>
              <p className="text-xs text-ink-muted">Detailed line-by-line financial statement for checkout presentation</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="pms-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Lucide.Printer size={14} />
              <span>Print Statement</span>
            </button>
          </div>

          <div className="border rounded-2xl p-6 flex flex-col gap-4 font-mono text-xs" style={{ borderColor: 'var(--color-divider)' }}>
            <div className="flex justify-between border-b pb-4" style={{ borderColor: 'var(--color-divider)' }}>
              <div>
                <p className="font-bold text-sm font-sans">{currentGuest.name}</p>
                <p className="text-ink-muted">{currentGuest.room} · {currentGuest.reservationCode}</p>
              </div>
              <div className="text-right">
                <p className="font-bold font-sans">Statement Date</p>
                <p className="text-ink-muted">17 Oct 2026</p>
              </div>
            </div>

            <div className="flex justify-between font-bold py-2 border-b" style={{ borderColor: 'var(--color-divider)' }}>
              <span>Total Charges &amp; Taxes</span>
              <span>{formatINR(currentGuest.summary.totalAmount)}</span>
            </div>
            <div className="flex justify-between font-bold py-2 border-b text-emerald-700" style={{ borderColor: 'var(--color-divider)' }}>
              <span>Total Payments Received</span>
              <span>-{formatINR(currentGuest.summary.paymentsReceived)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm py-2 text-rose-600">
              <span>Balance Due</span>
              <span>{formatINR(currentGuest.summary.outstandingBalance)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'History' || activeTab === 'Other Folios (0)' ? (
        <div className="rounded-2xl border bg-surface p-6 shadow-xs flex flex-col gap-3" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="font-bold text-ink text-base">Folio Audit Timeline</h3>
          <p className="text-xs text-ink-muted">All system postings, modifications, and payments logged for this reservation</p>
          <div className="border-l-2 border-primary/30 pl-4 ml-2 flex flex-col gap-4 mt-2 text-xs">
            {currentGuest.transactions.map((tx) => (
              <div key={tx.id} className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-primary absolute -left-[21px] top-1" />
                <p className="font-bold text-ink">{tx.title}</p>
                <p className="text-ink-muted text-[11px]">{tx.date} {tx.time} · {tx.reference} · {tx.charge > 0 ? `Charged ${formatINR(tx.charge)}` : `Credited ${formatINR(tx.credit)}`}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 4. MODALS & OVERLAYS (Portaled to document.body) */}

      {/* Post Charge Modal */}
      <Modal
        open={postChargeModalOpen}
        onClose={() => setPostChargeModalOpen(false)}
        title="Post Charge to Folio"
        subtitle={`${currentGuest.name} · Room ${currentGuest.roomNumber} (${currentGuest.reservationCode})`}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setPostChargeModalOpen(false)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handlePostCharge()}
              className="pms-btn-primary px-5 py-2 text-xs font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Posting…' : 'Post Charge'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Department / Category</label>
            <select
              value={postChargeData.category}
              onChange={(e) => setPostChargeData({ ...postChargeData, category: e.target.value as BillingTransaction['category'] })}
              className="w-full p-2.5 rounded-xl border font-medium text-ink bg-page"
            >
              <option value="service">Extra Services / Amenities</option>
              <option value="food">Food &amp; Beverage / Restaurant</option>
              <option value="spa">Spa &amp; Wellness</option>
              <option value="transport">Airport Transfer / Car</option>
              <option value="minibar">Minibar Consumption</option>
              <option value="room">Room Charge Extension</option>
              <option value="other">Other Incidentals</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-ink block mb-1">Item Description</label>
            <input
              type="text"
              placeholder="e.g. Laundry Express, Spa Massage, Dinner Platter"
              value={postChargeData.title}
              onChange={(e) => setPostChargeData({ ...postChargeData, title: e.target.value })}
              className="w-full p-2.5 rounded-xl border font-medium text-ink bg-page"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-ink block mb-1">Charge Amount ({currentGuest.currency})</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={postChargeData.amount}
                onChange={(e) => setPostChargeData({ ...postChargeData, amount: e.target.value })}
                className="w-full p-2.5 rounded-xl border font-bold text-ink bg-page"
              />
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">Reference Code</label>
              <input
                type="text"
                placeholder="e.g. POS-9812, SVC-301"
                value={postChargeData.reference}
                onChange={(e) => setPostChargeData({ ...postChargeData, reference: e.target.value })}
                className="w-full p-2.5 rounded-xl border font-mono font-medium text-ink bg-page"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-ink block mb-1">Additional Detail / Note</label>
            <input
              type="text"
              placeholder="e.g. 2 guests, Room 201 charge"
              value={postChargeData.detail}
              onChange={(e) => setPostChargeData({ ...postChargeData, detail: e.target.value })}
              className="w-full p-2.5 rounded-xl border font-medium text-ink bg-page"
            />
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Folio Payment"
        subtitle={`${currentGuest.name} · Outstanding: ${formatINR(currentGuest.summary.outstandingBalance)}`}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleRecordPayment()}
              className="pms-btn-primary px-5 py-2 text-xs font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Payment Method</label>
            <select
              value={paymentData.method}
              onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
              className="w-full p-2.5 rounded-xl border font-medium text-ink bg-page"
            >
              <option value="Card (VISA **** 4242)">Card (VISA **** 4242)</option>
              <option value="Card (Mastercard **** 8812)">Card (Mastercard)</option>
              <option value="Cash Counter">Cash Counter</option>
              <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer (NEFT/IMPS)</option>
              <option value="UPI / QR Payment">UPI / QR Code</option>
              <option value="Corporate Account">Corporate Account Billing</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-ink">Payment Amount ({currentGuest.currency})</label>
              {currentGuest.summary.outstandingBalance > 0 ? (
                <button
                  type="button"
                  onClick={() => setPaymentData({ ...paymentData, amount: String(currentGuest.summary.outstandingBalance) })}
                  className="text-[11px] text-primary font-bold hover:underline"
                >
                  Pay full balance ({formatINR(currentGuest.summary.outstandingBalance)})
                </button>
              ) : null}
            </div>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              className="w-full p-2.5 rounded-xl border font-bold text-ink bg-page text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="font-bold text-ink block mb-1">Transaction Reference</label>
            <input
              type="text"
              value={paymentData.ref}
              onChange={(e) => setPaymentData({ ...paymentData, ref: e.target.value })}
              className="w-full p-2.5 rounded-xl border font-mono font-medium text-ink bg-page"
            />
          </div>
        </div>
      </Modal>

      {/* Settle Folio Modal */}
      <Modal
        open={settleFolioModalOpen}
        onClose={() => setSettleFolioModalOpen(false)}
        title="Settle Folio &amp; Close Account"
        subtitle={`Settle remaining balance for ${currentGuest.name}`}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setSettleFolioModalOpen(false)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSettleFolio}
              className="pms-btn-primary px-5 py-2 text-xs font-bold"
            >
              Confirm Settlement
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          <div className="p-4 rounded-xl border bg-page flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-ink-secondary">Guest Name:</span>
              <span className="font-bold text-ink">{currentGuest.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Reservation:</span>
              <span className="font-mono font-bold text-ink">{currentGuest.reservationCode}</span>
            </div>
            <div className="flex justify-between border-t pt-2" style={{ borderColor: 'var(--color-divider)' }}>
              <span className="font-bold text-ink">Total Billed:</span>
              <span className="font-bold text-ink">{formatINR(currentGuest.summary.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span className="font-bold">Payments Received:</span>
              <span className="font-bold">-{formatINR(currentGuest.summary.paymentsReceived)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-rose-600 border-t pt-2" style={{ borderColor: 'var(--color-divider)' }}>
              <span>Settlement Amount Due:</span>
              <span>{formatINR(currentGuest.summary.outstandingBalance)}</span>
            </div>
          </div>
          <p className="text-ink-muted leading-relaxed">
            Upon clicking confirm, the outstanding balance will be marked as paid via Card Terminal, and the folio will transition to Settled status.
          </p>
        </div>
      </Modal>

      {/* Generate Tax Invoice Modal */}
      <Modal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        title="Tax Invoice"
        subtitle={`Invoice # INV-2026-${currentGuest.roomNumber}-01`}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setInvoiceModalOpen(false)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                window.print();
                toast('Invoice ready for printing', { tone: 'success' });
              }}
              className="pms-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Lucide.Printer size={14} />
              <span>Print / Download PDF</span>
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          <div className="p-4 rounded-xl border bg-white flex flex-col gap-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-start border-b pb-3" style={{ borderColor: 'var(--color-divider)' }}>
              <div>
                <h4 className="font-bold text-sm text-ink">TRIOUNITY GRAND HOTEL &amp; SUITES</h4>
                <p className="text-[11px] text-ink-muted">GSTIN: 27AABCT3518Q1ZV · Licensed PMS Hotel</p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ORIGINAL FOR RECIPIENT
                </span>
                <p className="font-mono text-ink font-bold mt-1">INV-2026-{currentGuest.roomNumber}-01</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11.5px]">
              <div>
                <span className="font-bold text-ink block">Billed To:</span>
                <p className="text-ink font-semibold">{currentGuest.name}</p>
                <p className="text-ink-muted">{currentGuest.phone}</p>
                <p className="text-ink-muted">{currentGuest.email}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-ink block">Stay Info:</span>
                <p className="text-ink">{currentGuest.room}</p>
                <p className="text-ink-muted">{currentGuest.stayDates}</p>
                <p className="font-mono text-ink-muted">{currentGuest.reservationCode}</p>
              </div>
            </div>

            <table className="w-full text-left border-t border-b text-[11px]" style={{ borderColor: 'var(--color-divider)' }}>
              <thead>
                <tr className="text-ink-muted font-bold py-1.5">
                  <th className="py-1">Description</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
                <tr>
                  <td className="py-1 text-ink">Room Tariff Charges ({currentGuest.roomType})</td>
                  <td className="py-1 text-right font-bold text-ink">{formatINR(currentGuest.summary.roomCharges)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-ink">Extra Services, Food &amp; Incidentals</td>
                  <td className="py-1 text-right font-bold text-ink">
                    {formatINR(currentGuest.summary.extraServices + currentGuest.summary.foodBeverage + currentGuest.summary.otherCharges)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-ink">GST (12%) &amp; Hotel Occupancy Tax (2%)</td>
                  <td className="py-1 text-right font-bold text-ink">{formatINR(currentGuest.summary.taxesAndFees)}</td>
                </tr>
                <tr className="font-bold text-xs">
                  <td className="py-1.5 text-ink">Total Invoice Value</td>
                  <td className="py-1.5 text-right text-ink">{formatINR(currentGuest.summary.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Apply Discount Modal */}
      <Modal
        open={discountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        title="Apply Folio Discount"
        subtitle={`Current Subtotal: ${formatINR(currentGuest.summary.subtotal)}`}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setDiscountModalOpen(false)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyDiscount}
              className="pms-btn-primary px-5 py-2 text-xs font-bold"
            >
              Apply Discount
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-ink block mb-1">Discount Type</label>
              <select
                value={discountData.type}
                onChange={(e) => setDiscountData({ ...discountData, type: e.target.value as 'percent' | 'amount' })}
                className="w-full p-2.5 rounded-xl border font-medium text-ink bg-page"
              >
                <option value="amount">Fixed Amount (₹)</option>
                <option value="percent">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-ink block mb-1">
                Value ({discountData.type === 'amount' ? '₹' : '%'})
              </label>
              <input
                type="number"
                placeholder="e.g. 500 or 10"
                value={discountData.value}
                onChange={(e) => setDiscountData({ ...discountData, value: e.target.value })}
                className="w-full p-2.5 rounded-xl border font-bold text-ink bg-page"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-ink block mb-1">Reason / Promo Code</label>
            <input
              type="text"
              placeholder="e.g. Corporate Agreement, VIP Courtesy, Management Approval"
              value={discountData.reason}
              onChange={(e) => setDiscountData({ ...discountData, reason: e.target.value })}
              className="w-full p-2.5 rounded-xl border font-medium text-ink bg-page"
            />
          </div>
        </div>
      </Modal>

      {/* Split Folio Modal */}
      <Modal
        open={splitFolioModalOpen}
        onClose={() => setSplitFolioModalOpen(false)}
        title="Split Guest Folio"
        subtitle={`Split charges from ${currentGuest.name} to Secondary Folio`}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setSplitFolioModalOpen(false)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                toast('Folio split created', {
                  detail: `Secondary Folio B created with ${splitPercent}% split rule.`,
                  tone: 'success',
                });
                setSplitFolioModalOpen(false);
              }}
              className="pms-btn-primary px-5 py-2 text-xs font-bold"
            >
              Split Folio
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Split Strategy</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSplitMethod('percent')}
                className={`p-3 rounded-xl border text-left font-semibold ${
                  splitMethod === 'percent'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-ink bg-page'
                }`}
              >
                Percentage Split
              </button>
              <button
                type="button"
                onClick={() => setSplitMethod('items')}
                className={`p-3 rounded-xl border text-left font-semibold ${
                  splitMethod === 'items'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-ink bg-page'
                }`}
              >
                Itemized Selection
              </button>
            </div>
          </div>

          {splitMethod === 'percent' ? (
            <div>
              <label className="font-bold text-ink block mb-1">Percentage to Split (%)</label>
              <input
                type="number"
                min="1"
                max="99"
                value={splitPercent}
                onChange={(e) => setSplitPercent(e.target.value)}
                className="w-full p-2.5 rounded-xl border font-bold text-ink bg-page"
              />
            </div>
          ) : (
            <p className="text-ink-muted">
              Select specific items from the table checkboxes to move to Secondary Folio B.
            </p>
          )}
        </div>
      </Modal>

      {/* Email Folio Modal */}
      <Modal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Email Folio Statement"
        subtitle={`Send PDF copy to ${currentGuest.name}`}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setEmailModalOpen(false)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                toast('Folio emailed successfully', {
                  detail: `PDF statement sent to ${currentGuest.email}`,
                  tone: 'success',
                });
                setEmailModalOpen(false);
              }}
              className="pms-btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <Lucide.Mail size={14} />
              <span>Send Email</span>
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 py-2 text-xs">
          <div>
            <label className="font-bold text-ink block mb-1">Recipient Email</label>
            <input
              type="email"
              defaultValue={currentGuest.email}
              className="w-full p-2.5 rounded-xl border font-medium text-ink bg-page"
            />
          </div>
          <div>
            <label className="font-bold text-ink block mb-1">Subject</label>
            <input
              type="text"
              defaultValue={`Your Hotel Folio Statement — ${currentGuest.reservationCode}`}
              className="w-full p-2.5 rounded-xl border font-medium text-ink bg-page"
            />
          </div>
          <div>
            <label className="font-bold text-ink block mb-1">Attachment</label>
            <div className="p-2.5 rounded-xl border bg-page flex items-center gap-2 text-ink-secondary">
              <Lucide.FileText size={16} className="text-primary" />
              <span className="font-medium">Folio_{currentGuest.reservationCode}.pdf (Generated)</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Void Charge Confirmation Modal */}
      <Modal
        open={voidModalOpen !== null}
        onClose={() => setVoidModalOpen(null)}
        title="Void Charge Item"
        subtitle={voidModalOpen?.title}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setVoidModalOpen(null)}
              className="pms-btn-ghost px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleVoidCharge}
              className="pms-btn-danger px-5 py-2 text-xs font-bold"
            >
              Confirm Void
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 py-2 text-xs">
          <p className="text-ink">
            Are you sure you want to void this item from the guest folio? This action will adjust the running balance and tax calculations.
          </p>
          <div>
            <label className="font-bold text-ink block mb-1">Reason for voiding (required)</label>
            <input
              type="text"
              placeholder="e.g. Guest dispute, billing correction, courtesy cancellation"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border font-medium text-ink bg-page"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
