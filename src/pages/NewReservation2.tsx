import { useEffect, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import type { NavTarget } from '../components/nav';
import { toast } from '../components/toastStore';
import { ThemeSwatcher } from '../components/ThemeSwatcher';

interface AccompanyingGuest {
  id: string;
  name: string;
  gender: string;
  age: string;
  relationship: string;
  idNumber: string;
}


const SAMPLE_GUESTS = [
  { id: 'g-101', name: 'Rahul Sharma', phone: '+91 98200 12345', email: 'rahul.sharma@example.com', gender: 'Male', city: 'Mumbai', idType: 'Aadhaar Card', idNum: '9845 2311 4452' },
  { id: 'g-102', name: 'Priya Patel', phone: '+91 98110 56789', email: 'priya.patel@example.com', gender: 'Female', city: 'Ahmedabad', idType: 'PAN Card', idNum: 'ABCDE9876F' },
  { id: 'g-103', name: 'Amit Verma', phone: '+91 99223 88120', email: 'amit.verma@example.com', gender: 'Male', city: 'Delhi', idType: 'Passport', idNum: 'Z8765432' },
];

export function NewReservation2({
  go,
  onOpenThemes,
}: {
  go: (t: NavTarget) => void;
  onOpenThemes?: () => void;
}) {
  const [swatcherOpen, setSwatcherOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [doneRegistration, setDoneRegistration] = useState<{
    code: string;
    visitorName: string;
    room: string;
    date: string;
  } | null>(null);

  // Section 1: Visitor Profile & Contact
  const [guestType, setGuestType] = useState<'new' | 'existing'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [contactNo, setContactNo] = useState('');
  const [alternateContactNo, setAlternateContactNo] = useState('');
  const [email, setEmail] = useState('');

  // Section 2: Address & Location
  const [fullAddress, setFullAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState('');
  const [cityDistrict, setCityDistrict] = useState('');
  const [taluka, setTaluka] = useState('');

  // Section 3: Identity Proof & Visitor Photo
  const [idProofType, setIdProofType] = useState('Aadhaar Card');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [frontImageName, setFrontImageName] = useState('');
  const [frontImagePreview, setFrontImagePreview] = useState<string | null>(null);
  const [backImageName, setBackImageName] = useState('');
  const [backImagePreview, setBackImagePreview] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<'upload' | 'capture'>('upload');
  const [selfPhotoName, setSelfPhotoName] = useState('');
  const [selfPhotoPreview, setSelfPhotoPreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Section 4: Stay & Accompanying Guests
  const [checkInDateTime, setCheckInDateTime] = useState(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = String(hours % 12 || 12).padStart(2, '0');
    return `${day}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
  });
  const [assignedRoom, setAssignedRoom] = useState('Room 201 · Deluxe King');
  const [stayNights, setStayNights] = useState(1);
  const [accompanyingGuests, setAccompanyingGuests] = useState<AccompanyingGuest[]>([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  const handleSelectExistingGuest = (g: typeof SAMPLE_GUESTS[0]) => {
    const parts = g.name.split(' ');
    setFirstName(parts[0] || '');
    setMiddleName(parts.length > 2 ? parts[1] : '');
    setLastName(parts.length > 2 ? parts.slice(2).join(' ') : parts[1] || '');
    setGender(g.gender);
    setContactNo(g.phone);
    setEmail(g.email);
    setIdProofType(g.idType);
    setIdProofNumber(g.idNum);
    setCityDistrict(g.city);
    setShowDropdown(false);
    setSearchQuery('');
    toast.success('Guest Profile Loaded', { detail: g.name });
  };

  // Handle webcam stream start/stop
  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsCameraActive(true);
      } else {
        toast.warning('Webcam unavailable', { detail: 'Camera API is not supported in this browser environment.' });
      }
    } catch {
      toast.warning('Webcam access denied', { detail: 'Please allow camera permission or use the upload tab.' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (photoMode === 'capture') {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [photoMode]);

  const takeSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setSelfPhotoPreview(dataUrl);
        setSelfPhotoName(`webcam-snapshot-${Date.now()}.jpg`);
        stopCamera();
        toast.success('Photo Captured', { detail: 'Snapshot saved to visitor profile.' });
      }
    }
  };

  const handleAddGuest = () => {
    const newGuest: AccompanyingGuest = {
      id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: '',
      gender: 'Female',
      age: '',
      relationship: 'Spouse',
      idNumber: '',
    };
    setAccompanyingGuests((prev) => [...prev, newGuest]);
  };

  const handleRemoveGuest = (id: string) => {
    setAccompanyingGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const handleUpdateGuest = (id: string, field: keyof AccompanyingGuest, value: string) => {
    setAccompanyingGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!contactNo.trim()) errs.contactNo = 'Contact number is required';
    if (!fullAddress.trim()) errs.fullAddress = 'Address is required';
    if (!idProofNumber.trim()) errs.idProofNumber = 'Document number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveVisitor = () => {
    if (!validateForm()) {
      toast.error('Required Fields Missing', {
        detail: 'Please complete the highlighted visitor fields.',
      });
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      const bookingCode = `RSV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setDoneRegistration({
        code: bookingCode,
        visitorName: `${firstName} ${lastName}`.trim(),
        room: assignedRoom,
        date: checkInDateTime,
      });
      toast.success('Visitor Registration Saved', {
        detail: `${firstName} ${lastName} checked in · Code: ${bookingCode}`,
      });
    }, 700);
  };

  // Full visitor display name
  const fullVisitorName = `${firstName} ${lastName}`.trim() || 'New Visitor';
  const visitorInitials = (firstName ? firstName[0] : 'V') + (lastName ? lastName[0] : '');

  // Verification Checklist Items
  const isIdEntered = Boolean(idProofNumber.trim());
  const isFrontUploaded = Boolean(frontImageName || frontImagePreview);
  const isPhotoUploaded = Boolean(selfPhotoName || selfPhotoPreview);
  const isAddressEntered = Boolean(fullAddress.trim());
  const isContactEntered = Boolean(contactNo.trim());

  // ================= SUCCESS VIEW =================
  if (doneRegistration) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 sm:p-12 text-center shadow-lg">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-xs mb-4">
            <Lucide.CheckCircle2 size={36} />
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Visitor Registration Confirmed
          </h2>
          <p className="max-w-md mx-auto text-xs text-slate-600 mt-2">
            Visitor <strong className="text-slate-900">{doneRegistration.visitorName}</strong> has been registered successfully.
            <br />
            Assigned: <strong className="text-slate-900">{doneRegistration.room}</strong> · Check-in: {doneRegistration.date}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-mono font-semibold text-slate-800">
            <span>Booking Code:</span>
            <span className="text-[var(--color-primary)] font-bold">{doneRegistration.code}</span>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="flex items-center gap-2 px-5 py-2.5 rounded-md font-semibold bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] text-white shadow-xs transition-all text-xs cursor-pointer"
              onClick={() => go({ view: 'reservations' })}
            >
              <Lucide.CalendarDays size={14} />
              <span>View All Reservations</span>
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-md font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs text-xs cursor-pointer"
              onClick={() => {
                setDoneRegistration(null);
                setFirstName('');
                setMiddleName('');
                setLastName('');
                setContactNo('');
                setAlternateContactNo('');
                setEmail('');
                setFullAddress('');
                setPincode('');
                setState('');
                setCityDistrict('');
                setTaluka('');
                setIdProofNumber('');
                setFrontImageName('');
                setFrontImagePreview(null);
                setBackImageName('');
                setBackImagePreview(null);
                setSelfPhotoName('');
                setSelfPhotoPreview(null);
                setAccompanyingGuests([]);
              }}
            >
              Register Another Visitor
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-900 font-sans pb-8">
      {/* ================= TOP BREADCRUMB & HEADER ================= */}
      <div className="mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">New Reservation 2</h1>
            <p className="text-xs text-slate-500 mt-1">Visitor intake, identity verification & direct check-in registration</p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            {/* Step 1: Visitor Profile */}
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  activeStep >= 1 ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'border border-slate-300 bg-white text-slate-500'
                }`}
              >
                1
              </span>
              <span className={`transition-colors ${activeStep >= 1 ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>
                Visitor Profile
              </span>
            </button>

            <div className="w-6 sm:w-10 h-[1px] bg-slate-200" />

            {/* Step 2: Address & Location */}
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  activeStep >= 2 ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'border border-slate-300 bg-white text-slate-500'
                }`}
              >
                2
              </span>
              <span className={`transition-colors ${activeStep >= 2 ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>
                Address
              </span>
            </button>

            <div className="w-6 sm:w-10 h-[1px] bg-slate-200" />

            {/* Step 3: ID Proof & Photo */}
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  activeStep >= 3 ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'border border-slate-300 bg-white text-slate-500'
                }`}
              >
                3
              </span>
              <span className={`transition-colors ${activeStep >= 3 ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>
                ID & Photo
              </span>
            </button>

            <div className="w-6 sm:w-10 h-[1px] bg-slate-200" />

            {/* Step 4: Stay & Guests */}
            <button
              type="button"
              onClick={() => setActiveStep(4)}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  activeStep >= 4 ? 'bg-[var(--color-primary)] text-white shadow-xs' : 'border border-slate-300 bg-white text-slate-500'
                }`}
              >
                4
              </span>
              <span className={`transition-colors ${activeStep >= 4 ? 'font-bold text-slate-900' : 'font-medium text-slate-500'}`}>
                Stay & Guests
              </span>
            </button>

            {/* Action buttons */}
            <div className="h-5 w-[1px] bg-slate-200 hidden sm:block mx-1" />
            <button
              type="button"
              onClick={() => go({ view: 'new-reservation' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer text-xs font-semibold"
            >
              <Lucide.CalendarPlus size={14} className="text-slate-500" />
              <span className="hidden sm:inline">Standard Booking</span>
            </button>
            <button
              type="button"
              onClick={() => (onOpenThemes ? onOpenThemes() : setSwatcherOpen(true))}
              title="Customize Theme & Palette"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition-colors cursor-pointer text-xs font-semibold"
            >
              <Lucide.Palette size={14} className="text-[var(--color-primary)]" />
              <span className="hidden sm:inline">Theme</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= MAIN 2-COLUMN LAYOUT ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] 2xl:grid-cols-[1fr_420px] gap-3.5 items-start w-full">
        {/* ================= LEFT MAIN FORM ================= */}
        <div className="flex flex-col gap-3.5 w-full">
          {/* ================= SECTION 1: VISITOR PROFILE & CONTACT DETAILS ================= */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold text-xs shrink-0">
                  1
                </span>
                <h2 className="text-[15px] font-bold text-slate-900">Visitor Profile & Contact Details</h2>
                <span className="text-xs text-slate-400 font-normal hidden sm:inline ml-1">
                  Enter legal name matching ID proof document and phone numbers
                </span>
              </div>
            </div>

            {/* Toggle Pills: Existing Guest vs New Visitor */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setGuestType('new')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  guestType === 'new'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                New Visitor
              </button>
              <button
                type="button"
                onClick={() => setGuestType('existing')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  guestType === 'existing'
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Search Existing Guest
              </button>
            </div>

            {/* Existing Guest Search Bar */}
            {guestType === 'existing' && (
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lucide.Search size={14} />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search existing guest by name, phone or email..."
                  className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                />

                {showDropdown && searchQuery.trim().length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                    {SAMPLE_GUESTS.filter(
                      (g) =>
                        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        g.phone.includes(searchQuery) ||
                        g.email.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectExistingGuest(g)}
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <span className="font-semibold text-slate-900">{g.name}</span>
                        <span className="text-[11px] text-slate-500">{g.phone} · {g.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Inputs Grid: Row 1 (Names & Gender) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lucide.User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: '' }));
                    }}
                    placeholder="e.g. Rahul"
                    className={`w-full rounded-md border pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all ${
                      errors.firstName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                    }`}
                  />
                </div>
                {errors.firstName && <p className="text-[11px] text-rose-500 mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="e.g. Kumar"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Inputs Grid: Row 2 (Contacts & Email) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Contact No <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lucide.Phone size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={contactNo}
                    onChange={(e) => {
                      setContactNo(e.target.value);
                      if (errors.contactNo) setErrors((prev) => ({ ...prev, contactNo: '' }));
                    }}
                    placeholder="e.g. 9820012345"
                    className={`w-full rounded-md border pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all ${
                      errors.contactNo ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                    }`}
                  />
                </div>
                {errors.contactNo && <p className="text-[11px] text-rose-500 mt-1">{errors.contactNo}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Alternate Contact No
                </label>
                <div className="relative">
                  <Lucide.PhoneCall size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={alternateContactNo}
                    onChange={(e) => setAlternateContactNo(e.target.value)}
                    placeholder="e.g. 9820067890"
                    className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Lucide.Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul.sharma@example.com"
                    className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ================= SECTION 2: GUEST ADDRESS & LOCATION DETAILS ================= */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold text-xs shrink-0">
                2
              </span>
              <h2 className="text-[15px] font-bold text-slate-900">Guest Address & Location Details</h2>
              <span className="text-xs text-slate-400 font-normal hidden sm:inline ml-1">
                Permanent residential address and postal verification
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Full Address Textarea */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Full Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => {
                    setFullAddress(e.target.value);
                    if (errors.fullAddress) setErrors((prev) => ({ ...prev, fullAddress: '' }));
                  }}
                  placeholder="House / Flat No, Street Name, Area / Colony"
                  className={`w-full rounded-md border p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all resize-none ${
                    errors.fullAddress ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                  }`}
                />
                {errors.fullAddress && <p className="text-[11px] text-rose-500 mt-1">{errors.fullAddress}</p>}
              </div>

              {/* 4-col: Pincode, City/District, State, Taluka */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pincode / Postal Code
                  </label>
                  <div className="relative">
                    <Lucide.MapPin size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 400001"
                      className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    City / District
                  </label>
                  <input
                    type="text"
                    value={cityDistrict}
                    onChange={(e) => setCityDistrict(e.target.value)}
                    placeholder="City / District"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Taluka
                  </label>
                  <input
                    type="text"
                    value={taluka}
                    onChange={(e) => setTaluka(e.target.value)}
                    placeholder="Taluka"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ================= SECTION 3: IDENTITY PROOF & VISITOR PHOTO ================= */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold text-xs shrink-0">
                3
              </span>
              <h2 className="text-[15px] font-bold text-slate-900">
                Identity Proof & Visitor Photo
              </h2>
              <span className="text-xs text-slate-400 font-normal hidden sm:inline ml-1">
                Government issued ID verification and portrait photograph
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* ID Type & Document Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ID Proof Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={idProofType}
                    onChange={(e) => setIdProofType(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all cursor-pointer"
                  >
                    <option value="Aadhaar Card">Aadhaar Card (UIDAI 12-Digit)</option>
                    <option value="PAN Card">PAN Card (Permanent Account Number)</option>
                    <option value="Passport">Passport (Indian / International)</option>
                    <option value="Driving License">Driving License (State RTO)</option>
                    <option value="Voter ID">Voter ID (Election Commission)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    ID Proof Document Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={idProofNumber}
                    onChange={(e) => {
                      setIdProofNumber(e.target.value);
                      if (errors.idProofNumber) setErrors((prev) => ({ ...prev, idProofNumber: '' }));
                    }}
                    placeholder={
                      idProofType === 'Aadhaar Card'
                        ? 'e.g. 1234 5678 9812'
                        : idProofType === 'PAN Card'
                        ? 'e.g. ABCDE1234F'
                        : idProofType === 'Passport'
                        ? 'e.g. A1234567'
                        : 'e.g. DL-1420110012345'
                    }
                    className={`w-full rounded-md border px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all font-mono ${
                      errors.idProofNumber ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 bg-white'
                    }`}
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    {idProofType === 'Aadhaar Card'
                      ? 'Enter 12-digit UID format without spaces.'
                      : idProofType === 'PAN Card'
                      ? 'Format: 5 letters, 4 digits, 1 letter.'
                      : 'Government ID required for regulatory hotel guest register.'}
                  </p>
                  {errors.idProofNumber && <p className="text-[11px] text-rose-500 mt-1">{errors.idProofNumber}</p>}
                </div>
              </div>

              {/* Upload Dropzones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {/* Front Image Dropzone */}
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 hover:bg-white hover:border-[var(--color-primary)] p-4 transition-all">
                  <p className="text-[11px] font-semibold text-slate-700 mb-2">
                    ID Proof Front Image / PDF <span className="text-rose-500">*</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--color-muted-surface)] text-[var(--color-primary)]">
                      <Lucide.UploadCloud size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer transition-colors">
                        <Lucide.FolderOpen size={13} className="text-slate-500" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFrontImageName(file.name);
                              if (file.type.startsWith('image/')) {
                                const url = URL.createObjectURL(file);
                                setFrontImagePreview(url);
                              } else {
                                setFrontImagePreview(null);
                              }
                              toast.success('Front Document Uploaded', { detail: file.name });
                            }
                          }}
                        />
                      </label>
                      <span className="text-xs text-slate-500 ml-2.5 truncate inline-block align-middle">
                        {frontImageName || 'No file chosen'}
                      </span>
                    </div>
                  </div>

                  {frontImagePreview && (
                    <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-200 max-h-24 bg-white">
                      <img src={frontImagePreview} alt="ID Front preview" className="w-full h-24 object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setFrontImageName('');
                          setFrontImagePreview(null);
                        }}
                        className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center text-xs hover:bg-slate-900 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Back Image Dropzone */}
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 hover:bg-white hover:border-[var(--color-primary)] p-4 transition-all">
                  <p className="text-[11px] font-semibold text-slate-700 mb-2">
                    ID Proof Back Image / PDF (Optional)
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--color-muted-surface)] text-[var(--color-primary)]">
                      <Lucide.UploadCloud size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer transition-colors">
                        <Lucide.FolderOpen size={13} className="text-slate-500" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setBackImageName(file.name);
                              if (file.type.startsWith('image/')) {
                                const url = URL.createObjectURL(file);
                                setBackImagePreview(url);
                              } else {
                                setBackImagePreview(null);
                              }
                              toast.success('Back Document Uploaded', { detail: file.name });
                            }
                          }}
                        />
                      </label>
                      <span className="text-xs text-slate-500 ml-2.5 truncate inline-block align-middle">
                        {backImageName || 'No file chosen'}
                      </span>
                    </div>
                  </div>

                  {backImagePreview && (
                    <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-200 max-h-24 bg-white">
                      <img src={backImagePreview} alt="ID Back preview" className="w-full h-24 object-contain" />
                      <button
                        type="button"
                        onClick={() => {
                          setBackImageName('');
                          setBackImagePreview(null);
                        }}
                        className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center text-xs hover:bg-slate-900 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Visitor Photo Block */}
              <div className="mt-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Visitor Photo (Portrait)
                  </label>
                  {/* Mode Toggle */}
                  <div className="flex items-center gap-1 p-0.5 rounded-md bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setPhotoMode('upload')}
                      className={`px-3 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer ${
                        photoMode === 'upload'
                          ? 'bg-white text-[var(--color-primary)] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoMode('capture')}
                      className={`px-3 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer ${
                        photoMode === 'capture'
                          ? 'bg-white text-[var(--color-primary)] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Webcam Capture
                    </button>
                  </div>
                </div>

                {photoMode === 'upload' ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 hover:bg-white hover:border-[var(--color-primary)] p-4 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--color-muted-surface)] text-[var(--color-primary)]">
                        <Lucide.Image size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs cursor-pointer transition-colors">
                          <Lucide.FolderOpen size={13} className="text-slate-500" />
                          <span>Select Photo (JPG / PNG)</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setSelfPhotoName(file.name);
                                const url = URL.createObjectURL(file);
                                setSelfPhotoPreview(url);
                                toast.success('Visitor Photo Selected', { detail: file.name });
                              }
                            }}
                          />
                        </label>
                        <span className="text-xs text-slate-500 ml-2.5 truncate inline-block align-middle">
                          {selfPhotoName || 'No photo chosen'}
                        </span>
                      </div>
                    </div>

                    {selfPhotoPreview && (
                      <div className="mt-3 flex items-center gap-3 p-2.5 bg-white rounded-lg border border-slate-200">
                        <img
                          src={selfPhotoPreview}
                          alt="Visitor preview"
                          className="h-14 w-14 rounded-md object-cover border border-slate-200"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{selfPhotoName}</p>
                          <p className="text-[11px] text-emerald-600 font-medium">✓ Ready for registration</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelfPhotoName('');
                              setSelfPhotoPreview(null);
                            }}
                            className="text-xs text-rose-600 hover:underline mt-0.5 cursor-pointer font-medium"
                          >
                            Remove photo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-900 text-white flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                    <div className="relative w-full max-w-[340px] aspect-[4/3] bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      {!isCameraActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-4 text-center">
                          <Lucide.CameraOff size={26} className="text-slate-500 mb-2" />
                          <p className="text-xs font-bold text-slate-300">Camera preview inactive</p>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="mt-2 px-3 py-1 rounded-md bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-xs font-semibold cursor-pointer"
                          >
                            Start Camera
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={takeSnapshot}
                        disabled={!isCameraActive}
                        className="flex items-center gap-2 px-4 py-2 rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-xs font-bold text-white shadow-xs cursor-pointer transition-all active:scale-95"
                      >
                        <Lucide.Camera size={14} />
                        <span>Take Snapshot</span>
                      </button>
                    </div>

                    {selfPhotoPreview && (
                      <div className="w-full max-w-[340px] p-2 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center gap-3 mt-1">
                        <img
                          src={selfPhotoPreview}
                          alt="Snapshot preview"
                          className="h-12 w-12 rounded object-cover border border-slate-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-emerald-400">Snapshot captured!</p>
                          <p className="text-[11px] text-slate-300 truncate">{selfPhotoName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelfPhotoPreview(null);
                            void startCamera();
                          }}
                          className="px-2 py-1 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 cursor-pointer"
                        >
                          Retake
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ================= SECTION 4: STAY & ACCOMPANYING GUESTS ================= */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] p-4 sm:p-5">
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-bold text-xs shrink-0">
                4
              </span>
              <h2 className="text-[15px] font-bold text-slate-900">
                Check-In Details & Accompanying Guests
              </h2>
              <span className="text-xs text-slate-400 font-normal hidden sm:inline ml-1">
                Room assignment, stay schedule, and companion roster
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Row 1: Check-in, Room, Nights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Check-In Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lucide.Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={checkInDateTime}
                      onChange={(e) => setCheckInDateTime(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Assigned Room
                  </label>
                  <select
                    value={assignedRoom}
                    onChange={(e) => setAssignedRoom(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all cursor-pointer"
                  >
                    <option value="Room 201 · Deluxe King">Room 201 · Deluxe King</option>
                    <option value="Room 202 · Deluxe Twin">Room 202 · Deluxe Twin</option>
                    <option value="Room 301 · Executive Suite">Room 301 · Executive Suite</option>
                    <option value="Room 302 · Executive Suite">Room 302 · Executive Suite</option>
                    <option value="Room 401 · Presidential Suite">Room 401 · Presidential Suite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Stay Duration (Nights)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={stayNights}
                    onChange={(e) => setStayNights(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
                  />
                </div>
              </div>

              {/* Accompanying Guests Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 flex-none items-center justify-center rounded-md bg-[var(--color-muted-surface)] text-[var(--color-primary)]">
                      <Lucide.Users size={15} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">
                        Accompanying Guests / Family Members <span className="font-normal text-slate-400">(Optional)</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">Add details of any additional guests accompanying the primary visitor</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddGuest}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Lucide.Plus size={13} className="text-[var(--color-primary)]" />
                    <span>Add Guest</span>
                  </button>
                </div>

                {accompanyingGuests.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white/60 p-4 text-center">
                    <p className="text-xs text-slate-400">No accompanying guests added yet. Click &quot;Add Guest&quot; above to include family or companions.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {accompanyingGuests.map((guest, idx) => (
                      <div
                        key={guest.id}
                        className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col md:flex-row items-center gap-2.5 shadow-xs"
                      >
                        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                          #{idx + 1}
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 flex-1 w-full">
                          <input
                            type="text"
                            value={guest.name}
                            onChange={(e) => handleUpdateGuest(guest.id, 'name', e.target.value)}
                            placeholder="Full Name"
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                          />
                          <select
                            value={guest.gender}
                            onChange={(e) => handleUpdateGuest(guest.id, 'gender', e.target.value)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Minor / Child">Minor / Child</option>
                            <option value="Other">Other</option>
                          </select>
                          <input
                            type="number"
                            value={guest.age}
                            onChange={(e) => handleUpdateGuest(guest.id, 'age', e.target.value)}
                            placeholder="Age"
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
                          />
                          <select
                            value={guest.relationship}
                            onChange={(e) => handleUpdateGuest(guest.id, 'relationship', e.target.value)}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] cursor-pointer"
                          >
                            <option value="Spouse">Spouse</option>
                            <option value="Child">Child</option>
                            <option value="Parent">Parent</option>
                            <option value="Sibling">Sibling</option>
                            <option value="Friend">Friend</option>
                            <option value="Colleague">Colleague</option>
                          </select>
                          <input
                            type="text"
                            value={guest.idNumber}
                            onChange={(e) => handleUpdateGuest(guest.id, 'idNumber', e.target.value)}
                            placeholder="ID No (Optional)"
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] font-mono"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveGuest(guest.id)}
                          className="h-7 w-7 flex-none flex items-center justify-center rounded text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Remove guest"
                        >
                          <Lucide.Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ================= RIGHT COLUMN: STICKY VISITOR INTAKE SUMMARY ================= */}
        <div className="flex flex-col gap-3.5 sticky top-4">
          <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]">
            {/* Summary Header */}
            <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">Visitor Intake Summary</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live verification status & registration overview
                </p>
              </div>

              <span className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold bg-[var(--color-muted-surface)] text-[var(--color-primary)] border border-[color-mix(in_srgb,var(--color-primary)_25%,transparent)] shrink-0">
                <Lucide.UserCheck size={11} />
                <span>Check-in</span>
              </span>
            </div>

            {/* Live Guest Mini Card */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 mb-4 flex items-center gap-3">
              {selfPhotoPreview ? (
                <img
                  src={selfPhotoPreview}
                  alt={fullVisitorName}
                  className="h-12 w-12 rounded-full object-cover border border-slate-300 shadow-xs shrink-0"
                />
              ) : (
                <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full font-bold text-sm bg-slate-700 text-white shadow-xs">
                  {visitorInitials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-slate-900 truncate">{fullVisitorName}</p>
                <p className="text-[11px] text-slate-500 truncate">{contactNo || 'No contact entered'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                    {gender}
                  </span>
                  {cityDistrict && (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 truncate">
                      {cityDistrict}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stay Overview */}
            <div className="border-b border-slate-100 pb-3 mb-3 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Lucide.BedDouble size={13} className="text-slate-400" />
                  <span>Assigned Room</span>
                </span>
                <span className="font-bold text-slate-900">{assignedRoom.split('·')[0].trim()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Lucide.Calendar size={13} className="text-slate-400" />
                  <span>Check-In</span>
                </span>
                <span className="font-medium text-slate-900 truncate max-w-[170px] text-right font-mono text-[11px]">
                  {checkInDateTime}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Lucide.Clock size={13} className="text-slate-400" />
                  <span>Stay Duration</span>
                </span>
                <span className="font-semibold text-slate-900">{stayNights} Night{stayNights > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Lucide.Users size={13} className="text-slate-400" />
                  <span>Accompanying</span>
                </span>
                <span className="font-semibold text-slate-900">
                  {accompanyingGuests.length} Guest{accompanyingGuests.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Verification Checklist */}
            <div className="border-b border-slate-100 pb-3 mb-4">
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Verification Checklist
              </p>
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Lucide.CreditCard size={12} className="text-slate-400" />
                    <span>ID Proof ({idProofType.split(' ')[0]})</span>
                  </span>
                  {isIdEntered ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      ✓ Number Entered
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                      Missing
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Lucide.FileCheck size={12} className="text-slate-400" />
                    <span>ID Front Scan</span>
                  </span>
                  {isFrontUploaded ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      ✓ Attached
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                      Missing
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Lucide.Camera size={12} className="text-slate-400" />
                    <span>Visitor Portrait</span>
                  </span>
                  {isPhotoUploaded ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      ✓ Attached
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Optional
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Lucide.MapPin size={12} className="text-slate-400" />
                    <span>Permanent Address</span>
                  </span>
                  {isAddressEntered ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      ✓ Filled
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                      Missing
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Lucide.Phone size={12} className="text-slate-400" />
                    <span>Contact Number</span>
                  </span>
                  {isContactEntered ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      ✓ Valid
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                      Required
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions in Sidebar */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveVisitor}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md font-bold text-xs bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] text-white shadow-xs cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Lucide.Loader2 size={14} className="animate-spin" />
                    <span>Registering Visitor...</span>
                  </>
                ) : (
                  <>
                    <Lucide.CheckCircle2 size={14} />
                    <span>Save Visitor & Check-In</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => go({ view: 'reservations' })}
                className="w-full py-2 rounded-md font-semibold text-xs border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer transition-colors text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance theme modal */}
      <ThemeSwatcher open={swatcherOpen} onClose={() => setSwatcherOpen(false)} />
    </div>
  );
}
