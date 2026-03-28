import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SupplementsClient from './SupplementsClient';

export default async function SupplementsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <SupplementsClient />;
}
