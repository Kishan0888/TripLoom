import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './lib/session';
import { Loading } from './components/ui';
import Login from './pages/Login';
import ChooseOrg from './pages/ChooseOrg';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOrgs from './pages/admin/AdminOrgs';
import AdminOrg from './pages/admin/AdminOrg';
import AdminFx from './pages/admin/AdminFx';
import OrgLayout from './components/OrgLayout';
import Dashboard from './pages/app/Dashboard';
import Invoices from './pages/app/Invoices';
import InvoiceNew from './pages/app/InvoiceNew';
import InvoiceDetail from './pages/app/InvoiceDetail';
import Customers from './pages/app/Customers';
import Payments from './pages/app/Payments';
import Reconciliation from './pages/app/Reconciliation';
import Items from './pages/app/Items';
import Settings from './pages/app/Settings';
import Pay from './pages/public/Pay';
import PayInvoice from './pages/public/PayInvoice';
import InvoicePrint from './pages/app/InvoicePrint';
import SiteLayout from './site/SiteLayout';
import SiteHome from './site/pages/Home';
import SiteProduct from './site/pages/Product';
import SitePayments from './site/pages/Payments';
import SitePricing from './site/pages/Pricing';
import SiteContact from './site/pages/Contact';
import { Privacy, Terms, Refunds } from './site/pages/Legal';

function Home() {
  const { loading, user, isAdmin, memberships } = useSession();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin && memberships.length === 0) return <Navigate to="/admin" replace />;
  if (memberships.length === 1 && !isAdmin) return <Navigate to={`/o/${memberships[0].slug}`} replace />;
  return <ChooseOrg />;
}

function RequireAuth({ children }) {
  const { loading, user } = useSession();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Marketing website */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<SiteHome />} />
        <Route path="/product" element={<SiteProduct />} />
        <Route path="/payments" element={<SitePayments />} />
        <Route path="/pricing" element={<SitePricing />} />
        <Route path="/contact" element={<SiteContact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refunds" element={<Refunds />} />
      </Route>
      {/* Software */}
      <Route path="/app" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/p/:token" element={<Pay />} />
      <Route path="/p/:token/invoice" element={<PayInvoice />} />
      <Route path="/o/:slug/invoices/:id/print" element={<RequireAuth><InvoicePrint /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminOrgs />} />
        <Route path="orgs/:id" element={<AdminOrg />} />
        <Route path="fx" element={<AdminFx />} />
      </Route>
      <Route path="/o/:slug" element={<RequireAuth><OrgLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceNew />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="payments" element={<Payments />} />
        <Route path="reconciliation" element={<Reconciliation />} />
        <Route path="items" element={<Items />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
