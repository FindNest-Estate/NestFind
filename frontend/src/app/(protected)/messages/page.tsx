'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    MessageCircle,
    Send,
    ArrowLeft,
    Loader2,
    AlertCircle,
    User,
    Home,
    Inbox
} from 'lucide-react';
import { get, post, put } from '@/lib/api';

/**
 * Messages Page - /messages
 * 
 * Conversation list with message thread view.
 */

interface OtherParty {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface Conversation {
    id: string;
    property_id: string | null;
    property_title: string | null;
    other_party: OtherParty;
    last_message: string | null;
    last_message_at: string | null;
    unread_count: number;
    updated_at: string;
}

interface Message {
    id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    is_own: boolean;
    read_at: string | null;
    created_at: string;
}

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.toLocaleDateString('en-IN', { weekday: 'short' });
    } else {
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
}

// Helper to determine if a message should show a date divider
function shouldShowDateDivider(currentMsg: Message, prevMsg: Message | null): boolean {
    if (!prevMsg) return true;
    
    const currDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    
    return currDate !== prevDate;
}

// Helper to format date for the divider (e.g., "Today", "Yesterday", "Mar 12")
function formatDateDivider(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.setHours(0,0,0,0) - date.setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MessagesPage() {
    const searchParams = useSearchParams();
    const activeId = searchParams.get('id');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingConvs, setIsLoadingConvs] = useState(true);
    const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load conversations
    useEffect(() => {
        async function load() {
            try {
                const data = await get<{ conversations: Conversation[] }>('/conversations');
                setConversations(data.conversations);

                // If activeId from URL, select that conversation
                if (activeId) {
                    const conv = data.conversations.find(c => c.id === activeId);
                    if (conv) setActiveConversation(conv);
                }
            } catch (err: any) {
                setError(err?.message || 'Failed to load conversations');
            } finally {
                setIsLoadingConvs(false);
            }
        }
        load();
    }, [activeId]);

    // WebSocket Integration
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Clean up previous connection if any
        if (wsRef.current) {
            wsRef.current.close();
        }

        const wsUrl = `ws://localhost:8000/api/ws/user?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('WebSocket connected');
            // Start ping loop to keep alive
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, 30000);
            (ws as any)._pingInterval = pingInterval;
        };

        ws.onmessage = (event) => {
            if (event.data === 'pong') return;

            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'new_message') {
                    // 1. Update active message thread if it belongs to the current conversation
                    setMessages(prev => {
                        // We check activeConversation.id inside the setter to get latest state context
                        // but since we can't easily access the current activeConversation state inside here accurately without adding it to dependencies (which resets WS),
                        // we use a trick: we compare against the `conversation_id` in the payload.
                        // Actually, better approach: use a ref for activeConversationId or just rely on the fact that if the message belongs here, we insert it.
                        return prev;
                    });
                    
                    // The safe way to access current state inside event listener without recreating the listener
                    setActiveConversation(currActive => {
                        if (currActive?.id === data.conversation_id) {
                            // Only append if it's not already there (prevent duplicates if REST call was slightly faster)
                            setMessages(prevMsgs => {
                                if (!prevMsgs.find(m => m.id === data.message.id)) {
                                    return [...prevMsgs, data.message];
                                }
                                return prevMsgs;
                            });
                            
                            // Mark read automatically since user is looking at it
                            put(`/conversations/${data.conversation_id}/read`, {}).catch(console.error);
                        }
                        return currActive;
                    });

                    // 2. Update conversation list sidebar
                    setConversations(prev => {
                        return prev.map(conv => {
                            if (conv.id === data.conversation_id) {
                                return {
                                    ...conv,
                                    last_message: data.message.content,
                                    last_message_at: data.message.created_at,
                                    // Only increment unread if it's not the active conversation
                                    unread_count: (activeConversation?.id !== data.conversation_id) 
                                        ? conv.unread_count + 1 
                                        : conv.unread_count
                                };
                            }
                            return conv;
                        });
                    });
                }
            } catch (err) {
                console.error('Error parsing websocket message:', err);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            if ((ws as any)._pingInterval) {
                clearInterval((ws as any)._pingInterval);
            }
        };

        wsRef.current = ws;

        return () => {
            if (wsRef.current) {
                if ((wsRef.current as any)._pingInterval) {
                    clearInterval((wsRef.current as any)._pingInterval);
                }
                wsRef.current.close();
            }
        };
    }, []); // Empty dependency array means this runs once on mount

    // Load messages when conversation selected
    const loadMessages = useCallback(async (convId: string) => {
        setIsLoadingMsgs(true);
        try {
            const data = await get<{ messages: Message[] }>(`/conversations/${convId}/messages`);
            setMessages(data.messages);
            // Mark as read
            await put(`/conversations/${convId}/read`, {});
        } catch (err: any) {
            setError(err?.message || 'Failed to load messages');
        } finally {
            setIsLoadingMsgs(false);
        }
    }, []);

    useEffect(() => {
        if (activeConversation) {
            loadMessages(activeConversation.id);
        }
    }, [activeConversation, loadMessages]);

    const handleSelectConversation = (conv: Conversation) => {
        setActiveConversation(conv);
        // Update URL without navigation
        window.history.pushState({}, '', `/messages?id=${conv.id}`);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeConversation || isSending) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        try {
            // Optimistic update
            const optimisticMsg: Message = {
                id: `temp-${Date.now()}`,
                sender_id: 'me', // Real ID will come from backend
                sender_name: 'Me',
                content: content,
                is_own: true,
                read_at: null,
                created_at: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, optimisticMsg]);
            
            // Update sidebar optimistically
            setConversations(prev => prev.map(c => 
                c.id === activeConversation.id 
                    ? { ...c, last_message: content, last_message_at: new Date().toISOString() }
                    : c
            ));

            const response = await post<{ message_id: string }>(`/conversations/${activeConversation.id}/messages`, { content });
            
            // Replace optimistic ID with real ID
            setMessages(prev => prev.map(m => 
                m.id === optimisticMsg.id ? { ...m, id: response.message_id } : m
            ));
        } catch (err: any) {
            setError(err?.message || 'Failed to send message');
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
            setNewMessage(content); // Restore message
        } finally {
            setIsSending(false);
            scrollToBottom();
        }
    };

    if (isLoadingConvs) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] glass-card border border-white/60 bg-white/40 backdrop-blur-xl rounded-2xl overflow-hidden shadow-xl drop-shadow-sm">
            {/* Background Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-[var(--color-brand)]/5 pointer-events-none -z-10" />

            {/* Conversation List */}
            <div className={`w-full md:w-80 lg:w-96 border-r border-white/50 bg-white/60 flex flex-col relative z-10 ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-5 border-b border-gray-100/50 bg-white/40 backdrop-blur">
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Messages</h1>
                    <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-widest">Inbox</p>
                </div>

                {conversations.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center">
                            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No conversations yet</p>
                            <p className="text-sm text-gray-400 mt-1">Contact an agent from a property listing</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv)}
                                className={`w-full p-4 flex gap-4 transition-all text-left border-b border-white hover:bg-white/80 ${
                                    activeConversation?.id === conv.id 
                                        ? 'bg-white shadow-sm border-l-4 border-l-indigo-600' 
                                        : 'bg-white/30'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center border shadow-sm ${activeConversation?.id === conv.id ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gradient-to-br from-indigo-50 to-white text-indigo-600 border-indigo-100'}`}>
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className={`font-bold text-[15px] truncate ${conv.unread_count > 0 ? 'text-gray-900' : 'text-gray-800'}`}>{conv.other_party.name}</span>
                                        {conv.last_message_at && (
                                            <span className={`text-[10px] font-black tracking-widest uppercase ml-2 flex-shrink-0 ${conv.unread_count > 0 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                {formatTime(conv.last_message_at)}
                                            </span>
                                        )}
                                    </div>
                                    {conv.property_title && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md w-fit mb-1 border border-indigo-100/50 shadow-sm">
                                            <Home className="w-3 h-3" />
                                            <span className="truncate">{conv.property_title}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between gap-3">
                                        <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-gray-900 font-semibold text-sm' : 'text-gray-500 font-medium'}`}>
                                            {conv.last_message || 'No messages yet'}
                                        </p>
                                        {conv.unread_count > 0 && (
                                            <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-md">
                                                {conv.unread_count}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Message Thread */}
            <div className={`flex-1 flex flex-col relative z-10 ${activeConversation ? 'flex' : 'hidden md:flex'}`}>
                {activeConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 md:px-6 border-b border-white/60 bg-white/60 backdrop-blur-md flex items-center gap-4 py-5 shadow-sm">
                            <button
                                onClick={() => setActiveConversation(null)}
                                className="md:hidden p-2 text-gray-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="w-12 h-12 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-indigo-600">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="font-black text-lg text-gray-900 tracking-tight">{activeConversation.other_party.name}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">{activeConversation.other_party.role}</div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-white/20">
                            {isLoadingMsgs ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <MessageCircle className="w-10 h-10 mx-auto mb-2" />
                                    <p>No messages yet. Say hello!</p>
                                </div>
                            ) : (
                                messages.map((msg, index) => {
                                    const showDivider = shouldShowDateDivider(msg, index > 0 ? messages[index - 1] : null);
                                    
                                    return (
                                        <React.Fragment key={msg.id}>
                                            {showDivider && (
                                                <div className="flex justify-center my-6">
                                                    <span className="px-3 py-1 bg-white/60 backdrop-blur border border-white/50 shadow-sm text-[10px] font-black tracking-widest uppercase text-indigo-400 rounded-full">
                                                        {formatDateDivider(msg.created_at)}
                                                    </span>
                                                </div>
                                            )}
                                            <div
                                                className={`flex ${msg.is_own ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${msg.is_own
                                                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tr-sm border border-indigo-700/50'
                                                        : 'bg-white text-gray-900 rounded-tl-sm border border-white'
                                                    }`}>
                                                    <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed">{msg.content}</p>
                                                    <div className={`text-[10px] font-bold tracking-widest uppercase mt-2 text-right ${msg.is_own ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 md:p-5 border-t border-white/60 bg-white/70 backdrop-blur-md">
                            <div className="flex gap-3 relative">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    placeholder="Type your message..."
                                    className="flex-1 px-6 py-3.5 bg-white border border-gray-100 shadow-inner rounded-full focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 font-medium text-gray-900 placeholder:text-gray-400 transition-all outline-none"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim() || isSending}
                                    className="p-3.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-md transition-all flex items-center justify-center min-w-[52px]"
                                >
                                    {isSending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5 -ml-0.5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 bg-white/20">
                        <div className="text-center bg-white/60 backdrop-blur-md p-10 rounded-3xl border border-white shadow-sm max-w-sm mx-auto">
                            <div className="w-20 h-20 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-center mx-auto mb-5 shadow-inner">
                                <MessageCircle className="w-10 h-10 text-indigo-400" />
                            </div>
                            <p className="text-xl font-black text-gray-900 tracking-tight">Select a conversation</p>
                            <p className="text-[13px] font-medium text-gray-500 mt-2 leading-relaxed">Choose from your existing conversations in the inbox to continue chatting.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Toast */}
            {error && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 shadow-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">×</button>
                </div>
            )}
        </div>
    );
}
