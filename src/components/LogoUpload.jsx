import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { initials } from '../lib/format';

// Shows the organisation logo, or initials when there is none.
export function OrgLogo({ org, size = 46, radius = 12 }) {
  if (org?.logo_url) {
    return <img src={org.logo_url} alt={org.name} style={{ height: size, maxWidth: size * 3.2, objectFit: 'contain', borderRadius: 6, display: 'block' }} />;
  }
  return <span className="oplogo" style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.34 }}>{initials(org?.name || '')}</span>;
}

// Upload / replace / remove the logo. Files go to the public org-logos bucket under the org's id.
export default function LogoUpload({ org, canEdit, onChange, toast }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  async function pick(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) { toast('Use a PNG, JPG, WebP or SVG image.'); return; }
    if (file.size > 1024 * 1024) { toast('The logo must be under 1 MB.'); return; }
    setBusy(true);
    const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `${org.id}/logo-${Date.now()}.${ext}`;
    const up = await supabase.storage.from('org-logos').upload(path, file, { contentType: file.type, upsert: true });
    if (up.error) { setBusy(false); toast(up.error.message); return; }
    const url = supabase.storage.from('org-logos').getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from('organizations').update({ logo_url: url }).eq('id', org.id);
    setBusy(false);
    if (error) { toast(error.message); return; }
    toast('Logo updated'); onChange?.(url);
  }
  async function remove() {
    const { error } = await supabase.from('organizations').update({ logo_url: null }).eq('id', org.id);
    if (error) toast(error.message); else { toast('Logo removed'); onChange?.(null); }
  }
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 72, minHeight: 72, padding: 10, border: '1px dashed var(--line)', borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--surface-2)' }}>
        <OrgLogo org={org} size={52} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="muted" style={{ fontSize: 12.5 }}>Shown on invoices and the payment page your customers see. PNG, JPG, WebP or SVG, under 1 MB. A wide logo on a transparent background works best.</span>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Uploading…' : org.logo_url ? 'Replace logo' : 'Upload logo'}</button>
            {org.logo_url && <button type="button" className="btn sm ghost" onClick={remove}>Remove</button>}
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={pick} id={`logo-${org.id}`} />
          </div>
        )}
      </div>
    </div>
  );
}
