import { describe, expect, it, vi } from "vitest";
import { readAssistantSkillRun } from "./assistant-skill-runs.js";

describe("readAssistantSkillRun", () => {
  it("requests report context for a skill run", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ id: "run-1", blocks: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    const payload = await readAssistantSkillRun("run-1", { context: "report" });

    expect(payload.id).toBe("run-1");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/assistant/skill-runs/run-1?context=report",
      expect.objectContaining({
        credentials: "include",
        headers: { Accept: "application/json" }
      })
    );
  });
});
