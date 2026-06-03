import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { installPreviewWindowGlobals } from "./preview-globals";
import { Button, Card, Contact, Section, Text } from "./components";

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
  const [previewURL, setPreviewURL] = useState("/workspace/test.html");
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
      {/* <aside style={styles.chatPanel}>
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
      </aside> */}
      <main style={styles.previewPanel}>
        {/* {previewURL && previewDocument?.url === previewURL && (
          <iframe
            key={previewURL}
            srcDoc={previewDocument.html}
            style={styles.previewIframe}
          />
        )} */}
        <style>
          {`:root {
            --bg-primary: #faf9f5;
            --bg-secondary: #f5f4ed;
            --bg-tertiary: #f0eee6;

            --fg-primary: #141413;
            --fg-secondary: #1a1918;
            --fg-tertiary: #5e5d59;
            
            --brand-primary: #c96442;

            --border-primary: #dedcd1;
            --border-secondary: #d1cfc5;
            
            --font-primary-family: "Anthropic Sans",Arial,sans-serif;
            --font-mono-family: "Anthropic Mono",Arial,sans-serif;
            --font-secondary-family: "Anthropic Serif",Georgia,sans-serif;

            --button-border-width: 0.0625rem;
          }
            
          .dark {
            --bg-primary: #141413;
            --bg-secondary: #1a1918;
            --bg-tertiary: #262624;

            --fg-primary: #faf9f5;
            --fg-secondary: #b0aea5;
            --fg-tertiary: #87867f;
          }
          `}
        </style>
        <div className="text-pretty bg-(--bg-primary) text-(--fg-primary) font-(family-name:--font-primary-family) py-10 px-5">
          <Section columns={20} rows={10} className="h-130">
            <Text
              className="row-start-1 row-end-2 col-start-2 col-end-12 text-xs flex items-center uppercase text-(--fg-tertiary)"
              content="Reference fixture · claude"
            />
            <Text
              className="row-start-4 row-end-7 col-start-2 col-end-12 leading-[1.1] font-(family-name:--font-secondary-family) font-medium text-7xl"
              content="Hand off the work, come back to clarity"
            />
            <Text
              className="row-start-7 row-end-9 col-start-2 col-end-12 text-(--fg-tertiary) text-2xl"
              content="Assign research, reporting, cleanup, and recurring operations to a calm workspace that keeps you in control."
            />
            <Button
              className="row-start-9 rounded-md row-end-10 col-start-2 col-end-4 bg-(--fg-primary) text-(--bg-primary) shadow-[0_0_0_0rem_var(--fg-primary),0_0_0_var(--button-border-width)_var(--fg-primary)] font-(family-name:--font-primary-family) hover:shadow-[0_0_0_var(--button-border-width)_var(--fg-primary),0_0_0_calc(var(--button-border-width)*2)_var(--fg-primary)]"
              label="Start a task"
            />
            <Button
              className="row-start-9 rounded-md row-end-10 col-start-4 col-end-6 bg-(--bg-tertiary) text-(--fg-primary) shadow-[0_0_0_0rem_var(--bg-tertiary),0_0_0_var(--button-border-width)_var(--border-primary)] font-(family-name:--font-primary-family) hover:shadow-[0_0_0_var(--button-border-width)_var(--bg-tertiary),0_0_0_calc(var(--button-border-width)*2)_var(--border-primary)]"
              label="View controls"
            />
          </Section>
          <Section columns={19} rows={10} className="h-150">
            <Text
              className="row-start-2 row-end-3 col-start-2 col-end-20 text-xs flex items-center uppercase text-(--fg-tertiary)"
              content="What this fixture exercises"
            />
            <Text
              className="row-start-3 row-end-5 col-start-2 col-end-20 leading-[1.1] font-(family-name:--font-secondary-family) font-medium text-4xl"
              content="Power through the work that slows teams down"
            />
            <Card
              classNames={{
                root: "row-start-5 row-end-10 p-8 col-start-2 col-end-7 rounded-3xl bg-white border-1 border-solid border-(--border-secondary)",
                title: "font-(family-name:--font-secondary-family) text-2xl",
                description:
                  "font-(family-name:--font-primary-family) text-(--fg-tertiary) mt-2",
                button:
                  "w-full h-9 rounded-lg bg-(--fg-primary) text-(--bg-primary) shadow-[0_0_0_0rem_var(--fg-primary),0_0_0_var(--button-border-width)_var(--fg-primary)] font-(family-name:--font-primary-family) hover:shadow-[0_0_0_var(--button-border-width)_var(--fg-primary),0_0_0_calc(var(--button-border-width)*2)_var(--fg-primary)]",
              }}
              buttonLabel="Try"
              title="Organize files"
              description="Sort messy folders into named collections with summaries, owners, and next steps."
            />
            <Card
              classNames={{
                root: "row-start-5 row-end-10 p-8 col-start-8 col-end-13 rounded-3xl bg-white border-1 border-solid border-(--border-secondary)",
                title: "font-(family-name:--font-secondary-family) text-2xl",
                description:
                  "font-(family-name:--font-primary-family) text-(--fg-tertiary) mt-2",
                button:
                  "w-full h-9 rounded-lg bg-(--fg-primary) text-(--bg-primary) shadow-[0_0_0_0rem_var(--fg-primary),0_0_0_var(--button-border-width)_var(--fg-primary)] font-(family-name:--font-primary-family) hover:shadow-[0_0_0_var(--button-border-width)_var(--fg-primary),0_0_0_calc(var(--button-border-width)*2)_var(--fg-primary)]",
              }}
              buttonLabel="Try"
              title="Build reports"
              description="Pull data from source systems and turn it into a readable weekly operating brief."
            />
            <Card
              classNames={{
                root: "row-start-5 row-end-10 p-8 col-start-14 col-end-19 rounded-3xl bg-white border-1 border-solid border-(--border-secondary)",
                title: "font-(family-name:--font-secondary-family) text-2xl",
                description:
                  "font-(family-name:--font-primary-family) text-(--fg-tertiary) mt-2",
                button:
                  "w-full h-9 rounded-lg bg-(--fg-primary) text-(--bg-primary) shadow-[0_0_0_0rem_var(--fg-primary),0_0_0_var(--button-border-width)_var(--fg-primary)] font-(family-name:--font-primary-family) hover:shadow-[0_0_0_var(--button-border-width)_var(--fg-primary),0_0_0_calc(var(--button-border-width)*2)_var(--fg-primary)]",
              }}
              buttonLabel="Try"
              title="Schedule tasks"
              description="Set the cadence once, then review the plan before the assistant performs meaningful actions."
            />
          </Section>
          <Section columns={20} className="dark h-150 bg-(--bg-primary)">
            <Text
              className="text-(--brand-primary) row-start-3 row-end-3 col-start-2 col-end-11 uppercase font-(family-name:--font-secondary-family)"
              content="contact"
            />
            <Text
              className="row-start-4 row-end-10 col-start-2 col-end-11 text-7xl text-(--fg-primary)"
              content="Create what matters. Keep the conversation simple."
            />
            <Text
              className="row-start-10 row-end-13 text-(--fg-tertiary) col-start-2 col-end-11 text-2xl font-(family-name:--font-primary-family)"
              content="Tell us what you are building, what feels blocked, or where you want a sharper path forward. We will reply with a thoughtful next step."
            />
            <Contact
              classNames={{
                root: "row-start-3 row-end-13 col-start-13 col-end-20 bg-(--bg-secondary) p-8 rounded-2xl flex flex-col justify-between",
                "field-label": "text-(--fg-secondary) uppercase text-[14px]",
                field: "flex flex-col",
                input:
                  "h-14 text-(--fg-primary) bg-(--bg-tertiary) py-4 px-5 rounded-xl mt-1 ",
                "field-group": "flex flex-col gap-5",
                textarea:
                  "text-(--fg-primary) bg-(--bg-tertiary) py-4 px-5 rounded-xl mt-1",
                button:
                  "bg-(--brand-primary) rounded-lg h-9 text-(--fg-primary) shadow-[0_0_0_0rem_var(--brand-primary),0_0_0_var(--button-border-width)_var(--brand-primary)] font-(family-name:--font-primary-family) hover:shadow-[0_0_0_var(--button-border-width)_var(--brand-primary),0_0_0_calc(var(--button-border-width)*2)_var(--brand-primary)]",
              }}
              placeholders={{
                name: "Your name",
                email: "you@example.com",
                message: "Tell us what you need...",
              }}
            />
          </Section>
        </div>
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
