import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { readLaunchParams, type BugId, type Drift } from '../lib/launchParams';

export const STARTING_BALANCE = 1000;
export const DAILY_LIMIT = 500;
export const MAX_DEPOSIT = 5000;

export interface User {
  name: string;
  email: string;
}

export interface Transaction {
  id: string;
  kind: 'payment' | 'deposit';
  /** Recipient email (payments only). */
  to?: string;
  amount: number;
}

interface AppState {
  user: User | null;
  verified: boolean;
  balance: number;
  sentToday: number;
  /** What can be sent right now: the lower of balance and today's remaining limit. */
  canSendNow: number;
  transactions: Transaction[];
  bugs: BugId[];
  toast: string | null;
  signUp: (user: User) => void;
  markVerified: () => void;
  recordPayment: (to: string, amount: number) => void;
  recordDeposit: (amount: number) => void;
  showToast: (message: string) => void;
  hasBug: (bug: BugId) => boolean;
  hasDrift: (drift: Drift) => boolean;
}

const AppContext = createContext<AppState | null>(null);

const SEED_USER: User = { name: 'Dana Levi', email: 'dana@paydemo.dev' };

export function AppProvider({ children }: { children: ReactNode }) {
  const launch = useMemo(readLaunchParams, []);
  const [user, setUser] = useState<User | null>(launch.seed ? SEED_USER : null);
  const [verified, setVerified] = useState(launch.seed === 'verified-user');
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [sentToday, setSentToday] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasBug = useCallback((bug: BugId) => launch.bugs.includes(bug), [launch.bugs]);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const recordPayment = useCallback(
    (to: string, amount: number) => {
      if (!hasBug('balance-update')) setBalance((b) => b - amount);
      setSentToday((s) => s + amount);
      setTransactions((t) => [{ id: String(Date.now()), kind: 'payment', to, amount }, ...t]);
    },
    [hasBug],
  );

  // Deposits raise the balance but never touch the daily send limit.
  const recordDeposit = useCallback((amount: number) => {
    setBalance((b) => b + amount);
    setTransactions((t) => [{ id: String(Date.now()), kind: 'deposit', amount }, ...t]);
  }, []);

  const value: AppState = {
    user,
    verified,
    balance,
    sentToday,
    canSendNow: Math.max(0, Math.min(balance, DAILY_LIMIT - sentToday)),
    transactions,
    bugs: launch.bugs,
    toast,
    signUp: (u) => {
      setUser(u);
      setVerified(false);
    },
    markVerified: () => setVerified(true),
    recordPayment,
    recordDeposit,
    showToast,
    hasBug,
    hasDrift: (d) => launch.drift.includes(d),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export const formatMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
