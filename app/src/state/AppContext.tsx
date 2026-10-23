import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { readLaunchParams, type BugId, type Drift } from '../lib/launchParams';

export const STARTING_BALANCE = 1000;
export const DAILY_LIMIT = 500;

export interface User {
  name: string;
  email: string;
}

export interface Transaction {
  id: string;
  to: string;
  amount: number;
}

interface AppState {
  user: User | null;
  verified: boolean;
  balance: number;
  sentToday: number;
  transactions: Transaction[];
  bugs: BugId[];
  toast: string | null;
  signUp: (user: User) => void;
  markVerified: () => void;
  recordPayment: (to: string, amount: number) => void;
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
      setTransactions((t) => [{ id: String(Date.now()), to, amount }, ...t]);
    },
    [hasBug],
  );

  const value: AppState = {
    user,
    verified,
    balance,
    sentToday,
    transactions,
    bugs: launch.bugs,
    toast,
    signUp: (u) => {
      setUser(u);
      setVerified(false);
    },
    markVerified: () => setVerified(true),
    recordPayment,
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
