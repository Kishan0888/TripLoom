import { useState } from 'react';
import { supabase, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { useOrg } from '../../components/OrgLayout';
import { Loading, ErrorBox, Icon, Pill, Modal, Field, Empty, useToast } from '../../components/ui';
import { money, CURRENCIES } from '../../lib/format';

export default function Items() {
  const { org, can } = useOrg();
  const toast = useToast();
  const [cat, setCat] = useState('All');
  const [edit, setEdit] = useState(null);
  const { data, loading, error, reload } = useLoad(async () => must(await supabase.from('items').select('*').eq('org_id', org.id).order('category').order('name')), [org.id]);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const cats = ['All', ...new Set(data.map((x) => x.category))];
  const list = data.filter((x) => cat === 'All' || x.category === cat);
  const canWrite = can(['owner', 'accounts']);
  async function toggle(x) {
    const { error: e } = await supabase.from('items').update({ active: !x.active }).eq('id', x.id);
    if (e) toast(e.message); else reload();
  }
  return (
    <>
      <div className="pagehead"><div><h1>Services &amp; items</h1><p className="sub">Your catalogue of packages and add-ons. Pick from it when building an invoice.</p></div>
        {canWrite && <div className="actions"><button className="btn primary" onClick={() => setEdit({})}><Icon name="plus" />Add item</button></div>}</div>
      <section className="card">
        <div className="toolbar"><div className="chips">{cats.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}<span>{c === 'All' ? data.length : data.filter((x) => x.category === c).length}</span></button>)}</div></div>
        {list.length === 0 ? <Empty>No items yet. Add your packages and add-ons.</Empty> : (
          <div className="tw"><table className="t"><thead><tr><th>Item</th><th>Category</th><th>Unit</th><th className="right">Default price</th><th>Status</th><th /></tr></thead><tbody>
            {list.map((x) => (
              <tr key={x.id}><td><b>{x.name}</b></td><td>{x.category}</td><td className="sub">{x.unit}</td><td className="right num">{money(x.price, x.currency)}</td>
                <td>{x.active ? <Pill kind="ok">Active</Pill> : <Pill>Hidden</Pill>}</td>
                <td className="right" style={{ whiteSpace: 'nowrap' }}>{canWrite && <><button className="btn sm ghost" onClick={() => setEdit(x)}>Edit</button> <button className="btn sm ghost" onClick={() => toggle(x)}>{x.active ? 'Hide' : 'Show'}</button></>}</td></tr>
            ))}
          </tbody></table></div>
        )}
      </section>
      {edit && <ItemModal item={edit.id ? edit : null} cats={cats.slice(1)} onClose={() => setEdit(null)} onSaved={(n) => { setEdit(null); toast(n); reload(); }} />}
    </>
  );
}

function ItemModal({ item, cats, onClose, onSaved }) {
  const { org } = useOrg();
  const [f, setF] = useState(item || { name: '', category: cats[0] || 'Tour packages', unit: 'per person', price: '', currency: 'USD' });
  const [err, setErr] = useState(null);
  async function save() {
    if (!f.name.trim() || !(Number(f.price) > 0)) { setErr('Enter a name and a price above zero.'); return; }
    const row = { name: f.name.trim(), category: f.category.trim() || 'General', unit: f.unit.trim() || 'each', price: Number(f.price), currency: f.currency };
    const { error } = item ? await supabase.from('items').update(row).eq('id', item.id) : await supabase.from('items').insert({ ...row, org_id: org.id });
    if (error) setErr(error.message); else onSaved(item ? 'Item updated' : `${row.name} added`);
  }
  return (
    <Modal title={item ? 'Edit item' : 'Add item'} onClose={onClose} footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>{item ? 'Save' : 'Add item'}</button></>}>
      <Field label="Item name" id="ni-name"><input className="in" id="ni-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <div className="fgrid">
        <Field label="Category" id="ni-cat" hint="Pick one or type a new category."><input className="in" id="ni-cat" list="ni-cats" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /><datalist id="ni-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></Field>
        <Field label="Unit" id="ni-unit"><input className="in" id="ni-unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
        <Field label="Default price" id="ni-price"><input className="in num" id="ni-price" type="number" min="0" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
        <Field label="Currency" id="ni-cur"><select className="in" id="ni-cur" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      {err && <div className="alert bad">{err}</div>}
    </Modal>
  );
}
