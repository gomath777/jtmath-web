'use client';

import { useFormStatus } from 'react-dom';

type SummerLoginFormProps = {
  readonly action: (formData: FormData) => Promise<void>;
  readonly error?: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 rounded-lg bg-ink px-5 text-[14px] font-semibold text-ivory transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? '확인 중' : '학습 페이지 열기'}
    </button>
  );
}

export function SummerLoginForm({ action, error }: SummerLoginFormProps) {
  return (
    <form action={action} className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold text-olive">비밀번호 6자리</span>
        <input
          name="pin"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="100101"
          autoComplete="one-time-code"
          className="h-12 w-full rounded-lg border border-border-cream bg-ivory px-4 text-[20px] font-semibold tracking-normal text-ink outline-none transition placeholder:text-stone/35 focus:border-terracotta focus:shadow-ring-warm"
          aria-describedby={error ? 'summer-login-error' : undefined}
          required
        />
      </label>

      {error ? (
        <p id="summer-login-error" className="rounded-lg border border-terracotta/30 bg-terracotta/10 px-3 py-2 text-[13px] font-medium text-terracotta">
          {error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
