import { Spark, I } from './SiteLayout';

// Illustrated product panels built in HTML (sample data for a fictional operator), so they stay sharp and light.
const Bar = ({ title }) => <div className="mock-bar"><i /><i /><i /><span>{title}</span></div>;

export function HeroVisual() {
  return (
    <div className="laptop" style={{ paddingBottom: 30 }}>
      <div className="mock">
        <Bar title="app.triploom.in / home" />
        <div className="mock-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontFamily: 'var(--f-display)', fontSize: 15 }}>Good morning, Rahul</b><span className="mpill t">12 departures this week</span></div>
          <div className="mkpi"><div><small>New enquiries</small><b>38</b></div><div><small>Quotes sent</small><b>21</b></div><div><small>Collected</small><b>₹26.4L</b></div></div>
          <div className="mbars">{[42, 58, 36, 70, 54, 82, 64, 90].map((h, k) => <span key={k} className={k === 7 ? 'o' : ''} style={{ height: `${h}%` }} />)}</div>
          <div className="mrow"><span className="mpill o">WhatsApp</span><b>Emma Lawson</b><span className="muted">Golden Triangle · 2 pax · Dec</span><span className="r"><Spark /></span></div>
          <div className="mrow"><span className="mpill">Email</span><b>Wanderlust LLC</b><span className="muted">Group of 12 · Jan</span><span className="r mpill t">Quoted</span></div>
          <div className="mrow"><span className="mpill">Instagram</span><b>Aarav Kapoor</b><span className="muted">Kerala family trip</span><span className="r mpill ink">Booked</span></div>
        </div>
      </div>
      <div className="phone">
        <div className="mock">
          <div className="mock-body" style={{ gap: 8, padding: 12 }}>
            <b style={{ fontFamily: 'var(--f-display)', fontSize: 13 }}>Quote · Rajasthan 10N</b>
            {['Day 1 · Delhi arrival', 'Day 3 · Agra sunrise', 'Day 5 · Jaipur forts', 'Day 8 · Udaipur lakes'].map((d) => <div key={d} className="mrow" style={{ padding: '6px 8px', fontSize: 11 }}>{d}</div>)}
            <div className="mrow" style={{ background: '#0F2A33', color: '#fff', borderColor: '#0F2A33', padding: '8px' }}><span style={{ fontSize: 11 }}>Total · 2 pax</span><b className="r" style={{ fontSize: 13 }}>$4,950</b></div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 10.5, color: '#1f7d72' }}><Spark />Margin 18% · all checks passed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModuleVisual({ kind }) {
  const V = {
    crm: (
      <><Bar title="Enquiries · board" /><div className="mock-body">
        <div className="mcols">
          {[['New', [['Emma L.', 'WhatsApp · Dec'], ['Liam O.', 'Website · Jun']]], ['Quoted', [['Wanderlust', 'Group 12 · Jan'], ['Sophie M.', 'Kerala · Dec']]], ['Won', [['Aarav K.', 'Kerala · ₹1.4L']]]].map(([h, cs]) => (
            <div className="mcol" key={h}><h5>{h}</h5>{cs.map(([a, b]) => <div className="mcard" key={a}><b>{a}</b><span className="muted" style={{ fontSize: 11 }}>{b}</span></div>)}</div>))}
        </div>
        <div className="mrow" style={{ borderColor: '#2A9D8F', background: '#f2faf8' }}><Spark /><span><b>Extract details:</b> 2 adults · 2–9 Dec · Delhi, Agra, Jaipur · budget £3,000</span></div>
      </div></>),
    quote: (
      <><Bar title="Quote studio · v2" /><div className="mock-body">
        {[['Day 1', 'Delhi · Taj Palace (Deluxe, CP)', '$310'], ['Day 2', 'Agra · Sunrise guide + car', '$185'], ['Day 3', 'Jaipur · Amber Fort entry', '$96']].map(([a, b, c]) => <div className="mrow" key={a}><span className="mpill">{a}</span><span>{b}</span><span className="r">{c}</span></div>)}
        <div style={{ border: '1px dashed #2A9D8F', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 6, background: '#f2faf8' }}>
          <b style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#1f7d72' }}><Spark />AI checks</b>
          <span>⚠ Taj Mahal is closed on Fridays: Day 2 is a Friday</span><span>✓ Guide Ravi is free · ✓ Vehicle fits 4 pax · ✓ Margin 19%</span>
        </div>
      </div></>),
    rates: (
      <><Bar title="Hotels · Taj Palace · Rooms & rates" /><div className="mock-body">
        <div className="mrow" style={{ background: '#faf8f3', fontWeight: 600 }}><span style={{ flex: 1 }}>Room / season</span><span style={{ width: 70, textAlign: 'right' }}>Peak</span><span style={{ width: 70, textAlign: 'right' }}>Shoulder</span><span style={{ width: 70, textAlign: 'right' }}>Off</span></div>
        {[['Deluxe · CP', '₹14,500', '₹11,200', '₹8,900'], ['Premier · MAP', '₹18,900', '₹15,400', '₹12,100'], ['Suite · AP', '₹32,000', '₹27,500', '₹22,000']].map((r) => <div className="mrow" key={r[0]}><span style={{ flex: 1 }}>{r[0]}</span>{r.slice(1).map((x, k) => <span key={k} style={{ width: 70, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{x}</span>)}</div>)}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className="mpill o">Gala dinner 31 Dec +₹6,500</span><span className="mpill">Weekend +12%</span><span className="mpill">Cancel 30 days: 50%</span></div>
      </div></>),
    partners: (
      <><Bar title="Partners · Desert Trails Jodhpur" /><div className="mock-body">
        {[['Jeep safari, sunset', '₹4,200 / jeep', 'Min 2 pax'], ['Camel ride', '₹900 / pax', 'Oct–Mar'], ['Folk evening', '₹18,000 / group', 'Up to 20']].map(([a, b, c]) => <div className="mrow" key={a}><b>{a}</b><span className="muted">{c}</span><span className="r">{b}</span></div>)}
        <div className="mrow" style={{ borderColor: '#F2994A', background: '#fff8f0' }}><I n="bell" size={14} /><span>Contract renews on 31 Mar · 2 months left</span></div>
      </div></>),
    bookings: (
      <><Bar title="Bookings desk · HT-0139" /><div className="mock-body">
        {[['Taj Palace, Delhi', 't', 'Confirmed · #TP4471'], ['Oberoi Amarvilas', 't', 'Confirmed · #OA2290'], ['Rambagh Palace', 'o', 'Awaiting reply'], ['Car & driver, 8 days', 't', 'Confirmed']].map(([a, k, s]) => <div className="mrow" key={a}><b>{a}</b><span className={`r mpill ${k}`}>{s}</span></div>)}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#1f7d72', fontSize: 11.5 }}><Spark />Pasted supplier reply → status and confirmation no. updated</div>
      </div></>),
    dispatch: (
      <><Bar title="Guide calendar · December" /><div className="mock-body">
        <div style={{ display: 'grid', gridTemplateColumns: '70px repeat(7,1fr)', gap: 4, fontSize: 10.5 }}>
          <span />{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, k) => <b key={k} style={{ textAlign: 'center' }}>{d}</b>)}
          {[['Ravi', [1, 1, 0, 2, 2, 0, 0]], ['Meena', [0, 1, 1, 1, 0, 3, 3]], ['Arjun', [2, 2, 2, 0, 1, 1, 0]]].map(([n, d]) => [<b key={n}>{n}</b>, ...d.map((v, k) => <span key={n + k} style={{ height: 22, borderRadius: 5, background: ['#f3f0e8', '#D8EFEB', '#0F2A33', '#FCE8D5'][v] }} />)])}
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 10.5 }} className="muted"><span>■ on tour</span><span style={{ color: '#a65812' }}>■ leave</span><span>Duty slips sent on WhatsApp</span></div>
      </div></>),
    finance: (
      <><Bar title="Finance · Receivables" /><div className="mock-body">
        <div className="mkpi"><div><small>Outstanding</small><b>₹18.2L</b></div><div><small>Overdue</small><b style={{ color: '#c0522a' }}>₹2.1L</b></div><div><small>This month</small><b>₹26.4L</b></div></div>
        {[['0–30 days', 72, '₹12.4L'], ['31–60 days', 28, '₹3.7L'], ['60+ days', 14, '₹2.1L']].map(([a, w, v]) => <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 70 }}>{a}</span><span style={{ flex: 1, height: 10, background: '#f3f0e8', borderRadius: 6 }}><span style={{ display: 'block', width: `${w}%`, height: '100%', borderRadius: 6, background: a.startsWith('60') ? '#F2994A' : '#2A9D8F' }} /></span><b style={{ width: 54, textAlign: 'right' }}>{v}</b></div>)}
      </div></>),
    marketing: (
      <><Bar title="Marketing hub" /><div className="mock-body">
        {[['Winter in Rajasthan', 'Email · 2,140 sent', '38% opened'], ['Kerala monsoon offer', 'WhatsApp · 860 sent', '61% read'], ['Ladakh 2027 dates', 'Instagram · scheduled', 'Fri 7:00 pm']].map(([a, b, c]) => <div className="mrow" key={a}><div style={{ display: 'flex', flexDirection: 'column' }}><b>{a}</b><span className="muted" style={{ fontSize: 11 }}>{b}</span></div><span className="r mpill t">{c}</span></div>)}
      </div></>),
  };
  return <div className="mock">{V[kind]}</div>;
}

export function PaymentsVisual() {
  return (
    <div className="laptop" style={{ paddingBottom: 34 }}>
      <div className="mock">
        <Bar title="payments.triploom.in / invoices / HT-26-27-0139" />
        <div className="mock-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><b style={{ fontFamily: 'var(--f-display)', fontSize: 15 }}>Wanderlust Collective</b><div className="muted" style={{ fontSize: 11.5 }}>Golden Triangle group · 12 pax</div></div><span className="mpill t">Partially paid</span>
          </div>
          <div className="mkpi"><div><small>Total</small><b>$17,160</b></div><div><small>Collected</small><b style={{ color: '#1f7d72' }}>$3,432</b></div><div><small>Balance</small><b>$13,728</b></div></div>
          {[['p', 'Booking deposit · 20%', '20 Oct', '$3,432', 'Paid'], ['n', 'Second instalment · 40%', '15 Nov', '$6,864', 'Next'], ['', 'Final balance · 40%', '10 Dec', '$6,864', 'Upcoming']].map(([k, a, d, v, s]) => (
            <div className="mk-krow" key={a}><span className={`mk-knot ${k}`} /><div style={{ flex: 1 }}><b>{a}</b><div className="muted" style={{ fontSize: 11 }}>Due {d}</div></div><b style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</b><span className={`mpill ${k === 'p' ? 't' : k === 'n' ? 'o' : ''}`}>{s}</span></div>))}
          <div className="mrow"><I n="link" size={14} /><span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>payments.triploom.in/p/4f9a2c…</span><span className="r mpill ink">Copy link</span></div>
        </div>
      </div>
      <div className="phone">
        <div className="mock"><div className="mock-body" style={{ gap: 8, padding: 12 }}>
          <span className="muted" style={{ fontSize: 10.5 }}>Himalayan Trails · Invoice 0139</span>
          <span style={{ fontSize: 10.5 }}>You’re paying</span>
          <b style={{ fontFamily: 'var(--f-display)', fontSize: 22, lineHeight: 1 }}>$6,864.00</b>
          <div className="mrow" style={{ padding: '6px 8px', fontSize: 10.5, borderColor: '#0F2A33' }}>● Second instalment</div>
          <div className="mrow" style={{ padding: '6px 8px', fontSize: 10.5 }}>○ Full balance</div>
          <div style={{ background: '#F2994A', borderRadius: 999, textAlign: 'center', padding: '8px 0', fontWeight: 700, fontSize: 11 }}>Pay securely</div>
        </div></div>
      </div>
    </div>
  );
}

export function ReconVisual() {
  return (
    <div className="mock">
      <Bar title="Reconciliation" />
      <div className="mock-body">
        {[['Razorpay · Visa ••4821', '₹1,04,102', 'Matched', 't'], ['CCAvenue · Amex ••3005', '₹2,92,140', '₹12.40 bank charge', 'o'], ['PayPal · John W.', '₹38,610', 'Credit due 7 Nov', '']].map(([a, b, c, k]) => <div className="mrow" key={a}><div style={{ display: 'flex', flexDirection: 'column' }}><b>{a}</b><span className="muted" style={{ fontSize: 11 }}>UTR logged · T+3</span></div><span className="r">{b}</span><span className={`mpill ${k}`}>{c}</span></div>)}
      </div>
    </div>
  );
}
