import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminLayout from '@/components/admin/AdminLayout';
import { loadDs2Readiness } from '@/lib/admin/ds2-readiness.server';
import { isLocalAdminMode } from '@/utils/admin-auth';
import ContentReadinessClient from './ContentReadinessClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map((email) => email.trim());

export const dynamic = 'force-dynamic';

export default async function ContentReadinessPage() {
  if (!isLocalAdminMode()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');
  }

  const snapshot = await loadDs2Readiness();

  return (
    <AdminLayout activeNav="content-readiness">
      <ContentReadinessClient initialSnapshot={snapshot} />
    </AdminLayout>
  );
}
