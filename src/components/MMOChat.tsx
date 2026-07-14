import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase';
import { gameAudio } from '../lib/gameAudio';
import { useGameStore } from '../store/gameState';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  channel: 'global' | 'local' | 'party' | 'guild' | 'whisper';
  timestamp: number;
  playerId?: string;
  /** Whisper target callsign (lowercase). */
  to?: string;
  position?: [number, number, number];
  /** Sender has Iron Haven Pass (VIP). */
  pass?: boolean;
}

interface NearbyName {
  id: string;
  username: string;
  position: [number, number, number];
}

interface MMOChatProps {
  username?: string;
  playerId?: string | null;
  playerPosRef?: React.MutableRefObject<{ x: number; y: number; z: number }>;
  nearbyPlayers?: NearbyName[];
}

const LOCAL_RANGE = 35;

const MMOChat: React.FC<MMOChatProps> = ({
  username = 'Runner',
  playerId = null,
  playerPosRef,
  nearbyPlayers = [],
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: crypto.randomUUID(),
      username: 'System',
      message: SUPABASE_CONFIGURED
        ? 'Live chat up. /w Name msg for whisper · local is proximity P2P.'
        : 'Offline — local echo only. Set Supabase for multiplayer chat.',
      channel: 'global',
      timestamp: Date.now(),
    },
    {
      id: crypto.randomUUID(),
      username: 'System',
      message: 'Tab economy · F vehicle · R harvest · H stim · J job',
      channel: 'global',
      timestamp: Date.now(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState<
    'global' | 'local' | 'party' | 'guild' | 'whisper'
  >('global');
  const [whisperTo, setWhisperTo] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [live, setLive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenIds = useRef(new Set<string>());
  // Re-render when Pass flips so VIP styling can refresh for new lines.
  useGameStore((s) => s.pass.expiresAt);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    const channel = supabase.channel('ironhaven-chat-p2p', {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        const msg = payload as ChatMessage;
        if (!msg?.id || seenIds.current.has(msg.id)) return;
        if (playerId && msg.playerId === playerId) return;

        // Whisper: only deliver to intended recipient.
        if (msg.channel === 'whisper') {
          const me = (username || '').toLowerCase();
          if (msg.to !== me) return;
        }

        // Local: proximity filter (player-to-player range).
        if (msg.channel === 'local' && msg.position && playerPosRef?.current) {
          const p = playerPosRef.current;
          const dx = msg.position[0] - p.x;
          const dz = msg.position[2] - p.z;
          if (dx * dx + dz * dz > LOCAL_RANGE * LOCAL_RANGE) return;
        }

        seenIds.current.add(msg.id);
        setMessages((prev) => [...prev.slice(-100), msg]);
        if (msg.channel === 'whisper') gameAudio.play('talk', 0.15);
      })
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setLive(false);
    };
  }, [playerId, username, playerPosRef]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const parseAndSend = () => {
    const text = inputMessage.trim();
    if (!text) return;

    let channel = activeChannel;
    let to: string | undefined;
    let body = text;

    // /w Name message  or  /whisper Name message
    const whisperMatch = text.match(/^\/(w|whisper)\s+(\S+)\s+(.+)$/i);
    if (whisperMatch) {
      channel = 'whisper';
      to = whisperMatch[2].toLowerCase();
      body = whisperMatch[3];
      setWhisperTo(whisperMatch[2]);
      setActiveChannel('whisper');
    } else if (channel === 'whisper') {
      to = (whisperTo || '').toLowerCase();
      if (!to) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            username: 'System',
            message: 'Set whisper target: /w Name hello',
            channel: 'global',
            timestamp: Date.now(),
          },
        ]);
        return;
      }
    }

    const pos = playerPosRef?.current;
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      username: username || 'Runner',
      message: body,
      channel,
      timestamp: Date.now(),
      playerId: playerId || undefined,
      to,
      position: pos ? [pos.x, pos.y, pos.z] : undefined,
      pass: useGameStore.getState().isPassActive() || undefined,
    };
    seenIds.current.add(newMessage.id);

    if (channelRef.current && live) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: newMessage,
      });
    }

    // Always show locally (including our own whispers).
    setMessages((prev) => [...prev.slice(-100), newMessage]);
    setInputMessage('');
    gameAudio.play('ui', 0.1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      parseAndSend();
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'global':
        return 'text-[#c03a30]';
      case 'local':
        return 'text-[#3f7d4e]';
      case 'whisper':
        return 'text-[#a855f7]';
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
        className="absolute bottom-20 left-4 z-[18] font-mono border border-[#222428] bg-black/60 backdrop-blur-sm p-3 text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        <MessageCircle size={18} />
      </button>
    );
  }

  const channels = ['global', 'local', 'whisper', 'party', 'guild'] as const;

  return (
    <div className="absolute bottom-20 left-4 w-[min(22rem,42vw)] font-mono border border-[#222428] bg-black/75 backdrop-blur-sm overflow-hidden z-[18]">
      <div className="border-b border-[#1a1c1f] p-2 flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {channels.map((channel) => (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel)}
              className={`px-2 py-1 text-[9px] tracking-[0.15em] uppercase transition-colors ${
                activeChannel === channel
                  ? 'text-neutral-100 border-b border-[#c03a30]'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[9px] tracking-[0.15em] uppercase ${
              live ? 'text-[#3f7d4e]' : 'text-neutral-600'
            }`}
          >
            {live ? 'p2p live' : SUPABASE_CONFIGURED ? '…' : 'local'}
          </span>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-neutral-500 hover:text-neutral-200 text-xs px-1"
          >
            ×
          </button>
        </div>
      </div>

      {activeChannel === 'whisper' && (
        <div className="border-b border-[#1a1c1f] px-2 py-1.5 flex gap-2 items-center">
          <span className="text-[9px] text-neutral-600 uppercase tracking-[0.15em]">
            to
          </span>
          <input
            value={whisperTo}
            onChange={(e) => setWhisperTo(e.target.value)}
            placeholder="callsign"
            list="nearby-runners"
            className="flex-1 bg-transparent text-[11px] text-neutral-200 focus:outline-none"
          />
          <datalist id="nearby-runners">
            {nearbyPlayers.map((p) => (
              <option key={p.id} value={p.username} />
            ))}
          </datalist>
        </div>
      )}

      <div className="h-40 overflow-y-auto p-3 space-y-1.5 text-[12px] leading-relaxed">
        {messages.map((msg) => (
          <div key={msg.id}>
            <span
              className={`${getChannelColor(msg.channel)} text-[10px] tracking-[0.12em] uppercase`}
            >
              [{msg.channel}
              {msg.channel === 'whisper' && msg.to ? `→${msg.to}` : ''}]
            </span>
            {msg.pass && (
              <span
                className="ml-1 text-[9px] tracking-[0.15em] uppercase"
                style={{ color: '#c9a15a' }}
              >
                pass
              </span>
            )}
            <span
              className="ml-1"
              style={{
                color: msg.pass ? '#c9a15a' : undefined,
              }}
            >
              <span className={msg.pass ? '' : 'text-neutral-200'}>
                {msg.username}:
              </span>
            </span>
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
          onKeyDown={handleKeyPress}
          placeholder={
            activeChannel === 'whisper'
              ? `/w ${whisperTo || 'Name'} message…`
              : activeChannel === 'local'
                ? 'local radius chat…'
                : `${username} → ${activeChannel}…`
          }
          className="flex-1 bg-[#0d0d0f] border border-[#222428] px-3 py-2 text-neutral-200 text-[12px] placeholder:text-neutral-600 focus:outline-none focus:border-[#c03a30] transition-colors"
          maxLength={200}
        />
        <button
          onClick={parseAndSend}
          className="border border-[#222428] text-neutral-300 hover:border-[#c03a30] hover:text-neutral-100 px-3 py-2 transition-colors flex items-center"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

export default MMOChat;
