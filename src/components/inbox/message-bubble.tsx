"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Message, MessageReaction } from "@/types";
import {
  Clock,
  Check,
  CheckCheck,
  XCircle,
  FileText,
  MapPin,
  LayoutTemplate,
  ImageOff,
  CornerDownLeft,
  ExternalLink,
  X,
  Download,
  Play,
  FileDown,
  Link as LinkIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ReplyQuote } from "./reply-quote";
import { MessageReactions } from "./message-reactions";

interface MessageBubbleProps {
  message: Message;
  /** Pre-computed quote info for messages that reply to another. */
  reply?: { authorLabel: string; preview: string } | null;
  reactions?: MessageReaction[];
  currentUserId?: string;
  onToggleReaction?: (emoji: string) => void;
  translation?: TranslationSettings;
}

export interface TranslationSettings {
  enabled: boolean;
  targetLanguage: string;
}

function StatusIcon({ status }: { status: Message["status"] }) {
  switch (status) {
    case "sending":
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    case "sent":
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-400" />;
    case "failed":
      return <XCircle className="h-3 w-3 text-red-400" />;
    default:
      return null;
  }
}

function MediaUnavailable({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <ImageOff className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{label} unavailable</span>
    </div>
  );
}

type MediaViewerState =
  | { type: "image"; url: string; title: string }
  | { type: "video"; url: string; title: string };

function downloadUrlFor(url: string) {
  return url.startsWith("/api/whatsapp/media/")
    ? `${url}?download=1`
    : url;
}

function MediaViewer({
  viewer,
  onClose,
}: {
  viewer: MediaViewerState | null;
  onClose: () => void;
}) {
  const stateIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!viewer) return;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    stateIdRef.current = id;
    window.history.pushState({ adsrahuMediaViewer: id }, "", window.location.href);
    document.body.style.overflow = "hidden";

    const handlePopState = () => {
      stateIdRef.current = null;
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("popstate", handlePopState);
    };
  }, [viewer, onClose]);

  const handleClose = useCallback(() => {
    const stateId = stateIdRef.current;
    stateIdRef.current = null;
    onClose();
    if (stateId && window.history.state?.adsrahuMediaViewer === stateId) {
      window.history.back();
    }
  }, [onClose]);

  if (!viewer) return null;

  const downloadHref = downloadUrlFor(viewer.url);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={viewer.title}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 bg-black/80 px-3 backdrop-blur sm:px-4">
        <button
          type="button"
          onClick={handleClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
          aria-label="Close preview"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-medium">
          {viewer.title}
        </p>
        <a
          href={downloadHref}
          download
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10"
          aria-label="Download"
        >
          <Download className="h-5 w-5" />
        </a>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-4">
        {viewer.type === "image" ? (
          <img
            src={viewer.url}
            alt={viewer.title}
            className="max-h-full max-w-full touch-pan-y object-contain"
          />
        ) : (
          <video
            src={viewer.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full rounded-md bg-black"
          />
        )}
      </div>
    </div>
  );
}

function MediaImage({ url, alt }: { url: string; alt: string }) {
  const [error, setError] = useState(false);
  const [viewer, setViewer] = useState<MediaViewerState | null>(null);

  const handleOpen = useCallback(() => {
    setViewer({ type: "image", url, title: alt });
  }, [alt, url]);

  if (error) {
    return (
      <div className="flex h-40 w-60 items-center justify-center rounded-lg bg-muted">
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="group relative block overflow-hidden rounded-lg text-left"
        title="Open image"
      >
        <img
          src={url}
          alt={alt}
          className="max-h-64 max-w-60 object-cover"
          onError={() => setError(true)}
        />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 py-2 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          <span>Tap to view</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </span>
      </button>
      <MediaViewer viewer={viewer} onClose={() => setViewer(null)} />
    </>
  );
}

function MediaVideo({ url }: { url: string }) {
  const [error, setError] = useState(false);
  const [viewer, setViewer] = useState<MediaViewerState | null>(null);
  if (error) return <MediaUnavailable label="Video" />;
  return (
    <div className="relative overflow-hidden rounded-lg bg-black">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="max-h-64 max-w-60 bg-black"
        onError={() => setError(true)}
      />
      <button
        type="button"
        onClick={() => setViewer({ type: "video", url, title: "Shared video" })}
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        aria-label="Open video full screen"
        title="Open video"
      >
        <Play className="h-4 w-4 fill-current" />
      </button>
      <MediaViewer viewer={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}

function MediaAudio({ url }: { url: string }) {
  const [error, setError] = useState(false);
  if (error) return <MediaUnavailable label="Audio" />;
  return <audio src={url} controls className="max-w-60" onError={() => setError(true)} />;
}

function MediaDocument({
  url,
  label,
}: {
  url: string;
  label: string;
}) {
  const href = downloadUrlFor(url);
  const extension = label.includes(".") ? label.split(".").pop()?.toUpperCase() : "FILE";

  return (
    <div className="w-60 rounded-xl border border-border/70 bg-background/70 p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label || "Document"}</p>
          <p className="text-[10px] uppercase text-muted-foreground">{extension}</p>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-muted px-2 text-xs font-medium hover:bg-muted/80"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </a>
        <a
          href={href}
          download
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
        >
          <FileDown className="h-3.5 w-3.5" />
          Download
        </a>
      </div>
    </div>
  );
}

const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const URL_ONLY_RE = /^(https?:\/\/[^\s<]+|www\.[^\s<]+)$/i;

function normalizeHref(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function firstUrl(text: string) {
  return text.match(URL_RE)?.[0] ?? null;
}

function LinkPreview({ url }: { url: string }) {
  const href = normalizeHref(url);
  const domain = useMemo(() => {
    try {
      return new URL(href).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }, [href, url]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="mt-2 flex max-w-60 items-center gap-2 rounded-xl border border-border/70 bg-background/70 p-2 text-xs hover:bg-muted/70"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <LinkIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{domain}</span>
        <span className="block truncate text-muted-foreground">{url}</span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, index) => {
        if (!URL_ONLY_RE.test(part)) return <span key={index}>{part}</span>;
        const href = normalizeHref(part);
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-current/40 underline-offset-2 hover:decoration-current"
            onClick={(event) => event.stopPropagation()}
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

function TranslatedText({
  text,
  settings,
}: {
  text?: string | null;
  settings?: TranslationSettings;
}) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const source = text?.trim();
    if (!settings?.enabled || !source) {
      return;
    }

    let cancelled = false;
    const cacheKey = `adsrahu:translation:${settings.targetLanguage}:${source}`;
    const cached =
      typeof sessionStorage !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
    if (cached) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setTranslation(cached);
          setLoading(false);
        }
      });
      return;
    }

    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoading(true);
          setTranslation(null);
        }
      })
      .then(() =>
        fetch('/api/ai/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: source,
            target_language: settings.targetLanguage,
          }),
        }),
      )
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? 'Translation failed');
        return data?.translation as string | undefined;
      })
      .then((value) => {
        const cleaned = value?.trim() || null;
        if (cleaned && typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(cacheKey, cleaned);
        }
        if (!cancelled) setTranslation(cleaned);
      })
      .catch(() => {
        if (!cancelled) setTranslation(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [settings?.enabled, settings?.targetLanguage, text]);

  if (!settings?.enabled || !text?.trim()) return null;

  return (
    <div className="mt-2 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1.5 text-xs">
      <p className="mb-0.5 font-medium text-primary">
        {loading ? 'Translating...' : `Translated to ${settings.targetLanguage}`}
      </p>
      {translation && (
        <p className="whitespace-pre-wrap break-words text-foreground">
          <LinkifiedText text={translation} />
        </p>
      )}
    </div>
  );
}

function MessageContent({
  message,
  translation,
}: {
  message: Message;
  translation?: TranslationSettings;
}) {
  const previewUrl = message.content_text ? firstUrl(message.content_text) : null;
  const canTranslate =
    message.sender_type === 'customer' &&
    (message.content_type === 'text' ||
      message.content_type === 'image' ||
      message.content_type === 'video' ||
      message.content_type === 'document' ||
      message.content_type === 'interactive');

  switch (message.content_type) {
    case "text":
      return (
        <div>
          <p className="whitespace-pre-wrap break-words text-sm">
            <LinkifiedText text={message.content_text ?? ""} />
          </p>
          {previewUrl && <LinkPreview url={previewUrl} />}
          {canTranslate && (
            <TranslatedText text={message.content_text} settings={translation} />
          )}
        </div>
      );

    case "image":
      return (
        <div>
          {message.media_url ? (
            <MediaImage url={message.media_url} alt="Shared image" />
          ) : (
            <MediaUnavailable label="Image" />
          )}
          {message.content_text && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              <LinkifiedText text={message.content_text} />
            </p>
          )}
          {previewUrl && <LinkPreview url={previewUrl} />}
          {canTranslate && (
            <TranslatedText text={message.content_text} settings={translation} />
          )}
        </div>
      );

    case "video":
      return (
        <div>
          {message.media_url ? (
            <MediaVideo url={message.media_url} />
          ) : (
            <MediaUnavailable label="Video" />
          )}
          {message.content_text && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              <LinkifiedText text={message.content_text} />
            </p>
          )}
          {previewUrl && <LinkPreview url={previewUrl} />}
          {canTranslate && (
            <TranslatedText text={message.content_text} settings={translation} />
          )}
        </div>
      );

    case "audio":
      return (
        <div>
          {message.media_url ? (
            <MediaAudio url={message.media_url} />
          ) : (
            <MediaUnavailable label="Audio" />
          )}
        </div>
      );

    case "document":
      if (!message.media_url) {
        return <MediaUnavailable label={message.content_text || "Document"} />;
      }
      return (
        <div>
          <MediaDocument
            url={message.media_url}
            label={message.content_text || "Document"}
          />
          {canTranslate && (
            <TranslatedText text={message.content_text} settings={translation} />
          )}
        </div>
      );

    case "template":
      return (
        <div>
          <span className="mb-1 inline-flex items-center gap-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <LayoutTemplate className="h-3 w-3" />
            Template
          </span>
          {message.content_text && (
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              <LinkifiedText text={message.content_text} />
            </p>
          )}
        </div>
      );

    case "location":
      return (
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span>{message.content_text || "Location shared"}</span>
        </div>
      );

    case "interactive": {
      // Customer tapped a reply button or list row on a message the bot
      // sent. We show the tapped option's title (already in content_text,
      // set by parseMessageContent in the webhook) with a small affordance
      // so agents reading the inbox can tell at a glance that this is a
      // tap rather than the customer typing the same words.
      return (
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <CornerDownLeft className="h-3 w-3" />
            Button reply
          </span>
          <p className="whitespace-pre-wrap break-words text-sm">
            <LinkifiedText text={message.content_text || "[Interactive reply]"} />
          </p>
          {canTranslate && (
            <TranslatedText text={message.content_text} settings={translation} />
          )}
        </div>
      );
    }

    default:
      return (
        <p className="whitespace-pre-wrap break-words text-sm">
          <LinkifiedText text={message.content_text || "[Unsupported message type]"} />
        </p>
      );
  }
}

export function MessageBubble({
  message,
  reply,
  reactions,
  currentUserId,
  onToggleReaction,
  translation,
}: MessageBubbleProps) {
  const isAgent = message.sender_type === "agent" || message.sender_type === "bot";
  const time = format(new Date(message.created_at), "HH:mm");

  // Row alignment + width cap are owned by <MessageActions> so its hover
  // group matches the bubble's content area, not the full row.
  return (
    <div
      className={cn(
        "flex flex-col",
        isAgent ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "relative rounded-2xl px-3 py-2",
          isAgent
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground",
        )}
      >
        {reply && (
          <ReplyQuote
            authorLabel={reply.authorLabel}
            preview={reply.preview}
            onPrimary={isAgent}
          />
        )}
        <MessageContent message={message} translation={translation} />
        <div
          className={cn(
            "mt-1 flex items-center gap-1",
            isAgent ? "justify-end" : "justify-start",
          )}
        >
          <span
            className={cn(
              "text-[10px]",
              // Outbound bubbles sit on the primary fill, so the
              // timestamp must read against that (not the neutral
              // foreground) — otherwise it goes low-contrast in light
              // mode. Inbound bubbles use the muted surface.
              isAgent ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            {time}
          </span>
          {isAgent && <StatusIcon status={message.status} />}
        </div>
      </div>
      {reactions && reactions.length > 0 && onToggleReaction && (
        <MessageReactions
          reactions={reactions}
          currentUserId={currentUserId}
          onToggle={onToggleReaction}
        />
      )}
    </div>
  );
}
