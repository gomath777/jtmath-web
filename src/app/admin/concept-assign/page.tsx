import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ConceptAssignClient from './ConceptAssignClient';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@jtmath.com').split(',').map(e => e.trim());

export default async function AdminConceptAssignPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!ADMIN_EMAILS.includes(user.email || '')) redirect('/dashboard');

  return <ConceptAssignClient />;
}
