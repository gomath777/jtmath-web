import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import SupplementsClient from './SupplementsClient';

export default async function GS1SupplementsPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single();

  const userName = profile?.name || '학생';

  return <SupplementsClient userName={userName} />;
}
