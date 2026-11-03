import { useState } from 'react';
import { Modal } from '../../../components/overlays';
import { Button, FieldLabel, TextArea, TextField } from '../../../components/primitives';
import { dayLogApi } from '../../../lib/api/pms';
import { toast } from '../../../utils/toast';

/** Records a guest enquiry against a room on one date. The enquiry shows in that date's enquiry list. */
export function RoomEnquiryDialog({
  roomNumber,
  date,
  onClose,
  onSaved,
}: {
  roomNumber: string;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [detail, setDetail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSave = guestName.trim().length > 0 && !isSaving;

  const save = async () => {
    setIsSaving(true);
    try {
      const note = detail.trim();
      await dayLogApi.addEnquiry({
        date,
        guestName: guestName.trim(),
        phone: phone.trim(),
        detail: note ? `Room ${roomNumber}: ${note}` : `Room ${roomNumber}`,
      });
      onSaved();
      toast.success('Enquiry saved', { detail: `Room ${roomNumber} · ${date}` });
      onClose();
    } catch {
      toast.error('Enquiry not saved', { detail: `Room ${roomNumber} · ${date}` });
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Enquiry · Room ${roomNumber}`}
      subtitle={`Guest enquiry for ${date}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={!canSave}>
            Save enquiry
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="enquiry-guest">Guest name</FieldLabel>
          <TextField
            id="enquiry-guest"
            autoFocus
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Guest name"
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="enquiry-phone">Phone</FieldLabel>
          <TextField
            id="enquiry-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="enquiry-detail">Details</FieldLabel>
          <TextArea
            id="enquiry-detail"
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="What the guest asked for"
          />
        </div>
      </div>
    </Modal>
  );
}
