"use client";

import { useChat } from "ai/react";
import { Bot, Loader2, Minimize2, RefreshCw, Send, User } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WidgetTenant {
  slug: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  welcomeMessage: string;
  logoUrl: string | null;
}

interface WidgetChatProps {
  tenant: WidgetTenant;
  embedded?: boolean;
}

export function WidgetChat({ tenant, embedded = false }: WidgetChatProps) {
  const [sessionId, setSessionId] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem(`session-${tenant.slug}`) || nanoid()
      : nanoid(),
  );
  const [isMinimized, setIsMinimized] = useState(embedded);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Save session ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`session-${tenant.slug}`, sessionId);
    }
  }, [sessionId, tenant.slug]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } =
    useChat({
      api: `/api/widget/${tenant.slug}/chat`,
      body: { sessionId },
      initialMessages: [
        {
          id: "welcome",
          role: "assistant",
          content: tenant.welcomeMessage,
        },
      ],
    });

  // Start a new conversation with fresh session
  const handleNewConversation = () => {
    const newSessionId = nanoid();
    setSessionId(newSessionId);
    if (typeof window !== "undefined") {
      localStorage.setItem(`session-${tenant.slug}`, newSessionId);
    }
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: tenant.welcomeMessage,
      },
    ]);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const primaryStyle = {
    "--primary-color": tenant.primaryColor,
    "--accent-color": tenant.accentColor,
  } as React.CSSProperties;

  if (embedded && isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: tenant.primaryColor }}
      >
        <Bot className="h-6 w-6 text-white" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        embedded
          ? "fixed bottom-4 right-4 h-[600px] w-96 overflow-hidden rounded-xl border shadow-2xl"
          : "h-screen",
      )}
      style={primaryStyle}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 text-white"
        style={{ backgroundColor: tenant.primaryColor }}
      >
        <div className="flex items-center gap-3">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} className="h-8 w-8 rounded" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Bot className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="font-semibold">{tenant.name}</h2>
            <p className="text-xs opacity-80">AI Support</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleNewConversation}
            title="New conversation"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {embedded && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            if (message.role === "assistant" && !message.content.trim()) {
              return null;
            }

            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3",
                  message.role === "user" && "flex-row-reverse",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "assistant" ? "bg-muted" : "",
                  )}
                  style={
                    message.role === "user"
                      ? { backgroundColor: tenant.primaryColor }
                      : undefined
                  }
                >
                  {message.role === "assistant" ? (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-white" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2",
                    message.role === "assistant"
                      ? "rounded-tl-none bg-muted"
                      : "rounded-tr-none text-white",
                  )}
                  style={
                    message.role === "user"
                      ? { backgroundColor: tenant.primaryColor }
                      : undefined
                  }
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <Bot className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{ backgroundColor: tenant.primaryColor }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Powered by SupportHub
        </p>
      </form>
    </div>
  );
}
