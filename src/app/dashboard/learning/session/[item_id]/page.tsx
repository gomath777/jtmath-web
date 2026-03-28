import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SessionPageClient from './SessionPageClient';

export default async function SessionPage({ params }: { params: Promise<{ item_id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { item_id } = await params;

  return <SessionPageClient itemId={item_id} />;
}
