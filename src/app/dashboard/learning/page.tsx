import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import LearningClient from './LearningClient';

export default async function LearningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <LearningClient />;
}
