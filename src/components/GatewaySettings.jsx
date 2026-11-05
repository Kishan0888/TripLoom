import { useState } from 'react';
import { supabase, must } from '../lib/supabase';
import { useLoad } from '../lib/session';
import { useOrg } from './OrgLayout';
import { Loading, Field, Pill, Modal, Icon, useToast, copyText } from './ui';
import { PROVIDERS, PROVIDER_ORDER, GatewayMark } from '../lib/gateways';
import { CURRENCIES, fd } from '../lib/format';

export default function GatewaySettings() {
  const { org, role, reloadOrg } = useOrg();
  const toast = useToast();
  const owner = role === 'owner';
  const { data: list, loading, reload } = useLoad(async () => must(await supabase.rpc('list_gateways', { p_org: org.id })), [org.id]);
  const [edit, setEdit] = useState(null); // { provider, existing? }
  const [removing, setRemoving] = useState(null);
  if (loading && !list) return <Loading />;
  const enabled = list.filter((g) => g.enabled);
  const covered = new Set(enabled.flatMap((g) => g.currencies));

  async function setMode(mode) {
    if (mode === 'live' && enabled.length === 0) { toast('Connect and enable at least one gateway before going live.'); return; }
    const { error } = await supabase.from('organizations').update({ payment_mode: mode }).eq('id', org.id);
    toast(error ? error.message : mode === 'live' ? 'Live payments are on' : 'Demo mode is on'); reloadOrg();
  }
  async function toggle(g) {
    const { error } = await supabase.rpc('save_gateway', { p_org: org.id, p_id: g.id, p_provider: g.provider, p_label: g.label, p_env: g.environment,
      p_public: g.public_config, p_secret: {}, p_currencies: g.currencies, p_fee_pct: g.fee_pct, p_enabled: !g.enabled });
    toast(error ? error.message : g.enabled ? `${g.label} turned off` : `${g.label} turned on`); reload();
  }
  async function remove() {
    const { error } = await supabase.rpc('delete_gateway', { p_org: org.id, p_id: removing.id });
    toast(error ? error.message : `${removing.label} removed`); setRemoving(null); reload();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {!owner && <div className="alert info">Only the organisation owner can change payment settings.</div>}

      <div>
        <h3 style={{ marginBottom: 10 }}>Payment mode</h3>
        <div className="grid2e" style={{ gap: 10 }}>
          {[['demo', 'Demo', 'The payment page completes payments without charging anyone. Use it to show the product.'],
            ['live', 'Live', 'Customers pay through your connected gateways. Money settles to your bank.']].map(([k, t, d]) => (
            <label key={k} className={`opt ${org.payment_mode === k ? 'on' : ''}`} style={{ alignItems: 'flex-start', cursor: owner ? 'pointer' : 'default' }}>
              <input type="radio" name="pmode" id={`pmode-${k}`} checked={org.payment_mode === k} disabled={!owner} onChange={() => setMode(k)} style={{ marginTop: 3 }} />
              <div className="grow"><b>{t}</b><div className="muted" style={{ fontSize: 12.5 }}>{d}</div></div>
            </label>
          ))}
        </div>
        {org.payment_mode === 'live' && CURRENCIES.some((c) => !covered.has(c)) && (
          <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>Invoices in {CURRENCIES.filter((c) => !covered.has(c)).join(', ')} have no online payment option yet. Customers can still pay you directly and you can record it on the invoice.</p>
        )}
      </div>

      <div>
        <div className="card-h" style={{ marginBottom: 10 }}><div><h3>Connected gateways</h3><p>For each invoice, the payment page offers every enabled gateway that accepts its currency.</p></div></div>
        {list.length === 0 ? <div className="empty" style={{ border: '1px dashed var(--line)', borderRadius: 12 }}>No gateways connected yet. Choose one below.</div> : (
          <div className="rowlist" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '0 16px' }}>
            {list.map((g) => (
              <div className="r" key={g.id} style={{ flexWrap: 'wrap' }}>
                <GatewayMark provider={g.provider} size={38} />
                <div className="grow" style={{ minWidth: 160 }}><b>{g.label}</b><span>{PROVIDERS[g.provider]?.name} · {g.currencies.join(', ')} · updated {fd(g.updated_at)}</span></div>
                <Pill kind={g.environment === 'live' ? 'ok' : 'info'}>{g.environment === 'live' ? 'Live' : 'Test'}</Pill>
                <Pill kind={g.enabled ? 'sent' : ''}>{g.enabled ? 'On' : 'Off'}</Pill>
                {owner && <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn sm ghost" onClick={() => toggle(g)}>{g.enabled ? 'Turn off' : 'Turn on'}</button>
                  <button className="btn sm" onClick={() => setEdit({ provider: g.provider, existing: g })}>Edit</button>
                  <button className="btn sm ghost danger" onClick={() => setRemoving(g)}>Remove</button>
                </div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {owner && (
        <div>
          <h3 style={{ marginBottom: 10 }}>Add a gateway</h3>
          <div className="orgcards" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
            {PROVIDER_ORDER.map((p) => (
              <button key={p} className="orgcard" onClick={() => setEdit({ provider: p })}>
                <div className="top"><GatewayMark provider={p} size={36} /><b>{PROVIDERS[p].name}</b></div>
                <span className="muted" style={{ fontSize: 12.5 }}>{PROVIDERS[p].blurb}</span>
                <span className="mono muted" style={{ fontSize: 11.5 }}>{PROVIDERS[p].currencies.join(' · ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {edit && <GatewayModal provider={edit.provider} existing={edit.existing} onClose={() => setEdit(null)} onSaved={(msg) => { setEdit(null); toast(msg); reload(); }} />}
      {removing && <Modal title={`Remove ${removing.label}?`} onClose={() => setRemoving(null)}
        footer={<><button className="btn ghost" onClick={() => setRemoving(null)}>Cancel</button><button className="btn primary" onClick={remove}>Remove</button></>}>
        <p>Its keys are deleted and it disappears from your payment pages. Past payments stay in your records.</p></Modal>}
    </div>
  );
}

function GatewayModal({ provider, existing, onClose, onSaved }) {
  const { org } = useOrg();
  const toast = useToast();
  const P = PROVIDERS[provider];
  const [f, setF] = useState(() => ({
    label: existing?.label ?? P.name,
    environment: existing?.environment ?? 'test',
    values: { ...(existing?.public_config || {}) },
    currencies: existing?.currencies ?? P.currencies,
    fee_pct: existing?.fee_pct ?? P.fee,
    enabled: existing?.enabled ?? true,
  }));
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null);
  const saved = new Set(existing?.secrets_set || []);
  const setVal = (k, v) => setF((p) => ({ ...p, values: { ...p.values, [k]: v } }));

  async function showSecret() {
    const { data, error } = await supabase.rpc('get_custom_webhook_secret', { p_org: org.id, p_id: existing.id });
    if (error) toast(error.message); else setSecret(data);
  }

  async function save() {
    const e = [];
    for (const fl of P.fields) {
      const v = String(f.values[fl.k] ?? '').trim();
      const needed = fl.required && !(fl.secret && saved.has(fl.k));
      if (needed && !v) e.push(`Enter the ${fl.label.toLowerCase()}.`);
      else if (v && fl.pattern && !fl.pattern.test(v)) e.push(fl.patternMsg);
    }
    const kid = String(f.values.key_id ?? ''), sk = String(f.values.secret_key ?? '');
    if (provider === 'razorpay' && kid && !kid.startsWith(f.environment === 'live' ? 'rzp_live_' : 'rzp_test_')) e.push(`In ${f.environment === 'live' ? 'Live' : 'Test'} mode the Razorpay key ID starts with ${f.environment === 'live' ? 'rzp_live_' : 'rzp_test_'}.`);
    if (provider === 'stripe' && sk && !sk.startsWith(f.environment === 'live' ? 'sk_live_' : 'sk_test_')) e.push(`In ${f.environment === 'live' ? 'Live' : 'Test'} mode the Stripe secret key starts with ${f.environment === 'live' ? 'sk_live_' : 'sk_test_'}.`);
    if (f.currencies.length === 0) e.push('Pick at least one currency.');
    if (e.length) { setErr(e); return; }
    setBusy(true);
    const pub = {}, sec = {};
    P.fields.forEach((fl) => { const v = String(f.values[fl.k] ?? '').trim(); (fl.secret ? sec : pub)[fl.k] = v; });
    const { error } = await supabase.rpc('save_gateway', { p_org: org.id, p_id: existing?.id ?? null, p_provider: provider, p_label: f.label.trim() || P.name,
      p_env: f.environment, p_public: pub, p_secret: sec, p_currencies: f.currencies, p_fee_pct: f.fee_pct === '' ? null : Number(f.fee_pct), p_enabled: f.enabled });
    setBusy(false);
    if (error) { setErr([error.message]); return; }
    onSaved(existing ? `${f.label} updated` : `${f.label} connected`);
  }

  return (
    <Modal wide title={`${existing ? 'Edit' : 'Connect'} ${P.name}`} sub={P.blurb} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : existing ? 'Save changes' : 'Connect'}</button></>}>
      <div className="alert info"><b>Where to find these:</b> {P.where}</div>
      <div className="fgrid">
        <Field label="Name shown to customers" id="gw-label" hint="e.g. Cards & UPI (Razorpay)"><input className="in" id="gw-label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field>
        <Field label="Environment" id="gw-env" hint={P.envNote}><select className="in" id="gw-env" value={f.environment} onChange={(e) => setF({ ...f, environment: e.target.value })}><option value="test">Test (sandbox)</option><option value="live">Live</option></select></Field>
        {P.fields.map((fl) => (
          <Field key={fl.k} label={`${fl.label}${fl.required ? '' : ' (optional)'}`} id={`gw-${fl.k}`} span={fl.k === 'payment_url'}
            hint={fl.secret && saved.has(fl.k) ? 'Saved. Leave blank to keep the current value.' : fl.hint}>
            <input className="in mono" id={`gw-${fl.k}`} type={fl.secret ? 'password' : 'text'} autoComplete="off" value={f.values[fl.k] ?? ''}
              placeholder={fl.secret && saved.has(fl.k) ? '•••••••••••• saved' : fl.ph || ''} onChange={(e) => setVal(fl.k, e.target.value)} />
          </Field>
        ))}
        {P.urls.map((u) => (
          <Field key={u.label} label={u.label} id={`gw-url-${u.label}`} span hint="Paste this into your gateway dashboard.">
            <div className="copyrow"><input className="in" id={`gw-url-${u.label}`} readOnly value={u.value} /><button type="button" className="btn" onClick={() => copyText(u.value, toast)}>Copy</button></div>
          </Field>
        ))}
        {provider === 'custom' && (
          <Field label="Webhook signing secret" id="gw-whsec" span hint={'Your provider sends POST JSON {"reference","status":"success","amount","transaction_id","method"} with header X-TravoCloud-Signature = HMAC-SHA256 of the body using this secret.'}>
            {existing ? (secret ? <div className="copyrow"><input className="in mono" id="gw-whsec" readOnly value={secret} /><button type="button" className="btn" onClick={() => copyText(secret, toast)}>Copy</button></div>
              : <button type="button" className="btn sm" onClick={showSecret}>Show secret</button>) : <span className="muted" style={{ fontSize: 13 }}>Generated when you connect.</span>}
          </Field>
        )}
        <Field label="Currencies to accept through this gateway" id="gw-cur" span>
          <div className="curgrid">{CURRENCIES.map((c) => (
            <label key={c} className="check"><input type="checkbox" id={`gwc-${c}`} checked={f.currencies.includes(c)}
              onChange={(e) => setF({ ...f, currencies: e.target.checked ? [...f.currencies, c] : f.currencies.filter((x) => x !== c) })} />{c}</label>))}</div>
        </Field>
        <Field label="Fee (%)" id="gw-fee" hint="Used to estimate your net payout. GST is added on top."><input className="in num" id="gw-fee" type="number" step="0.01" min="0" value={f.fee_pct ?? ''} onChange={(e) => setF({ ...f, fee_pct: e.target.value })} /></Field>
        <Field label="Status" id="gw-on"><label className="check" style={{ height: 38 }}><input type="checkbox" id="gw-on" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />Offer this gateway on payment pages</label></Field>
      </div>
      {err && <div className="alert bad">{err.map((x) => <div key={x}>{x}</div>)}</div>}
      <p className="muted" style={{ fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="lock" size={14} />Secret keys are stored on the server and are never shown in the browser again.</p>
    </Modal>
  );
}
