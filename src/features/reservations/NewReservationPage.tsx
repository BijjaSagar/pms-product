import { useCallback, useMemo, useState } from "react";
import * as Lucide from "lucide-react";
import type { NavTarget } from "../../components/nav";
import { toast } from "../../components/toastStore";
import { inventoryApi, guestApi, reservationApi } from "../../lib/api/pms";
import type {
  ReservationPendingPaymentRow,
  ReservationRoomRow,
} from "../../lib/api/pms";
import { useApiResource } from "../../lib/api/useApiResource";
import { TAX_RATE } from "../../data/catalog";
import { BillingPreferencesSection } from "./new-reservation/BillingPreferencesSection";
import { OutletPOSSection } from "./new-reservation/OutletPOSSection";
import { RoomRequirementsSection } from "./new-reservation/RoomRequirementsSection";
import {
  FALLBACK_ROOM_CATEGORIES,
  MEAL_PLANS,
  OUTLET_CATALOG,
  RATE_PLANS,
  SAMPLE_GUEST_DATABASE,
} from "./new-reservation/data";
import type {
  BillingPreferences,
  FrontDeskTask,
  OutletAddonLine,
  OutletCatalogItem,
  RoomCategoryOption,
  RoomRequirement,
} from "./new-reservation/types";

export function NewReservation({ go }: { go: (t: NavTarget) => void }) {
  const [activeTab, setActiveTab] = useState<"general" | "outlet">("general");

  // Booking Parameters
  const [bookingSource, setBookingSource] = useState("Direct");
  const [sourceType, setSourceType] = useState("Phone");
  const [externalReferenceId, setExternalReferenceId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [sourceContactNumber, setSourceContactNumber] = useState("");
  const [checkInDate, setCheckInDate] = useState("2026-10-20");
  const [checkOutDate, setCheckOutDate] = useState("2026-10-21");
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
  const availableRoomsByType =
    inventoryResource.data?.availableRoomsByType ?? {};

  // Requirements (Rooms list)
  const [overridePrice, setOverridePrice] = useState(false);
  const [overrideRoomTotal, setOverrideRoomTotal] = useState<number | null>(
    null,
  );
  const [requirements, setRequirements] = useState<RoomRequirement[]>([
    {
      id: "req-1",
      roomIndex: 1,
      roomTypeId: "deluxe",
      category: "Deluxe",
      adults: 2,
      children: 0,
      infant: 0,
      roomId: null,
      roomNo: "",
      rate: 4500,
      ratePlan: "Best Available Rates",
      mealPlan: "EP",
      billingRoute: "Default",
      occupants: [
        { id: "occupant-primary", name: "Rohan Sharma", role: "Primary guest" },
      ],
    },
  ]);

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
  const [guestSearch, setGuestSearch] = useState("");
  const [showGuestSearchDropdown, setShowGuestSearchDropdown] = useState(false);
  const [guestSalutation, setGuestSalutation] = useState("Mr.");
  const [guestName, setGuestName] = useState("Rohan Sharma");
  const [primaryGuestId, setPrimaryGuestId] = useState<string | null>(null);
  const [guestContact, setGuestContact] = useState("+91 88829 51951");
  const [guestEmail, setGuestEmail] = useState("support@djubo.com");
  const [guestIdType, setGuestIdType] = useState("Aadhaar Card");
  const [guestIdNumber, setGuestIdNumber] = useState("9842 1290 8731");
  const [specialRequests, setSpecialRequests] = useState(
    "Quiet room on upper floor preferred.",
  );

  // Payments & Financials
  const [paymentNotes, setPaymentNotes] = useState(
    "Pre-booking verified via direct call.",
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
        <div className="bg-surface rounded-3xl border border-border/90 shadow-md p-6 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-success-text via-[var(--color-primary)] to-success-border" />

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-success-bg text-success-text shadow-sm border border-success-border mb-5">
            <Lucide.CheckCircle2 size={44} />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success-bg border border-success-border text-success-text text-xs font-bold mb-3 uppercase tracking-wider">
            <Lucide.ShieldCheck size={14} />
            Folio Verified & Confirmed
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            Booking ID #{confirmedBooking.code}
          </h2>
          {confirmedBooking.referenceId && (
            <p className="mt-1 text-xs text-ink-secondary">
              Reference ID:{" "}
              <span className="font-mono font-semibold text-ink">
                {confirmedBooking.referenceId}
              </span>
            </p>
          )}
          <p className="max-w-lg mx-auto text-xs sm:text-sm text-ink-secondary mt-2">
            Reservation successfully saved for{" "}
            <strong className="text-ink">{confirmedBooking.guest}</strong>. Room
            lines, billing routes, add-ons, and payments are saved to the PMS.
          </p>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mt-6 text-left">
            <div className="p-3.5 rounded-xl border border-divider bg-page/70">
              <span className="block text-[10px] font-bold text-ink-muted uppercase">
                Check-in
              </span>
              <span className="text-xs sm:text-sm font-bold text-ink mt-0.5 block">
                {checkInDate}
              </span>
              <span className="text-[10px] text-ink-secondary">
                {checkInTime} hrs
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-divider bg-page/70">
              <span className="block text-[10px] font-bold text-ink-muted uppercase">
                Check-out
              </span>
              <span className="text-xs sm:text-sm font-bold text-ink mt-0.5 block">
                {checkOutDate}
              </span>
              <span className="text-[10px] text-ink-secondary">
                {checkOutTime} hrs
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-divider bg-page/70">
              <span className="block text-[10px] font-bold text-ink-muted uppercase">
                Allotment
              </span>
              <span className="text-xs sm:text-sm font-bold text-ink mt-0.5 block">
                {confirmedBooking.rooms} Room(s)
              </span>
              <span className="text-[10px] text-ink-secondary">
                {confirmedBooking.nights} Night(s)
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-divider bg-page/70">
              <span className="block text-[10px] font-bold text-ink-muted uppercase">
                Total Bill
              </span>
              <span className="text-xs sm:text-sm font-bold text-success-text font-mono mt-0.5 block">
                ₹{confirmedBooking.total.toLocaleString("en-IN")}.00
              </span>
              <span className="text-[10px] text-ink-secondary font-semibold">
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
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[var(--color-primary)] hover:opacity-95 text-white shadow-sm transition-all text-xs cursor-pointer"
              onClick={() => go({ view: "reservations" })}
            >
              <Lucide.CalendarDays size={15} />
              <span>View All Reservations</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold border border-border bg-surface hover:bg-page text-ink shadow-xs transition-colors text-xs cursor-pointer"
              onClick={() => window.print()}
            >
              <Lucide.Printer size={15} className="text-ink-secondary" />
              <span>Print Registration Slip</span>
            </button>
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl font-semibold border border-border bg-surface hover:bg-page text-ink shadow-xs transition-colors text-xs cursor-pointer"
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
    <div className="w-full text-ink font-sans pb-24 flex flex-col gap-4">
      {/* ================= 4-COLUMN MASTER WORKBENCH ================= */}
      <div className="grid grid-cols-1 gap-4 items-start lg:grid-cols-2 xl:grid-cols-[repeat(24,minmax(0,1fr))]">
        {/* ================= LEFT COLUMN: LUXURY FOLIO BOARDING TICKET ================= */}
        <div className="flex flex-col rounded-3xl border border-border/90 bg-surface shadow-sm overflow-hidden lg:sticky lg:top-4 xl:col-span-5">
          {/* Top Boarding Pass Header Strip */}
          <div className="bg-gradient-to-r from-primary via-primary-hover to-dark-accent p-4 text-primary-foreground border-b border-dark-accent">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 border-r border-primary-foreground/25 pr-3">
                <span className="block text-[10px] font-bold tracking-wider text-primary-foreground/70">
                  BOOKING ID
                </span>
                <div className="mt-1 flex min-w-0 items-center gap-1.5">
                  <span
                    className="min-w-0 truncate text-xs font-bold font-mono"
                    title={bookingId || "Assigned on save"}
                  >
                    {bookingId || "Assigned on save"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    disabled={!bookingId}
                    className="ml-auto flex-none text-primary-foreground/70 transition-colors hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    title="Copy Booking ID"
                    aria-label="Copy Booking ID"
                  >
                    {copiedCode ? (
                      <Lucide.Check
                        size={12}
                        className="text-success-foreground"
                      />
                    ) : (
                      <Lucide.Copy size={12} />
                    )}
                  </button>
                </div>
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold tracking-wider text-primary-foreground/70">
                  REFERENCE ID
                </span>
                <span
                  className="mt-1 block truncate text-xs font-bold font-mono"
                  title={externalReferenceId || "No external reference"}
                >
                  {externalReferenceId || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Body with Notched Perforations */}
          <div className="p-5 flex flex-col gap-4 relative">
            {/* Elegant Calendar Journey Tile */}
            <div className="bg-gradient-to-b from-page to-surface rounded-2xl border border-border/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between text-center">
                {/* Check In */}
                <div className="text-left">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                    CHECK-IN
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-ink leading-none">
                      {inDate.day}
                    </span>
                    <span className="text-xs font-bold text-ink-secondary uppercase">
                      {inDate.month}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-ink-muted mt-1 block">
                    {inDate.weekday} · {checkInTime}
                  </span>
                </div>

                {/* Duration Badge with line */}
                <div className="flex-1 flex flex-col items-center px-3">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-ink bg-surface px-2.5 py-1 rounded-full border border-border shadow-2xs">
                    <Lucide.Moon size={11} className="text-primary" />
                    <span>
                      {nightsCount} {nightsCount === 1 ? "Night" : "Nights"}
                    </span>
                  </div>
                  <div className="w-full relative flex items-center justify-center my-1.5">
                    <div className="w-full border-t border-dashed border-ink-disabled" />
                    <Lucide.BedDouble
                      size={13}
                      className="text-ink-muted absolute bg-surface px-0.5"
                    />
                  </div>
                  <span className="text-[9px] text-ink-muted font-medium">
                    Allotment
                  </span>
                </div>

                {/* Check Out */}
                <div className="text-right">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                    CHECK-OUT
                  </span>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5">
                    <span className="text-3xl font-black text-ink leading-none">
                      {outDate.day}
                    </span>
                    <span className="text-xs font-bold text-ink-secondary uppercase">
                      {outDate.month}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-ink-muted mt-1 block">
                    {outDate.weekday} · {checkOutTime}
                  </span>
                </div>
              </div>
            </div>

            <p
              className="text-xs font-semibold tracking-wide text-ink-secondary"
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
            <div className="relative p-3 rounded-xl border border-divider bg-surface shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold text-xs shrink-0">
                  {guestName ? guestName.charAt(0).toUpperCase() : "G"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-ink truncate">
                      {guestName || "Unnamed Guest"}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-warning-bg text-warning-text border border-warning-border">
                      VIP
                    </span>
                  </div>
                  <span className="text-[11px] text-ink-secondary font-medium truncate block">
                    {guestContact || "No contact"}
                  </span>
                </div>
              </div>
              <a
                href={`tel:${guestContact}`}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-ink-secondary hover:bg-page transition-colors shrink-0"
                title="Call Guest"
              >
                <Lucide.Phone size={13} />
              </a>

              {/* Double-Ring Luxury Confirmed Front Desk Stamp Overlay - Half on name and half out */}
              <div
                className="pointer-events-none absolute -top-5 left-28 sm:left-43 flex items-center justify-center select-none z-20"
                aria-hidden="true"
              >
                <div className="relative inline-flex items-center justify-center p-1.5 rounded-full border-2 border-dashed border-success-text/80 bg-success-bg/25 rotate-[-10deg] shadow-xs">
                  <div className="flex flex-col h-14 w-14 items-center justify-center rounded-full border-2 border-success-text bg-surface/95 text-success-text shadow-xs text-center backdrop-blur-[1px]">
                    <Lucide.ShieldCheck
                      size={14}
                      className="text-success-text"
                    />
                    <span className="font-black text-[8px] uppercase tracking-wider mt-0.5 leading-none">
                      CONFIRMED
                    </span>
                    <span className="text-[6.5px] font-bold text-success-text/90 font-mono mt-0.5">
                      FRONT DESK
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt-style bill summary */}
            <div className="border-y border-divider py-3">
              <div className="grid grid-cols-2 divide-x divide-divider">
                <div className="pr-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Total Bill
                  </span>
                  <span className="mt-1 block text-sm font-extrabold font-mono text-ink">
                    ₹{totalBill.toLocaleString("en-IN")}.00
                  </span>
                </div>
                <div className="pl-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Outstanding
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`text-sm font-extrabold font-mono ${outstanding > 0 ? "text-warning-text" : "text-success-text"}`}
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
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-warning-text hover:bg-warning-bg"
                        title="e-Collect payment"
                        aria-label="e-Collect payment"
                      >
                        <Lucide.Banknote size={14} />
                      </button>
                    ) : (
                      <Lucide.Check
                        size={14}
                        className="text-success-text"
                        aria-label="Paid in full"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tile Buttons Footer */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-divider text-center">
              <button
                type="button"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-border/80 hover:bg-page text-ink-secondary transition-colors shadow-2xs cursor-pointer group"
                title="Direct Phone Booking"
              >
                <Lucide.PhoneCall
                  size={14}
                  className="text-ink-secondary group-hover:text-[var(--color-primary)] transition-colors"
                />
                <span className="text-[9px] font-bold mt-1 text-ink">
                  DIRECT
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectAmount(String(outstanding));
                  setCollectModalOpen(true);
                }}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-border/80 hover:bg-page text-ink-secondary transition-colors shadow-2xs cursor-pointer group"
                title="Collect Payment"
              >
                <Lucide.Banknote size={14} className="text-warning-text" />
                <span className="text-[9px] font-bold mt-1 text-ink">
                  ₹ PAY
                </span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-border/80 hover:bg-page text-ink-secondary transition-colors shadow-2xs cursor-pointer group"
                title="Assigned Rooms"
              >
                <Lucide.BedDouble size={14} className="text-primary" />
                <span className="text-[9px] font-bold mt-1 text-ink">
                  ROOMS
                </span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl border border-border/80 hover:bg-page text-ink-secondary transition-colors shadow-2xs cursor-pointer group"
                title="Guest ID Verification"
              >
                <Lucide.CreditCard size={14} className="text-success-text" />
                <span className="text-[9px] font-bold mt-1 text-ink">
                  ID / CARD
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= CENTER COLUMN: REFINED WORKBENCH & INTAKE CONSOLE ================= */}
        <div className="flex flex-col gap-4 min-w-0 xl:col-span-10">
          {/* Sub Navigation Segmented Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted-surface/80 rounded-2xl border border-border/80 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "general"
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
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "outlet"
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
              <section className="bg-surface rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-divider pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white font-bold text-xs shadow-xs shadow-primary/20">
                      1
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-ink tracking-tight">
                        Booking Details & Rate Plan
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                      Status:
                    </span>
                    <select
                      value={bookingType}
                      onChange={(e) => setBookingType(e.target.value)}
                      className="text-[11px] font-bold text-ink bg-page border border-border/80 px-2.5 py-1 rounded-lg focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                    >
                      <option value="Confirmed">Confirmed</option>
                      <option value="Guaranteed">Guaranteed</option>
                      <option value="Tentative">Tentative</option>
                      <option value="Waitlist">Waitlist</option>
                    </select>
                  </div>
                </div>

                {/* Booking source and source-specific booking type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Booking Source
                    </label>
                    <select
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
                      className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
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
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                          Booking Type
                        </label>
                        <select
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                        >
                          <option value="Walkin">Walkin</option>
                          <option value="Phone">Phone</option>
                          <option value="Email">Email</option>
                          <option value="Whatsapp">Whatsapp</option>
                        </select>
                      </>
                    ) : bookingSource === "OTA" ? (
                      <>
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                          OTA Channel
                        </label>
                        <select
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
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
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                          Agency Name
                        </label>
                        <input
                          type="text"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          placeholder="Enter Agency Name"
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                        />
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5 mt-2">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={sourceContactNumber}
                          onChange={(e) =>
                            setSourceContactNumber(e.target.value)
                          }
                          placeholder="Enter Contact Number"
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                        />
                      </>
                    ) : bookingSource === "GDS" ? (
                      <>
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                          GDS Name
                        </label>
                        <input
                          type="text"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          placeholder="Enter GDS Name"
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                        />
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5 mt-2">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={sourceContactNumber}
                          onChange={(e) =>
                            setSourceContactNumber(e.target.value)
                          }
                          placeholder="Enter Contact Number"
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                        />
                      </>
                    ) : bookingSource === "Corp" ||
                      bookingSource === "Corporate" ? (
                      <>
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          placeholder="Enter Company Name"
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                        />
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5 mt-2">
                          Contact Number
                        </label>
                        <input
                          type="text"
                          value={sourceContactNumber}
                          onChange={(e) =>
                            setSourceContactNumber(e.target.value)
                          }
                          placeholder="Enter Contact Number"
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                        />
                      </>
                    ) : bookingSource === "Booking Engine" ? (
                      <>
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                          Booking Engine
                        </label>
                        <select
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                        >
                          <option value="Website">Website</option>
                          <option value="Djubo">Djubo</option>
                        </select>
                      </>
                    ) : bookingSource === "Meta" ? (
                      <>
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                          Meta Source
                        </label>
                        <select
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                        >
                          <option value="Google ads">Google ads</option>
                          <option value="Trivago">Trivago</option>
                          <option value="Tripadvisor">Tripadvisor</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                          Booking Type / Mode
                        </label>
                        <select
                          value={sourceType}
                          onChange={(e) => setSourceType(e.target.value)}
                          className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
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
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                    Reference ID
                  </label>
                  <input
                    type="text"
                    value={externalReferenceId}
                    onChange={(e) => setExternalReferenceId(e.target.value)}
                    placeholder="Enter external OTA / agent reference ID"
                    className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-mono font-bold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                  />
                </div>

                {/* Stay dates and booking category */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-page/70 p-3.5 rounded-2xl border border-border/70">
                  <div>
                    <label className="block text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Check-in Date
                    </label>
                    <div className="relative">
                      <Lucide.Calendar
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                      />
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface pl-8 pr-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Check-out Date
                    </label>
                    <div className="relative">
                      <Lucide.Calendar
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                      />
                      <input
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface pl-8 pr-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Booking Type
                    </label>
                    <select
                      value={bookingCategory}
                      onChange={(e) => setBookingCategory(e.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all cursor-pointer"
                    >
                      <option value="FIT">FIT</option>
                      <option value="Group">Group</option>
                      <option value="MICE">MICE</option>
                      <option value="SERIES">SERIES</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Check-in Time
                    </label>
                    <div className="relative">
                      <Lucide.Clock
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                      />
                      <input
                        type="time"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        className="w-full rounded-lg border border-border bg-page/50 pl-8 pr-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Check-out Time
                    </label>
                    <div className="relative">
                      <Lucide.Clock
                        size={14}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
                      />
                      <input
                        type="time"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        className="w-full rounded-lg border border-border bg-page/50 pl-8 pr-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
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
                    <span className="text-xs font-semibold text-ink">
                      Same Plan for All Rooms
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                    />
                    <span className="text-xs font-semibold text-ink">
                      Pay at Hotel
                    </span>
                  </label>
                </div>

                {samePlanAllRooms && (
                  <div className="pt-1">
                    <label className="flex flex-col gap-1.5 text-[11px] font-bold text-ink-secondary uppercase tracking-wider">
                      Rate Plan
                      <select
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
                        className="w-full rounded-lg border border-border bg-page/50 px-3 py-1.5 text-xs font-semibold normal-case text-ink focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all"
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
                    </label>
                  </div>
                )}

                <div
                  className={`grid grid-cols-1 gap-3 pt-1 ${samePlanAllRooms ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
                >
                  <div>
                    <label className="block text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Room Type
                    </label>
                    <select
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
                      className="w-full rounded-lg border border-border bg-page/50 px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all cursor-pointer"
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
                      <label className="block text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                        Meal Plan
                      </label>
                      <select
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
                        className="w-full rounded-lg border border-border bg-page/50 px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all"
                      >
                        <option value="EP">EP</option>
                        <option value="CP">CP</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      No of Rooms
                    </label>
                    <select
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
                      className="w-full rounded-lg border border-border bg-page/50 px-2.5 py-1.5 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 transition-all cursor-pointer"
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
              <section className="bg-surface rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-divider pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white font-bold text-xs shadow-xs shadow-primary/20">
                      4
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-ink tracking-tight">
                        Guest Information & Verification
                      </h2>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-ink-secondary bg-page border border-border/80 px-2.5 py-1 rounded-lg">
                    Primary Resident
                  </span>
                </div>

                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Salutation
                    </label>
                    <select
                      value={guestSalutation}
                      onChange={(e) => setGuestSalutation(e.target.value)}
                      className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                    >
                      <option value="Mr.">Mr.</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Dr.">Dr.</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Full Legal Name{" "}
                      <span className="text-danger-text">*</span>
                    </label>
                    <input
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
                      className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Phone Number <span className="text-danger-text">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={guestContact}
                        onChange={(e) => {
                          setGuestContact(e.target.value);
                          setPrimaryGuestId(null);
                        }}
                        placeholder="e.g. +91 88829 51951"
                        className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                      />
                      <Lucide.Phone
                        size={13}
                        className="text-ink-muted absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => {
                          setGuestEmail(e.target.value);
                          setPrimaryGuestId(null);
                        }}
                        placeholder="e.g. guest@example.com"
                        className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                      />
                      <Lucide.Mail
                        size={13}
                        className="text-ink-muted absolute right-3 top-1/2 -translate-y-1/2"
                      />
                    </div>
                  </div>
                </div>

                {/* ID Verification Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-divider">
                  <div>
                    <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Identity Document
                    </label>
                    <select
                      value={guestIdType}
                      onChange={(e) => setGuestIdType(e.target.value)}
                      className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all cursor-pointer"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={guestIdNumber}
                      onChange={(e) => setGuestIdNumber(e.target.value)}
                      placeholder="e.g. 9842 1290 8731"
                      className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3.5 py-2 text-xs text-ink font-mono font-bold focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all"
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                    Front Desk & Stay Notes
                  </label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Guest preferences, arrival notes, or housekeeping requests..."
                    className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface p-3 text-xs text-ink focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 transition-all resize-none"
                  />
                </div>
              </section>

              {/* SECTION 5: PAYMENTS & SUMMARY BREAKDOWN */}
              <section className="bg-surface rounded-3xl border border-border/80 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-divider pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white font-bold text-xs shadow-xs shadow-primary/20">
                      5
                    </span>
                    <div>
                      <h2 className="text-sm font-bold text-ink tracking-tight">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-warning-text hover:bg-warning-text text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Lucide.Banknote size={13} />
                    <span>Collect Payment</span>
                  </button>
                </div>

                {/* Payments Recorded List */}
                {paymentsList.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                      Recorded Transactions
                    </span>
                    {paymentsList.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-page/60 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success-bg text-success-text">
                            <Lucide.Check size={14} />
                          </div>
                          <div>
                            <span className="font-bold text-ink block">
                              {p.method}
                            </span>
                            <span className="text-[10px] text-ink-secondary font-mono">
                              Ref: {p.ref} · {p.time}
                            </span>
                          </div>
                        </div>
                        <span className="font-extrabold font-mono text-success-text">
                          ₹{p.amount.toLocaleString("en-IN")}.00
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-ink-secondary bg-page/30">
                    No advance payments recorded yet. Click{" "}
                    <strong>Collect Payment</strong> to record an advance or
                    deposit.
                  </div>
                )}

                {/* Payment Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                    Payment & Accounting Notes
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Card pre-authorization held or UPI transaction reference..."
                    className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3.5 py-2 text-xs text-ink font-semibold focus:outline-none focus:border-[var(--color-primary)] transition-all"
                  />
                </div>

                {/* Itemized Bill Summary Table */}
                <div className="rounded-2xl border border-border/90 bg-surface p-4 flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between text-ink-secondary">
                    <span>
                      Room Charges ({requirements.length} room(s), {nightsCount}{" "}
                      night(s))
                    </span>
                    <span className="font-semibold font-mono text-ink">
                      ₹{roomCharges.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-ink-secondary">
                    <span>Meal plan supplements</span>
                    <span className="font-semibold font-mono text-ink">
                      ₹{mealPlanCharges.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-ink-secondary">
                    <span>Outlet / POS add-ons ({posAddons.length})</span>
                    <span className="font-semibold font-mono text-ink">
                      ₹{addonSubtotal.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-ink-secondary">
                    <div className="flex items-center gap-1.5">
                      <span>Discount Applied</span>
                      <span className="text-[10px] text-ink-muted font-medium">
                        (Editable)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-ink-muted font-mono text-xs">
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
                        className="w-20 rounded-lg border border-border bg-page px-2 py-0.5 text-right font-mono font-bold text-xs text-ink focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  <div className="h-[1px] bg-muted-surface my-0.5" />

                  <div className="flex items-center justify-between font-bold text-ink">
                    <span>Sub-Total</span>
                    <span className="font-mono text-ink">
                      ₹{subTotal.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-ink-secondary">
                    <span>Goods & Services Tax (GST {TAX_RATE * 100}%)</span>
                    <span className="font-semibold font-mono text-ink">
                      ₹{taxAmount.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-success-text font-bold">
                    <span>Payments Received</span>
                    <span className="font-mono">
                      ₹{totalPaid.toLocaleString("en-IN")}.00
                    </span>
                  </div>

                  <div className="h-[1px] bg-border my-1" />

                  <div className="flex items-center justify-between text-sm font-extrabold text-ink pt-0.5">
                    <span>Net Payable at Hotel</span>
                    <span className="font-mono text-base text-[var(--color-primary)]">
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

        {/* Reserved third column for the requested 2.5 / 5 / 2 / 2.5 layout. */}
        <div aria-hidden="true" className="hidden xl:block xl:col-span-4" />

        {/* ================= FOURTH COLUMN: TASKS & CHECKLIST ================= */}
        <div className="flex flex-col gap-4 xl:col-span-5">
          {/* Front Desk Tasks Panel */}
          <div className="bg-surface rounded-3xl border border-border/90 shadow-sm p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-warning-bg text-warning-text">
                  <Lucide.CheckSquare size={15} />
                </div>
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
                  Checklist & Tasks
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted-surface text-ink">
                {tasks.filter((t) => t.done).length}/{tasks.length} Done
              </span>
            </div>

            {/* Task Items */}
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    task.done
                      ? "bg-page border-border/60 opacity-60"
                      : "bg-surface border-border hover:border-ink-disabled shadow-2xs"
                  }`}
                >
                  <button
                    type="button"
                    className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                      task.done
                        ? "bg-success-text border-success-text text-white"
                        : "border-ink-disabled bg-surface"
                    }`}
                  >
                    {task.done && <Lucide.Check size={11} />}
                  </button>
                  <span
                    className={`text-xs flex-1 ${
                      task.done
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
                className="flex-1 rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:border-[var(--color-primary)]"
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
      <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2">
        <div className="backdrop-blur-md bg-surface/95 rounded-2xl border border-border/90 p-3 sm:px-4 shadow-lg flex items-center justify-between gap-3">
          {/* Left: Report an issue */}
          <button
            type="button"
            onClick={() => setIssueModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-danger-border bg-danger-bg/70 hover:bg-danger-bg/80 text-danger-text text-xs font-bold transition-colors cursor-pointer"
          >
            <Lucide.AlertCircle size={14} />
            <span className="hidden sm:inline">Report Issue</span>
          </button>

          {/* Center: Live Total Ticker */}
          <div className="hidden md:flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-page border border-border/60">
            <span className="text-ink-secondary">
              {requirements.length} Room(s) · {nightsCount} Night(s)
            </span>
            <span className="h-3 w-[1px] bg-ink-disabled" />
            <span className="font-mono text-ink">
              ₹{totalBill.toLocaleString("en-IN")}.00
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go({ view: "reservations" })}
              className="px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-page text-ink text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setCollectAmount(String(outstanding));
                setCollectModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-warning-text hover:bg-warning-text active:bg-warning-text text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Lucide.Banknote size={14} />
              <span>Save & Pay</span>
            </button>
            <button
              type="button"
              disabled={savingReservation}
              onClick={() => void handleConfirmReservation(true)}
              className="px-5 py-2 rounded-xl bg-[var(--color-primary)] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[var(--color-primary)]/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {savingReservation ? (
                <Lucide.LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Lucide.CheckCircle2 size={14} />
              )}
              <span>{savingReservation ? "Saving…" : "Confirm & Email"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= PAYMENT COLLECT MODAL ================= */}
      {collectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="bg-surface rounded-3xl border border-border max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-warning-bg text-warning-text">
                  <Lucide.Banknote size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    Collect Folio Payment
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Record advance or settle outstanding bill
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                className="text-ink-muted hover:text-ink-secondary p-1"
              >
                <Lucide.X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                  Payment Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-ink-muted">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface pl-8 pr-4 py-2.5 text-sm font-bold font-mono text-ink focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
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
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        collectMethod === method
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
                <label className="block text-[11px] font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
                  Transaction / Slip Reference
                </label>
                <input
                  type="text"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  placeholder="e.g. UPI-984210982 / POS Approval Code"
                  className="w-full rounded-xl border border-border bg-page/50 hover:bg-surface focus:bg-surface px-3.5 py-2 text-xs text-ink font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-ink text-xs font-bold hover:bg-page"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-95 shadow-xs"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REPORT ISSUE MODAL ================= */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="bg-surface rounded-3xl border border-border max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-divider pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger-bg text-danger-text">
                  <Lucide.AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">
                    Report Reservation Issue
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Escalate an allotment, rate, or sync issue
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="text-ink-muted hover:text-ink-secondary p-1"
              >
                <Lucide.X size={16} />
              </button>
            </div>

            <textarea
              rows={3}
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              placeholder="Describe the issue (e.g. rate mismatch on OTA, room allocation conflict)..."
              className="w-full rounded-xl border border-border p-3 text-xs text-ink focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-ink text-xs font-bold hover:bg-page"
              >
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
                className="px-5 py-2 rounded-xl bg-danger-text text-white text-xs font-bold hover:bg-danger-text shadow-xs"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
