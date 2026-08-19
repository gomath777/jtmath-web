import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));

const prohibitedFixtureKeys = new Set([
  "authorization",
  "birthDate",
  "cookie",
  "displayName",
  "email",
  "phoneNumber",
  "portalSlug",
  "token",
]);

const chatFixtureSchema = z.object({
  chat: z.object({
    user: z.object({
      name: z.string().startsWith("users/SYNTHETIC_"),
    }),
    messagePayload: z.object({
      message: z.object({
        name: z.string().startsWith("spaces/SYNTHETIC_"),
        text: z.string().min(1).max(1000),
      }),
      space: z
        .object({
          name: z.string().startsWith("spaces/SYNTHETIC_"),
          type: z.enum(["DM", "SPACE"]).optional(),
        })
        .optional(),
    }),
  }),
});

type FixtureViolation = {
  readonly key: string;
  readonly path: string;
};

async function readFixture(name: string): Promise<unknown> {
  const contents = await readFile(join(fixtureDirectory, name), "utf8");
  return JSON.parse(contents);
}

function collectProhibitedKeys(value: unknown, path = "$"): readonly FixtureViolation[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectProhibitedKeys(item, `${path}[${index}]`));
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`;
    const current = prohibitedFixtureKeys.has(key) ? [{ key, path: childPath }] : [];
    return [...current, ...collectProhibitedKeys(child, childPath)];
  });
}

for (const fixtureName of ["valid-dm-message.fixture.json", "valid-dm-image.fixture.json"]) {
  test(`${basename(fixtureName)} is synthetic and redacted`, async () => {
    // Given
    const fixture = await readFixture(fixtureName);

    // When
    const violations = collectProhibitedKeys(fixture);
    const parsed = chatFixtureSchema.parse(fixture);

    // Then
    assert.deepEqual(violations, []);
    assert.match(parsed.chat.user.name, /^users\/SYNTHETIC_/);
  });
}

test("fixture contract rejects auth headers and prohibited PII keys", async () => {
  // Given
  const fixture = await readFixture("rejected-auth-and-pii.fixture.json");

  // When
  const violations = collectProhibitedKeys(fixture);

  // Then
  assert.deepEqual(
    violations.map((violation) => violation.key).sort(),
    ["authorization", "email"],
  );
});
