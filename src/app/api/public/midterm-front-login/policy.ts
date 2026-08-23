export function isMidtermFrontAdminEntry(input: {
  readonly birthPin: string;
  readonly verifyAdminPasscode: (value: string) => boolean;
}): boolean {
  return input.verifyAdminPasscode(input.birthPin);
}
