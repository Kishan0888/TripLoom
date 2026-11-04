import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

const SessionCtx = createContext(null);

// Holds the signed-in user plus their platform-admin flag and organisation memberships.
export function SessionProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, isAdmin: false, memberships: [] });

  const load = useCallback(async (user) => {
    if (!user) { setState({ loading: false, user: null, isAdmin: false, memberships: [] }); return; }
    const { data, error } = await supabase.rpc('my_context');
    setState({
      loading: false, user,
      isAdmin: !error && !!data?.is_platform_admin,
      memberships: (!error && data?.memberships) || [],
    });
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === 'SIGNED_IN' || evt === 'SIGNED_OUT' || evt === 'USER_UPDATED') load(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await load(data.user ?? null);
  }, [load]);

  return <SessionCtx.Provider value={{ ...state, refresh }}>{children}</SessionCtx.Provider>;
}

export const useSession = () => useContext(SessionCtx);

// Small data-loading hook: re-runs when deps change, exposes reload().
export function useLoad(fn, deps) {
  const [s, set] = useState({ loading: true, data: null, error: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    set((p) => ({ ...p, loading: true }));
    fn().then((data) => live && set({ loading: false, data, error: null }))
      .catch((error) => live && set({ loading: false, data: null, error }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...s, reload: () => setTick((t) => t + 1) };
}
