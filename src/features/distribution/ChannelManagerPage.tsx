import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import { toast } from '../../utils/toast';
import { Modal } from '../../components/overlays';
import { AddChannelDialog } from './channel-manager/AddChannelDialog';
import { ChannelDirectoryPanel } from './channel-manager/ChannelDirectoryPanel';
import { ChannelLogo } from './channel-manager/ChannelLogo';
import { InventoryPanel } from './channel-manager/InventoryPanel';
import { MappingPanel } from './channel-manager/MappingPanel';
import { PromotionsPanel } from './channel-manager/PromotionsPanel';
import { RatesPanel } from './channel-manager/RatesPanel';
import { ChannelRestrictionsPanel } from './channel-manager/ChannelRestrictionsPanel';
import { SyncSettingsPanel } from './channel-manager/SyncSettingsPanel';
import {
  ADDABLE_PROVIDERS,
  BUSINESS_DATE,
  INITIAL_CHANNELS,
  INITIAL_INVENTORY,
  INITIAL_LOGS,
  INITIAL_MAPPINGS,
  INITIAL_PERFORMANCE,
  INITIAL_RANGE_START,
  INITIAL_SYNC_SETTINGS,
  RECENT_BOOKINGS,
  ROOM_TYPES,
  buildInventoryDates,
  formatDateRange,
  shiftDate,
} from './channel-manager/data';
import type { Channel, ChannelBooking, ChannelLog, ChannelPerformance, ChannelProvider, ChannelTabId, InventoryRow, InventorySelection, RateMapping, SyncSettings } from './channel-manager/types';

const TABS: Array<{ id: ChannelTabId; label: string; icon: Lucide.LucideIcon }> = [
  { id: 'inventory', label: 'Inventory', icon: Lucide.CalendarDays },
  { id: 'rates', label: 'Rates', icon: Lucide.ChartNoAxesCombined },
  { id: 'restrictions', label: 'Restrictions', icon: Lucide.LockKeyhole },
  { id: 'mapping', label: 'Room & rate mapping', icon: Lucide.Network },
  { id: 'promotions', label: 'Promotions & bookings', icon: Lucide.Sparkles },
];

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: Lucide.LucideIcon;
  tone: 'primary' | 'success' | 'info' | 'warning' | 'danger';
}) {
  const style = tone === 'primary'
    ? { color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))' }
    : { color: `var(--color-${tone}-text)`, background: `var(--color-${tone}-bg)` };
  return (
    <article className="pms-card pms-card-hover flex min-w-0 items-center gap-3 p-3.5 sm:p-4">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-control" style={style}><Icon size={18} /></span>
      <div className="min-w-0"><p className="truncate text-[11px] font-medium text-ink-secondary">{label}</p><p className="mt-0.5 truncate text-lg font-bold leading-tight text-ink tnum">{value}</p><p className="mt-0.5 truncate text-[10px] text-ink-muted">{hint}</p></div>
    </article>
  );
}

function statusAppearance(status: Channel['status']) {
  if (status === 'connected') return { label: 'Connected', color: 'var(--color-success-text)', background: 'var(--color-success-bg)', border: 'var(--color-success-border)' };
  if (status === 'error') return { label: 'Needs attention', color: 'var(--color-danger-text)', background: 'var(--color-danger-bg)', border: 'var(--color-danger-border)' };
  return { label: 'Paused', color: 'var(--color-ink-secondary)', background: 'var(--color-muted-surface)', border: 'var(--color-border)' };
}

const formatMoney = (value: number) => `₹${value.toLocaleString('en-IN')}`;

export function ChannelManager() {
  const [channels, setChannels] = useState<Channel[]>(() => INITIAL_CHANNELS.map((channel) => ({ ...channel })));
  const [logs, setLogs] = useState<ChannelLog[]>(() => [...INITIAL_LOGS]);
  const bookings: ChannelBooking[] = RECENT_BOOKINGS;
  const [performance, setPerformance] = useState<ChannelPerformance[]>(() => [...INITIAL_PERFORMANCE]);
  const [mappings, setMappings] = useState<RateMapping[]>(() => [...INITIAL_MAPPINGS]);
  const [inventory, setInventory] = useState<InventoryRow[]>(() => INITIAL_INVENTORY.map((row) => ({ ...row, availability: [...row.availability] })));
  const [settings, setSettings] = useState<SyncSettings>(() => ({ ...INITIAL_SYNC_SETTINGS }));

  const [activeTab, setActiveTab] = useState<ChannelTabId>('inventory');
  const [selectedChannelId, setSelectedChannelId] = useState('goibibo');
  const [channelFilter, setChannelFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [rangeStart, setRangeStart] = useState(INITIAL_RANGE_START);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingChannelIds, setSyncingChannelIds] = useState<string[]>([]);
  const [lastGlobalSync, setLastGlobalSync] = useState('10:48 AM');
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [selectedCell, setSelectedCell] = useState<InventorySelection | null>(null);
  const [cellDraft, setCellDraft] = useState('');

  const dates = useMemo(() => buildInventoryDates(rangeStart), [rangeStart]);
  const endDate = dates[dates.length - 1]?.iso ?? rangeStart;
  const dateLabel = formatDateRange(rangeStart, endDate);
  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId) ?? channels[0];
  const channelNames = useMemo(() => new Map(channels.map((channel) => [channel.id, channel.name])), [channels]);
  const connectedCount = channels.filter((channel) => channel.status === 'connected').length;
  const channelsWithErrors = channels.filter((channel) => channel.status === 'error');
  const issueCount = channelsWithErrors.length;
  const monthlyBookings = channels.reduce((sum, channel) => sum + channel.bookingsMtd, 0);
  const performanceTotals = performance.reduce((sum, item) => ({
    bookings: sum.bookings + item.bookings,
    roomNights: sum.roomNights + item.roomNights,
    revenue: sum.revenue + item.revenue,
  }), { bookings: 0, roomNights: 0, revenue: 0 });
  const mappedCount = mappings.filter((mapping) => mapping.channelId === selectedChannel?.id && mapping.status === 'Mapped').length;
  const availableProviders = ADDABLE_PROVIDERS.filter((provider) => !channels.some((channel) => channel.id === provider.id));
  const enabledSyncAreas = [
    settings.availability && 'inventory',
    settings.rates && 'rates',
    settings.restrictions && 'restrictions',
    settings.minStay && 'minimum stay',
    settings.stopSell && 'stop sell',
  ].filter((value): value is string => Boolean(value));

  const addLog = (channelId: string, event: string, status: ChannelLog['status'], detail: string) => {
    const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', timeZone: settings.timeZone }).format(new Date());
    setLogs((previous) => [{ id: `log-${Date.now()}`, time, channelId, event, status, detail }, ...previous].slice(0, 40));
  };

  const handleGlobalSync = () => {
    if (isSyncing) return;
    if (!enabledSyncAreas.length) {
      toast('Enable at least one sync category in Sync settings', { tone: 'warning' });
      return;
    }
    const syncable = channels.filter((channel) => channel.status === 'connected');
    setIsSyncing(true);
    toast(`Syncing ${syncable.length} connected channels…`, { tone: 'info' });
    window.setTimeout(() => {
      setChannels((previous) => previous.map((channel) => channel.status === 'connected'
        ? { ...channel, lastSync: 'Just now', syncSuccess: Math.min(100, Math.max(98, channel.syncSuccess)) }
        : channel));
      setIsSyncing(false);
      setLastGlobalSync('Just now');
      const markup = settings.rates && Number(settings.defaultMarkup) > 0 ? ` Default markup: ${settings.defaultMarkup}%.` : '';
      addLog('system', 'Global channel sync', issueCount ? 'Failed' : 'Success', `${syncable.length} channels · ${enabledSyncAreas.join(', ')} synchronized.${markup}${issueCount ? ` ${issueCount} channel needs attention.` : ''}`);
      toast(issueCount ? `${syncable.length} channels synced; ${issueCount} needs attention` : 'All connected channels are up to date', { tone: issueCount ? 'warning' : 'success' });
    }, 900);
  };

  const handleChannelSync = (channel: Channel) => {
    if (syncingChannelIds.includes(channel.id)) return;
    if (!enabledSyncAreas.length) {
      toast('Enable at least one sync category in Sync settings', { tone: 'warning' });
      return;
    }
    if (channel.status !== 'connected') {
      toast(`${channel.name} is ${channel.status === 'paused' ? 'paused' : 'not connected'}`, { tone: 'warning' });
      return;
    }
    setSyncingChannelIds((previous) => [...previous, channel.id]);
    setChannels((previous) => previous.map((item) => item.id === channel.id ? { ...item, lastSync: 'Syncing…' } : item));
    toast(`Syncing ${channel.name}…`, { tone: 'info' });
    window.setTimeout(() => {
      setSyncingChannelIds((previous) => previous.filter((id) => id !== channel.id));
      setChannels((previous) => previous.map((item) => item.id === channel.id ? { ...item, lastSync: 'Just now', syncSuccess: Math.min(100, Math.max(item.syncSuccess, 99)) } : item));
      setLastGlobalSync('Just now');
      const markup = settings.rates && Number(settings.defaultMarkup) > 0 ? ` Default markup: ${settings.defaultMarkup}%.` : '';
      addLog(channel.id, 'Manual sync', 'Success', `${enabledSyncAreas.join(', ')} synchronized.${markup}`);
      toast(`${channel.name} sync complete`, { tone: 'success' });
    }, 650);
  };

  const handleReconnect = (channel: Channel) => {
    toast(`Reconnecting ${channel.name}…`, { tone: 'info' });
    window.setTimeout(() => {
      setChannels((previous) => previous.map((item) => item.id === channel.id
        ? { ...item, status: 'connected', lastSync: 'Just now', syncSuccess: 100, errorDetail: undefined }
        : item));
      setLastGlobalSync('Just now');
      addLog(channel.id, 'Authentication handshake', 'Success', `${channel.name} connection verified.`);
      toast(`${channel.name} reconnected`, { tone: 'success' });
    }, 700);
  };

  const handleConnectChannel = (provider: ChannelProvider, propertyId: string) => {
    const newChannel: Channel = {
      id: provider.id,
      name: provider.name,
      code: provider.id,
      logoBg: provider.color,
      logoText: provider.abbreviation,
      logoColor: provider.logoColor,
      status: 'connected',
      lastSync: 'Just now',
      activeRooms: 0,
      bookingsMtd: 0,
      syncSuccess: 100,
    };
    setChannels((previous) => [newChannel, ...previous]);
    setPerformance((previous) => [...previous, { channelId: newChannel.id, bookings: 0, roomNights: 0, revenue: 0 }]);
    setSelectedChannelId(newChannel.id);
    setShowAddChannel(false);
    setHasUnpublishedChanges(true);
    addLog(newChannel.id, 'Channel connected', 'Success', `Demo property ${propertyId} linked to ${provider.name}.`);
    toast(`${provider.name} connected to the demo property`, { tone: 'success' });
  };

  const handlePauseChannel = (channel: Channel) => {
    const nextStatus: Channel['status'] = channel.status === 'paused' ? 'connected' : 'paused';
    setChannels((previous) => previous.map((item) => item.id === channel.id ? { ...item, status: nextStatus } : item));
    setHasUnpublishedChanges(true);
    addLog(channel.id, nextStatus === 'paused' ? 'Channel paused' : 'Channel resumed', 'Success', `${channel.name} is ${nextStatus}.`);
    toast(`${channel.name} ${nextStatus === 'paused' ? 'paused' : 'resumed'}`, { tone: 'info' });
  };

  const handleSettingsChange = (key: keyof SyncSettings, value: boolean | string) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
    setHasUnpublishedChanges(true);
  };

  const handleSaveSettings = () => {
    setHasUnpublishedChanges(true);
    toast('Sync settings saved for this demo session', { tone: 'success' });
  };

  const handlePublishChanges = () => {
    if (!hasUnpublishedChanges) return;
    setHasUnpublishedChanges(false);
    addLog('system', 'Changes published', 'Success', 'Inventory, mapping and sync changes published in the demo workspace.');
    toast('Changes published to connected demo channels', { tone: 'success' });
  };

  const handleInventoryCellSelect = (selection: InventorySelection) => {
    setSelectedCell(selection);
    setCellDraft(String(selection.available));
  };

  const metrics = [
    { label: 'Connected channels', value: `${connectedCount}/${channels.length}`, hint: `${issueCount} require attention`, icon: Lucide.Link2, tone: issueCount ? 'warning' as const : 'success' as const },
    { label: 'Room nights', value: String(performanceTotals.roomNights), hint: 'Next 30 days', icon: Lucide.BedDouble, tone: 'primary' as const },
    { label: 'Bookings this month', value: String(monthlyBookings), hint: 'Across connected channels', icon: Lucide.CalendarDays, tone: 'info' as const },
    { label: 'Channel revenue', value: formatMoney(performanceTotals.revenue), hint: 'Last 30 days', icon: Lucide.CircleDollarSign, tone: 'success' as const },
    { label: 'Channel issues', value: String(issueCount), hint: issueCount ? 'Reconnect required' : 'All channels healthy', icon: Lucide.AlertCircle, tone: issueCount ? 'danger' as const : 'success' as const },
  ];

  const handleMappingChange = (id: string, field: keyof RateMapping, value: string) => {
    setMappings((previous) => previous.map((mapping) => {
      if (mapping.id !== id) return mapping;
      if (field === 'status') return { ...mapping, status: value as RateMapping['status'] };
      return { ...mapping, [field]: value, status: 'Needs review' };
    }));
    setHasUnpublishedChanges(true);
  };

  const handleAddMapping = () => {
    setMappings((previous) => [{
      id: `mapping-${Date.now()}`,
      channelId: selectedChannel?.id ?? channels[0]?.id ?? 'booking',
      roomType: ROOM_TYPES[0],
      ratePlan: 'Best Available Rate',
      externalCode: '',
      status: 'Needs review',
    }, ...previous]);
    setHasUnpublishedChanges(true);
  };

  const handleSaveMappings = () => {
    if (mappings.some((mapping) => !mapping.externalCode.trim())) {
      toast('Add an external code to every mapping before saving', { tone: 'warning' });
      return;
    }
    setMappings((previous) => previous.map((mapping) => ({ ...mapping, status: 'Mapped' })));
    setHasUnpublishedChanges(true);
    addLog('system', 'Room and rate mappings saved', 'Success', `${mappings.length} mappings validated.`);
    toast('Mappings saved in this demo session', { tone: 'success' });
  };

  const handleSaveInventoryCell = () => {
    if (!selectedCell) return;
    const nextValue = Number(cellDraft);
    if (!Number.isFinite(nextValue) || nextValue < 0 || nextValue > selectedCell.total) {
      toast(`Availability must be between 0 and ${selectedCell.total}`, { tone: 'warning' });
      return;
    }
    const dayIndex = dates.findIndex((date) => date.iso === selectedCell.date.iso);
    if (dayIndex < 0) {
      toast('This date is no longer in the visible window', { tone: 'warning' });
      return;
    }
    setInventory((previous) => previous.map((row) => row.roomType === selectedCell.roomType
      ? { ...row, availability: row.availability.map((value, index) => index === dayIndex ? nextValue : value) }
      : row));
    setSelectedCell(null);
    setHasUnpublishedChanges(true);
    addLog(selectedChannel?.id ?? 'system', 'Inventory override', 'Success', `${selectedCell.roomType} · ${selectedCell.date.iso} · ${nextValue}/${selectedCell.total} rooms open.`);
    toast('Channel availability updated', { tone: 'success' });
  };

  const handleTabChange = (tab: ChannelTabId) => {
    setActiveTab(tab);
    if (tab === 'restrictions') setSettingsExpanded(true);
  };

  return (
    <div className="flex w-full flex-col gap-5 pb-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-white shadow-xs shadow-primary/20 mt-0.5">
            <Lucide.Globe size={20} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-bold tracking-tight text-ink leading-tight">Channel Manager</h1>
              <span className="flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-0.5 text-[10px] font-bold text-success-text border border-success-border/60">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-text opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-text"></span>
                </span>
                Live Feed
              </span>
            </div>
            <p className="text-xs text-ink-secondary mt-1">Monitor OTA connections, inventory distribution and booking performance.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={settings.autoSync} onClick={() => handleSettingsChange('autoSync', !settings.autoSync)} className={`inline-flex min-h-[38px] items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${settings.autoSync ? 'bg-success-bg text-success-text' : 'bg-muted-surface text-ink-secondary'}`} style={{ borderColor: settings.autoSync ? 'var(--color-success-border)' : 'var(--color-border)' }}>
            <span className={`h-1.5 w-1.5 rounded-full ${settings.autoSync ? 'bg-success-text' : 'bg-ink-disabled'}`} /> Auto-sync {settings.autoSync ? 'on' : 'paused'}
          </button>
          <button type="button" onClick={() => { handleTabChange('restrictions'); setSettingsExpanded(true); }} className="pms-btn-ghost min-h-[38px] px-3 py-1.5 text-xs"><Lucide.Settings2 size={14} /> Sync settings</button>
          <button type="button" onClick={() => setShowLogs(true)} className="pms-btn-ghost min-h-[38px] px-3 py-1.5 text-xs"><Lucide.ScrollText size={14} /> Logs</button>
          <button type="button" onClick={handleGlobalSync} disabled={isSyncing || connectedCount === 0} className="pms-btn-ghost min-h-[38px] px-3 py-1.5 text-xs disabled:opacity-50"><Lucide.RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />{isSyncing ? 'Syncing' : 'Sync now'}</button>
          <button type="button" onClick={handlePublishChanges} disabled={!hasUnpublishedChanges} className="pms-btn-ghost min-h-[38px] px-3 py-1.5 text-xs disabled:opacity-50"><Lucide.Upload size={14} /> Publish changes</button>
          <button type="button" onClick={() => setShowAddChannel(true)} className="pms-btn-primary min-h-[38px] px-3.5 py-1.5 text-xs"><Lucide.Plus size={15} /> Add channel</button>
        </div>
      </header>

      {issueCount > 0 && (
        <div role="status" className="flex flex-col gap-2 rounded-card border p-3.5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)' }}>
          <div className="flex items-start gap-2.5"><Lucide.AlertCircle size={17} className="mt-0.5 flex-none text-danger-text" /><div><p className="text-xs font-bold text-danger-text">{issueCount} channel connection{issueCount === 1 ? '' : 's'} need attention</p><p className="mt-0.5 text-[11px] text-danger-text">{channelsWithErrors.map((channel) => `${channel.name}: ${channel.errorDetail ?? 'Reconnect to resume synchronization.'}`).join(' · ')}</p></div></div>
          <button type="button" onClick={() => channelsWithErrors.forEach(handleReconnect)} className="rounded-control px-3 py-1.5 text-xs font-bold text-danger-text transition-colors hover:bg-surface/50">Reconnect {issueCount === 1 ? 'channel' : 'all'}</button>
        </div>
      )}

      <section className="pms-stagger grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5" aria-label="Channel manager summary">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.75fr)]">
        <ChannelDirectoryPanel channels={channels} selectedChannelId={selectedChannel?.id ?? ''} syncingChannelIds={syncingChannelIds} globalSyncing={isSyncing} onSelect={setSelectedChannelId} onSync={handleChannelSync} onReconnect={handleReconnect} />
        {selectedChannel ? (
          <section className="pms-card flex min-w-0 flex-col p-4 sm:p-5" aria-labelledby="channel-detail-title">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><ChannelLogo channel={selectedChannel} size="lg" /><div className="min-w-0"><h2 id="channel-detail-title" className="truncate text-sm font-bold text-ink">{selectedChannel.name}</h2><span className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ color: statusAppearance(selectedChannel.status).color, background: statusAppearance(selectedChannel.status).background, borderColor: statusAppearance(selectedChannel.status).border }}><span className={`h-1.5 w-1.5 rounded-full ${selectedChannel.status === 'connected' ? 'bg-success-text' : selectedChannel.status === 'error' ? 'bg-danger-text' : 'bg-ink-disabled'}`} />{statusAppearance(selectedChannel.status).label}</span></div></div>
              <button type="button" aria-label="Open channel logs" onClick={() => setShowLogs(true)} className="flex h-8 w-8 flex-none items-center justify-center rounded-control text-ink-muted hover:bg-hover-surface hover:text-ink"><Lucide.Ellipsis size={17} /></button>
            </div>
            {selectedChannel.status === 'error' && <div className="mt-4 rounded-control border p-3 text-[11px] leading-relaxed text-danger-text" style={{ borderColor: 'var(--color-danger-border)', background: 'var(--color-danger-bg)' }}><span className="font-bold">Connection error</span><br />{selectedChannel.errorDetail}</div>}
            <div className="mt-4 grid grid-cols-3 divide-x rounded-control border py-3" style={{ borderColor: 'var(--color-divider)' }}>
              <div className="px-2 text-center"><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Rooms</p><p className="mt-1 text-sm font-bold text-ink tnum">{selectedChannel.activeRooms}</p></div>
              <div className="px-2 text-center"><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Bookings MTD</p><p className="mt-1 text-sm font-bold text-ink tnum">{selectedChannel.bookingsMtd}</p></div>
              <div className="px-2 text-center"><p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Sync health</p><p className="mt-1 text-sm font-bold text-ink tnum">{selectedChannel.syncSuccess}%</p></div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs"><span className="text-ink-muted">Last sync</span><span className={`font-semibold ${selectedChannel.status === 'error' ? 'text-danger-text' : 'text-ink-secondary'}`}>{selectedChannel.lastSync}</span></div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs"><span className="text-ink-muted">Rate mappings</span><button type="button" onClick={() => handleTabChange('mapping')} className="font-semibold text-primary hover:underline">{mappedCount} mapped · Review</button></div>
            <div className="mt-auto flex gap-2 pt-5">
              {selectedChannel.status === 'error'
                ? <button type="button" onClick={() => handleReconnect(selectedChannel)} className="pms-btn-primary min-h-[38px] flex-1 px-3 py-1.5 text-xs"><Lucide.Link2 size={14} /> Reconnect</button>
                : <button type="button" onClick={() => handleChannelSync(selectedChannel)} disabled={selectedChannel.status === 'paused'} className="pms-btn-primary min-h-[38px] flex-1 px-3 py-1.5 text-xs disabled:opacity-50"><Lucide.RefreshCw size={14} /> Sync channel</button>}
              <button type="button" onClick={() => handlePauseChannel(selectedChannel)} className="pms-btn-ghost min-h-[38px] px-3 py-1.5 text-xs">{selectedChannel.status === 'paused' ? 'Resume' : 'Pause'}</button>
            </div>
          </section>
        ) : null}
      </div>

      <section className="pms-card overflow-hidden">
        <div className="no-scrollbar flex overflow-x-auto border-b px-2 sm:px-3" role="tablist" aria-label="Channel manager sections" style={{ borderColor: 'var(--color-border)' }} onKeyDown={(event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          const currentIndex = TABS.findIndex((tab) => `channel-tab-${tab.id}` === document.activeElement?.id);
          const next = TABS[(currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length];
          handleTabChange(next.id);
          document.getElementById(`channel-tab-${next.id}`)?.focus();
        }}>
          {TABS.map(({ id, label, icon: Icon }) => {
            const selected = activeTab === id;
            return <button key={id} id={`channel-tab-${id}`} type="button" role="tab" tabIndex={selected ? 0 : -1} aria-selected={selected} aria-controls="channel-tab-panel" onClick={() => handleTabChange(id)} className={`relative flex min-h-[48px] flex-none items-center gap-2 px-3 text-xs font-semibold transition-colors sm:px-4 ${selected ? 'text-primary' : 'text-ink-muted hover:text-ink'}`}><Icon size={15} />{label}{selected && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary sm:inset-x-4" />}</button>;
          })}
        </div>
        <div id="channel-tab-panel" role="tabpanel" aria-labelledby={`channel-tab-${activeTab}`} className="min-w-0 p-3 sm:p-4">
          {activeTab === 'inventory' && <InventoryPanel dates={dates} rows={inventory} roomFilter={roomFilter} dateLabel={dateLabel} lastUpdatedLabel={lastGlobalSync} onRoomFilterChange={setRoomFilter} onPrevious={() => setRangeStart((current) => shiftDate(current, -15))} onNext={() => setRangeStart((current) => shiftDate(current, 15))} onToday={() => setRangeStart(shiftDate(BUSINESS_DATE, -3))} onSelectCell={handleInventoryCellSelect} />}
          {activeTab === 'rates' && <RatesPanel channels={channels} performance={performance} channelFilter={channelFilter} onChannelFilterChange={setChannelFilter} />}
          {activeTab === 'restrictions' && <div className="flex flex-col gap-4"><ChannelRestrictionsPanel settings={settings} onChange={handleSettingsChange} /><SyncSettingsPanel settings={settings} expanded={settingsExpanded} onToggleExpanded={() => setSettingsExpanded((value) => !value)} onChange={handleSettingsChange} onSave={handleSaveSettings} /></div>}
          {activeTab === 'mapping' && <MappingPanel mappings={mappings} channels={channels} onChange={handleMappingChange} onAdd={handleAddMapping} onSave={handleSaveMappings} />}
          {activeTab === 'promotions' && <PromotionsPanel channels={channels} bookings={bookings} channelFilter={channelFilter} onChannelFilterChange={setChannelFilter} onViewAll={() => setShowAllBookings(true)} />}
        </div>
      </section>

      {showAddChannel && <AddChannelDialog key={channels.length} open providers={availableProviders} onClose={() => setShowAddChannel(false)} onConnect={handleConnectChannel} />}

      {showLogs && (
        <Modal open onClose={() => setShowLogs(false)} title="Channel synchronization logs" subtitle={`Most recent activity · last global sync ${lastGlobalSync}`} wide footer={<button type="button" onClick={() => setShowLogs(false)} className="pms-btn-primary px-4 py-2 text-xs">Done</button>}>
          <div className="flex flex-col gap-2.5">
            {logs.map((log) => {
              const failed = log.status === 'Failed';
              const running = log.status === 'Running';
              return <article key={log.id} className="flex flex-col gap-2 rounded-control border p-3 sm:flex-row sm:items-start sm:justify-between" style={{ background: failed ? 'var(--color-danger-bg)' : 'var(--color-muted-surface)', borderColor: failed ? 'var(--color-danger-border)' : 'var(--color-border)' }}><div className="flex min-w-0 items-start gap-2.5"><span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${failed ? 'bg-danger-text' : running ? 'animate-pulse bg-warning-text' : 'bg-success-text'}`} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="text-xs font-bold text-ink">{channelNames.get(log.channelId) ?? (log.channelId === 'system' ? 'Channel Manager' : log.channelId)}</span><span className="text-[10px] font-mono text-ink-muted">{log.time}</span><span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary" style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>{log.event}</span></div><p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">{log.detail}</p></div></div><span className={`flex-none rounded-full px-2 py-1 text-[10px] font-bold ${failed ? 'bg-danger-bg text-danger-text' : running ? 'bg-warning-bg text-warning-text' : 'bg-success-bg text-success-text'}`}>{log.status}</span></article>;
            })}
          </div>
        </Modal>
      )}

      {showAllBookings && (
        <Modal open onClose={() => setShowAllBookings(false)} title="Recent channel bookings" subtitle="Incoming reservations from connected distribution channels." wide footer={<button type="button" onClick={() => setShowAllBookings(false)} className="pms-btn-primary px-4 py-2 text-xs">Close</button>}>
          <div className="pms-table-scroll overflow-x-auto"><table className="pms-table min-w-[620px]"><thead><tr><th>Channel</th><th>Booking ID</th><th>Guest</th><th>Room type</th><th>Stay dates</th><th>Status</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id}><td>{channelNames.get(booking.channelId) ?? booking.channelId}</td><td className="font-mono text-[11px]">{booking.id}</td><td className="font-semibold">{booking.guestName}</td><td>{booking.roomType}</td><td>{booking.checkIn} – {booking.checkOut}</td><td>{booking.status}</td></tr>)}</tbody></table></div>
        </Modal>
      )}

      {selectedCell && (
        <Modal open onClose={() => setSelectedCell(null)} title={`Inventory override · ${selectedCell.roomType}`} subtitle={`${selectedCell.date.weekday}, ${selectedCell.date.month} ${selectedCell.date.day} · capacity ${selectedCell.total} rooms`} footer={<><button type="button" onClick={() => setSelectedCell(null)} className="pms-btn-ghost px-4 py-2 text-xs">Cancel</button><button type="button" onClick={handleSaveInventoryCell} className="pms-btn-primary px-4 py-2 text-xs">Save availability</button></>}>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-secondary">Rooms available to channels<input autoFocus type="number" min={0} max={selectedCell.total} value={cellDraft} onChange={(event) => setCellDraft(event.target.value)} className="pms-input w-full text-sm" /></label>
          <p className="mt-2 text-[11px] text-ink-muted">The override applies to this room type and date in the local demo inventory.</p>
        </Modal>
      )}
    </div>
  );
}
