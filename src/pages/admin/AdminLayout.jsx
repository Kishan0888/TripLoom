import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { Icon, LogoMark, Loading } from '../../components/ui';
import { initials } from '../../lib/format';

export default function AdminLayout() {
  const { loading, isAdmin, user, memberships } = useSession();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (loading) return <Loading />;
  if (!isAdmin) return <Navigate to="/" replace />;
  const cls = ({ isActive }) => (isActive ? 'on' : '');
  return (
    <div className="app">
      <aside className="side" style={open ? { transform: 'none', boxShadow: 'var(--shadow)' } : undefined}>
        <div className="brandmark"><LogoMark /><div><b>TripLoom</b><small>Platform admin</small></div></div>
        <div className="opbox"><b>Admin console</b><span>Onboard and manage operators</span></div>
        <nav className="nav">
          <span className="lbl">Platform</span>
          <NavLink end to="/admin" className={cls} onClick={() => setOpen(false)}><Icon name="building" />Organisations</NavLink>
          <NavLink to="/admin/fx" className={cls} onClick={() => setOpen(false)}><Icon name="swap" />Reference FX rates</NavLink>
          {memberships.length > 0 && <><span className="lbl">My workspaces</span>
            {memberships.map((m) => <NavLink key={m.org_id} to={`/o/${m.slug}`}><Icon name="dash" />{m.name}</NavLink>)}</>}
        </nav>
        <div className="me">
          <span className="avatar">{initials(user?.user_metadata?.full_name || user?.email)}</span>
          <div style={{ minWidth: 0 }}><b style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</b><span>Platform admin</span></div>
          <button className="btn ghost sm" onClick={async () => { await supabase.auth.signOut(); nav('/login'); }}>Sign out</button>
        </div>
      </aside>
      {open && <div className="scrim" style={{ display: 'block' }} onClick={() => setOpen(false)} />}
      <main className="main">
        <div className="topbar"><button className="btn ghost sm" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button><b>Admin console</b></div>
        <div className="page"><Outlet /></div>
      </main>
    </div>
  );
}
