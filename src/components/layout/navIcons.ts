import * as Lucide from 'lucide-react';
import type { ViewId } from '../nav';

export const NAV_ICONS: Record<ViewId, Lucide.LucideIcon> = {
  dashboard: Lucide.LayoutDashboard,
  reservations: Lucide.CalendarDays,
  'room-calendar': Lucide.CalendarRange,
  'new-reservation': Lucide.CalendarPlus,
  'rate-management': Lucide.SlidersHorizontal,
  'channel-manager': Lucide.Globe,
  guests: Lucide.BookUser,
  'room-overview': Lucide.BedDouble,
  'room-types': Lucide.Layers,
  'status-board': Lucide.LayoutGrid,
  housekeeping: Lucide.Sparkles,
  maintenance: Lucide.Wrench,
  folios: Lucide.ReceiptText,
  invoices: Lucide.FileText,
  payments: Lucide.CreditCard,
  'night-audit': Lucide.MoonStar,
  reports: Lucide.BarChart3,
  'occupancy-report': Lucide.Percent,
  'revenue-report': Lucide.TrendingUp,
  'arrivals-departures': Lucide.ArrowLeftRight,
  'staff-roles': Lucide.UserCog,
  settings: Lucide.Settings,
};

export const SECTION_ICONS: Record<string, Lucide.LucideIcon> = {
  Overview: Lucide.LayoutDashboard,
  'Front Office': Lucide.CalendarDays,
  'Rooms & Housekeeping': Lucide.BedDouble,
  'Rates & Distribution': Lucide.SlidersHorizontal,
  Finance: Lucide.ReceiptText,
  Analytics: Lucide.BarChart3,
  Administration: Lucide.ShieldCheck,
};

