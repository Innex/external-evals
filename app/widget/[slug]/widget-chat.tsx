"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

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
  const [sessionId] = useState(() => 
    typeof window !== "undefined" 
      ? localStorage.getItem(`session-${tenant.slug}`) || nanoid()
      : nanoid()
  );
  const [isMinimized, setIsMinimized] = useState(embedded);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Save session ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`session-${tenant.slug}`, sessionId);
    }
  }, [sessionId, tenant.slug]);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
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
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        style={{ backgroundColor: tenant.primaryColor }}
      >
        <Bot className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div 
      className={cn(
        "flex flex-col bg-background",
        embedded ? "fixed bottom-4 right-4 w-96 h-[600px] rounded-xl shadow-2xl border overflow-hidden" : "h-screen"
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
            <img src={tenant.logoUrl} alt={tenant.name} className="w-8 h-8 rounded" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="font-semibold">{tenant.name}</h2>
            <p className="text-xs opacity-80">AI Support</p>
          </div>
        </div>
        {embedded && (
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-3",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  message.role === "assistant" 
                    ? "bg-muted" 
                    : ""
                )}
                style={message.role === "user" ? { backgroundColor: tenant.primaryColor } : undefined}
              >
                {message.role === "assistant" ? (
                  <Bot className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-4 py-2 max-w-[80%]",
                  message.role === "assistant"
                    ? "bg-muted rounded-tl-none"
                    : "text-white rounded-tr-none"
                )}
                style={message.role === "user" ? { backgroundColor: tenant.primaryColor } : undefined}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
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
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Powered by SupportHub
        </p>
      </form>
    </div>
  );
}

