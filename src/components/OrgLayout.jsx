import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { NavLink, Outlet, useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useSession } from '../lib/session';
import { Icon, LogoMark, Loading } from './ui';
import { initials, ROLE_LBL } from '../lib/format';

const OrgCtx = createContext(null);
export const useOrg = () => useContext(OrgCtx);

const NAV = [
  ['', 'Dashboard', 'dash', 'Collect'], ['invoices', 'Invoices', 'inv'], ['customers', 'Customers', 'users'], ['payments', 'Payments', 'card'],
  ['reconciliation', 'Reconciliation', 'bank', 'Finance'], ['items', 'Services & items', 'box'],
];

// Workspace shell for one organisation. The org is resolved from the URL slug and
// the user's membership; row-level security in the database does the real enforcement.
export default function OrgLayout() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { user, memberships, isAdmin } = useSession();
  const membership = memberships.find((m) => m.slug === slug);
  const [org, setOrg] = useState(null);
  const [err, setErr] = useState(null);
  const [counts, setCounts] = useState({ overdue: 0, late: 0 });
  const [open, setOpen] = useState(false);

  const loadOrg = useCallback(async () => {
    const { data, error } = await supabase.from('organizations').select('*').eq('slug', slug).maybeSingle();
    if (error || !data) { setErr(error?.message || 'You do not have access to this workspace.'); return; }
    setOrg(data);
  }, [slug]);
  const loadCounts = useCallback(async () => {
    if (!org) return;
    const [a, b] = await Promise.all([
      supabase.from('invoice_summary').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('display_status', 'overdue'),
      supabase.from('payment_details').select('id', { count: 'exact', head: true }).eq('org_id', org.id).eq('settlement_status', 'late'),
    ]);
    setCounts({ overdue: a.count || 0, late: b.count || 0 });
  }, [org]);

  useEffect(() => { setOrg(null); setErr(null); loadOrg(); }, [loadOrg]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  if (err || (!membership && org === null && memberships.length && !isAdmin)) {
    return (
      <div className="co" style={{ justifyContent: 'center' }}>
        <div className="cocard"><div className="cobody" style={{ textAlign: 'center' }}>
          <h2>No access to this workspace</h2>
          <p className="sub">{err || 'Ask the organisation owner to add you.'}</p>
          <Link className="btn" to="/app">Go to my workspaces</Link>
        </div></div>
      </div>
    );
  }
  if (!org) return <Loading label="Opening workspace" />;
  if (!membership) {
    return <div className="co" style={{ justifyContent: 'center' }}><div className="cocard"><div className="cobody" style={{ textAlign: 'center' }}>
      <h2>{org.name}</h2><p className="sub">You can manage this organisation from the admin console, but its workspace is only open to its own team.</p>
      <Link className="btn primary" to={`/admin/orgs/${org.id}`}>Open in admin console</Link></div></div></div>;
  }

  const role = membership.role;
  const base = `/o/${slug}`;
  const name = user?.user_metadata?.full_name || user?.email;
  const signOut = async () => { await supabase.auth.signOut(); nav('/login'); };
  const link = ([to, label, icon]) => (
    <NavLink key={to} end={to === ''} to={to ? `${base}/${to}` : base} className={({ isActive }) => (isActive ? 'on' : '')} onClick={() => setOpen(false)}>
      <Icon name={icon} />{label}
      {to === 'invoices' && counts.overdue > 0 && <span className="count">{counts.overdue}</span>}
      {to === 'reconciliation' && counts.late > 0 && <span className="count">{counts.late}</span>}
    </NavLink>
  );

  return (
    <OrgCtx.Provider value={{ org, role, base, reloadOrg: loadOrg, refreshCounts: loadCounts, can: (r) => r.includes(role) }}>
      <div className={`app ${open ? 'nav-open' : ''}`}>
        <aside className="side" style={open ? { transform: 'none', boxShadow: 'var(--shadow)' } : undefined}>
          <div className="brandmark"><LogoMark /><div><b>TripLoom</b><small>Payments</small></div></div>
          <button className="opbox orgswitch" onClick={() => nav('/app')} title="Switch workspace">
            {org.logo_url && <img src={org.logo_url} alt="" style={{ maxHeight: 34, maxWidth: '100%', objectFit: 'contain', display: 'block', marginBottom: 6 }} />}
            <b>{org.name}</b><span>{ROLE_LBL[role]} · switch workspace</span>
          </button>
          <nav className="nav">
            <span className="lbl">Collect</span>{NAV.slice(0, 4).map(link)}
            <span className="lbl">Finance</span>{NAV.slice(4).map(link)}
            <NavLink to={`${base}/settings`} className={({ isActive }) => (isActive ? 'on' : '')} onClick={() => setOpen(false)}><Icon name="cog" />Settings</NavLink>
            {isAdmin && <NavLink to="/admin"><Icon name="building" />Admin console</NavLink>}
          </nav>
          <div className="me">
            <span className="avatar">{initials(name)}</span>
            <div style={{ minWidth: 0 }}><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</b><span>{ROLE_LBL[role]}</span></div>
            <button className="btn ghost sm" onClick={signOut}>Sign out</button>
          </div>
        </aside>
        {open && <div className="scrim" style={{ display: 'block' }} onClick={() => setOpen(false)} />}
        <main className="main">
          <div className="topbar">
            <button className="btn ghost sm" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
            <b>{org.name}</b>
            <Link className="btn primary sm" to={`${base}/invoices/new`}><Icon name="plus" />Invoice</Link>
          </div>
          <div className="page"><Outlet /></div>
        </main>
      </div>
    </OrgCtx.Provider>
  );
}
