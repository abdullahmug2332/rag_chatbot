"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  
  Square,
} from "lucide-react";
import { BiSolidFace } from "react-icons/bi";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ChatInput from "@/components/chat/chat-input";
type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Explain RAG in simple terms",
  "Teach me about LLMs",
  "What are AI embeddings?",
];

export default function Home() {
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

    const nextMessages: Message[] = [...messages, { role: "user", content }];

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

      const data: { reply?: string; error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      // Ignore a response if this request was cancelled.
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
        error instanceof Error ? error.message : "Please try again.";

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
    <main className="flex h-dvh flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bot className="size-6" />
          </div>

          <div>
            <h1 className="font-semibold tracking-tight">
              Learning Assistant
            </h1>
            <p className="text-xs text-muted-foreground">
              Powered by Llama 3.2 3B · Ollama
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={clearChat}
          disabled={isLoading || messages.length === 0}
        >
          <Plus className="mr-2 size-4" />
          New chat
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-4xl min-h-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-4 py-6 sm:px-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="size-10 text-primary" />
                </div>

                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  What are we learning today?
                </h2>

                <p className="mt-3 max-w-md text-sm text-muted-foreground">
                  Ask questions about anything you like.
                </p>

                <div className="mt-8 grid w-full max-w-lg gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      className="h-auto justify-start whitespace-normal px-4 py-3 text-left"
                      onClick={() => void sendMessage(suggestion)}
                      disabled={isLoading}
                    >
                      <MessageSquare className="mr-3 size-4 shrink-0" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  className={`flex gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className="size-8 shrink-0 bg-black!">
                    <AvatarFallback
                      className={
                        message.role === "assistant" 
                          ? " text-primary-foreground bg-black!"
                          : "bg-muted bg-black!"
                      }
                    >
                      {message.role === "assistant" ? (
                        <Bot className="size-5" />
                      ) : (
                        <BiSolidFace className="size-5 bg-black text-white" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-2 text-sm leading-7 sm:max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
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
                                [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-bold
                                [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold
                                [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-semibold
                                [&_p]:my-2
                                [&_strong]:font-semibold
                                [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6
                                [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6
                                [&_li]:my-1
                                [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic
                                [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background [&_pre]:p-3
                                [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1
                                [&_pre_code]:bg-transparent [&_pre_code]:p-0
                                [&_a]:text-primary [&_a]:underline
                                [&_hr]:my-4 [&_hr]:border-border
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

            {isLoading && (
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="size-4" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <span className="text-black">Daya pata lgao </span>
                  <span className="size-2 animate-bounce rounded-full bg-current" />
                  <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                  <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t bg-background p-4 sm:px-6">
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
              className="min-h-[56px] max-h-40 resize-none rounded-2xl py-4 pl-4 pr-14"
              disabled={isLoading}
              maxLength={5000}
              rows={1}
            />

            <Button
              type={isLoading ? "button" : "submit"}
              size="icon"
              className="absolute bottom-2 right-2 rounded-xl"
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

          <p className="mt-2 text-center text-xs text-muted-foreground">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </main>
  );
}
