import { useState } from 'react';
import * as Lucide from 'lucide-react';
import type { RoomDetails } from '../../lib/api/pms';
import { Modal } from '../../components/overlays';
import { SegmentedControl } from '../../components/SegmentedControl';
import type { SegmentOption } from '../../components/SegmentedControl';
import { TableContainer } from '../../components/ui';
import { RoomCategoryDetails } from './RoomCategoryDetails';
import { RoomImages } from './RoomImages';

type DialogTab = 'category' | 'rooms' | 'images';

const TABS: SegmentOption<DialogTab>[] = [
  { id: 'category', label: 'Room Category', Icon: Lucide.Tag },
  { id: 'rooms', label: 'Rooms under Category', Icon: Lucide.BedDouble },
  { id: 'images', label: 'Room Category Images', Icon: Lucide.Image },
];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-label text-ink-muted">{children}</p>;
}

export function RoomCategoryDialog({
  propertyId,
  room,
  rooms,
  canEdit,
  onSaved,
  onClose,
}: {
  propertyId: string;
  /** The room being viewed; null keeps the dialog closed. */
  room: RoomDetails | null;
  /** Every room of the property, to find the ones under the same category. */
  rooms: RoomDetails[];
  canEdit: boolean;
  /** Called after a section saves so the lists behind the dialog refresh. */
  onSaved: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DialogTab>('category');
  const sameCategory = room?.categoryId ? rooms.filter((r) => r.categoryId === room.categoryId) : [];

  return (
    <Modal open={room !== null} onClose={onClose} title={room?.name ?? ''} subtitle="Room category details" xl>
      <div className="flex flex-col gap-4 py-1">
        <SegmentedControl label="Room details" options={TABS} value={tab} onChange={setTab} />

        {tab === 'category' && room && (
          <RoomCategoryDetails propertyId={propertyId} room={room} canEdit={canEdit} onSaved={onSaved} />
        )}

        {tab === 'rooms' &&
          (sameCategory.length > 0 ? (
            <TableContainer>
              <table className="pms-table w-full min-w-[480px] text-left">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>ROOM TYPE</th>
                    <th className="text-right">ROOMS</th>
                  </tr>
                </thead>
                <tbody>
                  {sameCategory.map((r) => (
                    <tr key={r.id} className="border-b border-divider last:border-b-0">
                      <td className="py-3 text-label font-medium text-ink">{r.name}</td>
                      <td className="py-3 text-label text-ink-secondary">{r.roomType.name}</td>
                      <td className="py-3 text-right text-label text-ink-secondary">{r.roomCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableContainer>
          ) : (
            <Empty>No rooms under this category.</Empty>
          ))}

        {tab === 'images' && room && <RoomImages propertyId={propertyId} room={room} canEdit={canEdit} />}
      </div>
    </Modal>
  );
}
