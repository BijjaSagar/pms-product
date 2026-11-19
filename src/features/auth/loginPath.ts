/**
 * Platform administrators sign in at their own address; hotel staff use the main one. There is no router,
 * so the address is only read to choose which sign-in page to show while nobody is signed in.
 */
export const PLATFORM_LOGIN_PATH = '/admin';
export const STAFF_LOGIN_PATH = '/';

export function isPlatformLoginPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === PLATFORM_LOGIN_PATH;
}
