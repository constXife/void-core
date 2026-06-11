import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectAssistantUserEvents } from "./assistant-user-events-client.js";

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.closed = false;
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
    this.onclose?.();
  }
}
FakeWebSocket.instances = [];

beforeEach(() => {
  vi.useFakeTimers();
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("assistant user events client", () => {
  it("connects without cursor and dispatches parsed frames", () => {
    const events = [];
    const connection = connectAssistantUserEvents({ onEvent: (frame) => events.push(frame) });
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toMatch(/\/assistant\/events$/);

    socket.onmessage({
      data: JSON.stringify({
        id: 3,
        event: "message.created",
        session_id: "session-1",
        data: { message_id: "m-1" }
      })
    });

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("message.created");
    connection.close();
  });

  it("reconnects with the advanced cursor after an unexpected close", () => {
    const connection = connectAssistantUserEvents({ onEvent: () => {} });
    const socket = FakeWebSocket.instances[0];
    socket.onmessage({
      data: JSON.stringify({ id: 11, event: "run.status", session_id: "s", data: {} })
    });

    socket.onclose();
    vi.advanceTimersByTime(700);

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.instances[1].url).toMatch(/\/assistant\/events\?after=11$/);
    connection.close();
  });

  it("does not reconnect after explicit close", () => {
    const connection = connectAssistantUserEvents({ onEvent: () => {} });
    connection.close();
    vi.advanceTimersByTime(30000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("survives malformed frames without dropping the connection", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const events = [];
    const connection = connectAssistantUserEvents({ onEvent: (frame) => events.push(frame) });
    const socket = FakeWebSocket.instances[0];

    socket.onmessage({ data: "not json" });
    socket.onmessage({
      data: JSON.stringify({ id: 1, event: "session.updated", session_id: "s", data: {} })
    });

    expect(consoleError).toHaveBeenCalled();
    expect(events).toHaveLength(1);
    connection.close();
  });
});
