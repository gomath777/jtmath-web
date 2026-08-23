'use client';

import React from 'react';

export type TutorMaterialChoice = {
  readonly materialKey: string;
  readonly label: string;
  readonly order: number;
  readonly sideLabel?: string;
};

type TutorMaterialSelectorProps = {
  readonly materials: readonly TutorMaterialChoice[];
  readonly selectedMaterialKey: string | undefined;
  readonly resolvedMaterialKey?: string;
  readonly resolvedProblemNumber?: number;
  readonly onSelect: (materialKey: string) => void;
};

export function formatTutorMaterialLabel(material: TutorMaterialChoice): string {
  return material.sideLabel === undefined ? material.label : `${material.label} ${material.sideLabel}`;
}

export function TutorMaterialSelector({
  materials,
  selectedMaterialKey,
  resolvedMaterialKey,
  resolvedProblemNumber,
  onSelect,
}: TutorMaterialSelectorProps) {
  const selectedMaterial = materials.find((material) => material.materialKey === selectedMaterialKey);
  const resolvedMaterial = materials.find((material) => material.materialKey === resolvedMaterialKey);
  const activeMaterial = resolvedMaterial ?? selectedMaterial;

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 text-[12px] font-medium text-charcoal">질문할 학습지</legend>
      <div className="flex flex-wrap gap-2">
        {materials.map((material) => (
          <button
            key={material.materialKey}
            type="button"
            aria-pressed={selectedMaterialKey === material.materialKey}
            onClick={() => onSelect(material.materialKey)}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
              selectedMaterialKey === material.materialKey
                ? 'border-terracotta bg-terracotta text-white'
                : 'border-border-warm bg-sand text-charcoal hover:border-terracotta'
            }`}
          >
            {formatTutorMaterialLabel(material)}
          </button>
        ))}
      </div>
      {activeMaterial !== undefined && (
        <p className="mt-2 text-[11px] leading-5 text-stone">
          현재 질문: {formatTutorMaterialLabel(activeMaterial)}
          {resolvedProblemNumber === undefined ? '' : ` · ${resolvedProblemNumber}번`}
        </p>
      )}
    </fieldset>
  );
}
