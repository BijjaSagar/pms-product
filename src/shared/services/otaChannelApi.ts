import { otaChannels } from '../mocks/platform';
import { recordActivity, requireAccount, requireSuperAdmin } from './session';

/** An OTA. Super admins manage the list; every property gets all the active ones. */
export interface OtaChannel {
  id: string;
  name: string;
  region: string | null;
  /** Only active OTAs are offered. */
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface OtaChannelInput {
  name: string;
  region?: string;
  isActive?: boolean;
  sortOrder?: number;
}

const sorted = () => structuredClone(otaChannels).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

function requireChannel(id: string): OtaChannel {
  const channel = otaChannels.find((item) => item.id === id);
  if (!channel) throw new Error('This channel no longer exists.');
  return channel;
}

function assertNameFree(name: string, exceptId?: string) {
  const wanted = name.trim().toLowerCase();
  if (otaChannels.some((c) => c.id !== exceptId && c.name.toLowerCase() === wanted)) {
    throw new Error('A channel with this name already exists.');
  }
}

export const otaChannelApi = {
  /** The active OTAs. */
  list: async () => {
    requireAccount();
    return sorted().filter((c) => c.isActive);
  },
  /** SUPER_ADMIN: every OTA, switched off or not. */
  listAll: async () => {
    requireSuperAdmin();
    return sorted();
  },
  create: async (body: OtaChannelInput) => {
    requireSuperAdmin();
    assertNameFree(body.name);
    const now = new Date().toISOString();
    const channel: OtaChannel = {
      id: globalThis.crypto.randomUUID(),
      name: body.name.trim(),
      region: body.region?.trim() || null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? otaChannels.length + 1,
      createdAt: now,
      updatedAt: now,
    };
    otaChannels.push(channel);
    recordActivity('ota-channels', 'create', `Added the channel ${channel.name}`, { resourceId: channel.id });
    return { ...channel };
  },
  update: async (id: string, body: Partial<OtaChannelInput>) => {
    requireSuperAdmin();
    const channel = requireChannel(id);
    if (body.name !== undefined) assertNameFree(body.name, id);
    Object.assign(channel, body, { updatedAt: new Date().toISOString() });
    recordActivity('ota-channels', 'update', `Updated the channel ${channel.name}`, { resourceId: id });
    return { ...channel };
  },
  remove: async (id: string) => {
    requireSuperAdmin();
    const channel = requireChannel(id);
    otaChannels.splice(otaChannels.indexOf(channel), 1);
    recordActivity('ota-channels', 'delete', `Deleted the channel ${channel.name}`, { resourceId: id });
  },
};
