import { fieldClass } from '../../components/formStyles';

/** The shared field, a little taller than the app's 32px so the sign-in and register forms feel roomier. */
export const SIGN_IN_FIELD = `${fieldClass} !min-h-[44px] max-md:text-[16px] md:!min-h-[40px]`;

/** The submit button: as tall as the fields, with the same small corner radius as them (the shared Button is fully rounded). */
export const SIGN_IN_BUTTON =
  'mt-1 inline-flex min-h-[44px] w-full md:min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-primary px-5 text-title font-bold text-primary-foreground shadow-xs transition-colors hover:bg-primary-hover active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60';
