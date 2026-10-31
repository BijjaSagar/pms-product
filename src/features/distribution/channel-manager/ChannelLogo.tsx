import type { Channel } from './types';

export function ChannelLogo({ channel, size = 'sm' }: { channel: Pick<Channel, 'name' | 'logoBg' | 'logoText' | 'logoColor'>; size?: 'sm' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-11 w-11 text-body' : 'h-8 w-8 text-label';
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-control font-extrabold shadow-xs ${dimensions}`}
      style={{ background: channel.logoBg, color: channel.logoColor ?? '#ffffff' }}
      role="img"
      aria-label={`${channel.name} logo`}
    >
      {channel.logoText}
    </span>
  );
}
