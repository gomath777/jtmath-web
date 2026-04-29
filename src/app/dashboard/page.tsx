import Link from 'next/link';
import { BookOpen, PlayCircle, Clock, ChevronRight, BookMarked } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
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

  // Fetch real enrollments
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      id,
      valid_until,
      courses (
        id,
        title,
        subtitle
      )
    `)
    .eq('user_id', user.id)
    .gt('valid_until', new Date().toISOString());

  const hasEnrollments = enrollments && enrollments.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="brand-card p-8">
        <h1 className="text-2xl font-bold text-ink">
          환영합니다, <span className="text-terracotta">{userName}</span>님
        </h1>
        <p className="mt-2 text-charcoal">
          오늘도 열심히 공부하는 당신, 화이팅.
        </p>
      </div>

      {/* 기출 영상 - only show if enrolled */}
      {hasEnrollments && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-stone tracking-wider uppercase flex items-center gap-2 font-mono">
            <BookMarked className="w-4 h-4 text-olive" />
            EXAM VIDEOS
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { slug: 'gs1', name: '공통수학1' },
              { slug: 'ds2', name: '대수' },
            ].map(subject => (
              <Link
                key={subject.slug}
                href={`/dashboard/practice/${subject.slug}`}
                className="brand-card p-4 flex flex-col gap-2 hover:border-olive/30 transition-all group"
              >
                <span className="text-[10px] font-mono text-olive/70 uppercase tracking-widest">기출 해설</span>
                <span className="font-bold text-ink text-sm group-hover:text-olive transition-colors">{subject.name}</span>
                <span className="text-xs text-stone flex items-center gap-1 mt-auto">
                  <PlayCircle className="w-3.5 h-3.5" />
                  영상 보기
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-stone tracking-wider uppercase flex items-center gap-2 font-mono">
          <BookOpen className="w-4 h-4 text-terracotta" />
          ENROLLED COURSES
        </h2>

        {hasEnrollments ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map((enrollment) => {
              const course = enrollment.courses as unknown as { id: string; title: string; subtitle: string } | null;
              if (!course) return null;
              const validUntil = new Date(enrollment.valid_until).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
              return (
                <div key={enrollment.id} className="brand-card overflow-hidden group cursor-pointer flex flex-col h-full hover:border-terracotta/30 transition-all duration-300">
                  <div className="h-1 w-full bg-gradient-to-r from-terracotta to-coral" />
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-4">
                      <span className="text-xs font-mono text-terracotta/80 tracking-wide">{course.subtitle}</span>
                      <h3 className="text-lg font-bold text-ink mt-1 line-clamp-1 group-hover:text-terracotta transition-colors">{course.title}</h3>
                    </div>

                    <div className="mt-auto space-y-4">
                      <div className="flex items-center justify-between pt-4 border-t border-border-cream">
                        <div className="flex items-center gap-2 text-xs text-stone font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {validUntil}까지
                        </div>
                        <Link
                          href={`/dashboard/learning`}
                          className="text-sm font-bold text-terracotta hover:text-coral flex items-center gap-1 transition-colors"
                        >
                          입장
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="brand-card p-12 text-center">
            <div className="w-16 h-16 bg-sand rounded-full flex items-center justify-center mx-auto mb-4 border border-border-cream">
              <BookOpen className="w-8 h-8 text-stone" />
            </div>
            <h3 className="text-lg font-bold text-ink mb-2">등록된 강의가 없습니다.</h3>
            <p className="text-charcoal text-sm max-w-sm mx-auto">
              수강 등록 후 이용하실 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
