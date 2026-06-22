"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, Search, MessageCircle, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";
import { getChatsStatus } from "@/app/dashboard/chat/actions";
import { useSocket } from "./socket-context";

interface ChatContact {
    jid: string;
    name: string | null;
    notify: string | null;
    profilePic: string | null;
    lastMessage?: {
        content: string | null;
        timestamp: string;
        type: string;
    };
}

interface ChatListProps {
    sessionId: string;
    onSelectChat: (jid: string, name?: string) => void;
    selectedJid?: string;
}

const PAGE_SIZE = 50;

function getDisplayName(chat: ChatContact): string {
    return chat.name || chat.notify || chat.jid.split('@')[0];
}

function getMessagePreview(chat: ChatContact): string {
    if (!chat.lastMessage?.content) return "No messages yet";
    const content = chat.lastMessage.content;
    if (chat.lastMessage.type !== "TEXT") {
        return `📎 ${chat.lastMessage.type.charAt(0) + chat.lastMessage.type.slice(1).toLowerCase()}`;
    }
    return content.length > 40 ? content.slice(0, 40) + "…" : content;
}

function getTimeLabel(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ChatRow({
    chat,
    isSelected,
    onSelect,
}: {
    chat: ChatContact;
    isSelected: boolean;
    onSelect: (jid: string, name?: string) => void;
}) {
    const displayName = getDisplayName(chat);
    return (
        <button
            key={chat.jid + (chat.lastMessage?.timestamp || '')}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 border-b border-border/10 overflow-hidden",
                isSelected
                    ? "bg-primary/8 border-l-2 border-l-primary"
                    : "hover:bg-muted/40 border-l-2 border-l-transparent"
            )}
            onClick={() => onSelect(chat.jid, displayName)}
        >
            <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={chat.profilePic || ""} />
                <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-primary/20 to-blue-500/20 text-primary">
                    {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex justify-between items-baseline gap-2 overflow-hidden">
                    <h4 className={cn(
                        "text-sm truncate",
                        isSelected ? "font-semibold text-primary" : "font-medium text-foreground"
                    )}>
                        {displayName}
                    </h4>
                    {chat.lastMessage && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {getTimeLabel(chat.lastMessage.timestamp)}
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {getMessagePreview(chat)}
                </p>
            </div>
        </button>
    );
}

function SkeletonRow() {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-40" />
            </div>
        </div>
    );
}

export function ChatList({ sessionId, onSelectChat, selectedJid }: ChatListProps) {
    const [chats, setChats] = useState<ChatContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isNewChatOpen, setIsNewChatOpen] = useState(false);
    const [newChatNumber, setNewChatNumber] = useState("");
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const { getSocket, joinSession } = useSocket();
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchChats = useCallback(async (loadOffset = 0, append = false) => {
        try {
            if (loadOffset === 0) setLoading(true);

            const rawChats: any = await getChatsStatus(
                sessionId,
                PAGE_SIZE,
                loadOffset,
                searchQuery || undefined
            );

            const chatMap = new Map<string, ChatContact>();
            (rawChats || []).forEach((c: any) => {
                const existing = chatMap.get(c.jid);
                if (!existing || (c.lastMessage?.timestamp && (!existing.lastMessage?.timestamp || new Date(c.lastMessage.timestamp) > new Date(existing.lastMessage.timestamp)))) {
                    chatMap.set(c.jid, c);
                }
            });

            const newChats = Array.from(chatMap.values());

            if (append) {
                setChats(prev => {
                    const merged = new Map(prev.map(c => [c.jid, c]));
                    newChats.forEach(c => {
                        const existing = merged.get(c.jid);
                        if (!existing || (c.lastMessage?.timestamp && new Date(c.lastMessage.timestamp) > new Date(existing.lastMessage!.timestamp))) {
                            merged.set(c.jid, c);
                        }
                    });
                    return Array.from(merged.values());
                });
            } else {
                setChats(newChats);
            }

            setHasMore(newChats.length >= PAGE_SIZE);
            setOffset(loadOffset + newChats.length);
        } catch (error) {
            console.error("Failed to load chats", error);
        } finally {
            setLoading(false);
        }
    }, [sessionId, searchQuery]);

    // Initial load
    useEffect(() => {
        setChats([]);
        setOffset(0);
        setHasMore(true);
        fetchChats(0, false);
    }, [fetchChats]);

    // Socket real-time updates
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const onConnect = () => joinSession(sessionId);
        if (socket.connected) joinSession(sessionId);
        socket.on("connect", onConnect);

        const handler = async (newMessages: any[]) => {
            let needsReload = false;

            setChats(prev => {
                const updated = [...prev];
                newMessages.forEach(msg => {
                    const jid = msg.remoteJid;
                    const idx = updated.findIndex(c => c.jid === jid);
                    if (idx !== -1) {
                        updated[idx] = {
                            ...updated[idx],
                            lastMessage: { content: msg.content, timestamp: msg.timestamp, type: msg.type }
                        };
                    } else {
                        needsReload = true;
                    }
                });
                updated.sort((a, b) => {
                    const tA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
                    const tB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
                    return tB - tA;
                });
                return updated;
            });

            if (needsReload) fetchChats(0, false);
        };

        socket.on("message.update", handler);
        return () => {
            socket.off("connect", onConnect);
            socket.off("message.update", handler);
        };
    }, [sessionId, getSocket, joinSession, fetchChats]);

    // Debounced search
    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setOffset(0);
            fetchChats(0, false);
        }, 300);
    };

    // Filter by search
    const filteredChats = useMemo(() => {
        if (!searchQuery.trim()) return chats;
        const q = searchQuery.toLowerCase();
        return chats.filter(chat => {
            const name = (chat.name || chat.notify || "").toLowerCase();
            const jid = chat.jid.toLowerCase();
            return name.includes(q) || jid.includes(q);
        });
    }, [chats, searchQuery]);

    const handleEndReached = useCallback(() => {
        if (hasMore && !loading && !searchQuery.trim()) {
            fetchChats(offset, true);
        }
    }, [hasMore, loading, searchQuery, fetchChats, offset]);

    const itemContent = useCallback(
        (_: number, chat: ChatContact) => (
            <ChatRow chat={chat} isSelected={selectedJid === chat.jid} onSelect={onSelectChat} />
        ),
        [selectedJid, onSelectChat]
    );

    const handleStartNewChat = () => {
        if (!newChatNumber) return;
        let clean = newChatNumber.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.substring(1);
        const jid = `${clean}@s.whatsapp.net`;
        onSelectChat(jid);
        setIsNewChatOpen(false);
        setNewChatNumber("");
    };

    if (loading && chats.length === 0) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="p-3 space-y-3">
                    <Skeleton className="h-9 w-full rounded-lg" />
                    {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden bg-background">
            {/* Header — fixed */}
            <div className="shrink-0 px-3 pt-3 pb-2 space-y-2 border-b border-border/10">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-base text-foreground">
                        Chats
                        {chats.length > 0 && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">({chats.length})</span>
                        )}
                    </h3>
                    <Button
                        variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
                        onClick={() => setIsNewChatOpen(!isNewChatOpen)}
                    >
                        {isNewChatOpen ? <X className="h-4 w-4" /> : <MessageSquarePlus className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="h-8 pl-8 text-sm bg-muted/50 border-0 rounded-lg focus-visible:ring-1"
                    />
                </div>

                {isNewChatOpen && (
                    <div className="p-2.5 bg-muted/30 rounded-lg space-y-2 border border-border/40">
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Phone Number</Label>
                        <div className="flex gap-1.5">
                            <Input
                                placeholder="628123456789"
                                value={newChatNumber}
                                onChange={(e) => setNewChatNumber(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleStartNewChat()}
                                className="h-8 text-sm"
                            />
                            <Button size="sm" className="h-8 px-3" onClick={handleStartNewChat}>Go</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Scrollable list — Virtuoso with full height */}
            <div className="flex-1 min-h-0">
                {filteredChats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                            <MessageCircle className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {searchQuery ? "No chats match your search" : "No chats yet"}
                        </p>
                    </div>
                ) : (
                    <Virtuoso
                        style={{ height: "100%" }}
                        data={filteredChats}
                        computeItemKey={(_, chat) => chat.jid}
                        itemContent={itemContent}
                        endReached={handleEndReached}
                        increaseViewportBy={200}
                        components={{
                            Footer: () =>
                                hasMore && !loading ? (
                                    <div className="py-4 text-center">
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                            Scroll for more
                                        </span>
                                    </div>
                                ) : null,
                        }}
                    />
                )}
            </div>
        </div>
    );
}
