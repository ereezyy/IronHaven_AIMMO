import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  channel: 'global' | 'local' | 'party' | 'guild';
  timestamp: number;
}

const MMOChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      username: 'System',
      message: 'Welcome to IronHaven AIMMO!',
      channel: 'global',
      timestamp: Date.now(),
    },
    {
      id: '2',
      username: 'System',
      message: 'Use WASD to move, mouse to look around',
      channel: 'global',
      timestamp: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState<
    'global' | 'local' | 'party' | 'guild'
  >('global');
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel('chat-global');

    channel
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && channelRef.current) {
      const newMessage: ChatMessage = {
        id: `msg_${crypto.randomUUID()}`,
        username: 'You',
        message: inputMessage.trim(),
        channel: activeChannel,
        timestamp: Date.now(),
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: newMessage,
      });

      setMessages((prev) => [...prev, newMessage]);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'global':
        return 'text-[#c03a30]';
      case 'local':
        return 'text-neutral-300';
      case 'party':
        return 'text-neutral-400';
      case 'guild':
        return 'text-neutral-500';
      default:
        return 'text-neutral-500';
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="absolute bottom-32 left-4 font-mono border border-[#222428] bg-black/60 backdrop-blur-sm p-3 text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        <MessageCircle size={18} />
      </button>
    );
  }

  return (
    <div className="absolute bottom-32 left-4 w-96 font-mono border border-[#222428] bg-black/70 backdrop-blur-sm overflow-hidden">
      <div className="border-b border-[#1a1c1f] p-2 flex items-center justify-between">
        <div className="flex gap-1">
          {['global', 'local', 'party', 'guild'].map((channel) => (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel as any)}
              className={`px-2.5 py-1 text-[10px] tracking-[0.2em] uppercase transition-colors ${
                activeChannel === channel
                  ? 'text-neutral-100 border-b border-[#c03a30]'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-neutral-500 hover:text-neutral-200 transition-colors text-xs px-1"
        >
          ×
        </button>
      </div>

      <div className="h-64 overflow-y-auto p-3 space-y-1.5 text-[12px] leading-relaxed">
        {messages.map((msg) => (
          <div key={msg.id} className="animate-fadeIn">
            <span
              className={`${getChannelColor(msg.channel)} text-[10px] tracking-[0.15em] uppercase`}
            >
              [{msg.channel}]
            </span>
            <span className="text-neutral-200 ml-1">{msg.username}:</span>
            <span className="text-neutral-400 ml-1">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#1a1c1f] p-2 flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`message ${activeChannel}...`}
          className="flex-1 bg-[#0d0d0f] border border-[#222428] px-3 py-2 text-neutral-200 text-[12px] placeholder:text-neutral-600 focus:outline-none focus:border-[#c03a30] transition-colors"
          maxLength={200}
        />
        <button
          onClick={handleSendMessage}
          className="border border-[#222428] text-neutral-300 hover:border-[#c03a30] hover:text-neutral-100 px-3 py-2 transition-colors flex items-center"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

export default MMOChat;
