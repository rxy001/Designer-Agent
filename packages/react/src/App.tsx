import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { installPreviewWindowGlobals } from "./preview-globals";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

type PreviewDocument = {
  html: string;
  url: string;
};

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createPreviewDocument(html: string, previewURL: string) {
  const baseURL = new URL(previewURL, window.location.href).href;
  const bootstrapScript = `
    <script>
      (() => {
        const globals = window.parent && window.parent.__previewWindowGlobals;

        if (!globals) {
          return;
        }

        window.__previewWindowGlobals = globals;
        Object.assign(window, globals);
        window.dispatchEvent(
          new CustomEvent("design-system-ready", { detail: globals })
        );
      })();
    </script>
  `;
  const headStartInjection = `
    <base href="${escapeHtmlAttribute(baseURL)}" />
    ${bootstrapScript}
  `;

  if (/<head[\s>]/i.test(html)) {
    const htmlWithHeadStart = html.replace(
      /<head([^>]*)>/i,
      `<head$1>${headStartInjection}`,
    );

    if (/<\/head>/i.test(htmlWithHeadStart)) {
      return htmlWithHeadStart.replace(
        /<\/head>/i,
        `${bootstrapScript}</head>`,
      );
    }

    return htmlWithHeadStart;
  }

  return `${headStartInjection}${html}`;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedDesignSystemId, setSelectedDesignSystemId] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [previewURL, setPreviewURL] = useState("");
  const [designSystemOptions, setDesignSystemOptions] = useState<
    {
      id: number;
      title: string;
    }[]
  >([]);
  const [previewDocument, setPreviewDocument] =
    useState<PreviewDocument | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    installPreviewWindowGlobals(window);
  }, []);

  useEffect(() => {
    if (!previewURL) {
      return;
    }

    const abortController = new AbortController();

    async function loadPreviewDocument() {
      try {
        const response = await fetch(previewURL, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Preview request failed: ${response.status}`);
        }

        const html = await response.text();
        setPreviewDocument({
          html: createPreviewDocument(html, previewURL),
          url: previewURL,
        });
      } catch {
        if (!abortController.signal.aborted) {
          setPreviewDocument(null);
        }
      }
    }

    void loadPreviewDocument();

    return () => abortController.abort();
  }, [previewURL]);

  useEffect(() => {
    async function request() {
      const response = await fetch("/api/design-systems", {
        method: "GET",
      });

      const result = await response.json();

      setDesignSystemOptions([{ id: -1, title: "Not Select" }, ...result.data]);
    }

    request();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextMessage = inputValue.trim();

    if (!nextMessage) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: Date.now(),
        role: "user",
        text: nextMessage,
      },
    ]);
    setInputValue("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: nextMessage,
          designSystemId: selectedDesignSystemId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        if (result.data.message) {
          setMessages((currentMessages) => [
            ...currentMessages,
            {
              id: Date.now() + 1,
              role: "assistant",
              text: result.data.message,
            },
          ]);
        }

        if (result.data.path) {
          setPreviewURL(result.data.path);
        }
      }
    } catch {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: "请求失败，请稍后再试。",
        },
      ]);
    }
  };

  return (
    <div style={styles.page}>
      <aside style={styles.chatPanel}>
        <div style={styles.messages}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                ...styles.messageBubble,
                ...(message.role === "user"
                  ? styles.userMessage
                  : styles.assistantMessage),
              }}
            >
              {message.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form style={styles.form} onSubmit={handleSubmit}>
          <label style={styles.selectLabel}>
            设计系统
            <select
              aria-label="选择设计系统"
              style={styles.select}
              value={selectedDesignSystemId}
              onChange={(event) =>
                setSelectedDesignSystemId(Number(event.target.value))
              }
            >
              {designSystemOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
          <div style={styles.inputRow}>
            <textarea
              aria-label="聊天输入"
              placeholder="输入消息..."
              style={styles.input}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
            <button style={styles.button} type="submit">
              发送
            </button>
          </div>
        </form>
      </aside>
      <main style={styles.previewPanel}>
        {previewURL && previewDocument?.url === previewURL && (
          <iframe
            key={previewURL}
            srcDoc={previewDocument.html}
            style={styles.previewIframe}
          />
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    boxSizing: "border-box",
    display: "flex",
    gap: 16,
    height: "100vh",
    margin: 0,
    padding: 16,
    background: "#f5f6f8",
    color: "#1f2937",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  chatPanel: {
    boxSizing: "border-box",
    display: "flex",
    width: 350,
    flexDirection: "column",
    border: "1px solid #d8dde5",
    borderRadius: 8,
    background: "#ffffff",
    overflow: "hidden",
  },
  messages: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    flexDirection: "column",
    gap: 10,
    overflowY: "auto",
    padding: 14,
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 8,
    padding: "10px 12px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
    width: "fit-content",
  },
  userMessage: {
    alignSelf: "flex-end",
    background: "#eef2f7",
  },
  assistantMessage: {
    alignSelf: "flex-start",
    background: "#f7f2e8",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    borderTop: "1px solid #e2e8f0",
    padding: 12,
  },
  selectLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "#475569",
    fontSize: 13,
    fontWeight: 600,
  },
  select: {
    boxSizing: "border-box",
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    background: "#ffffff",
    color: "#1f2937",
    fontFamily: "inherit",
    fontSize: 14,
    height: 38,
    outline: "none",
    padding: "0 10px",
  },
  inputRow: {
    display: "flex",
    gap: 8,
  },
  input: {
    boxSizing: "border-box",
    minWidth: 0,
    flex: 1,
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontFamily: "inherit",
    padding: "10px 12px",
    fontSize: 14,
    lineHeight: 1.5,
    minHeight: 44,
    outline: "none",
    resize: "vertical",
  },
  button: {
    border: 0,
    borderRadius: 6,
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    padding: "0 16px",
  },
  previewPanel: {
    minWidth: 0,
    minHeight: 0,
    border: "1px solid #d8dde5",
    borderRadius: 8,
    background: "#ffffff",
    flex: 1,
  },

  previewIframe: {
    width: "100%",
    height: "100%",
  },
} satisfies Record<string, CSSProperties>;

export default App;
