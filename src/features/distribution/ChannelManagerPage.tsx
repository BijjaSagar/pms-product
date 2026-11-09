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
import { Button, IconButton, TextField } from '../../components/primitives';
import { Field, Switch } from '../../components/controls';
import { PageTabs } from '../../components/PageTabs';
import type { PageTab } from '../../components/PageTabs';
import { SummaryStrip } from '../../components/SummaryStrip';
import type { SummaryItem } from '../../components/SummaryStrip';
import { Badge } from '../../components/ui';
import type { BadgeTone } from '../../utils/status';

const TABS: PageTab<ChannelTabId>[] = [
  { id: 'inventory', label: 'Inventory', icon: Lucide.CalendarDays },
  { id: 'rates', label: 'Rates', icon: Lucide.ChartNoAxesCombined },
  { id: 'restrictions', label: 'Restrictions', icon: Lucide.LockKeyhole },
  { id: 'mapping', label: 'Room & rate mapping', icon: Lucide.Network },
  { id: 'promotions', label: 'Promotions & bookings', icon: Lucide.Sparkles },
];

const STATUS: Record<Channel['status'], { label: string; tone: BadgeTone }> = {
  connected: { label: 'Connected', tone: 'success' },
  error: { label: 'Needs attention', tone: 'danger' },
  paused: { label: 'Paused', tone: 'neutral' },
};

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

  const metrics: SummaryItem[] = [
    { label: 'Connected channels', value: `${connectedCount}/${channels.length}`, hint: `${issueCount} require attention`, icon: Lucide.Link2, tone: issueCount ? 'warning' : 'success' },
    { label: 'Room nights', value: String(performanceTotals.roomNights), hint: 'Next 30 days', icon: Lucide.BedDouble, tone: 'primary' },
    { label: 'Bookings this month', value: String(monthlyBookings), hint: 'Across connected channels', icon: Lucide.CalendarDays, tone: 'info' },
    { label: 'Channel revenue', value: formatMoney(performanceTotals.revenue), hint: 'Last 30 days', icon: Lucide.CircleDollarSign, tone: 'success' },
    { label: 'Channel issues', value: String(issueCount), hint: issueCount ? 'Reconnect required' : 'All channels healthy', icon: Lucide.AlertCircle, tone: issueCount ? 'danger' : 'success' },
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

  const selectedStatus = selectedChannel ? STATUS[selectedChannel.status] : null;

  return (
    <div className="pms-page gap-5">
      {/* Title and the actions, from most to least used */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-dark-accent text-primary-foreground shadow-xs shadow-primary/20">
            <Lucide.Globe size={20} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-disp3 font-bold leading-tight tracking-tight text-ink">Channel Manager</h1>
            <p className="mt-0.5 text-label text-ink-secondary">OTA connections, inventory distribution and booking performance.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span role="status" className="mr-1">
            {hasUnpublishedChanges ? <Badge tone="warning" dot>Unpublished changes</Badge> : <Badge tone="success" dot>Up to date</Badge>}
          </span>
          <label className="flex min-h-[34px] cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-3 md:min-h-[32px]">
            <span className="text-label font-semibold text-ink-secondary">Auto-sync</span>
            <Switch label="Auto-sync" checked={settings.autoSync} onChange={(next) => handleSettingsChange('autoSync', next)} />
          </label>
          <IconButton title="Sync settings" aria-label="Sync settings" onClick={() => handleTabChange('restrictions')}>
            <Lucide.Settings2 size={15} />
          </IconButton>
          <IconButton title="Sync logs" aria-label="Sync logs" onClick={() => setShowLogs(true)}>
            <Lucide.ScrollText size={15} />
          </IconButton>
          <Button variant="secondary" onClick={handlePublishChanges} disabled={!hasUnpublishedChanges} icon={<Lucide.Upload size={14} />}>
            Publish
          </Button>
          <Button variant="secondary" onClick={handleGlobalSync} disabled={isSyncing || connectedCount === 0} icon={<Lucide.RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />}>
            {isSyncing ? 'Syncing' : 'Sync now'}
          </Button>
          <Button variant="primary" onClick={() => setShowAddChannel(true)} icon={<Lucide.Plus size={15} />}>
            Add channel
          </Button>
        </div>
      </header>

      {issueCount > 0 && (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-danger-border bg-danger-bg p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Lucide.AlertCircle size={18} className="mt-0.5 flex-none text-danger-text" aria-hidden="true" />
            <div>
              <p className="text-body font-bold text-danger-text">
                {issueCount} channel connection{issueCount === 1 ? '' : 's'} need{issueCount === 1 ? 's' : ''} attention
              </p>
              <p className="mt-0.5 text-label text-danger-text">
                {channelsWithErrors.map((channel) => `${channel.name}: ${channel.errorDetail ?? 'Reconnect to resume synchronization.'}`).join(' · ')}
              </p>
            </div>
          </div>
          <Button variant="danger" onClick={() => channelsWithErrors.forEach(handleReconnect)} icon={<Lucide.Link2 size={14} />} className="flex-none">
            Reconnect {issueCount === 1 ? 'channel' : 'all'}
          </Button>
        </div>
      )}

      <SummaryStrip label="Channel manager summary" items={metrics} />

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)] xl:items-start">
        <ChannelDirectoryPanel channels={channels} selectedChannelId={selectedChannel?.id ?? ''} syncingChannelIds={syncingChannelIds} globalSyncing={isSyncing} onSelect={setSelectedChannelId} onSync={handleChannelSync} onReconnect={handleReconnect} />

        {selectedChannel && selectedStatus ? (
          <section className="pms-card flex min-w-0 flex-col p-4 sm:p-5" aria-labelledby="channel-detail-title">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ChannelLogo channel={selectedChannel} size="lg" />
                <div className="min-w-0">
                  <h2 id="channel-detail-title" className="truncate text-title font-bold text-ink">{selectedChannel.name}</h2>
                  <div className="mt-1">
                    <Badge tone={selectedStatus.tone} size="sm" dot>{selectedStatus.label}</Badge>
                  </div>
                </div>
              </div>
              <IconButton title="Open channel logs" aria-label="Open channel logs" onClick={() => setShowLogs(true)}>
                <Lucide.Ellipsis size={17} />
              </IconButton>
            </div>

            {selectedChannel.status === 'error' && (
              <div className="mt-4 rounded-xl border border-danger-border bg-danger-bg p-3 text-label leading-relaxed text-danger-text">
                <span className="font-bold">Connection error</span>
                <br />
                {selectedChannel.errorDetail}
              </div>
            )}

            <dl className="mt-4 grid grid-cols-3 gap-2">
              {[
                ['Rooms', String(selectedChannel.activeRooms)],
                ['Bookings MTD', String(selectedChannel.bookingsMtd)],
                ['Sync health', `${selectedChannel.syncSuccess}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted-surface px-2 py-2.5 text-center">
                  <dt className="truncate text-micro font-bold uppercase tracking-[0.1em] text-ink-muted">{label}</dt>
                  <dd className="tnum mt-1 text-title font-bold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex items-center justify-between gap-2 text-label">
              <span className="text-ink-muted">Last sync</span>
              <span className={`font-semibold ${selectedChannel.status === 'error' ? 'text-danger-text' : 'text-ink-secondary'}`}>{selectedChannel.lastSync}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-label">
              <span className="text-ink-muted">Rate mappings</span>
              <Button variant="link" onClick={() => handleTabChange('mapping')} className="hover:underline">
                {mappedCount} mapped · Review
              </Button>
            </div>

            <div className="mt-auto flex gap-2 pt-5">
              {selectedChannel.status === 'error' ? (
                <Button variant="primary" onClick={() => handleReconnect(selectedChannel)} icon={<Lucide.Link2 size={14} />} className="flex-1">
                  Reconnect
                </Button>
              ) : (
                <Button variant="primary" onClick={() => handleChannelSync(selectedChannel)} disabled={selectedChannel.status === 'paused'} icon={<Lucide.RefreshCw size={14} />} className="flex-1">
                  Sync channel
                </Button>
              )}
              <Button variant="secondary" onClick={() => handlePauseChannel(selectedChannel)}>
                {selectedChannel.status === 'paused' ? 'Resume' : 'Pause'}
              </Button>
            </div>
          </section>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <PageTabs label="Channel manager sections" idPrefix="channel" panelId="channel-tab-panel" tabs={TABS} active={activeTab} onChange={handleTabChange} />

        <div id="channel-tab-panel" role="tabpanel" aria-labelledby={`channel-tab-${activeTab}`} className="pms-card min-w-0 p-3 sm:p-4">
          {activeTab === 'inventory' && <InventoryPanel dates={dates} rows={inventory} roomFilter={roomFilter} dateLabel={dateLabel} lastUpdatedLabel={lastGlobalSync} onRoomFilterChange={setRoomFilter} onPrevious={() => setRangeStart((current) => shiftDate(current, -15))} onNext={() => setRangeStart((current) => shiftDate(current, 15))} onToday={() => setRangeStart(shiftDate(BUSINESS_DATE, -3))} onSelectCell={handleInventoryCellSelect} />}
          {activeTab === 'rates' && <RatesPanel channels={channels} performance={performance} channelFilter={channelFilter} onChannelFilterChange={setChannelFilter} />}
          {activeTab === 'restrictions' && <div className="flex flex-col gap-4"><ChannelRestrictionsPanel settings={settings} onChange={handleSettingsChange} /><SyncSettingsPanel settings={settings} expanded={settingsExpanded} onToggleExpanded={() => setSettingsExpanded((value) => !value)} onChange={handleSettingsChange} onSave={handleSaveSettings} /></div>}
          {activeTab === 'mapping' && <MappingPanel mappings={mappings} channels={channels} onChange={handleMappingChange} onAdd={handleAddMapping} onSave={handleSaveMappings} />}
          {activeTab === 'promotions' && <PromotionsPanel channels={channels} bookings={bookings} channelFilter={channelFilter} onChannelFilterChange={setChannelFilter} onViewAll={() => setShowAllBookings(true)} />}
        </div>
      </div>

      {showAddChannel && <AddChannelDialog key={channels.length} open providers={availableProviders} onClose={() => setShowAddChannel(false)} onConnect={handleConnectChannel} />}

      {showLogs && (
        <Modal open onClose={() => setShowLogs(false)} title="Channel synchronization logs" subtitle={`Most recent activity · last global sync ${lastGlobalSync}`} wide footer={<Button variant="primary" onClick={() => setShowLogs(false)}>Done</Button>}>
          <ul className="flex flex-col gap-2.5">
            {logs.map((log) => {
              const failed = log.status === 'Failed';
              const running = log.status === 'Running';
              return (
                <li
                  key={log.id}
                  className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-start sm:justify-between ${failed ? 'border-danger-border bg-danger-bg' : 'border-border bg-muted-surface'}`}
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${failed ? 'bg-danger-text' : running ? 'animate-pulse bg-warning-text' : 'bg-success-text'}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-label font-bold text-ink">{channelNames.get(log.channelId) ?? (log.channelId === 'system' ? 'Channel Manager' : log.channelId)}</span>
                        <span className="font-mono text-micro text-ink-muted">{log.time}</span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-micro font-semibold text-primary">{log.event}</span>
                      </div>
                      <p className="mt-1 text-label leading-relaxed text-ink-secondary">{log.detail}</p>
                    </div>
                  </div>
                  <Badge size="sm" tone={failed ? 'danger' : running ? 'warning' : 'success'}>{log.status}</Badge>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}

      {showAllBookings && (
        <Modal open onClose={() => setShowAllBookings(false)} title="Recent channel bookings" subtitle="Incoming reservations from connected distribution channels." wide footer={<Button variant="primary" onClick={() => setShowAllBookings(false)}>Close</Button>}>
          <div className="pms-table-scroll overflow-x-auto">
            <table className="pms-table min-w-[620px]">
              <thead>
                <tr><th>Channel</th><th>Booking ID</th><th>Guest</th><th>Room type</th><th>Stay dates</th><th>Status</th></tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{channelNames.get(booking.channelId) ?? booking.channelId}</td>
                    <td className="font-mono text-label">{booking.id}</td>
                    <td className="font-semibold">{booking.guestName}</td>
                    <td>{booking.roomType}</td>
                    <td>{booking.checkIn} – {booking.checkOut}</td>
                    <td>{booking.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {selectedCell && (
        <Modal
          open
          onClose={() => setSelectedCell(null)}
          title={`Inventory override · ${selectedCell.roomType}`}
          subtitle={`${selectedCell.date.weekday}, ${selectedCell.date.month} ${selectedCell.date.day} · capacity ${selectedCell.total} rooms`}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setSelectedCell(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveInventoryCell}>Save availability</Button>
            </>
          )}
        >
          <Field label="Rooms available to channels" hint="The override applies to this room type and date in the local demo inventory.">
            <TextField autoFocus type="number" min={0} max={selectedCell.total} value={cellDraft} onChange={(event) => setCellDraft(event.target.value)} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
