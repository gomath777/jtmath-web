import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loginSummer, logoutSummer } from './actions';
import { SummerLoginForm } from './_components/SummerLoginForm';
import { SummerSubjectChooser } from './_components/SummerSubjectChooser';
import { readSummerSession } from '@/lib/summer-5week/server';

export const metadata: Metadata = {
  title: '5주 특강 학습 페이지 | 고T수학',
};

export const dynamic = 'force-dynamic';

type SummerEntryPageProps = {
  readonly searchParams?: {
    readonly error?: string;
    readonly gate?: string;
  };
};

const ERROR_MESSAGES: Record<string, string> = {
  format: '생년월일 6자리를 숫자로 입력해 주세요.',
  invalid: '등록된 생년월일이 아닙니다. 다시 확인해 주세요.',
  config: '현재 접속 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.',
  rate_limited: '입력 횟수가 많습니다. 잠시 후 다시 시도해 주세요.',
};

export default async function SummerEntryPage({ searchParams }: SummerEntryPageProps) {
  const session = await readSummerSession();

  if (session) {
    if (session.subjects.length === 1) {
      redirect(`/5wsummer/${session.subjects[0]}`);
    }

    return (
      <SummerSubjectChooser
        subjects={session.subjects}
        master={session.master}
        logoutAction={logoutSummer}
      />
    );
  }

  const gate = searchParams?.error ?? searchParams?.gate;
  const error = gate ? ERROR_MESSAGES[gate] : undefined;

  return (
    <main className="min-h-screen bg-parchment text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
        <div className="border-b border-border-cream pb-7">
          <p className="text-[11px] font-medium uppercase tracking-normal text-stone">2026 여름</p>
          <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-normal md:text-[38px]">
            5주 특강 학습 페이지
          </h1>
          <p className="mt-3 break-keep text-[14px] leading-relaxed text-olive">
            학생 생년월일 6자리를 입력하면 배정된 과목 달력으로 이동합니다.
          </p>
        </div>

        <SummerLoginForm action={loginSummer} error={error} />
      </section>
    </main>
  );
}
