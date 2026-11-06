"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Copy,
  FileText,
  Library,
  Plus,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PiRobotThin } from "react-icons/pi";

type Source = {
  source: string;
  documentId: string;
  filename: string;
  pageNumber: number | null;
  chunkIndex: number;
  similarity: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

type StreamEvent =
  | { type: "chunk"; content: string }
  | { type: "sources"; sources: Source[] }
  | { type: "error"; error: string }
  | { type: "done" };

const SUGGESTIONS = [
  {
    title: "Summarize my documents",
    detail: "Get the main points of what you've uploaded",
    prompt: "Summarize the main points of my uploaded documents.",
  },
  {
    title: "Explain a concept simply",
    detail: "Break down a hard idea step by step",
    prompt:
      "Pick the most important concept in my documents and explain it simply, step by step.",
  },
  {
    title: "Quiz me",
    detail: "Five questions to check what you know",
    prompt:
      "Quiz me with 5 questions based on my uploaded documents. Ask one at a time.",
  },
  {
    title: "Make a study plan",
    detail: "A week of short, focused sessions",
    prompt:
      "Make me a one-week study plan for the material in my uploaded documents.",
  },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C468]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E1420]";

export default function Home() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showJump, setShowJump] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  /* ---------- Scrolling ---------- */

  function scrollToBottom(smooth = true) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distance < 80;
    stickToBottomRef.current = atBottom;
    setShowJump(!atBottom);
  }

  // Follow new text only if the user hasn't scrolled up to read.
  useEffect(() => {
    if (stickToBottomRef.current) {
      scrollToBottom(!isLoading);
    }
  }, [messages, isLoading]);

  /* ---------- Input ---------- */

  // Auto-grow the textarea up to 200px.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  /* ---------- Streaming ---------- */

  function updateAssistant(updater: (message: Message) => Message) {
    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") {
        copy[copy.length - 1] = updater(last);
      }
      return copy;
    });
  }

  async function sendMessage(text = input) {
    const content = text.trim();
    if (!content || isLoading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];

    const controller = new AbortController();
    abortControllerRef.current = controller;

    stickToBottomRef.current = true;
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((msg) => msg.content.trim().length > 0)
            .map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let errorMessage = "Something went wrong.";
        try {
          const data: { error?: string } = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // ignore
        }
        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamError: string | null = null;

      const handleLine = (line: string) => {
        if (!line.trim()) return;

        let event: StreamEvent;
        try {
          event = JSON.parse(line);
        } catch {
          return;
        }

        switch (event.type) {
          case "chunk":
            updateAssistant((msg) => ({
              ...msg,
              content: msg.content + event.content,
            }));
            break;
          case "sources":
            updateAssistant((msg) => ({ ...msg, sources: event.sources }));
            break;
          case "error":
            streamError = event.error;
            break;
          case "done":
            break;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) handleLine(line);

        if (streamError) {
          await reader.cancel().catch(() => {});
          break;
        }
      }

      buffer += decoder.decode();
      if (buffer) handleLine(buffer);

      if (streamError) throw new Error(streamError);
    } catch (error) {
      if (controller.signal.aborted) {
        updateAssistant((msg) => ({
          ...msg,
          content: msg.content.trim() ? msg.content : "Response stopped.",
        }));
        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : "Please try again.";

      updateAssistant((msg) => ({
        ...msg,
        content: msg.content.trim()
          ? `${msg.content}\n\n_${errorMessage}_`
          : `I couldn't answer that. ${errorMessage}`,
      }));
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    }
  }

  function stopGeneration() {
    abortControllerRef.current?.abort();
  }

  function clearChat() {
    if (isLoading) return;
    setMessages([]);
    setInput("");
    setShowJump(false);
    stickToBottomRef.current = true;
  }

  async function copyMessage(index: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((i) => (i === index ? null : i)), 1500);
    } catch {
      // clipboard blocked; ignore
    }
  }

  function uniqueSources(sources: Source[] = []) {
    const seen = new Set<string>();
    return sources.filter((s) => {
      const key = `${s.filename}-${s.pageNumber ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return (
    <main className="flex h-dvh flex-col bg-[#0E1420] text-[#E7EAF0] selection:bg-[#E8C468]/30">
      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        .msg-in { animation: msgIn 0.28s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
        .chat-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
        @media (prefers-reduced-motion: reduce) {
          .msg-in { animation: none; }
        }
      `}</style>

      {/* Header */}
      <header className="z-20 shrink-0 border-b border-white/[0.06] bg-[#0E1420]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#E8C468] text-[#1A1405]">
              <PiRobotThin className="size-[25px]" strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <h1 className="text-[15px] font-semibold tracking-tight">
                Nova Tech
              </h1>
              <p className="text-xs text-[#8B94A7]">
                Modal llama3.2:3b
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => router.push("/documents")}
              className={`flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-[#B7BECC] transition-colors hover:bg-white/[0.06] hover:text-white ${focusRing}`}
            >
              <Library className="size-4" />
              <span className="hidden sm:inline">Documents</span>
            </button>
            <button
              type="button"
              onClick={clearChat}
              disabled={isLoading || messages.length === 0}
              className={`flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-sm text-[#E7EAF0] transition-colors hover:border-white/[0.16] hover:bg-white/[0.04] disabled:pointer-events-none disabled:opacity-35 ${focusRing}`}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">New chat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conversation */}
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="chat-scroll h-full overflow-y-auto"
        >
          <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 sm:px-6">
            {messages.length === 0 ? (
              /* Welcome */
              <div className="msg-in flex flex-1 flex-col justify-center py-14">
                <h2 className="text-3xl font-semibold tracking-tight sm:text-[40px] sm:leading-[1.1]">
                  What are we learning today?
                </h2>
                <p className="mt-3 max-w-lg text-[15px] leading-7 text-[#8B94A7]">
                  Ask about anything, or about the files you&apos;ve uploaded.
                  When an answer uses your documents, you&apos;ll see which ones.
                </p>

                
              </div>
            ) : (
              <div className="space-y-8 py-8">
                {messages.map((message, index) => {
                  const isLast = index === messages.length - 1;
                  const isStreaming =
                    isLoading && isLast && message.role === "assistant";
                  const isWaiting = isStreaming && message.content === "";
                  const sources = uniqueSources(message.sources);

                  if (message.role === "user") {
                    return (
                      <div key={index} className="msg-in flex justify-end">
                        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[#1E2840] px-4 py-2.5 text-[15px] leading-7">
                          {message.content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="msg-in group flex gap-3.5">
                      <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md border border-[#E8C468]/25 bg-[#E8C468]/10 text-[#E8C468]">
                        <BookOpen className="size-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        {isWaiting ? (
                          <div
                            className="flex h-8 items-center gap-1.5"
                            aria-label="Thinking"
                          >
                            <span className="size-1.5 animate-bounce rounded-full bg-[#8B94A7]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-[#8B94A7] [animation-delay:150ms]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-[#8B94A7] [animation-delay:300ms]" />
                          </div>
                        ) : (
                          <div
                            className="
                              break-words text-[15px] leading-7 text-[#D5DAE3]
                              [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                              [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-white
                              [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white
                              [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-white
                              [&_p]:my-3
                              [&_strong]:font-semibold [&_strong]:text-white
                              [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-[#5D667A]
                              [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:marker:text-[#8B94A7]
                              [&_li]:my-1.5 [&_li]:pl-1
                              [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-[#E8C468]/50 [&_blockquote]:pl-4 [&_blockquote]:text-[#B7BECC]
                              [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/[0.07] [&_pre]:bg-[#0A0F19] [&_pre]:p-4 [&_pre]:text-[13px] [&_pre]:leading-6
                              [&_code]:rounded [&_code]:bg-white/[0.07] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.875em] [&_code]:text-[#F0D58C]
                              [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[#D5DAE3]
                              [&_a]:text-[#E8C468] [&_a]:underline [&_a]:decoration-[#E8C468]/40 [&_a]:underline-offset-2 hover:[&_a]:decoration-[#E8C468]
                              [&_hr]:my-6 [&_hr]:border-white/[0.08]
                              [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
                              [&_th]:border-b [&_th]:border-white/[0.12] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-white
                              [&_td]:border-b [&_td]:border-white/[0.06] [&_td]:px-3 [&_td]:py-2
                            "
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                            {isStreaming && (
                              <span className="ml-0.5 inline-block h-4 w-[3px] animate-pulse rounded-full bg-[#E8C468] align-middle" />
                            )}
                          </div>
                        )}

                        {!isStreaming && sources.length > 0 && (
                          <div className="mt-4 flex flex-wrap items-center gap-1.5">
                            <span className="mr-1 text-xs text-[#5D667A]">
                              Used
                            </span>
                            {sources.map((s) => (
                              <span
                                key={`${s.filename}-${s.pageNumber ?? ""}`}
                                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-[#B7BECC]"
                                title={s.filename}
                              >
                                <FileText className="size-3 shrink-0 text-[#E8C468]" />
                                <span className="truncate">{s.filename}</span>
                                {s.pageNumber != null && (
                                  <span className="shrink-0 text-[#5D667A]">
                                    p. {s.pageNumber}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {!isStreaming && message.content && (
                          <div className="mt-2 flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                            <button
                              type="button"
                              onClick={() =>
                                void copyMessage(index, message.content)
                              }
                              className={`flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-[#8B94A7] transition-colors hover:bg-white/[0.06] hover:text-white ${focusRing}`}
                            >
                              {copiedIndex === index ? (
                                <>
                                  <Check className="size-3.5 text-[#7FD1A0]" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3.5" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Jump to latest */}
        {showJump && messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              stickToBottomRef.current = true;
              scrollToBottom();
            }}
            aria-label="Jump to latest message"
            className={`msg-in absolute bottom-4 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-white/[0.1] bg-[#1B2436] text-[#E7EAF0] shadow-lg shadow-black/40 transition-colors hover:bg-[#222C42] ${focusRing}`}
          >
            <ArrowDown className="size-4" />
          </button>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-4 pb-4 pt-2 sm:px-6 sm:pb-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
          className="mx-auto max-w-3xl"
        >
          <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-[#141B2A] p-2 pl-4 shadow-[0_10px_40px_-16px_rgba(0,0,0,0.7)] transition-colors focus-within:border-[#E8C468]/45">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask a question…"
              aria-label="Message"
              maxLength={5000}
              rows={1}
              className="max-h-[200px] min-h-6 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-[#E7EAF0] outline-none placeholder:text-[#5D667A]"
            />

            <button
              type={isLoading ? "button" : "submit"}
              onClick={isLoading ? stopGeneration : undefined}
              disabled={!isLoading && !input.trim()}
              aria-label={isLoading ? "Stop response" : "Send message"}
              title={isLoading ? "Stop response" : "Send message"}
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-[#5D667A] ${
                isLoading
                  ? "bg-[#E7EAF0] text-[#0E1420] hover:bg-white"
                  : "bg-[#E8C468] text-[#1A1405] hover:bg-[#F0D07A]"
              } ${focusRing}`}
            >
              {isLoading ? (
                <Square className="size-3.5 fill-current" />
              ) : (
                <ArrowUp className="size-[18px]" strokeWidth={2.5} />
              )}
            </button>
          </div>

          <p className="mt-2.5 text-center text-xs text-[#5D667A]">
            Runs on Llama 3.2 3B with Ollama. Check important answers against
            your documents.
          </p>
        </form>
      </div>
    </main>
  );
}