import { useState, type ChangeEvent } from "react";
import { Field } from "../../../components/controls";
import { Modal } from "../../../components/overlays";
import { Button } from "../../../components/primitives";
import { guestApi } from "../../../lib/api/pms";
import { guestFromApi } from "../../../lib/api/adapters";
import { displayApiError } from "../../../lib/api/client";
import { toast } from "../../../utils/toast";
import { inputClass } from "../../../utils/styling";
import type { Guest } from "../../../types";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

type GuestForm = {
  name: string;
  email: string;
  mobile: string;
  nationality: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
};

const EMPTY_FORM: GuestForm = {
  name: "",
  email: "",
  mobile: "",
  nationality: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  city: "",
  state: "",
  country: "",
};

/** Adds a Guest to the directory and hands the saved record back to the reservation. */
export function AddGuestModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (guest: Guest) => void;
}) {
  const [form, setForm] = useState<GuestForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const setField = (key: keyof GuestForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((previous) => ({ ...previous, [key]: e.target.value }));

  const save = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();
    if (name.length < 2) {
      toast.error("Check the Guest details", { detail: "Name is required." });
      return;
    }
    if (mobile.length < 6) {
      toast.error("Check the Guest details", { detail: "A valid mobile number is required." });
      return;
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Check the Guest details", { detail: "Enter a valid email address." });
      return;
    }

    const [firstName, ...rest] = name.split(/\s+/);
    setSaving(true);
    try {
      const created = await guestApi.create({
        firstName,
        lastName: rest.join(" "),
        email: email || null,
        phone: mobile,
        nationality: form.nationality.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
      });
      toast.success("Guest added", { detail: `${name} was saved to the Guest directory.` });
      onCreated(guestFromApi(created));
    } catch (error) {
      toast.error("Could not add Guest", { detail: displayApiError(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Add more Guest"
      subtitle="Saved to the Guest directory and selected for this reservation"
      wide
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save Guest"}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Name *">
            <input value={form.name} onChange={setField("name")} placeholder="Jordan Miles" className={inputClass("text-body")} />
          </Field>
        </div>
        <Field label="Email">
          <input value={form.email} onChange={setField("email")} placeholder="jordan@mail.com" inputMode="email" className={inputClass("text-body")} />
        </Field>
        <Field label="Mobile *">
          <input value={form.mobile} onChange={setField("mobile")} placeholder="+91 88829 51951" inputMode="tel" className={inputClass("text-body")} />
        </Field>
        <Field label="Nationality">
          <input value={form.nationality} onChange={setField("nationality")} placeholder="Indian" className={inputClass("text-body")} />
        </Field>
        <Field label="Date of Birth">
          <input type="date" value={form.dateOfBirth} onChange={setField("dateOfBirth")} className={inputClass("text-body")} />
        </Field>
        <Field label="Gender">
          <select value={form.gender} onChange={setField("gender")} className={inputClass("text-body")}>
            <option value="">Select gender</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address">
            <input value={form.address} onChange={setField("address")} placeholder="Street and house number" className={inputClass("text-body")} />
          </Field>
        </div>
        <Field label="City">
          <input value={form.city} onChange={setField("city")} placeholder="Hyderabad" className={inputClass("text-body")} />
        </Field>
        <Field label="State">
          <input value={form.state} onChange={setField("state")} placeholder="Telangana" className={inputClass("text-body")} />
        </Field>
        <Field label="Country">
          <input value={form.country} onChange={setField("country")} placeholder="India" className={inputClass("text-body")} />
        </Field>
      </div>
    </Modal>
  );
}
