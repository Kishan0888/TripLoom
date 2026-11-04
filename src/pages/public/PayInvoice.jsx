import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { Loading } from '../../components/ui';
import InvoiceDocument, { PrintFrame } from '../../components/InvoiceDocument';
import { payLink } from '../../lib/format';

// Traveller view of the A4 invoice: /p/:token/invoice
export default function PayInvoice() {
  const { token } = useParams();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { data, loading } = useLoad(async () => {
    const { data: d, error } = await supabase.rpc('get_public_invoice', { p_token: token });
    if (error) throw error; return d;
  }, [token]);
  if (loading && !data) return <Loading label="Preparing invoice" />;
  if (!data) return <div className="co" style={{ justifyContent: 'center' }}><div className="cocard"><div className="cobody" style={{ textAlign: 'center' }}><h2>This invoice isn’t available</h2><p className="sub">The link may have been cancelled. Please contact the tour operator.</p></div></div></div>;
  return (
    <PrintFrame title={`Invoice ${data.invoice.number}`.replace(/\//g, '-')} autoPrint={sp.get('print') === '1'} onBack={() => nav(`/p/${token}`)}>
      <div className="print-scroll">
        <InvoiceDocument org={data.org} inv={data.invoice} customer={data.customer || { name: data.invoice.customer_name, email: data.invoice.customer_email }}
          lines={data.lines} instalments={data.instalments} payments={data.payments || []} payUrl={payLink(token)} />
      </div>
    </PrintFrame>
  );
}
