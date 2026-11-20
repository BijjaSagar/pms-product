import { useEffect, useState } from 'react';
import * as Lucide from 'lucide-react';
import { BrandShell } from '../../components/brand/BrandShell';
import { HEADING } from '../../components/brand/brandStyles';
import { Button } from '../../components/primitives';
import { displayApiError } from '../../lib/api/client';
import { toast } from '../../utils/toast';
import { useAuth } from './AuthContext';

/** How often the page asks whether the account has been approved. */
const CHECK_EVERY_MS = 30_000;

/**
 * Step three of three: the property is saved and a super admin has not decided yet. The API refuses
 * everything but the account itself, so this page is all there is. It checks on its own, and the moment
 * the account is approved the app opens.
 */
export function AwaitingApprovalPage() {
  const { me, reload, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => void reload(), CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [reload]);

  const check = async () => {
    setChecking(true);
    try {
      const latest = await reload();
      // When it has been approved the app opens instead, so only say "waiting" if that is still true.
      if (latest?.user.approvalStatus === 'PENDING_APPROVAL') {
        toast('Still waiting', { detail: 'Your property has not been approved yet.', tone: 'info' });
      }
    } catch (cause) {
      toast('Could not check', { detail: displayApiError(cause), tone: 'danger' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <BrandShell>
      <div className="flex flex-1 items-center justify-center py-10">
        <section className="pms-animate-fade-in w-full max-w-[520px] text-center" aria-label="Waiting for approval" role="status">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Lucide.Hourglass size={26} aria-hidden="true" />
          </span>
          <h1 className={`mt-5 text-[26px] font-bold leading-tight tracking-[-0.045em] text-ink sm:text-[32px] ${HEADING}`}>
            Your property is with our team.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-secondary">
            Thanks{me?.user.fullName ? `, ${me.user.fullName.trim().split(/\s+/)[0]}` : ''}. We are reviewing what you sent. You can use TriponX as soon as it
            is approved; this page opens it for you, and you can also sign in again later.
          </p>
          {me?.user.email ? <p className="mt-2 text-[13px] text-ink-muted">Signed in as {me.user.email}</p> : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => void check()}
              disabled={checking}
              icon={checking ? <Lucide.Loader2 size={14} className="animate-spin" /> : <Lucide.RefreshCw size={14} />}
            >
              Check now
            </Button>
            <Button variant="ghost" icon={<Lucide.LogOut size={14} />} onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </section>
      </div>
    </BrandShell>
  );
}
