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
      timestamp: Date.now()
    },
    {
      id: '2',
      username: 'System',
      message: 'Use WASD to move, mouse to look around',
      channel: 'global',
      timestamp: Date.now()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState<'global' | 'local' | 'party' | 'guild'>('global');
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel('chat-global');

    channel
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
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
        id: `msg_${Date.now()}`,
        username: 'You',
        message: inputMessage.trim(),
        channel: activeChannel,
        timestamp: Date.now()
      };

      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: newMessage
      });

      setMessages(prev => [...prev, newMessage]);
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
        return 'text-cyan-400';
      case 'local':
        return 'text-green-400';
      case 'party':
        return 'text-purple-400';
      case 'guild':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="absolute bottom-20 left-4 bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-3 hover:border-cyan-400 transition-colors"
      >
        <MessageCircle className="text-cyan-400" size={20} />
      </button>
    );
  }

  return (
    <div className="absolute bottom-20 left-4 w-96 bg-black/90 backdrop-blur-sm border border-cyan-500/50 rounded-lg overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 p-2 flex items-center justify-between">
        <div className="flex gap-2">
          {['global', 'local', 'party', 'guild'].map(channel => (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel as any)}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                activeChannel === channel
                  ? 'bg-cyan-500 text-black'
                  : 'text-gray-400 hover:text-cyan-400'
              }`}
            >
              {channel.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="h-64 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.map(msg => (
          <div key={msg.id} className="animate-fadeIn">
            <span className={`font-bold ${getChannelColor(msg.channel)}`}>
              [{msg.channel.toUpperCase()}]
            </span>
            <span className="text-white font-semibold ml-1">
              {msg.username}:
            </span>
            <span className="text-gray-300 ml-1">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-cyan-500/30 p-2 flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Message to ${activeChannel}...`}
          className="flex-1 bg-gray-900 border border-cyan-500/30 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-400 transition-colors"
          maxLength={200}
        />
        <button
          onClick={handleSendMessage}
          className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold px-4 py-2 rounded transition-colors flex items-center gap-2"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default MMOChat;
