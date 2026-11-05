import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { LogoMark, Icon } from '../components/ui';
import { ROLE_LBL, initials } from '../lib/format';

export default function ChooseOrg() {
  const { user, isAdmin, memberships } = useSession();
  const nav = useNavigate();
  return (
    <div className="co" style={{ paddingTop: 48 }}>
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="brandmark" style={{ padding: 0 }}><LogoMark /><div><b>TravoCloud</b><small>Payments</small></div></div>
        <div><h1 style={{ fontSize: 24 }}>Choose a workspace</h1><p className="sub">Signed in as {user?.email}</p></div>
        <div className="card" style={{ padding: 0 }}>
          <div className="rowlist">
            {isAdmin && (
              <Link to="/admin" className="r" style={{ padding: '14px 18px', textDecoration: 'none', color: 'inherit' }}>
                <span className="avatar" style={{ background: 'var(--thread-soft)', color: 'var(--thread)' }}><Icon name="building" size={16} /></span>
                <div className="grow"><b>Platform admin console</b><span>Onboard and manage organisations</span></div>
                <span className="admin-badge">Admin</span>
              </Link>
            )}
            {memberships.map((m) => (
              <Link key={m.org_id} to={`/o/${m.slug}`} className="r" style={{ padding: '14px 18px', textDecoration: 'none', color: 'inherit' }}>
                <span className="avatar" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>{initials(m.name)}</span>
                <div className="grow"><b>{m.name}</b><span>{window.location.host}/o/{m.slug}</span></div>
                <span className="pill">{ROLE_LBL[m.role]}</span>
              </Link>
            ))}
            {!isAdmin && memberships.length === 0 && <div className="empty">Your account isn’t part of any organisation yet. Ask your TravoCloud administrator to add you.</div>}
          </div>
        </div>
        <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={async () => { await supabase.auth.signOut(); nav('/login'); }}>Sign out</button>
      </div>
    </div>
  );
}
