import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { getSmartAccountClient } from './zerodev';

const API = process.env.EXPO_PUBLIC_API_URL!;
const JWT_KEY = 'pangea_jwt';
const WALLET_KEY_PREFIX = 'pangea_wallet_pk';

// Each signed-in email gets its own wallet key, scoped by email — otherwise
// switching accounts on the same phone would reuse one device-wide wallet for
// every account, and the backend's unique constraint on wallet_address would
// reject the second account's login with a 500 (surfaced to the user as a
// misleading "Invalid code").
// SecureStore keys may only contain alphanumerics, ".", "-", and "_" — an
// email's "@" (and anything else non-conforming) has to be sanitized out.
function walletKeyFor(email: string): string {
  const sanitized = email.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  return `${WALLET_KEY_PREFIX}_${sanitized}`;
}

export interface AuthUser {
  userId: string;
  email: string;
  walletAddress: string | null;
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

function decodeJwt(token: string): { sub: string; email: string; wallet: string | null; exp: number } {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(json);
}

function isTokenExpired(token: string): boolean {
  try {
    const { exp } = decodeJwt(token);
    return Date.now() / 1000 > exp;
  } catch {
    return true;
  }
}

export function userFromToken(token: string): AuthUser | null {
  try {
    const { sub, email, wallet } = decodeJwt(token);
    return { userId: sub, email, walletAddress: wallet };
  } catch {
    return null;
  }
}

// ── Secure storage ────────────────────────────────────────────────────────────

export async function loadStoredToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(JWT_KEY);
  if (!token || isTokenExpired(token)) return null;
  return token;
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(JWT_KEY);
}

// ── Wallet key ────────────────────────────────────────────────────────────────

// Devices updated before the per-email scoping fix may still have a wallet
// key stored under this old, unscoped name. Only migrate it to a given email
// if that email's backend-registered wallet actually matches it — otherwise
// we'd risk handing one account's wallet to a different account that happens
// to check first.
async function tryMigrateLegacyWallet(email: string): Promise<string | null> {
  const legacyKey = await SecureStore.getItemAsync(WALLET_KEY_PREFIX);
  if (!legacyKey) return null;

  try {
    // The backend can only look users up by wallet address, so derive the
    // legacy key's address and check whose email it's actually registered to.
    const { address } = await getSmartAccountClient(legacyKey);
    const { fetchUser } = await import('./api');
    const registeredUser = await fetchUser(address);
    if (registeredUser.email?.toLowerCase() === email.toLowerCase()) {
      await SecureStore.setItemAsync(walletKeyFor(email), legacyKey);
      await SecureStore.deleteItemAsync(WALLET_KEY_PREFIX);
      return legacyKey;
    }
  } catch {
    // No user registered for this wallet yet, or a network error — leave
    // the legacy key untouched for whichever email it actually belongs to.
  }
  return null;
}

export async function getOrCreateWallet(email: string): Promise<{ privateKey: string; address: string }> {
  const key = walletKeyFor(email);
  let privateKey = await SecureStore.getItemAsync(key);

  if (!privateKey) {
    privateKey = await tryMigrateLegacyWallet(email);
  }
  if (!privateKey) {
    const bytes = await Crypto.getRandomBytesAsync(32);
    privateKey = '0x' + Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(key, privateKey);
  }

  const { address } = await getSmartAccountClient(privateKey);
  return { privateKey, address };
}

export async function getWalletPrivateKey(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(JWT_KEY);
  if (!token) return null;
  const user = userFromToken(token);
  if (!user) return null;

  const key = walletKeyFor(user.email);
  let privateKey = await SecureStore.getItemAsync(key);
  if (!privateKey) {
    // Handles a session that was already logged in (skipped the login
    // screen, so getOrCreateWallet never ran) when this fix was deployed.
    privateKey = await tryMigrateLegacyWallet(user.email);
  }
  return privateKey;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function sendCode(email: string): Promise<void> {
  const res = await fetch(`${API}/auth/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'Failed to send code');
  }
}

export async function verifyCode(
  email: string,
  code: string,
  walletAddress: string | null
): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API}/auth/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, wallet_address: walletAddress }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? 'Invalid code');
  }
  const data = await res.json();
  const user: AuthUser = {
    userId: data.user_id,
    email: data.email,
    walletAddress: data.wallet_address,
  };
  return { token: data.token, user };
}
