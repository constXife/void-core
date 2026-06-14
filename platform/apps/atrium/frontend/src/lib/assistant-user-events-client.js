// WebSocket-клиент user-scoped event feed ассистента (GET /assistant/events).
// Канал живёт всю жизнь вкладки: reconnect с экспоненциальным backoff без лимита
// попыток, курсор after= продвигается по id входящих фреймов, чтобы reconnect
// не терял события. Первое подключение идёт без курсора — feed стартует «с сейчас»,
// историю surface получает обычными GET.

const RECONNECT_BASE_DELAY_MS = 700;
const RECONNECT_MAX_DELAY_MS = 15000;

export function connectAssistantUserEvents({ onEvent, onStatus, path = "/assistant/events" } = {}) {
  let socket = null;
  let closed = false;
  let cursor = 0;
  let attempts = 0;
  let reconnectTimer = null;

  const open = () => {
    if (closed) return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const suffix = cursor > 0 ? `?after=${cursor}` : "";
    socket = new WebSocket(`${protocol}://${window.location.host}${path}${suffix}`);
    socket.onopen = () => {
      attempts = 0;
      onStatus?.({ connected: true });
    };
    socket.onmessage = (message) => {
      let frame = null;
      try {
        frame = JSON.parse(message.data);
      } catch (error) {
        console.error("void-assistant: user event frame parse failed", error, message.data);
        return;
      }
      const id = Number(frame?.id || 0);
      if (Number.isFinite(id) && id > cursor) {
        cursor = id;
      }
      onEvent?.(frame);
    };
    socket.onclose = () => {
      socket = null;
      if (closed) return;
      onStatus?.({ connected: false });
      scheduleReconnect();
    };
    socket.onerror = () => {
      // Браузер сам вызовет onclose; reconnect живёт там.
    };
  };

  const scheduleReconnect = () => {
    attempts += 1;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** (attempts - 1), RECONNECT_MAX_DELAY_MS);
    reconnectTimer = window.setTimeout(open, delay);
  };

  open();

  return {
    close() {
      closed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket) {
        socket.close();
        socket = null;
      }
    }
  };
}
