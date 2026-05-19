import { describe, expect, it } from "vitest";
import { readAssistantSseEvents } from "./assistant-sse.js";

describe("readAssistantSseEvents", () => {
  it("parses delta and done events", () => {
    const { events, buffer } = readAssistantSseEvents(
      'event: delta\ndata: {"text":"hi"}\n\nevent: done\ndata: {}\n\n'
    );

    expect(buffer).toBe("");
    expect(events).toEqual([
      { event: "delta", id: "", data: '{"text":"hi"}', json: { text: "hi" } },
      { event: "done", id: "", data: "{}", json: {} }
    ]);
  });

  it("parses event ids for resumable streams", () => {
    const { events } = readAssistantSseEvents('id: 42\nevent: delta\ndata: {"text":"hi"}\n\n');

    expect(events[0]).toEqual({
      event: "delta",
      id: "42",
      data: '{"text":"hi"}',
      json: { text: "hi" }
    });
  });

  it("keeps partial events in the buffer", () => {
    const { events, buffer } = readAssistantSseEvents('event: delta\ndata: {"text":"hi"}');

    expect(events).toEqual([]);
    expect(buffer).toBe('event: delta\ndata: {"text":"hi"}');
  });
});
