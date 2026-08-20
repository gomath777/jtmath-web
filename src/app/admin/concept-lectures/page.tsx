import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ConceptLecturesAdminClient from './ConceptLecturesAdminClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

export default async function AdminConceptLecturesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  return <ConceptLecturesAdminClient />;
}
