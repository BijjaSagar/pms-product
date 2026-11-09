import { useCallback, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import { roomImageApi } from '../../lib/api/pms';
import type { RoomDetails, RoomImageDetails } from '../../lib/api/pms';
import { useApiResource } from '../../lib/api/useApiResource';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { Button, IconButton } from '../../components/primitives';
import { ConfirmDialog, PromptDialog } from '../../components/overlays';
import { AuthImage } from './AuthImage';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 20;
const ACCEPT = 'image/jpeg,image/png,image/webp';

export function RoomImages({ propertyId, room, canEdit }: { propertyId: string; room: RoomDetails; canEdit: boolean }) {
  const load = useCallback(() => roomImageApi.list(propertyId, room.id), [propertyId, room.id]);
  const resource = useApiResource(load);
  const images = resource.data ?? [];

  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [captioning, setCaptioning] = useState<RoomImageDetails | null>(null);
  const [deleting, setDeleting] = useState<RoomImageDetails | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const slotsLeft = MAX_IMAGES - images.length;
    const chosen = Array.from(files);
    if (chosen.length > slotsLeft) {
      toast(`Only ${slotsLeft} more image${slotsLeft === 1 ? '' : 's'} fit`, {
        detail: `A room can have up to ${MAX_IMAGES} images.`,
        tone: 'warning',
      });
      return;
    }
    const invalid = chosen.find((file) => !ACCEPT.split(',').includes(file.type) || file.size > MAX_BYTES);
    if (invalid) {
      toast(`Cannot upload ${invalid.name}`, { detail: 'Use a JPEG, PNG or WebP image of at most 5 MB.', tone: 'warning' });
      return;
    }

    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of chosen) {
        await roomImageApi.upload(propertyId, room.id, file);
        uploaded += 1;
      }
      toast(uploaded === 1 ? 'Image uploaded' : `${uploaded} images uploaded`, { tone: 'success' });
    } catch (err) {
      toast('Could not upload the image', { detail: displayApiError(err), tone: 'danger' });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
      if (uploaded > 0) resource.refresh();
    }
  };

  const saveCaption = async (image: RoomImageDetails, caption: string) => {
    try {
      await roomImageApi.update(propertyId, room.id, image.id, caption.trim() || null);
      resource.refresh();
      toast('Caption saved', { tone: 'success' });
    } catch (err) {
      toast('Could not save the caption', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  const remove = async (image: RoomImageDetails) => {
    try {
      await roomImageApi.remove(propertyId, room.id, image.id);
      resource.refresh();
      toast('Image deleted', { tone: 'success' });
    } catch (err) {
      toast('Could not delete the image', { detail: displayApiError(err), tone: 'danger' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-label text-ink-secondary">
          <span className="font-semibold text-ink">{images.length}</span> of {MAX_IMAGES} images · JPEG, PNG or WebP, up to 5 MB each
        </p>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Button
          variant="primary"
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={!canEdit || uploading || images.length >= MAX_IMAGES}
          title={canEdit ? undefined : 'Only administrators can change room images'}
          icon={uploading ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.Upload size={14} />}
        >
          {uploading ? 'Uploading…' : 'Upload Images'}
        </Button>
      </div>

      {images.length === 0 ? (
        <p className="py-10 text-center text-label text-ink-muted">
          {resource.error ?? (resource.loading ? 'Loading images…' : 'No images yet.')}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <li
              key={image.id}
              className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-muted-surface">
                <AuthImage
                  load={() => roomImageApi.file(propertyId, room.id, image.id)}
                  alt={image.caption ?? image.fileName}
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-label font-bold text-ink">{image.caption || 'No caption'}</p>
                  <p className="truncate text-micro text-ink-muted">{image.fileName}</p>
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  <IconButton title="Edit caption" onClick={() => setCaptioning(image)} disabled={!canEdit}>
                    <Lucide.Pencil size={14} />
                  </IconButton>
                  <IconButton
                    title="Delete image"
                    onClick={() => setDeleting(image)}
                    disabled={!canEdit}
                    className="hover:text-danger-text"
                  >
                    <Lucide.Trash2 size={14} />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PromptDialog
        open={captioning !== null}
        onClose={() => setCaptioning(null)}
        onSubmit={(value) => (captioning ? saveCaption(captioning, value) : undefined)}
        title="Edit caption"
        subtitle={captioning?.fileName}
        label="Caption"
        defaultValue={captioning?.caption ?? ''}
        placeholder="e.g. Sea-facing balcony"
        confirmLabel="Save"
      />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => (deleting ? remove(deleting) : undefined)}
        title="Delete image"
        body={`Delete ${deleting?.caption || deleting?.fileName}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
