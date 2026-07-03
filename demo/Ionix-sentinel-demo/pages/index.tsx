import CheckoutForm from "../components/CheckoutForm";
import AdminReconciliation from "../components/AdminReconciliation";

export default function Home() {
  return (
    <main>
      <h1>IONIX Payments — Demo (con fallas PCI-DSS intencionales)</h1>
      <CheckoutForm />
      <AdminReconciliation />
    </main>
  );
}
