import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, ConnectionStatus, ServerMessage } from "./types";

type UseEditorSocketOptions = {
  onMessage: (message: ServerMessage) => void;
};

export function useEditorSocket({ onMessage }: UseEditorSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: number | undefined;
    let reconnectAttempt = 0;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";

    const connect = () => {
      if (disposed) return;
      setConnectionStatus("connecting");
      const socket = new WebSocket(`${protocol}://${window.location.host}/ws/editor`);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        reconnectAttempt = 0;
        setConnectionStatus("connected");
      });
      socket.addEventListener("close", () => {
        if (socketRef.current === socket) socketRef.current = null;
        if (disposed) return;
        setConnectionStatus("disconnected");
        const delay = Math.min(1_000 * 2 ** reconnectAttempt, 10_000);
        reconnectAttempt += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      });
      socket.addEventListener("error", () => setConnectionStatus("error"));
      socket.addEventListener("message", (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data) as ServerMessage);
        } catch {
          onMessageRef.current({
            type: "error",
            code: "invalid_server_message",
            message: "Received an unreadable WebSocket message.",
          });
        }
      });
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, []);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      return false;
    }

    socketRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  return {
    connectionStatus,
    sendMessage,
  };
}
