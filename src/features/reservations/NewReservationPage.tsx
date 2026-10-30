import { useCallback, useMemo, useState } from "react";
import * as Lucide from "lucide-react";
import type { NavDraft, NavTarget } from "../../config/navigation";
import { toast } from "../../utils/toast";
import { Modal } from "../../components/overlays";
import { inventoryApi, guestApi, reservationApi } from "../../lib/api/pms";
import type {
  ReservationPendingPaymentRow,
  ReservationRoomRow,
} from "../../lib/api/pms";
import { useApiResource } from "../../lib/api/useApiResource";
import { BUSINESS_DATE, GUESTS, TAX_RATE } from "../../data/catalog";
import { BillingPreferencesSection } from "./new-reservation/BillingPreferencesSection";
import { OutletPOSSection } from "./new-reservation/OutletPOSSection";
import { RoomRequirementsSection } from "./new-reservation/RoomRequirementsSection";
import {
  FALLBACK_ROOM_CATEGORIES,
  MEAL_PLANS,
  OUTLET_CATALOG,
  RATE_PLANS,
} from "./new-reservation/data";
import type {
  BillingPreferences,
  FrontDeskTask,
  OutletAddonLine,
  OutletCatalogItem,
  RoomCategoryOption,
  RoomRequirement,
} from "./new-reservation/types";

/* The form opens on the store's first guest, so its defaults match the seeded data. */
const DEFAULT_GUEST = GUESTS[0];
const DEFAULT_GUEST_NAME = `${DEFAULT_GUEST.firstName} ${DEFAULT_GUEST.lastName}`;

/** ISO date (YYYY-MM-DD) for the day after the given ISO date. */
function nextDayIso(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

// Shared form classes. Inputs use the theme's pms-input so focus rings, hover
// and radius match the rest of the app; 16px text on phones stops iOS zooming.
const labelClass = "block text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-ink tracking-wide mb-1.5";
const fieldClass =
  "pms-input w-full min-h-[34px] md:min-h-[32px] px-2.5 py-1 text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-semibold";
const selectClass = `${fieldClass} cursor-pointer`;
const iconFieldClass = `${fieldClass} pl-8 pr-3`;
const textareaClass = "pms-input w-full px-2.5 py-1.5 text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-semibold resize-none";

export function NewReservation({
  go,
  initialDraft,
}: {
  go: (t: NavTarget) => void;
  initialDraft?: NavDraft;
}) {
  const [activeTab, setActiveTab] = useState<"general" | "outlet">("general");

  // Prefill from the room calendar (room + night clicked on the rack).
  const draftRoomTypeName = initialDraft?.roomType ?? "";
  const draftCategory =
    FALLBACK_ROOM_CATEGORIES.find(
      (category) =>
        category.name.toLowerCase() === draftRoomTypeName.toLowerCase(),
    ) ?? FALLBACK_ROOM_CATEGORIES[1];
  const initialCheckIn = initialDraft?.checkIn ?? BUSINESS_DATE;
  const initialCheckOut =
    initialDraft?.checkOut ?? nextDayIso(initialCheckIn);

  // Booking Parameters
  const [bookingSource, setBookingSource] = useState("Direct");
  const [sourceType, setSourceType] = useState("Phone");
  const [externalReferenceId, setExternalReferenceId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [sourceContactNumber, setSourceContactNumber] = useState("");
  const [checkInDate, setCheckInDate] = useState(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);
  const [bookingType, setBookingType] = useState("Confirmed"); // Status
  const [bookingCategory, setBookingCategory] = useState("FIT"); // Booking Type
  const [checkInTime, setCheckInTime] = useState("13:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [samePlanAllRooms, setSamePlanAllRooms] = useState(true);
  const [ratePlan, setRatePlan] = useState("Best Available Rates");
  const [mealPlan, setMealPlan] = useState("EP");

  const loadInventory = useCallback(async () => {
    const roomTypes = await inventoryApi.roomTypes();
    const availabilityEntries = await Promise.all(
      roomTypes.map(
        async (roomType) =>
          [
            roomType.id,
            await inventoryApi.availability(
              checkInDate,
              checkOutDate,
              roomType.id,
            ),
          ] as const,
      ),
    );
    return {
      roomTypes: roomTypes.map((roomType) => ({
        id: roomType.id,
        name: roomType.name,
        baseRate: Number(roomType.baseRate),
        maxAdults: roomType.maxAdults,
        maxChildren: roomType.maxChildren,
        desc: roomType.description ?? "",
      })),
      availableRoomsByType: Object.fromEntries(
        availabilityEntries.map(([id, availability]) => [
          id,
          availability.available,
        ]),
      ),
    };
  }, [checkInDate, checkOutDate]);
  const inventoryResource = useApiResource(loadInventory, [
    checkInDate,
    checkOutDate,
  ]);
  const roomTypes: RoomCategoryOption[] =
    inventoryResource.data?.roomTypes ?? FALLBACK_ROOM_CATEGORIES;
  const availableRoomsByType = useMemo(
    () => inventoryResource.data?.availableRoomsByType ?? {},
    [inventoryResource.data],
  );

  // Requirements (Rooms list)
  const [overridePrice, setOverridePrice] = useState(false);
  const [overrideRoomTotal, setOverrideRoomTotal] = useState<number | null>(
    null,
  );
  const [roomRequirements, setRequirements] = useState<RoomRequirement[]>([
    {
      id: "req-1",
      roomIndex: 1,
      roomTypeId: draftCategory.id,
      category: draftCategory.name,
      adults: 2,
      children: 0,
      infant: 0,
      roomId: null,
      roomNo: initialDraft?.roomNumber ?? "",
      rate: draftCategory.baseRate,
      ratePlan: "Best Available Rates",
      mealPlan: "EP",
      billingRoute: "Default",
      occupants: [
        { id: "occupant-primary", name: DEFAULT_GUEST_NAME, role: "Primary guest" },
      ],
    },
  ]);

  // Resolve the physical room picked on the room calendar against live
  // availability. The calendar's room types are display-only and can differ
  // from inventory types, so the room number is the source of truth. Deriving
  // this keeps the prefill without writing state from an effect.
  const requirements = useMemo(() => {
    const lookup = new Map<string, { roomId: string; typeId: string }>();
    for (const [typeId, rooms] of Object.entries(availableRoomsByType)) {
      for (const option of rooms) {
        lookup.set(option.roomNumber, { roomId: option.id, typeId });
      }
    }
    return roomRequirements.map((requirement) => {
      const match = requirement.roomNo
        ? lookup.get(requirement.roomNo)
        : undefined;
      if (!match) return requirement;
      if (
        match.roomId === requirement.roomId &&
        match.typeId === requirement.roomTypeId
      ) {
        return requirement;
      }
      const type = roomTypes.find((item) => item.id === match.typeId);
      return {
        ...requirement,
        roomTypeId: match.typeId,
        category: type?.name ?? requirement.category,
        rate: type?.baseRate ?? requirement.rate,
        roomId: match.roomId,
      };
    });
  }, [roomRequirements, availableRoomsByType, roomTypes]);

  // Billing Preferences
  const [billingPreferences, setBillingPreferences] =
    useState<BillingPreferences>({
      roomBillTo: "To Guest",
      extrasBillTo: "To Guest",
      billToCompany: false,
      noPost: false,
      companyName: "",
      companyGst: "",
    });
  const [posAddons, setPosAddons] = useState<OutletAddonLine[]>([]);

  // Guest Details
  const [guestSalutation, setGuestSalutation] = useState("Mr.");
  const [guestName, setGuestName] = useState(DEFAULT_GUEST_NAME);
  const [primaryGuestId, setPrimaryGuestId] = useState<string | null>(null);
  const [guestContact, setGuestContact] = useState(DEFAULT_GUEST.phone);
  const [guestEmail, setGuestEmail] = useState(DEFAULT_GUEST.email);
  const [guestIdType, setGuestIdType] = useState("Aadhaar Card");
  const [guestIdNumber, setGuestIdNumber] = useState("");
  const [specialRequests, setSpecialRequests] = useState(
    "",
  );

  // Payments & Financials
  const [paymentNotes, setPaymentNotes] = useState(
    "",
  );
  const [paymentsList, setPaymentsList] = useState<
    { id: string; method: string; amount: number; time: string; ref: string }[]
  >([]);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Front Desk Tasks & Checklist
  const [tasks, setTasks] = useState<FrontDeskTask[]>([
    {
      id: "t-1",
      text: "Verify physical Photo ID and collect signed registration card",
      done: false,
      priority: "high",
    },
    {
      id: "t-2",
      text: "Pre-allocate room 202 on high floor (Requested by guest)",
      done: true,
      priority: "medium",
    },
    {
      id: "t-3",
      text: "Send digital invoice and welcome packet via WhatsApp",
      done: false,
      priority: "low",
    },
  ]);
  const [newTaskInput, setNewTaskInput] = useState("");

  // Modal states
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState("4305");
  const [collectMethod, setCollectMethod] = useState<
    "UPI / QR" | "Credit Card" | "Debit Card" | "Cash" | "Bank Transfer"
  >("UPI / QR");
  const [collectRef, setCollectRef] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueText, setIssueText] = useState("");
  const [savingReservation, setSavingReservation] = useState(false);

  // Confirmation state
  const [confirmedBooking, setConfirmedBooking] = useState<{
    code: string;
    referenceId: string;
    total: number;
    guest: string;
    rooms: number;
    nights: number;
  } | null>(null);

  // Night calculation
  const nightsCount = useMemo(() => {
    try {
      const d1 = new Date(checkInDate);
      const d2 = new Date(checkOutDate);
      const diff = Math.ceil(
        (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24),
      );
      return Math.max(1, isNaN(diff) ? 1 : diff);
    } catch {
      return 1;
    }
  }, [checkInDate, checkOutDate]);

  // Financial calculations
  const calculatedRoomCharges = useMemo(() => {
    return requirements.reduce((acc, r) => acc + r.rate * nightsCount, 0);
  }, [requirements, nightsCount]);
  const roomCharges =
    overridePrice && overrideRoomTotal !== null
      ? overrideRoomTotal
      : calculatedRoomCharges;

  const mealPlanCharges = useMemo(
    () =>
      requirements.reduce((sum, room) => {
        const surcharge =
          MEAL_PLANS.find((plan) => plan.code === room.mealPlan)?.surcharge ??
          0;
        return sum + surcharge * room.adults * nightsCount;
      }, 0),
    [requirements, nightsCount],
  );
  const addonSubtotal = useMemo(
    () =>
      posAddons.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [posAddons],
  );
  const bookingSubtotal = roomCharges + mealPlanCharges + addonSubtotal;
  const subTotal = Math.max(0, bookingSubtotal - discountAmount);
  const taxAmount = Math.round(subTotal * TAX_RATE);
  const totalBill = subTotal + taxAmount;
  const totalPaid = paymentsList.reduce((acc, p) => acc + p.amount, 0);
  const outstanding = Math.max(0, totalBill - totalPaid);
  const roomTax = Math.round((roomCharges + mealPlanCharges) * TAX_RATE);

  const totalsByRoute = useMemo(() => {
    const totals: Record<string, number> = {};
    const resolveRoute = (route: string, fallback: string) =>
      route === "Default" ? fallback : route;
    for (const room of requirements) {
      const route = resolveRoute(
        room.billingRoute,
        billingPreferences.roomBillTo,
      );
      const mealSurcharge =
        MEAL_PLANS.find((plan) => plan.code === room.mealPlan)?.surcharge ?? 0;
      totals[route] =
        (totals[route] ?? 0) +
        (room.rate + mealSurcharge * room.adults) * nightsCount;
    }
    for (const addon of posAddons) {
      const route = billingPreferences.noPost
        ? "Direct Settlement"
        : resolveRoute(addon.billingRoute, billingPreferences.extrasBillTo);
      totals[route] = (totals[route] ?? 0) + addon.unitPrice * addon.quantity;
    }
    let remainingDiscount = discountAmount;
    const discountOrder = [
      billingPreferences.roomBillTo,
      ...Object.keys(totals).filter(
        (route) => route !== billingPreferences.roomBillTo,
      ),
    ];
    for (const route of discountOrder) {
      if (remainingDiscount <= 0) break;
      const reduction = Math.min(totals[route] ?? 0, remainingDiscount);
      totals[route] = (totals[route] ?? 0) - reduction;
      remainingDiscount -= reduction;
    }
    const netSubtotal = Object.values(totals).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const tax = Math.round(netSubtotal * TAX_RATE);
    const entries = Object.entries(totals);
    const split = entries.map(
      ([route, amount]) =>
        [
          route,
          Math.round(
            amount + (netSubtotal > 0 ? (tax * amount) / netSubtotal : 0),
          ),
        ] as const,
    );
    const roundedTotal = netSubtotal + tax;
    const roundingDifference =
      roundedTotal - split.reduce((sum, [, amount]) => sum + amount, 0);
    if (split.length > 0)
      split[split.length - 1] = [
        split[split.length - 1][0],
        split[split.length - 1][1] + roundingDifference,
      ];
    return Object.fromEntries(split);
  }, [
    requirements,
    posAddons,
    billingPreferences,
    nightsCount,
    discountAmount,
  ]);

  const formatDisplayDate = (dStr: string) => {
    try {
      const date = new Date(dStr);
      const day = date.getDate();
      const month = date
        .toLocaleString("en-US", { month: "short" })
        .toUpperCase();
      const year = date.getFullYear();
      const weekday = date.toLocaleString("en-US", { weekday: "short" });
      return {
        day: isNaN(day) ? "20" : String(day).padStart(2, "0"),
        month,
        year,
        weekday,
      };
    } catch {
      return { day: "20", month: "OCT", year: 2026, weekday: "Tue" };
    }
  };

  const inDate = formatDisplayDate(checkInDate);
  const outDate = formatDisplayDate(checkOutDate);

  const handleAddRoom = () => {
    const nextIdx = requirements.length + 1;
    const defaultType =
      requirements[requirements.length - 1]?.roomTypeId ?? "deluxe";
    const category =
      roomTypes.find((item) => item.id === defaultType) ??
      roomTypes[0] ??
      FALLBACK_ROOM_CATEGORIES[1];
    const newReq: RoomRequirement = {
      id: `req-${Date.now()}`,
      roomIndex: nextIdx,
      roomTypeId: category.id,
      category: category.name,
      adults: 2,
      children: 0,
      infant: 0,
      roomId: null,
      roomNo: "",
      rate: category.baseRate,
      ratePlan,
      mealPlan,
      billingRoute: "Default",
      occupants: [
        { id: `occupant-${Date.now()}`, name: "", role: "Family member" },
      ],
    };
    setRequirements((prev) => [...prev, newReq]);
    toast.success("Room Added", {
      detail: `Room ${nextIdx} (${category.name}) added to requirements.`,
    });
  };

  const handleRemoveRoom = (id: string) => {
    if (requirements.length <= 1) {
      toast.warning("Minimum Required", {
        detail: "At least one room requirement must remain.",
      });
      return;
    }
    const remaining = requirements.filter((room) => room.id !== id);
    setRequirements(
      remaining.map((room, index) => ({ ...room, roomIndex: index + 1 })),
    );
    setPosAddons((previous) =>
      previous.map((addon) =>
        addon.roomRequirementId === id
          ? { ...addon, roomRequirementId: remaining[0].id }
          : addon,
      ),
    );
    toast.info("Room Removed", {
      detail: "Room requirement removed from folio.",
    });
  };

  const handleUpdateRequirement = (
    id: string,
    updates: Partial<RoomRequirement>,
  ) => {
    setRequirements((prev) =>
      prev.map((room) => (room.id === id ? { ...room, ...updates } : room)),
    );
  };

  const handleAddAddon = (item: OutletCatalogItem) => {
    const firstRoom = requirements[0];
    if (!firstRoom) return;
    setPosAddons((previous) => [
      ...previous,
      {
        id: `addon-${Date.now()}`,
        catalogItemId: item.id,
        outletId: item.outletId,
        outletName: item.outletName,
        name: item.name,
        quantity: 1,
        unitPrice: item.unitPrice,
        roomRequirementId: firstRoom.id,
        billingRoute: "Default",
      },
    ]);
  };

  const handleUpdateAddon = (id: string, updates: Partial<OutletAddonLine>) => {
    setPosAddons((previous) =>
      previous.map((addon) =>
        addon.id === id ? { ...addon, ...updates } : addon,
      ),
    );
    if (updates.billingRoute === "To Company")
      setBillingPreferences((previous) => ({
        ...previous,
        billToCompany: true,
      }));
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  };

  const handleAddTask = () => {
    if (!newTaskInput.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}`,
        text: newTaskInput.trim(),
        done: false,
        priority: "medium",
      },
    ]);
    setNewTaskInput("");
    toast.success("Task Added", { detail: "Front desk task recorded." });
  };

  const handleRecordPayment = () => {
    const amt = parseFloat(collectAmount);
    if (!amt || amt <= 0) {
      toast.error("Invalid Amount", {
        detail: "Please specify an amount greater than ₹0.",
      });
      return;
    }
    const newPayment = {
      id: `pay-${Date.now()}`,
      method: collectMethod,
      amount: amt,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ref: collectRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    };
    setPaymentsList((prev) => [...prev, newPayment]);
    setCollectModalOpen(false);
    setCollectRef("");
    toast.success("Payment Recorded", {
      detail: `₹${amt.toLocaleString("en-IN")} via ${collectMethod}`,
    });
  };

  const handleConfirmReservation = async (withEmail = false) => {
    if (!guestName.trim()) {
      toast.error("Guest Name Required", {
        detail: "Please provide guest name before confirming.",
      });
      return;
    }
    if (!guestContact.trim()) {
      toast.error("Guest Phone Required", {
        detail: "Please provide a contact phone number before confirming.",
      });
      return;
    }
    if (
      new Date(`${checkOutDate}T00:00:00`).getTime() <=
      new Date(`${checkInDate}T00:00:00`).getTime()
    ) {
      toast.error("Invalid Stay Dates", {
        detail: "Check-out must be after check-in.",
      });
      return;
    }
    if (inventoryResource.loading) {
      toast.info("Inventory Loading", {
        detail: "Please wait until room availability has loaded.",
      });
      return;
    }
    const roomIds = requirements.map((room) => room.roomId).filter(Boolean);
    if (new Set(roomIds).size !== roomIds.length) {
      toast.error("Room Assigned Twice", {
        detail: "Each reservation room must use a different physical room.",
      });
      return;
    }
    setSavingReservation(true);
    try {
      let guestId = primaryGuestId;
      if (!guestId) {
        const nameParts = guestName.trim().split(/\s+/);
        const createdGuest = await guestApi.create({
          firstName: nameParts.shift() ?? "Guest",
          lastName: nameParts.join(" "),
          email: guestEmail.trim() || null,
          phone: guestContact.trim() || null,
          companyName: billingPreferences.companyName || null,
        });
        guestId = createdGuest.id;
        setPrimaryGuestId(guestId);
      }

      const persistedRooms: ReservationRoomRow[] = requirements.map((room) => {
        const mealSurcharge =
          MEAL_PLANS.find((plan) => plan.code === room.mealPlan)?.surcharge ??
          0;
        const baseRate =
          overridePrice && overrideRoomTotal !== null
            ? calculatedRoomCharges > 0
              ? room.rate * (overrideRoomTotal / calculatedRoomCharges)
              : overrideRoomTotal /
              Math.max(1, requirements.length * nightsCount)
            : room.rate;
        return {
          id: room.id,
          roomTypeId: room.roomTypeId,
          roomId: room.roomId,
          roomNumber: room.roomNo || null,
          roomTypeName: room.category,
          baseRate: String(baseRate),
          nightlyRate: String(baseRate + mealSurcharge * room.adults),
          ratePlanName: samePlanAllRooms ? ratePlan : room.ratePlan,
          adults: room.adults,
          children: room.children,
          infants: room.infant,
          mealPlanName: samePlanAllRooms ? mealPlan : room.mealPlan,
          billingRoute:
            room.billingRoute === "Default"
              ? billingPreferences.roomBillTo
              : room.billingRoute,
          occupants: room.occupants,
        };
      });
      const persistedAddons = posAddons.map((addon) => {
        const room =
          requirements.find(
            (candidate) => candidate.id === addon.roomRequirementId,
          ) ?? requirements[0];
        const route = billingPreferences.noPost
          ? "Direct Settlement"
          : addon.billingRoute === "Default"
            ? billingPreferences.extrasBillTo
            : addon.billingRoute;
        return {
          id: addon.id,
          outletId: addon.outletId,
          outletName: addon.outletName,
          description: addon.name,
          quantity: String(addon.quantity),
          unitAmount: String(addon.unitPrice),
          billingRoute: route,
          roomLineId: room.id,
          roomNumber: room.roomNo || null,
          postToFolio:
            !billingPreferences.noPost && route !== "Direct Settlement",
        };
      });
      const pendingPayments: ReservationPendingPaymentRow[] = paymentsList.map(
        (payment) => ({
          amount: String(payment.amount),
          method: payment.method,
          reference: payment.ref,
        }),
      );
      const saved = await reservationApi.create({
        externalReferenceId: externalReferenceId.trim() || null,
        status:
          bookingType === "Confirmed" || bookingType === "Guaranteed"
            ? "CONFIRMED"
            : "DRAFT",
        source: bookingSource,
        sourceType,
        primaryGuestId: guestId,
        checkInDate,
        checkOutDate,
        adults: persistedRooms.reduce(
          (sum, room) => sum + Number(room.adults ?? 0),
          0,
        ),
        children: persistedRooms.reduce(
          (sum, room) => sum + Number(room.children ?? 0),
          0,
        ),
        infants: persistedRooms.reduce(
          (sum, room) => sum + Number(room.infants ?? 0),
          0,
        ),
        roomLines: persistedRooms,
        pendingCharges: persistedAddons,
        pendingPayments,
        discountAmount: String(discountAmount),
        billingPreferences,
        specialRequests,
        internalNotes: [
          sourceType && `Booking mode: ${sourceType}`,
          paymentNotes,
          ...tasks.map((task) => `${task.done ? "[x]" : "[ ]"} ${task.text}`),
        ]
          .filter(Boolean)
          .join("\n"),
      });
      const code = saved.bookingCode;
      setBookingId(code);
      setConfirmedBooking({
        code,
        referenceId: externalReferenceId.trim(),
        total: totalBill,
        guest: guestName,
        rooms: requirements.length,
        nights: nightsCount,
      });
      toast.success("Reservation Confirmed", {
        detail: `${guestName} · Booking ID ${code}${externalReferenceId.trim() ? ` · Ref ${externalReferenceId.trim()}` : ""} ${withEmail ? "· Confirmation email sent" : ""}`,
      });
    } catch (error) {
      toast.error("Reservation Not Saved", {
        detail:
          error instanceof Error
            ? error.message
            : "Please check the booking details and try again.",
      });
    } finally {
      setSavingReservation(false);
    }
  };

  const handleCopyCode = () => {
    if (!bookingId) return;
    navigator.clipboard.writeText(bookingId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast.info("Copied", { detail: "Booking ID copied to clipboard." });
  };

  // SUCCESS CONFIRMATION SCREEN
  if (confirmedBooking) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4 text-ink font-sans">
        <div className="bg-surface rounded-3xl border border-border/90 shadow-md p-6 md:p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-success-text via-[var(--color-primary)] to-success-border" />

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-success-bg text-success-text shadow-sm border border-success-border mb-5">
            <Lucide.CheckCircle2 size={44} />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success-bg border border-success-border text-success-text text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold mb-3 uppercase tracking-wider">
            <Lucide.ShieldCheck size={14} />
            Folio Verified & Confirmed
          </div>

          <h2 className="text-[20px] md:max-[1023px]:text-[18px] lg:max-[1439px]:text-[18px] min-[1440px]:text-[18px] font-extrabold tracking-tight text-ink">
            Booking ID #{confirmedBooking.code}
          </h2>
          {confirmedBooking.referenceId && (
            <p className="mt-1 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] text-ink-secondary">
              Reference ID:{" "}
              <span className="font-mono font-semibold text-ink">
                {confirmedBooking.referenceId}
              </span>
            </p>
          )}
          <p className="max-w-lg mx-auto text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] text-ink-secondary mt-2">
            Reservation successfully saved for{" "}
            <strong className="text-ink">{confirmedBooking.guest}</strong>. Room
            lines, billing routes, add-ons, and payments are saved to the PMS.
          </p>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mt-6 text-left">
            <div className="p-3.5 rounded-xl border border-divider bg-page/70">
              <span className="block text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-muted uppercase">
                Check-in
              </span>
              <span className="text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-ink mt-0.5 block">
                {checkInDate}
              </span>
              <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-secondary">
                {checkInTime} hrs
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-divider bg-page/70">
              <span className="block text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-muted uppercase">
                Check-out
              </span>
              <span className="text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-ink mt-0.5 block">
                {checkOutDate}
              </span>
              <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-secondary">
                {checkOutTime} hrs
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-divider bg-page/70">
              <span className="block text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-muted uppercase">
                Allotment
              </span>
              <span className="text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-ink mt-0.5 block">
                {confirmedBooking.rooms} Room(s)
              </span>
              <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-secondary">
                {confirmedBooking.nights} Night(s)
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-divider bg-page/70">
              <span className="block text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-muted uppercase">
                Total Bill
              </span>
              <span className="text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-success-text font-mono mt-0.5 block">
                ₹{confirmedBooking.total.toLocaleString("en-IN")}.00
              </span>
              <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-secondary font-semibold">
                {outstanding === 0
                  ? "Fully Settled"
                  : `₹${outstanding.toLocaleString("en-IN")} Due`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[var(--color-primary)] hover:opacity-95 text-white shadow-sm transition-all text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] cursor-pointer"
              onClick={() => go({ view: "reservations" })}
            >
              <Lucide.CalendarDays size={15} />
              <span>View All Reservations</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold border border-border bg-surface hover:bg-page text-ink shadow-xs transition-colors text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] cursor-pointer"
              onClick={() => window.print()}
            >
              <Lucide.Printer size={15} className="text-ink-secondary" />
              <span>Print Registration Slip</span>
            </button>
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl font-semibold border border-border bg-surface hover:bg-page text-ink shadow-xs transition-colors text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] cursor-pointer"
              onClick={() => {
                setConfirmedBooking(null);
                setBookingId("");
                setExternalReferenceId("");
                setSourceContactNumber("");
              }}
            >
              Create Another Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 text-ink font-sans flex flex-col gap-4 pb-4">
      {/* ================= 4-COLUMN MASTER WORKBENCH ================= */}
      <div className="grid grid-cols-1 gap-4 items-start lg:max-[1279px]:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(240px,3fr)_minmax(0,5fr)_minmax(32px,1fr)_minmax(240px,3fr)]">
        {/* ================= LEFT COLUMN: LUXURY FOLIO BOARDING TICKET ================= */}
        <div className="flex min-w-0 flex-col rounded-3xl border border-border/90 bg-surface shadow-sm overflow-hidden lg:max-[1279px]:col-start-1 lg:row-start-1 xl:col-start-1 xl:row-start-1 xl:sticky xl:top-6 xl:self-start">
          {/* Top Boarding Pass Header Strip */}
          <div className="bg-gradient-to-r from-primary via-primary-hover to-dark-accent p-3 md:p-4 text-primary-foreground border-b border-dark-accent lg:sticky lg:top-0 lg:z-10">
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <div className="min-w-0 border-r border-primary-foreground/25 pr-2 md:pr-3">
                <span className="block text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold tracking-wider text-primary-foreground/75 uppercase">
                  BOOKING ID
                </span>
                <div className="mt-0.5 md:mt-1 flex min-w-0 items-center justify-between gap-1">
                  <span
                    className="min-w-0 truncate text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold font-mono"
                    title={bookingId || "Auto on save"}
                  >
                    {bookingId || "Auto on save"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    disabled={!bookingId}
                    className="flex-none text-primary-foreground/70 transition-colors hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 p-0.5"
                    title="Copy Booking ID"
                    aria-label="Copy Booking ID"
                  >
                    {copiedCode ? (
                      <Lucide.Check
                        size={12}
                        className="text-success-foreground shrink-0"
                      />
                    ) : (
                      <Lucide.Copy size={12} className="shrink-0" />
                    )}
                  </button>
                </div>
              </div>
              <div className="min-w-0 pl-1 md:pl-0">
                <span className="block text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold tracking-wider text-primary-foreground/75 uppercase">
                  REFERENCE ID
                </span>
                <span
                  className="mt-0.5 md:mt-1 block truncate text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold font-mono"
                  title={externalReferenceId || "No external reference"}
                >
                  {externalReferenceId || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Body with Notched Perforations */}
          <div className="relative flex flex-col gap-3.5 md:gap-4 p-3 md:p-4 min-[1440px]:p-5">
            {/* Elegant Calendar Journey Tile */}
            <div className="bg-gradient-to-b from-page to-surface rounded-2xl border border-border/80 p-2.5 md:p-3 min-[1440px]:p-4 shadow-2xs">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-center">
                {/* Check In */}
                <div className="text-left min-w-0">
                  <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-muted uppercase tracking-wider whitespace-nowrap block">
                    CHECK-IN
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-[20px] md:max-[1023px]:text-[18px] lg:max-[1439px]:text-[18px] min-[1440px]:text-[18px] font-black text-ink leading-none">
                      {inDate.day}
                    </span>
                    <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-secondary uppercase">
                      {inDate.month}
                    </span>
                  </div>
                  <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-semibold text-ink-muted mt-1 block truncate">
                    {inDate.weekday} · {checkInTime}
                  </span>
                </div>

                {/* Duration Badge with line */}
                <div className="flex min-w-[72px] flex-col items-center px-1">
                  <div className="flex items-center gap-1 whitespace-nowrap rounded-full border border-border bg-surface px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink shadow-2xs">
                    <Lucide.Moon size={10} className="text-primary shrink-0" />
                    <span className="truncate">
                      {nightsCount} {nightsCount === 1 ? "Night" : "Nights"}
                    </span>
                  </div>
                  <div className="w-full relative flex items-center justify-center my-1 md:my-1.5">
                    <div className="w-full border-t border-dashed border-ink-disabled" />
                    <Lucide.BedDouble
                      size={12}
                      className="text-ink-muted absolute bg-surface px-0.5"
                    />
                  </div>
                  <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-muted font-medium">
                    Allotment
                  </span>
                </div>

                {/* Check Out */}
                <div className="text-right min-w-0">
                  <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-muted uppercase tracking-wider whitespace-nowrap block">
                    CHECK-OUT
                  </span>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5">
                    <span className="text-[20px] md:max-[1023px]:text-[18px] lg:max-[1439px]:text-[18px] min-[1440px]:text-[18px] font-black text-ink leading-none">
                      {outDate.day}
                    </span>
                    <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-secondary uppercase">
                      {outDate.month}
                    </span>
                  </div>
                  <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-semibold text-ink-muted mt-1 block truncate">
                    {outDate.weekday} · {checkOutTime}
                  </span>
                </div>
              </div>
            </div>

            <p
              className="break-words text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold tracking-wide text-ink-secondary"
              aria-label="Room summary"
            >
              {requirements.length}-
              {Array.from(
                new Set(requirements.map((room) => room.category)),
              ).join("+")}
              -
              {Array.from(
                new Set(requirements.map((room) => room.mealPlan)),
              ).join("+")}{" "}
              × {nightsCount}
            </p>

            {/* Guest Profile Chip with Confirmed Stamp Overlay */}
            <div className="relative flex items-center justify-between gap-2 rounded-xl border border-divider bg-surface p-2.5 md:p-3 shadow-2xs">
              <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-2.5 relative z-10">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] shrink-0 shadow-2xs">
                  {guestName ? guestName.charAt(0).toUpperCase() : "G"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-ink" title={guestName}>
                      {guestName || "Unnamed Guest"}
                    </span>
                  </div>
                  <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-secondary font-medium truncate block">
                    {guestContact || "No contact"}
                  </span>
                </div>
              </div>
              <a
                href={`tel:${guestContact}`}
                className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-ink-secondary hover:bg-page transition-colors"
                title="Call Guest"
              >
                <Lucide.Phone size={13} />
              </a>

              {/* Confirmed front desk stamp: sits half inside and half over the top edge of the guest chip */}
              <div
                className="pointer-events-none absolute -top-3 right-8 md:right-10 flex items-center justify-center select-none z-20 opacity-60"
                aria-hidden="true"
              >
                <div className="relative inline-flex items-center justify-center p-1 rounded-full border-2 border-dashed border-success-text bg-success-bg/25 rotate-[-12deg]">
                  <div className="flex flex-col h-13 w-13 items-center justify-center rounded-full border-2 border-success-text text-success-text text-center">
                    <Lucide.ShieldCheck size={13} className="text-success-text" />
                    <span className="font-black text-[7px] uppercase tracking-wider mt-0.5 leading-none">CONFIRMED</span>
                    <span className="text-[7px] font-bold text-success-text/90 font-mono mt-0.5">FRONT DESK</span>
                  </div>
                </div>
              </div>

            </div>

                        {/* Receipt-style bill summary */}
            <div className="border-y border-divider py-2.5 md:py-3">
              <div className="grid grid-cols-2 divide-x divide-divider">
                <div className="pr-3 min-w-0">
                  <span className="block text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Total Bill
                  </span>
                  <span className="mt-1 block text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-extrabold font-mono text-ink truncate">
                    ₹{totalBill.toLocaleString("en-IN")}.00
                  </span>
                </div>
                <div className="pl-3 min-w-0">
                  <span className="block text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Outstanding
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-extrabold font-mono truncate ${outstanding > 0 ? "text-warning-text" : "text-success-text"}`}
                    >
                      ₹{outstanding.toLocaleString("en-IN")}.00
                    </span>
                    {outstanding > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCollectAmount(String(outstanding));
                          setCollectModalOpen(true);
                        }}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-warning-text hover:bg-warning-bg"
                        title="e-Collect payment"
                        aria-label="e-Collect payment"
                      >
                        <Lucide.Banknote size={14} />
                      </button>
                    ) : (
                      <Lucide.Check
                        size={14}
                        className="text-success-text shrink-0"
                        aria-label="Paid in full"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tile Buttons Footer - 4 buttons in 1 compact row */}
            <div className="grid grid-cols-4 gap-1 md:gap-1.5 pt-2 border-t border-divider text-center">
              <button
                type="button"
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl border border-border/80 hover:bg-page text-ink-secondary transition-colors shadow-2xs cursor-pointer group min-w-0"
                title="Direct Phone Booking"
              >
                <Lucide.PhoneCall
                  size={13}
                  className="text-ink-secondary group-hover:text-[var(--color-primary)] transition-colors shrink-0"
                />
                <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold mt-1 text-ink truncate w-full">
                  DIRECT
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectAmount(String(outstanding));
                  setCollectModalOpen(true);
                }}
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl border border-border/80 hover:bg-page text-ink-secondary transition-colors shadow-2xs cursor-pointer group min-w-0"
                title="Collect Payment"
              >
                <Lucide.Banknote size={13} className="text-warning-text shrink-0" />
                <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold mt-1 text-ink truncate w-full">
                  ₹ PAY
                </span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl border border-border/80 hover:bg-page text-ink-secondary transition-colors shadow-2xs cursor-pointer group min-w-0"
                title="Assigned Rooms"
              >
                <Lucide.BedDouble size={13} className="text-primary shrink-0" />
                <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold mt-1 text-ink truncate w-full">
                  ROOMS
                </span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl border border-border/80 hover:bg-page text-ink-secondary transition-colors shadow-2xs cursor-pointer group min-w-0"
                title="Guest ID Verification"
              >
                <Lucide.CreditCard size={13} className="text-success-text shrink-0" />
                <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold mt-1 text-ink truncate w-full">
                  ID / CARD
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= CENTER COLUMN: REFINED WORKBENCH & INTAKE CONSOLE ================= */}
        <div className="@container flex flex-col gap-4 min-w-0 lg:max-[1279px]:col-start-2 lg:row-start-1 lg:max-[1279px]:row-span-2 xl:col-start-2 xl:row-start-1 xl:row-span-1">
          {/* Sub Navigation Segmented Tabs */}
          <div className="flex w-full max-w-full items-center gap-1.5 overflow-x-auto p-1 bg-muted-surface/80 rounded-2xl border border-border/80 md:w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`flex flex-1 md:flex-none min-h-[40px] items-center justify-center gap-1.5 whitespace-normal md:whitespace-nowrap text-center leading-tight px-3 md:px-4 py-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold rounded-xl transition-all cursor-pointer ${activeTab === "general"
                ? "bg-surface text-ink shadow-sm border border-border/60"
                : "text-ink-secondary hover:text-ink"
                }`}
            >
              <Lucide.FileText
                size={13}
                className={
                  activeTab === "general"
                    ? "text-[var(--color-primary)]"
                    : "text-ink-muted"
                }
              />
              <span>General Reservation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("outlet")}
              className={`flex flex-1 md:flex-none min-h-[40px] items-center justify-center gap-1.5 whitespace-normal md:whitespace-nowrap text-center leading-tight px-3 md:px-4 py-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold rounded-xl transition-all cursor-pointer ${activeTab === "outlet"
                ? "bg-surface text-ink shadow-sm border border-border/60"
                : "text-ink-secondary hover:text-ink"
                }`}
            >
              <Lucide.Receipt
                size={13}
                className={
                  activeTab === "outlet"
                    ? "text-[var(--color-primary)]"
                    : "text-ink-muted"
                }
              />
              <span>+ Outlet / POS Addons</span>
            </button>
          </div>

          {activeTab === "general" && (
            <div className="flex flex-col gap-4">
              {/* SECTION 1: BOOKING PARAMETERS & DETAILS */}
              <section className="min-w-0 bg-surface rounded-2xl md:rounded-3xl border border-border/80 p-4 md:p-5 min-[1440px]:p-6 shadow-xs flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white font-bold text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] shadow-xs shadow-primary/20">
                      1
                    </span>
                    <div>
                      <h2 className="text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-bold text-ink-secondary tracking-tight">
                        Booking Details & Rate Plan
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                      Status:
                    </span>
                    <select
                      value={bookingType}
                      onChange={(e) => setBookingType(e.target.value)}
                      className="pms-input w-auto min-h-[34px] md:min-h-[32px] px-2.5 py-1 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold cursor-pointer"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Guaranteed">Guaranteed</option>
                      <option value="Tentative">Tentative</option>
                      <option value="Waitlist">Waitlist</option>
                    </select>
                  </div>
                </div>

                {/* Booking source and source-specific booking type */}
                <div className="grid grid-cols-1 gap-3 @md:grid-cols-3">
                  <div>
                    <label htmlFor="res-booking-source" className={labelClass}>
                      Booking Source
                    </label>
                    <select id="res-booking-source"
                      value={bookingSource}
                      onChange={(e) => {
                        setBookingSource(e.target.value);
                        // Reset dependent fields when source changes
                        if (e.target.value === "Direct") {
                          setSourceType("Walkin");
                        } else if (e.target.value === "OTA") {
                          setSourceType("Booking.com");
                        } else if (e.target.value === "Agent") {
                          setSourceType("");
                        } else if (e.target.value === "GDS") {
                          setSourceType("");
                        } else if (
                          e.target.value === "Corp" ||
                          e.target.value === "Corporate"
                        ) {
                          setSourceType("");
                        } else if (e.target.value === "Booking Engine") {
                          setSourceType("Website");
                        } else if (e.target.value === "Meta") {
                          setSourceType("Google ads");
                        } else {
                          setSourceType("Phone");
                        }
                      }}
                      className={selectClass}
                    >
                      <option value="Direct">Direct</option>
                      <option value="OTA">OTA</option>
                      <option value="Agent">Agent</option>
                      <option value="GDS">GDS</option>
                      <option value="Corp">Corporate</option>
                      <option value="Booking Engine">Booking Engine</option>
                      <option value="Meta">Meta</option>
                    </select>
                  </div>

                  <div>
                    {bookingSource === "Direct" ? (
                      <>
                        <label htmlFor="res-booking-type" className={labelClass}>
                          Booking Type
                        </label>
                        <select id="res-booking-type"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className={selectClass}
                        >
                          <option value="Walkin">Walkin</option>
                          <option value="Phone">Phone</option>
                          <option value="Email">Email</option>
                          <option value="Whatsapp">Whatsapp</option>
                        </select>
                      </>
                    ) : bookingSource === "OTA" ? (
                      <>
                        <label htmlFor="res-ota-channel" className={labelClass}>
                          OTA Channel
                        </label>
                        <select id="res-ota-channel"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className={selectClass}
                        >
                          <option value="Booking.com">Booking.com</option>
                          <option value="Expedia">Expedia</option>
                          <option value="Agoda">Agoda</option>
                          <option value="MakeMyTrip">MakeMyTrip</option>
                          <option value="Goibibo">Goibibo</option>
                          <option value="Airbnb">Airbnb</option>
                          <option value="Other OTA">Other OTA</option>
                        </select>
                      </>
                    ) : bookingSource === "Agent" ? (
                      <>
                        <label htmlFor="res-agency-name" className={labelClass}>
                          Agency Name
                        </label>
                        <input id="res-agency-name"
                          type="text"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          placeholder="Enter Agency Name"
                          className={fieldClass}
                        />
                        <label className={`${labelClass} mt-2`}>
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={sourceContactNumber}
                          onChange={(e) =>
                            setSourceContactNumber(e.target.value)
                          }
                          placeholder="Enter Contact Number"
                          className={fieldClass}
                        />
                      </>
                    ) : bookingSource === "GDS" ? (
                      <>
                        <label htmlFor="res-gds-name" className={labelClass}>
                          GDS Name
                        </label>
                        <input id="res-gds-name"
                          type="text"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          placeholder="Enter GDS Name"
                          className={fieldClass}
                        />
                        <label className={`${labelClass} mt-2`}>
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={sourceContactNumber}
                          onChange={(e) =>
                            setSourceContactNumber(e.target.value)
                          }
                          placeholder="Enter Contact Number"
                          className={fieldClass}
                        />
                      </>
                    ) : bookingSource === "Corp" ||
                      bookingSource === "Corporate" ? (
                      <>
                        <label htmlFor="res-company-name" className={labelClass}>
                          Company Name
                        </label>
                        <input id="res-company-name"
                          type="text"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          placeholder="Enter Company Name"
                          className={fieldClass}
                        />
                        <label className={`${labelClass} mt-2`}>
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={sourceContactNumber}
                          onChange={(e) =>
                            setSourceContactNumber(e.target.value)
                          }
                          placeholder="Enter Contact Number"
                          className={fieldClass}
                        />
                      </>
                    ) : bookingSource === "Booking Engine" ? (
                      <>
                        <label htmlFor="res-booking-engine" className={labelClass}>
                          Booking Engine
                        </label>
                        <select id="res-booking-engine"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className={selectClass}
                        >
                          <option value="Website">Website</option>
                          <option value="Djubo">Djubo</option>
                        </select>
                      </>
                    ) : bookingSource === "Meta" ? (
                      <>
                        <label htmlFor="res-meta-source" className={labelClass}>
                          Meta Source
                        </label>
                        <select id="res-meta-source"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className={selectClass}
                        >
                          <option value="Google ads">Google ads</option>
                          <option value="Trivago">Trivago</option>
                          <option value="Tripadvisor">Tripadvisor</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <label htmlFor="res-booking-type-mode" className={labelClass}>
                          Booking Type / Mode
                        </label>
                        <select id="res-booking-type-mode"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className={selectClass}
                        >
                          <option value="Phone">Phone Call Inquiry</option>
                          <option value="Email">Email Confirmation</option>
                          <option value="Web Portal">
                            Web Portal / Engine
                          </option>
                          <option value="Front Desk">Front Desk Agent</option>
                        </select>
                      </>
                    )}
                  </div>
                <div>
                  <label htmlFor="res-reference-id" className={labelClass}>
                    Reference ID
                  </label>
                  <input id="res-reference-id"
                    type="text"
                    value={externalReferenceId}
                    onChange={(e) => setExternalReferenceId(e.target.value)}
                    placeholder="Enter external OTA / agent reference ID"
                    className={fieldClass}
                  />
                </div>
                </div>


                {/* Stay dates and booking category */}
                <div className="grid grid-cols-1 @md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="res-check-in-date" className={labelClass}>
                      Check-in Date
                    </label>
                    <div className="relative">
                      <Lucide.Calendar
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                      />
                      <input id="res-check-in-date"
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className={`${iconFieldClass} rounded-xl`}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="res-check-out-date" className={labelClass}>
                      Check-out Date
                    </label>
                    <div className="relative">
                      <Lucide.Calendar
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                      />
                      <input id="res-check-out-date"
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        className={`${iconFieldClass} rounded-xl`}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="res-booking-type-2" className={labelClass}>
                      Booking Type
                    </label>
                    <select id="res-booking-type-2"
                      value={bookingCategory}
                      onChange={(e) => setBookingCategory(e.target.value)}
                      className={selectClass}
                    >
                      <option value="FIT">FIT</option>
                      <option value="Group">Group</option>
                      <option value="MICE">MICE</option>
                      <option value="SERIES">SERIES</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 @md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label htmlFor="res-check-in-time" className={labelClass}>
                      Check-in Time
                    </label>
                    <div className="relative">
                      <Lucide.Clock
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                      />
                      <input id="res-check-in-time"
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className={`${iconFieldClass} rounded-xl`}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="res-check-out-time" className={labelClass}>
                      Check-out Time
                    </label>
                    <div className="relative">
                      <Lucide.Clock
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                      />
                      <input id="res-check-out-time"
                        type="time"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className={`${iconFieldClass} rounded-xl`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={samePlanAllRooms}
                      onChange={(e) => {
                        setSamePlanAllRooms(e.target.checked);
                        if (e.target.checked) {
                          setRequirements((previous) =>
                            previous.map((room) => ({
                              ...room,
                              ratePlan,
                              mealPlan,
                            })),
                          );
                        }
                      }}
                      className="w-4 h-4 rounded border-border text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                    />
                    <span className="text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold text-ink">
                      Same Plan for All Rooms
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                    />
                    <span className="text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-semibold text-ink">
                      Pay at Hotel
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1 @md:grid-cols-2">
                {samePlanAllRooms && (
                  <div className="min-w-0">
                    <label htmlFor="res-rate-plan" className={labelClass}>
                      Rate Plan
                    </label>
                    <select id="res-rate-plan"
                      value={ratePlan}
                      onChange={(event) => {
                        setRatePlan(event.target.value);
                        setRequirements((previous) =>
                          previous.map((room) => ({
                            ...room,
                            ratePlan: event.target.value,
                          })),
                        );
                      }}
                      className={selectClass}
                    >
                      <option value="Best Available Rates">
                        Best Available Rates
                      </option>
                      {RATE_PLANS.filter(
                        (plan) => plan !== "Best Available Rates",
                      ).map((plan) => (
                        <option key={plan} value={plan}>
                          {plan}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                  <div>
                    <label htmlFor="res-room-type" className={labelClass}>
                      Room Type
                    </label>
                    <select id="res-room-type"
                      value={requirements[0]?.roomTypeId ?? "deluxe"}
                      onChange={(e) => {
                        const nextType = roomTypes.find(
                          (type) => type.id === e.target.value,
                        );
                        if (nextType) {
                          setRequirements((prev) =>
                            prev.map((room) => ({
                              ...room,
                              roomTypeId: nextType.id,
                              category: nextType.name,
                              rate: Number(nextType.baseRate),
                              roomId: null,
                              roomNo: "",
                            })),
                          );
                        }
                      }}
                      className={selectClass}
                    >
                      {roomTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {samePlanAllRooms && (
                    <div>
                      <label htmlFor="res-meal-plan" className={labelClass}>
                        Meal Plan
                      </label>
                      <select id="res-meal-plan"
                        value={mealPlan}
                        onChange={(event) => {
                          setMealPlan(event.target.value);
                          setRequirements((previous) =>
                            previous.map((room) => ({
                              ...room,
                              mealPlan: event.target.value,
                            })),
                          );
                        }}
                        className={selectClass}
                      >
                        <option value="EP">EP</option>
                        <option value="CP">CP</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label htmlFor="res-no-of-rooms" className={labelClass}>
                      No of Rooms
                    </label>
                    <select id="res-no-of-rooms"
                      value={requirements.length}
                      onChange={(e) => {
                        const count = parseInt(e.target.value);
                        if (count >= requirements.length) {
                          for (let i = requirements.length; i < count; i++) {
                            handleAddRoom();
                          }
                        } else {
                          for (let i = requirements.length; i > count; i--) {
                            if (requirements[i - 1]) {
                              handleRemoveRoom(requirements[i - 1].id);
                            }
                          }
                        }
                      }}
                      className={selectClass}
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </div>
                </div>
              </section>

              <RoomRequirementsSection
                requirements={requirements}
                roomTypes={roomTypes}
                availableRoomsByType={availableRoomsByType}
                samePlanAllRooms={samePlanAllRooms}
                overridePrice={overridePrice}
                roomCharges={roomCharges}
                mealPlanCharges={mealPlanCharges}
                roomTax={roomTax}
                totalRooms={requirements.length}
                nights={nightsCount}
                onOverridePriceChange={setOverridePrice}
                onOverrideRoomTotalChange={setOverrideRoomTotal}
                onRemoveRoom={handleRemoveRoom}
                onUpdateRoom={(id, updates) => {
                  handleUpdateRequirement(id, updates);
                  if (updates.billingRoute === "To Company")
                    setBillingPreferences((previous) => ({
                      ...previous,
                      billToCompany: true,
                    }));
                }}
              />


              <BillingPreferencesSection
                preferences={billingPreferences}
                totalsByRoute={totalsByRoute}
                onChange={(updates) =>
                  setBillingPreferences((previous) => ({
                    ...previous,
                    ...updates,
                  }))
                }
              />

              {/* SECTION 4: GUEST DETAILS & PROFILE SEARCH */}
              <section className="min-w-0 bg-surface rounded-2xl md:rounded-3xl border border-border/80 p-4 md:p-5 min-[1440px]:p-6 shadow-xs flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white font-bold text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] shadow-xs shadow-primary/20">
                      4
                    </span>
                    <div>
                      <h2 className="text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-bold text-ink-secondary tracking-tight">
                        Guest Information & Verification
                      </h2>
                    </div>
                  </div>

                  <span className="text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-ink-secondary bg-page border border-border/80 px-2.5 py-1 rounded-lg">
                    Primary Resident
                  </span>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @2xl:grid-cols-4">
                  <div className="md:col-span-1">
                    <label htmlFor="res-salutation" className={labelClass}>
                      Salutation
                    </label>
                    <select id="res-salutation"
                      value={guestSalutation}
                      onChange={(e) => setGuestSalutation(e.target.value)}
                      className={selectClass}
                    >
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Dr.">Dr.</option>
                    </select>
                  </div>

                  <div className="md:col-span-1 @2xl:col-span-3">
                    <label htmlFor="res-full-legal-name" className={labelClass}>
                      Full Legal Name{" "}
                      <span className="text-danger-text">*</span>
                    </label>
                    <input id="res-full-legal-name"
                      type="text"
                      value={guestName}
                      onChange={(e) => {
                        setGuestName(e.target.value);
                        setPrimaryGuestId(null);
                        setRequirements((previous) =>
                          previous.map((room, index) =>
                            index === 0
                              ? {
                                ...room,
                                occupants: room.occupants.map(
                                  (occupant, occupantIndex) =>
                                    occupantIndex === 0
                                      ? { ...occupant, name: e.target.value }
                                      : occupant,
                                ),
                              }
                              : room,
                          ),
                        );
                      }}
                      placeholder="e.g. Rohan Sharma"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 @md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="res-phone-number" className={labelClass}>
                      Phone Number <span className="text-danger-text">*</span>
                    </label>
                    <div className="relative">
                      <input id="res-phone-number"
                        type="text"
                        value={guestContact}
                        onChange={(e) => {
                          setGuestContact(e.target.value);
                          setPrimaryGuestId(null);
                        }}
                        placeholder="e.g. +91 88829 51951"
                        className={`${fieldClass} pr-9`}
                      />
                      <Lucide.Phone
                        size={13}
                        className="text-ink-muted absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="res-email-address" className={labelClass}>
                      Email Address
                    </label>
                    <div className="relative">
                      <input id="res-email-address"
                        type="email"
                        value={guestEmail}
                        onChange={(e) => {
                          setGuestEmail(e.target.value);
                          setPrimaryGuestId(null);
                        }}
                        placeholder="e.g. guest@example.com"
                        className={`${fieldClass} pr-9`}
                      />
                      <Lucide.Mail
                        size={13}
                        className="text-ink-muted absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                  </div>
                </div>

                {/* ID Verification Row */}
                <div className="grid grid-cols-1 @md:grid-cols-2 gap-3 pt-1 border-t border-divider">
                  <div>
                    <label htmlFor="res-identity-document" className={labelClass}>
                      Identity Document
                    </label>
                    <select id="res-identity-document"
                      value={guestIdType}
                      onChange={(e) => setGuestIdType(e.target.value)}
                      className={selectClass}
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="res-document-number" className={labelClass}>
                      Document Number
                    </label>
                    <input id="res-document-number"
                      type="text"
                      value={guestIdNumber}
                      onChange={(e) => setGuestIdNumber(e.target.value)}
                      placeholder="e.g. 9842 1290 8731"
                      className={fieldClass}
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label htmlFor="res-front-desk-stay" className={labelClass}>
                    Front Desk & Stay Notes
                  </label>
                  <textarea id="res-front-desk-stay"
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Guest preferences, arrival notes, or housekeeping requests..."
                    className={textareaClass}
                  />
                </div>
              </section>

              {/* SECTION 5: PAYMENTS & SUMMARY BREAKDOWN */}
              <section className="min-w-0 bg-surface rounded-2xl md:rounded-3xl border border-border/80 p-4 md:p-5 min-[1440px]:p-6 shadow-xs flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider pb-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white font-bold text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] shadow-xs shadow-primary/20">
                      5
                    </span>
                    <div>
                      <h2 className="text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-bold text-ink-secondary tracking-tight">
                        Payments & Master Folio Summary
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCollectAmount(String(outstanding));
                      setCollectModalOpen(true);
                    }}
                    className="flex flex-none items-center gap-1.5 rounded-xl bg-warning-text px-3 py-1.5 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-white shadow-xs transition-all hover:bg-warning-text cursor-pointer"
                  >
                    <Lucide.Banknote size={13} />
                    <span>Collect Payment</span>
                  </button>
                </div>

                {/* Payments Recorded List */}
                {paymentsList.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                      Recorded Transactions
                    </span>
                    {paymentsList.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-page/60 p-3 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px]"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-bg text-success-text">
                            <Lucide.Check size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-ink block">
                              {p.method}
                            </span>
                            <span className="break-words text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-secondary font-mono">
                              Ref: {p.ref} · {p.time}
                            </span>
                          </div>
                        </div>
                        <span className="ml-auto flex-none font-extrabold font-mono text-success-text">
                          ₹{p.amount.toLocaleString("en-IN")}.00
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-center text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] text-ink-secondary bg-page/30">
                    No advance payments recorded yet. Click{" "}
                    <strong>Collect Payment</strong> to record an advance or
                    deposit.
                  </div>
                )}

                {/* Payment Notes */}
                <div>
                  <label htmlFor="res-payment-accounting-notes" className={labelClass}>
                    Payment & Accounting Notes
                  </label>
                  <input id="res-payment-accounting-notes"
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Card pre-authorization held or UPI transaction reference..."
                    className={fieldClass}
                  />
                </div>

                {/* Itemized Bill Summary Table */}
                <div className="rounded-2xl border border-border/90 bg-surface p-3 md:p-4 flex flex-col gap-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px]">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-ink-secondary">
                    <span className="min-w-0 flex-1">
                      Room Charges ({requirements.length} room(s), {nightsCount}{" "}
                      night(s))
                    </span>
                    <span className="shrink-0 text-right font-semibold font-mono text-ink">
                      ₹{roomCharges.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-ink-secondary">
                    <span className="min-w-0 flex-1">Meal plan supplements</span>
                    <span className="shrink-0 text-right font-semibold font-mono text-ink">
                      ₹{mealPlanCharges.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-ink-secondary">
                    <span className="min-w-0 flex-1">Outlet / POS add-ons ({posAddons.length})</span>
                    <span className="shrink-0 text-right font-semibold font-mono text-ink">
                      ₹{addonSubtotal.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-ink-secondary">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <span>Discount Applied</span>
                      <span className="text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] text-ink-muted font-medium">
                        (Editable)
                      </span>
                    </div>
                    <div className="flex flex-none items-center gap-1">
                      <span className="text-ink-muted font-mono text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px]">
                        -₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount || ""}
                        onChange={(e) =>
                          setDiscountAmount(
                            Math.max(0, Number(e.target.value) || 0),
                          )
                        }
                        placeholder="0"
                        className="pms-input w-24 min-h-[32px] px-2 py-1 text-right font-mono font-bold text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="h-[1px] bg-muted-surface my-0.5" />

                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 font-bold text-ink">
                    <span className="min-w-0 flex-1">Sub-Total</span>
                    <span className="shrink-0 text-right font-mono text-ink">
                      ₹{subTotal.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-ink-secondary">
                    <span className="min-w-0 flex-1">Goods & Services Tax (GST {TAX_RATE * 100}%)</span>
                    <span className="shrink-0 text-right font-semibold font-mono text-ink">
                      ₹{taxAmount.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-success-text font-bold">
                    <span className="min-w-0 flex-1">Payments Received</span>
                    <span className="shrink-0 text-right font-mono">
                      ₹{totalPaid.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="h-[1px] bg-border my-1" />

                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 pt-0.5 text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-extrabold text-ink">
                    <span className="min-w-0 flex-1">Net Payable at Hotel</span>
                    <span className="shrink-0 text-right font-mono text-[16px] md:max-[1023px]:text-[15px] lg:max-[1439px]:text-[14px] min-[1440px]:text-[15px] text-[var(--color-primary)]">
                      ₹{outstanding.toLocaleString("en-IN")}.00
                    </span>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* OUTLET / POS ADDONS TAB */}
          {activeTab === "outlet" && (
            <OutletPOSSection
              requirements={requirements}
              addons={posAddons}
              catalog={OUTLET_CATALOG}
              noPost={billingPreferences.noPost}
              defaultBillingRoute={billingPreferences.extrasBillTo}
              onAdd={handleAddAddon}
              onUpdate={handleUpdateAddon}
              onRemove={(id) =>
                setPosAddons((previous) =>
                  previous.filter((addon) => addon.id !== id),
                )
              }
            />
          )}
        </div>


        {/* ================= FOURTH COLUMN: TASKS & CHECKLIST ================= */}
        <div className="flex min-w-0 flex-col gap-4 lg:max-[1279px]:col-start-1 lg:max-[1279px]:row-start-2 xl:col-start-4 xl:row-start-1 xl:sticky xl:top-6 xl:self-start">
          {/* Front Desk Tasks Panel */}
          <div className="min-w-0 bg-surface rounded-3xl border border-border/90 shadow-sm p-3 min-[1440px]:p-5 flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-warning-bg text-warning-text">
                  <Lucide.CheckSquare size={15} />
                </div>
                <h3 className="min-w-0 flex-1 text-[14px] md:max-[1023px]:text-[13px] lg:max-[1439px]:text-[12px] min-[1440px]:text-[13px] font-bold text-ink uppercase tracking-wider">
                  Checklist & Tasks
                </h3>
              </div>
              <span className="flex-none text-[10px] md:max-[1023px]:text-[10px] lg:max-[1439px]:text-[10px] min-[1440px]:text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted-surface text-ink">
                {tasks.filter((t) => t.done).length}/{tasks.length} Done
              </span>
            </div>

            {/* Task Items */}
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${task.done
                    ? "bg-page border-border/60 opacity-60"
                    : "bg-surface border-border hover:border-ink-disabled shadow-2xs"
                    }`}
                >
                  <button
                    type="button"
                    className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border transition-colors ${task.done
                      ? "bg-success-text border-success-text text-white"
                      : "border-ink-disabled bg-surface"
                      }`}
                  >
                    {task.done && <Lucide.Check size={11} />}
                  </button>
                  <span
                    className={`min-w-0 flex-1 break-words text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] ${task.done
                      ? "line-through text-ink-muted font-normal"
                      : "font-semibold text-ink"
                      }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Add Task Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="Add front desk task..."
                className={`${fieldClass} min-w-0 flex-1`}
              />
              <button
                type="button"
                onClick={handleAddTask}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink text-white hover:bg-ink transition-colors cursor-pointer shrink-0"
              >
                <Lucide.Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= FLOATING ACTION DOCK (BOTTOM BAR) ================= */}
      <div className="sticky bottom-3 z-30 mx-auto w-full max-w-4xl">
        <div className="backdrop-blur-md bg-surface/95 rounded-2xl border border-border/90 p-3 md:px-4 shadow-lg flex flex-wrap items-center justify-between gap-2 md:gap-3">
          {/* Left: Report an issue */}
          <button
            type="button"
            onClick={() => setIssueModalOpen(true)}
            aria-label="Report issue"
            className="flex items-center gap-1.5 px-3 min-h-[40px] py-2 rounded-xl border border-danger-border bg-danger-bg/70 hover:bg-danger-bg/80 text-danger-text text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold transition-colors cursor-pointer"
          >
            <Lucide.AlertCircle size={14} />
            <span className="hidden md:inline">Report Issue</span>
          </button>

          {/* Center: Live Total Ticker */}
          <div className="hidden md:flex items-center gap-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold px-3 py-1.5 rounded-xl bg-page border border-border/60">
            <span className="text-ink-secondary">
              {requirements.length} Room(s) · {nightsCount} Night(s)
            </span>
            <span className="h-3 w-[1px] bg-ink-disabled" />
            <span className="font-mono text-ink">
              ₹{totalBill.toLocaleString("en-IN")}.00
            </span>
          </div>

          {/* Right: Actions */}
          <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-1.5 md:w-auto md:gap-2">
            <button
              type="button"
              onClick={() => go({ view: "reservations" })}
              className="rounded-xl border border-border bg-surface px-2.5 min-h-[40px] py-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-ink transition-colors hover:bg-page cursor-pointer md:px-3.5"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setCollectAmount(String(outstanding));
                setCollectModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-warning-text px-3 min-h-[40px] py-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-white shadow-xs transition-all hover:bg-warning-text active:bg-warning-text cursor-pointer md:px-4"
            >
              <Lucide.Banknote size={14} />
              <span>Save & Pay</span>
            </button>
            <button
              type="button"
              disabled={savingReservation}
              onClick={() => void handleConfirmReservation(true)}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 min-h-[40px] py-2 text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold text-white shadow-md shadow-[var(--color-primary)]/20 transition-all hover:opacity-95 cursor-pointer md:px-5"
            >
              {savingReservation ? (
                <Lucide.LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Lucide.CheckCircle2 size={14} />
              )}
              <span className="md:hidden">{savingReservation ? "Saving…" : "Confirm"}</span>
              <span className="hidden md:inline">{savingReservation ? "Saving…" : "Confirm & Email"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= PAYMENT COLLECT MODAL ================= */}
      <Modal
        open={collectModalOpen}
        onClose={() => setCollectModalOpen(false)}
        title="Collect Folio Payment"
        subtitle="Record advance or settle the outstanding bill"
        footer={
          <>
            <button type="button" onClick={() => setCollectModalOpen(false)} className="pms-btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={handleRecordPayment} className="pms-btn-primary">
              Confirm Payment
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="res-payment-amount" className={labelClass}>
                  Payment Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-ink-muted">
                    ₹
                  </span>
                  <input id="res-payment-amount"
                    type="number"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className={iconFieldClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    ["UPI / QR", "Credit Card", "Debit Card", "Cash"] as const
                  ).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setCollectMethod(method)}
                      className={`py-2 px-3 rounded-xl border text-[12px] md:max-[1023px]:text-[11px] lg:max-[1439px]:text-[11px] min-[1440px]:text-[12px] font-bold transition-all cursor-pointer ${collectMethod === method
                        ? "bg-[var(--color-primary)] text-white border-transparent shadow-xs"
                        : "bg-surface border-border text-ink hover:bg-page"
                        }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="res-transaction-slip-reference" className={labelClass}>
                  Transaction / Slip Reference
                </label>
                <input id="res-transaction-slip-reference"
                  type="text"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  placeholder="e.g. UPI-984210982 / POS Approval Code"
                  className={fieldClass}
                />
              </div>
            </div>
      </Modal>

      {/* ================= REPORT ISSUE MODAL ================= */}
      <Modal
        open={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Report Reservation Issue"
        subtitle="Escalate an allotment, rate, or sync issue"
        footer={
          <>
            <button type="button" onClick={() => setIssueModalOpen(false)} className="pms-btn-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                toast.success("Issue Submitted", {
                  detail: "Escalated to IT & Duty Manager.",
                });
                setIssueModalOpen(false);
                setIssueText("");
              }}
              className="pms-btn-danger"
            >
              Submit Ticket
            </button>
          </>
        }
      >
        <textarea
              rows={3}
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="Describe the issue (e.g. rate mismatch on OTA, room allocation conflict)..."
              className={textareaClass}
            />
      </Modal>
    </div>
  );
}
