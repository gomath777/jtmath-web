import type { ReactNode } from 'react';
import { ConceptAccessGate } from './ConceptAccessGate';
import {
  isConceptPageUnlocked,
  readGateStatus,
  unlockConceptPage,
  type ConceptGateConfig,
} from './conceptAccess';

type ConceptAccessPageProps = {
  readonly config: ConceptGateConfig;
  readonly subjectLabel: string;
  readonly heading: string;
  readonly gate: string | readonly string[] | undefined;
  readonly children: ReactNode;
};

export async function ConceptAccessPage({
  config,
  subjectLabel,
  heading,
  gate,
  children,
}: ConceptAccessPageProps) {
  async function unlock(formData: FormData): Promise<void> {
    'use server';

    await unlockConceptPage(formData, config);
  }

  const isUnlocked = await isConceptPageUnlocked(config);
  if (!isUnlocked) {
    return (
      <ConceptAccessGate
        subjectLabel={subjectLabel}
        heading={heading}
        status={readGateStatus(gate)}
        action={unlock}
      />
    );
  }

  return <>{children}</>;
}
