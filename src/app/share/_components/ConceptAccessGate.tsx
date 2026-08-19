import type { GateStatus } from './conceptAccess';

type Props = {
  readonly subjectLabel: string;
  readonly heading: string;
  readonly status: GateStatus | null;
  readonly action: (formData: FormData) => Promise<void>;
  readonly eyebrowSuffix?: string;
  readonly inputLabel?: string;
  readonly inputHelp?: string;
  readonly placeholder?: string;
};

function gateMessage(status: GateStatus | null, inputLabel: string): string {
  if (status === 'config') return '암호 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.';
  if (status === 'format') return `${inputLabel} 6자리를 숫자로 입력해 주세요.`;
  if (status === 'invalid') return '입력한 암호가 맞지 않습니다.';
  return '암호 입력 후 볼 수 있습니다.';
}

export function ConceptAccessGate({
  subjectLabel,
  heading,
  status,
  action,
  eyebrowSuffix = '개념강의',
  inputLabel = '암호 (생년월일 6자리)',
  inputHelp = '예: 2010년 1월 1일생이면 100101',
  placeholder = '예: 100101',
}: Props) {
  const isError = status !== null;

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <main className="max-w-md mx-auto px-5 py-16 md:py-24">
        <div className="mb-8 pb-7 border-b border-border-cream">
          <p className="text-[11px] tracking-[0.14em] uppercase text-stone font-medium">
            {subjectLabel} · {eyebrowSuffix}
          </p>
          <h1 className="font-serif text-[26px] md:text-[30px] mt-1.5 tracking-tight leading-tight">
            {heading}
          </h1>
          <p className={`text-[13px] mt-2 ${isError ? 'text-crimson' : 'text-olive'}`}>
            {gateMessage(status, inputLabel)}
          </p>
        </div>

        <form action={action} className="bg-ivory border border-border-cream rounded-2xl p-5 shadow-whisper">
          <label htmlFor="passcode" className="block text-[13px] font-medium text-charcoal mb-2">
            {inputLabel}
          </label>
          <input
            id="passcode"
            name="passcode"
            type="password"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="off"
            placeholder={placeholder}
            className="w-full h-12 rounded-xl bg-parchment border border-border-warm px-4 text-[18px] tracking-[0.22em] font-mono text-ink outline-none placeholder:text-stone/55 focus:border-terracotta focus:shadow-ring-terracotta"
            aria-describedby="passcode-help"
          />
          <p id="passcode-help" className="text-[12px] text-stone mt-2">
            {inputHelp}
          </p>
          <button
            type="submit"
            className="mt-5 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-terracotta text-ivory text-[14px] font-medium shadow-ring-terracotta hover:bg-terracotta-light transition-colors"
          >
            들어가기
          </button>
        </form>
      </main>
    </div>
  );
}
