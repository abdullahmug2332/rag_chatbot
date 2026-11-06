
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  MessageSquare,
  Plus,
  Send,
  Square,
} from "lucide-react";
import { BiSolidFace } from "react-icons/bi";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BsFiletypeDoc } from "react-icons/bs";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  async function sendMessage(text = input) {
    const content = text.trim();

    if (!content || isLoading) return;

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content },
    ];

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
        signal: controller.signal,
      });

      const data: { reply?: string; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      if (controller.signal.aborted) return;

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply ?? "",
        },
      ]);
    } catch (error) {
      if (controller.signal.aborted) {
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: "Request stopped.",
          },
        ]);
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Please try again.";

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: `Sorry, I couldn't respond. ${errorMessage}`,
        },
      ]);
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
  }

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  return (
    <main className="flex h-dvh flex-col bg-[#0b0d11] text-white">

      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0b0d11] px-4 py-3 sm:px-6">

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-[#1b202a]">
            <Bot className="size-6 text-white" />
          </div>

          <div>
            <h1 className="font-semibold tracking-tight text-white">
              Learning Assistant
            </h1>
            <p className="text-xs text-gray-500">
              Powered by Llama 3.2 3B · Ollama
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/documents")}
            className="border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <BsFiletypeDoc className="mr-2 size-4" />
            Documents
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            disabled={isLoading || messages.length === 0}
            className="border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <Plus className="mr-2 size-4" />
            New chat
          </Button>
        </div>
      </header>

      {/* Chat */}
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col">

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-7 px-4 py-8 sm:px-6">

            {/* Welcome screen */}
            {messages.length === 0 ? (
              <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">

                <div className="mb-6 flex size-[72px] items-center justify-center rounded-2xl border border-white/10 bg-[#171b24] shadow-xl shadow-black/20">
                  <Bot className="size-10 text-gray-200" />
                </div>

                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                  What are we learning today?
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
                  Ask questions, explore ideas, and learn something new.
                </p>

              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  className={`flex gap-3 ${
                    message.role === "user"
                      ? "flex-row-reverse"
                      : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <Avatar className="size-9 shrink-0 border border-white/10 bg-[#20242d]">
                    <AvatarFallback className="bg-[#20242d] text-gray-200">
                      {message.role === "assistant" ? (
                        <Bot className="size-5" />
                      ) : (
                        <BiSolidFace className="size-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message */}
                  <div
                    className={`min-w-0 max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-7 sm:max-w-[80%] ${
                      message.role === "user"
                        ? "rounded-tr-sm bg-[#252a35] text-white"
                        : "rounded-tl-sm border border-white/[0.06] bg-[#151922] text-gray-200"
                    }`}
                  >
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    ) : (
                      <div
                        className="
                          break-words
                          [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white
                          [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white
                          [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-white
                          [&_p]:my-2
                          [&_strong]:font-semibold [&_strong]:text-white
                          [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6
                          [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6
                          [&_li]:my-1
                          [&_blockquote]:border-l-2 [&_blockquote]:border-gray-600 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-400
                          [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-[#0b0d11] [&_pre]:p-4
                          [&_code]:rounded [&_code]:bg-[#252a35] [&_code]:px-1 [&_code]:text-gray-200
                          [&_pre_code]:bg-transparent [&_pre_code]:p-0
                          [&_a]:text-blue-400 [&_a]:underline
                          [&_hr]:my-4 [&_hr]:border-white/10
                        "
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-3">
                <Avatar className="size-9 shrink-0 border border-white/10 bg-[#20242d]">
                  <AvatarFallback className="bg-[#20242d] text-gray-200">
                    <Bot className="size-5" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-[#151922] px-4 py-3 text-sm text-gray-400">
                  <span>Thinking</span>
                  <span className="size-1.5 animate-bounce rounded-full bg-gray-400" />
                  <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="shrink-0 border-t border-white/[0.08] bg-[#0b0d11] px-4 pb-4 pt-5 sm:px-6">

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            className="relative"
          >
            <Textarea
              value={input}
              ref={inputRef}
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
              placeholder="Ask anything..."
              className="min-h-[56px] max-h-40 resize-none rounded-2xl border border-white/10 bg-[#171b24] py-4 pl-4 pr-14 text-white shadow-lg shadow-black/10 placeholder:text-gray-500 focus-visible:border-white/20 focus-visible:ring-1 focus-visible:ring-white/10"
              disabled={isLoading}
              maxLength={5000}
              rows={1}
            />

            {/* Send / Stop */}
            <Button
              type={isLoading ? "button" : "submit"}
              size="icon"
              className={`absolute right-2 top-1/2 size-9 -translate-y-1/2 rounded-xl transition-colors ${
                isLoading
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-white text-black hover:bg-gray-200"
              }`}
              disabled={!isLoading && !input.trim()}
              onClick={isLoading ? stopGeneration : undefined}
              aria-label={isLoading ? "Stop response" : "Send message"}
              title={isLoading ? "Stop response" : "Send message"}
            >
              {isLoading ? (
                <Square className="size-4 fill-current" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>

          <p className="mt-3 text-center text-xs text-gray-500">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </main>
  );
}
