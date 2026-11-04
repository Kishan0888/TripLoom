import { useState, useEffect } from 'react';
import { supabase, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { Loading, ErrorBox, useToast } from '../../components/ui';
import { fd } from '../../lib/format';

export default function AdminFx() {
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(async () => must(await supabase.from('fx_rates').select('*').order('currency')), []);
  const [rates, setRates] = useState({});
  useEffect(() => { if (data) setRates(Object.fromEntries(data.map((r) => [r.currency, r.rate_to_inr]))); }, [data]);
  async function save() {
    const rows = Object.entries(rates).filter(([c]) => c !== 'INR').map(([currency, v]) => ({ currency, rate_to_inr: Number(v), updated_at: new Date().toISOString() }));
    if (rows.some((r) => !(r.rate_to_inr > 0))) { toast('Every rate must be above zero.'); return; }
    const { error: e } = await supabase.from('fx_rates').upsert(rows);
    if (e) toast(e.message); else { toast('Rates saved'); reload(); }
  }
  if (loading) return <Loading />;
  return (
    <>
      <div className="pagehead"><div><span className="admin-badge">Platform admin</span><h1 style={{ marginTop: 6 }}>Reference FX rates</h1>
        <p className="sub">Used to estimate the INR value of foreign-currency payments until the actual settlement is reconciled.</p></div>
        <div className="actions"><button className="btn primary" onClick={save}>Save rates</button></div></div>
      <ErrorBox error={error} onRetry={reload} />
      <section className="card" style={{ maxWidth: 560 }}>
        <div className="tw"><table className="t"><thead><tr><th>Currency</th><th>INR per unit</th><th>Last updated</th></tr></thead><tbody>
          {(data || []).filter((r) => r.currency !== 'INR').map((r) => (
            <tr key={r.currency}><td className="mono"><b>{r.currency}</b></td>
              <td><input className="in sm num" id={`fx-${r.currency}`} type="number" step="0.0001" min="0" style={{ maxWidth: 140 }} value={rates[r.currency] ?? ''} onChange={(e) => setRates({ ...rates, [r.currency]: e.target.value })} /></td>
              <td className="muted">{fd(r.updated_at)}</td></tr>
          ))}
        </tbody></table></div>
      </section>
    </>
  );
}
