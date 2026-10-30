import { redirect } from 'next/navigation';

export default function AdminPaymentsRedirectPage() {
  redirect('/dashboard/admin/payments');
}
