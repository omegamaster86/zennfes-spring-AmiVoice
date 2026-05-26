import type { BrowserContext } from "@playwright/test";

export async function freezeTime(
  context: BrowserContext,
  iso = "2025-10-01T13:00:00Z",
) {
  await context.addInitScript(
    ({ fixed }: { fixed: string }) => {
      const fixedMs = new Date(fixed).valueOf();
      const OriginalDate = Date as unknown as typeof Date;

      class FixedDate extends OriginalDate {
        // biome-ignore lint/suspicious/noExplicitAny: Date constructor accepts various argument types
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(fixedMs);
          } else {
            // 引数ありの new Date() は通常通り
            // @ts-expect-error - Date constructor accepts various argument types
            super(...args);
          }
        }
        static now() {
          return fixedMs;
        }
        static UTC = OriginalDate.UTC;
        static parse = OriginalDate.parse;
      }

      // biome-ignore lint/suspicious/noExplicitAny: Date needs to be replaced globally
      (globalThis as any).Date = FixedDate;
      try {
        // biome-ignore lint/suspicious/noExplicitAny:通常是Date needs to be replaced globally
        (window as any).Date = FixedDate;
      } catch {
        // window が存在しない環境では無視
      }
    },
    { fixed: iso },
  );
}
