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
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws/editor`);

    socketRef.current = socket;

    socket.addEventListener("open", () => setConnectionStatus("connected"));
    socket.addEventListener("close", () => setConnectionStatus("disconnected"));
    socket.addEventListener("error", () => setConnectionStatus("error"));
    socket.addEventListener("message", (event) => {
      try {
        onMessageRef.current(JSON.parse(event.data) as ServerMessage);
      } catch {
        onMessageRef.current({
          type: "error",
          message: "Received an unreadable WebSocket message.",
        });
      }
    });

    return () => {
      socket.close();
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
