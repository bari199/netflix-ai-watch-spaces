import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { MessageCircle, Send, Users, Radio, Smile, X } from "lucide-react";

const CHAT_EMOJIS = [
  "😀",
  "😂",
  "🥹",
  "😍",
  "🤩",
  "😎",
  "😭",
  "😮",
  "👏",
  "🙌",
  "❤️",
  "🔥",
  "💯",
  "🍿",
  "🎬",
  "👀",
  "👍",
  "👎",
  "🥳",
  "🤔",
  "🙏",
  "💀",
  "✨",
  "🤣",
];

export default function LiveChat({
  chatMessages = [],
  currentUserId,
  getUserId,
  REACTION_EMOJIS = ["❤️", "😂", "🔥", "👏", "😮"],
  handleChatReaction,
  typingUsers = [],
  chatInput,
  handleChatInputChange,
  handleChatInputBlur,
  handleSendMessage,
  isSendingMessage = false,
  chatMessagesEndRef,
}) {
  const internalEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  useEffect(() => {
    const target = chatMessagesEndRef?.current || internalEndRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatMessages, typingUsers, chatMessagesEndRef]);

  useEffect(() => {
    if (!isEmojiPickerOpen) return;

    const handlePointerDown = (event) => {
      if (!emojiPickerRef.current?.contains(event.target)) {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isEmojiPickerOpen]);

  const insertEmoji = (emoji) => {
    const nextValue = `${chatInput || ""}${emoji}`;
    // Keep compatibility with the existing React onChange handler.
    handleChatInputChange?.({ target: { value: nextValue } });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0f0f0f] text-white"
    >
      {/* Compact YouTube-inspired chat header */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07]">
            <MessageCircle size={16} className="text-white/80" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-tight">
              Live chat
            </h2>
            <p className="text-[10px] text-white/40">
              Watch together, chat together
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-red-400">
            Live
          </span>
        </div>
      </header>

      {/* Chat activity line */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <Users size={12} className="text-white/40" />
        <span className="text-[10px] text-white/45">
          {chatMessages.length} messages
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-white/35">
          <Radio size={11} className="text-green-400" />
          Real-time
        </span>
      </div>

      {/* Only this message region scrolls */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-[#0b0b0b] px-3 py-3 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent"
        aria-live="polite"
        aria-label="Live chat messages"
      >
        {chatMessages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05]">
              <MessageCircle size={19} className="text-white/35" />
            </div>
            <p className="text-xs font-medium text-white/65">
              Welcome to the chat!
            </p>
            <p className="mt-1 max-w-[220px] text-[10px] leading-relaxed text-white/35">
              Be the first to say hello and share the movie moment 🍿
            </p>
          </div>
        ) : (
          chatMessages.map((message, index) => {
            const sender = message.sender || message.user;
            const senderId = getUserId?.(sender);
            const isCurrentUser = senderId === currentUserId;
            const senderName =
              sender?.name || sender?.fullName || "Unknown User";
            const messageText =
              message.message || message.content || message.text || "";
            const avatar = sender?.avatar || sender?.avatarUrl;
            const reactions = Array.isArray(message.reactions)
              ? message.reactions
              : [];

            return (
              <motion.article
                key={message._id || index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex min-w-0 items-start gap-2.5"
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt={senderName}
                    className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/75">
                    {senderName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col items-start">
                  <div className="mb-1 flex max-w-full items-center gap-2">
                    <span className="max-w-[170px] truncate text-[11px] font-semibold text-white/75">
                      {isCurrentUser ? "You" : senderName}
                    </span>
                    {message.createdAt && (
                      <span className="shrink-0 text-[9px] text-white/30">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  <p className="max-w-full whitespace-pre-wrap break-words text-[12px] leading-[1.55] text-white/90">
                    {messageText}
                  </p>

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {REACTION_EMOJIS.map((emoji) => {
                      const matchingReactions = reactions.filter(
                        (reaction) => reaction.emoji === emoji,
                      );
                      const count = matchingReactions.length;
                      const hasReacted = matchingReactions.some(
                        (reaction) =>
                          getUserId?.(reaction.user) === currentUserId,
                      );

                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() =>
                            handleChatReaction?.(message._id, emoji)
                          }
                          disabled={!message._id}
                          aria-label={`React with ${emoji}`}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition ${
                            hasReacted
                              ? "border-red-500/50 bg-red-500/15"
                              : "border-white/10 bg-white/[0.04] hover:bg-white/10"
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          <span>{emoji}</span>
                          {count > 0 && (
                            <span className="text-white/65">{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.article>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-1 py-1">
            <div className="flex gap-1">
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400"
                  style={{ animationDelay: `${item * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-[10px] text-white/45">
              {typingUsers
                .map(
                  (typingUser) =>
                    typingUser.name || typingUser.fullName || "Someone",
                )
                .join(", ")}{" "}
              {typingUsers.length === 1 ? "is" : "are"} typing...
            </p>
          </div>
        )}

        <div ref={internalEndRef} />
      </div>

      {/* Composer stays fixed while messages scroll */}
      <footer className="shrink-0 border-t border-white/10 bg-[#111111] p-3">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="relative min-w-0 flex-1" ref={emojiPickerRef}>
            {isEmojiPickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute bottom-full left-0 z-30 mb-2 grid w-[ min(260px, calc(100vw - 64px)) ] grid-cols-8 gap-1 rounded-xl border border-white/10 bg-[#202020] p-2 shadow-2xl"
              >
                {CHAT_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-base transition hover:bg-white/10"
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}

            <div className="flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-[#080808] px-3 transition focus-within:border-white/35">
              <button
                type="button"
                onClick={() => setIsEmojiPickerOpen((open) => !open)}
                aria-label={
                  isEmojiPickerOpen ? "Close emoji picker" : "Open emoji picker"
                }
                className="shrink-0 text-white/45 transition hover:text-yellow-300"
              >
                {isEmojiPickerOpen ? <X size={17} /> : <Smile size={17} />}
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={handleChatInputChange}
                onBlur={handleChatInputBlur}
                maxLength={2000}
                placeholder="Chat..."
                aria-label="Chat message"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-white outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!chatInput?.trim() || isSendingMessage}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {isSendingMessage ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </form>
        <p className="mt-2 text-center text-[9px] text-white/25">
          Be respectful · Enjoy watching together 🍿
        </p>
      </footer>
    </motion.section>
  );
}
