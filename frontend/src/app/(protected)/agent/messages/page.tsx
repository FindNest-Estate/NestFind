'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Send,
    Paperclip,
    MoreVertical,
    Phone,
    Video,
    Star,
    Archive,
    Trash2,
    ChevronLeft,
    Smile,
    Image as ImageIcon,
    Check,
    CheckCheck,
    Clock,
    Loader2,
    MessageSquare
} from 'lucide-react';
import { getAgentMessages, sendAgentMessage, Conversation as APIConversation } from '@/lib/api/agent';

// Types
interface Message {
    id: string;
    content: string;
    timestamp: string;
    sender: 'agent' | 'client';
    status: 'sent' | 'delivered' | 'read';
    type: 'text' | 'image' | 'document';
}

interface Conversation {
    id: string;
    client: {
        id: string;
        name: string;
        avatar?: string;
        type: 'BUYER' | 'SELLER';
        property?: string;
    };
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    messages: Message[];
    starred: boolean;
}

// Quick reply templates
const quickReplies = [
    'Thank you for your interest!',
    'I will schedule a visit for you.',
    'The property is available for viewing.',
    'I will share the documents shortly.',
    'Please let me know your preferred time.'
];

// Chat Bubble Component
function ChatBubble({ message, isLast }: { message: Message; isLast: boolean }) {
    const isAgent = message.sender === 'agent';

    return (
        <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'} mb-3`}>
            <div className={`max-w-[70%] ${isAgent ? 'order-2' : ''}`}>
                <div className={`px-4 py-2.5 rounded-2xl ${isAgent
                    ? 'bg-rose-500 text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                    }`}>
                    <p className="text-sm">{message.content}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 ${isAgent ? 'justify-end' : ''}`}>
                    <span className="text-[10px] text-gray-400">{message.timestamp}</span>
                    {isAgent && (
                        <span className="text-gray-400">
                            {message.status === 'read' ? (
                                <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : message.status === 'delivered' ? (
                                <CheckCheck className="w-3 h-3" />
                            ) : (
                                <Check className="w-3 h-3" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// Conversation List Item
function ConversationItem({
    conversation,
    isActive,
    onClick
}: {
    conversation: Conversation;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors rounded-xl ${isActive ? 'bg-rose-50' : 'hover:bg-gray-50'
                }`}
        >
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${conversation.client.type === 'BUYER'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                : 'bg-gradient-to-br from-rose-500 to-pink-500'
                }`}>
                {conversation.client.name.charAt(0)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                        {conversation.client.name}
                    </h4>
                    <span className={`text-[10px] ${conversation.unreadCount > 0 ? 'text-rose-500 font-bold' : 'text-gray-400'}`}>
                        {conversation.lastMessageTime}
                    </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-500 truncate">{conversation.lastMessage}</p>
                    {conversation.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {conversation.unreadCount}
                        </span>
                    )}
                </div>
                {conversation.client.property && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate">
                        🏠 {conversation.client.property}
                    </p>
                )}
            </div>

            {conversation.starred && (
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
            )}
        </div>
    );
}

export default function MessagesPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [isMobileViewChat, setIsMobileViewChat] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch conversations from database on mount
    useEffect(() => {
        async function loadConversations() {
            setIsLoading(true);
            try {
                const response = await getAgentMessages();
                if (response.success && response.conversations) {
                    // Transform API response to local format
                    const transformed: Conversation[] = response.conversations.map(c => ({
                        id: c.id,
                        client: {
                            id: c.id,
                            name: c.contact_name,
                            type: c.contact_type,
                            property: c.property_title
                        },
                        lastMessage: c.last_message,
                        lastMessageTime: new Date(c.last_message_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        unreadCount: c.unread_count,
                        messages: c.messages?.map(m => ({
                            id: m.id,
                            content: m.content,
                            timestamp: new Date(m.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                            sender: m.sender_id === c.id ? 'client' as const : 'agent' as const,
                            status: m.read ? 'read' as const : 'sent' as const,
                            type: 'text' as const
                        })) || [],
                        starred: false
                    }));
                    setConversations(transformed);
                }
            } catch (error) {
                console.error('Failed to load messages:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadConversations();
    }, []);

    useEffect(() => {
        if (conversations.length > 0 && !activeConversation) {
            setActiveConversation(conversations[0]);
        }
    }, [conversations]);

    const handleSendMessage = () => {
        if (!message.trim() || !activeConversation) return;

        const newMessage: Message = {
            id: `m-${Date.now()}`,
            content: message,
            timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            sender: 'agent',
            status: 'sent',
            type: 'text'
        };

        setConversations(conversations.map(c =>
            c.id === activeConversation.id
                ? { ...c, messages: [...c.messages, newMessage], lastMessage: message }
                : c
        ));
        setActiveConversation({
            ...activeConversation,
            messages: [...activeConversation.messages, newMessage]
        });
        setMessage('');
        setShowQuickReplies(false);
    };

    const handleQuickReply = (reply: string) => {
        setMessage(reply);
        setShowQuickReplies(false);
    };

    const filteredConversations = conversations.filter(c =>
        c.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.client.property?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-120px)] flex bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {/* Conversations Sidebar */}
            <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${isMobileViewChat ? 'hidden md:flex' : ''}`}>
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-900 mb-3">Messages</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button className="flex-1 py-2 text-sm font-medium text-rose-600 border-b-2 border-rose-500">
                        All
                    </button>
                    <button className="flex-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                        Unread
                    </button>
                    <button className="flex-1 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
                        Starred
                    </button>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredConversations.map(conv => (
                        <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            isActive={activeConversation?.id === conv.id}
                            onClick={() => {
                                setActiveConversation(conv);
                                setIsMobileViewChat(true);
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col bg-gray-50 ${!isMobileViewChat && !activeConversation ? 'hidden md:flex' : ''}`}>
                {activeConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsMobileViewChat(false)}
                                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${activeConversation.client.type === 'BUYER'
                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                                    : 'bg-gradient-to-br from-rose-500 to-pink-500'
                                    }`}>
                                    {activeConversation.client.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{activeConversation.client.name}</h3>
                                    <p className="text-xs text-gray-500">
                                        {activeConversation.client.type} • {activeConversation.client.property || 'General Inquiry'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                                    <Phone className="w-5 h-5" />
                                </button>
                                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                                    <Video className="w-5 h-5" />
                                </button>
                                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {activeConversation.messages.map((msg, index) => (
                                <ChatBubble
                                    key={msg.id}
                                    message={msg}
                                    isLast={index === activeConversation.messages.length - 1}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Replies */}
                        {showQuickReplies && (
                            <div className="px-4 pb-2 flex gap-2 flex-wrap animate-fade-in">
                                {quickReplies.map((reply, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleQuickReply(reply)}
                                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        <div className="bg-white p-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                                    <Paperclip className="w-5 h-5" />
                                </button>
                                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                                    <ImageIcon className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                                    className={`p-2 rounded-lg transition-colors ${showQuickReplies ? 'bg-rose-50 text-rose-500' : 'hover:bg-gray-100 text-gray-500'}`}
                                >
                                    <Smile className="w-5 h-5" />
                                </button>
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!message.trim()}
                                    className="p-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Select a conversation</h3>
                            <p className="text-gray-500 text-sm mt-1">Choose from your existing conversations or start a new one</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
