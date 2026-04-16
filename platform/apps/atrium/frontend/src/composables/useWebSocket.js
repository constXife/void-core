import { ref, onMounted, onUnmounted, readonly } from "vue";

/**
 * WebSocket composable with auto-reconnect and exponential backoff.
 * 
 * Usage:
 * ```js
 * const { 
 *   status, 
 *   data, 
 *   error, 
 *   send, 
 *   connect, 
 *   disconnect 
 * } = useWebSocket('/ws');
 * 
 * // Watch for incoming messages
 * watch(data, (message) => {
 *   if (message.type === 'service_update') {
 *     // Handle service status change
 *   }
 * });
 * ```
 */
export function useWebSocket(url, options = {}) {
  const {
    autoConnect = true,
    reconnect = true,
    reconnectAttempts = Infinity,
    reconnectInterval = 1000,
    reconnectIntervalMax = 30000,
    onConnected,
    onDisconnected,
    onError,
    onMessage
  } = options;

  // Reactive state
  const status = ref("CLOSED"); // CONNECTING, OPEN, CLOSING, CLOSED
  const data = ref(null);
  const error = ref(null);

  // Internal state
  let ws = null;
  let reconnectCount = 0;
  let reconnectTimeout = null;
  let explicitClose = false;

  /**
   * Calculate backoff delay with jitter
   */
  const getReconnectDelay = () => {
    const delay = Math.min(
      reconnectInterval * Math.pow(2, reconnectCount),
      reconnectIntervalMax
    );
    // Add 10% jitter
    return delay + Math.random() * delay * 0.1;
  };

  /**
   * Build WebSocket URL (handle relative paths)
   */
  const buildUrl = () => {
    if (url.startsWith("ws://") || url.startsWith("wss://")) {
      return url;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}${url}`;
  };

  /**
   * Connect to WebSocket server
   */
  const connect = () => {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }

    explicitClose = false;
    status.value = "CONNECTING";
    error.value = null;

    try {
      ws = new WebSocket(buildUrl());
    } catch (err) {
      error.value = err.message;
      status.value = "CLOSED";
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      status.value = "OPEN";
      reconnectCount = 0;
      onConnected?.();
    };

    ws.onclose = (event) => {
      status.value = "CLOSED";
      ws = null;
      onDisconnected?.(event);

      if (!explicitClose && reconnect && reconnectCount < reconnectAttempts) {
        scheduleReconnect();
      }
    };

    ws.onerror = (event) => {
      error.value = "WebSocket error";
      onError?.(event);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        data.value = parsed;
        onMessage?.(parsed);
      } catch {
        // If not JSON, store raw data
        data.value = event.data;
        onMessage?.(event.data);
      }
    };
  };

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    const delay = getReconnectDelay();
    reconnectCount++;

    console.log(`[WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectCount})`);

    reconnectTimeout = setTimeout(() => {
      connect();
    }, delay);
  };

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = () => {
    explicitClose = true;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws) {
      status.value = "CLOSING";
      ws.close();
      ws = null;
    }
  };

  /**
   * Send data through WebSocket
   */
  const send = (message) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[WebSocket] Cannot send: connection not open");
      return false;
    }

    const payload = typeof message === "string" ? message : JSON.stringify(message);
    ws.send(payload);
    return true;
  };

  // Lifecycle hooks
  onMounted(() => {
    if (autoConnect) {
      connect();
    }
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    // Read-only reactive state
    status: readonly(status),
    data: readonly(data),
    error: readonly(error),
    
    // Methods
    connect,
    disconnect,
    send,
    
    // Computed helpers
    isConnected: () => status.value === "OPEN",
    isConnecting: () => status.value === "CONNECTING"
  };
}

/**
 * Specialized composable for Atrium service updates.
 * Handles service status changes from the backend.
 */
export function useServiceUpdates(onUpdate) {
  const { status, data, error, connect, disconnect } = useWebSocket("/ws", {
    autoConnect: true,
    reconnect: true,
    onMessage: (message) => {
      // Expected message format:
      // { type: "service_update", service_id: 1, widget_data: { online: true, latency_ms: 23 } }
      // { type: "ping" } - keepalive
      if (message.type === "service_update" && onUpdate) {
        onUpdate(message);
      }
    }
  });

  return {
    status,
    error,
    lastUpdate: data,
    connect,
    disconnect
  };
}

