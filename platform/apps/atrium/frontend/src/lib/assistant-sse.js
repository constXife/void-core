export function readAssistantSseEvents(buffer) {
  let nextBuffer = String(buffer || "");
  const events = [];

  while (true) {
    const delimiter = findSseDelimiter(nextBuffer);
    if (!delimiter) break;

    const block = nextBuffer.slice(0, delimiter.index);
    nextBuffer = nextBuffer.slice(delimiter.index + delimiter.length);
    const event = parseSseBlock(block);
    if (event) events.push(event);
  }

  return {
    events,
    buffer: nextBuffer
  };
}

function findSseDelimiter(buffer) {
  const lf = buffer.indexOf("\n\n");
  const crlf = buffer.indexOf("\r\n\r\n");
  if (lf === -1 && crlf === -1) return null;
  if (lf !== -1 && (crlf === -1 || lf < crlf)) {
    return { index: lf, length: 2 };
  }
  return { index: crlf, length: 4 };
}

function parseSseBlock(block) {
  const lines = String(block || "").split(/\r?\n/);
  let event = "message";
  const data = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      data.push(line.slice("data:".length).trimStart());
    }
  }

  if (!event && data.length === 0) return null;
  const payload = data.join("\n");
  return {
    event,
    data: payload,
    json: parseJsonPayload(payload)
  };
}

function parseJsonPayload(payload) {
  if (!String(payload || "").trim()) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
