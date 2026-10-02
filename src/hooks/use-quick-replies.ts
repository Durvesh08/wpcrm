import { useState, useEffect, useCallback } from 'react';

export interface QuickReply {
  id: string;
  shortcut: string;
  content: string;
}

const DEFAULT_REPLIES: QuickReply[] = [
  { id: '1', shortcut: 'hello', content: 'Hello! How can we help you today?' },
  { id: '2', shortcut: 'pricing', content: 'Our standard pricing starts at $49/month. Would you like a detailed breakdown?' },
  { id: '3', shortcut: 'brb', content: 'I need to check on this for you. I will be right back in a few minutes.' },
  { id: '4', shortcut: 'address', content: 'We are located at 123 Business Avenue, Tech District.' }
];

export function useQuickReplies() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('wpcrm_quick_replies');
      if (stored) {
        setReplies(JSON.parse(stored));
      } else {
        setReplies(DEFAULT_REPLIES);
        localStorage.setItem('wpcrm_quick_replies', JSON.stringify(DEFAULT_REPLIES));
      }
    } catch (e) {
      setReplies(DEFAULT_REPLIES);
    }
    setIsLoaded(true);
  }, []);

  const addReply = useCallback((shortcut: string, content: string) => {
    setReplies(prev => {
      const updated = [...prev, { id: crypto.randomUUID(), shortcut: shortcut.replace('/', ''), content }];
      localStorage.setItem('wpcrm_quick_replies', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeReply = useCallback((id: string) => {
    setReplies(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('wpcrm_quick_replies', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { replies, isLoaded, addReply, removeReply };
}
