import { useEffect, useState } from 'react';
import * as Lucide from 'lucide-react';

/** An `<img>` for a file behind the bearer token: it is fetched, then shown from a blob URL. */
export function AuthImage({ load, alt, fit = 'cover' }: { load: () => Promise<Blob>; alt: string; fit?: 'cover' | 'contain' }) {
  const [state, setState] = useState<{ url: string } | { failed: true } | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    load()
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl });
      })
      .catch(() => {
        if (active) setState({ failed: true });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // `load` is rebuilt every render; the image itself never changes for a mounted card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state && 'url' in state) return <img src={state.url} alt={alt} className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`} />;
  return (
    <div className="flex h-full w-full items-center justify-center text-ink-muted">
      {state ? <Lucide.ImageOff size={22} /> : <Lucide.Loader2 size={20} className="animate-spin" />}
    </div>
  );
}
