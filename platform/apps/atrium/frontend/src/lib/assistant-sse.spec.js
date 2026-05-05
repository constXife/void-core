import { describe, expect, it } from "vitest";
import { readAssistantSseEvents } from "./assistant-sse.js";

describe("readAssistantSseEvents", () => {
  it("parses delta and done events", () => {
    const { events, buffer } = readAssistantSseEvents(
      'event: delta\ndata: {"text":"hi"}\n\nevent: done\ndata: {}\n\n'
    );

    expect(buffer).toBe("");
    expect(events).toEqual([
      { event: "delta", data: '{"text":"hi"}', json: { text: "hi" } },
      { event: "done", data: "{}", json: {} }
    ]);
  });

  it("keeps partial events in the buffer", () => {
    const { events, buffer } = readAssistantSseEvents('event: delta\ndata: {"text":"hi"}');

    expect(events).toEqual([]);
    expect(buffer).toBe('event: delta\ndata: {"text":"hi"}');
  });
});
