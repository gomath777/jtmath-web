import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { SUMMER_SUBJECT_INFO, type SummerSubject } from '@/lib/summer-5week/subjects';

type SummerSubjectChooserProps = {
  readonly subjects: readonly SummerSubject[];
  readonly master: boolean;
  readonly logoutAction: () => Promise<void>;
};

export function SummerSubjectChooser({ subjects, master, logoutAction }: SummerSubjectChooserProps) {
  return (
    <main className="min-h-screen bg-parchment text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-10 md:py-14">
        <div className="border-b border-border-cream pb-7">
          <p className="text-[11px] font-medium uppercase tracking-normal text-stone">5주 특강</p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-[28px] leading-tight tracking-normal md:text-[34px]">
                내 학습 과목
              </h1>
              <p className="mt-2 break-keep text-[13px] leading-relaxed text-olive">
                배정된 과목만 표시됩니다. 한 과목 수강생은 다음 접속부터 해당 과목으로 바로 이동합니다.
              </p>
            </div>
            <form action={logoutAction}>
              <button className="rounded-lg border border-border-cream bg-ivory px-3 py-2 text-[12px] font-semibold text-stone transition hover:border-terracotta/40 hover:text-ink">
                로그아웃
              </button>
            </form>
          </div>
        </div>

        {master ? (
          <p className="mt-5 rounded-lg border border-olive/20 bg-olive/10 px-3 py-2 text-[12px] font-medium text-olive">
            관리자 확인 모드입니다. 모든 과목 카드가 표시됩니다.
          </p>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => {
            const info = SUMMER_SUBJECT_INFO[subject];
            return (
              <Link
                key={subject}
                href={`/5wsummer/${subject}`}
                className="group rounded-lg border border-border-cream bg-ivory p-5 transition hover:border-terracotta/40 hover:shadow-ring-warm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-stone">{info.shortLabel}</p>
                      <h2 className="mt-1 font-serif text-[22px] leading-tight tracking-normal">{info.label}</h2>
                      <p className="mt-2 break-keep text-[13px] leading-relaxed text-olive">{info.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-stone transition group-hover:translate-x-0.5 group-hover:text-terracotta" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
