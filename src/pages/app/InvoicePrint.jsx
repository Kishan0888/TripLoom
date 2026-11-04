import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, must } from '../../lib/supabase';
import { useLoad } from '../../lib/session';
import { Loading, ErrorBox } from '../../components/ui';
import InvoiceDocument, { PrintFrame } from '../../components/InvoiceDocument';
import { payLink } from '../../lib/format';

// Team view of the A4 invoice: /o/:slug/invoices/:id/print
export default function InvoicePrint() {
  const { slug, id } = useParams();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { data, loading, error, reload } = useLoad(async () => {
    const [org, inv, inst, lines, pays, cust] = await Promise.all([
      supabase.from('organizations').select('*').eq('slug', slug).single(),
      supabase.from('invoice_summary').select('*').eq('id', id).single(),
      supabase.from('instalment_status').select('*').eq('invoice_id', id).order('position'),
      supabase.from('invoice_lines').select('*').eq('invoice_id', id).order('position'),
      supabase.from('payment_details').select('paid_at,amount,method,tracking_id').eq('invoice_id', id).order('paid_at'),
      supabase.from('invoices').select('customers(name,email,phone,country)').eq('id', id).single(),
    ]);
    return { org: must(org), inv: must(inv), inst: must(inst), lines: must(lines), pays: must(pays), cust: must(cust).customers };
  }, [slug, id]);

  if (loading && !data) return <Loading label="Preparing invoice" />;
  if (error) return <div className="page"><ErrorBox error={{ message: 'This invoice could not be loaded.' }} onRetry={reload} /></div>;
  const { org, inv, inst, lines, pays, cust } = data;
  return (
    <PrintFrame title={`Invoice ${inv.number}`.replace(/\//g, '-')} autoPrint={sp.get('print') === '1'} onBack={() => nav(`/o/${slug}/invoices/${id}`)}>
      <div className="print-scroll">
        <InvoiceDocument org={org} inv={inv} customer={cust} lines={lines} instalments={inst} payments={pays}
          payUrl={inv.status === 'sent' ? payLink(inv.public_token) : null} />
      </div>
    </PrintFrame>
  );
}
