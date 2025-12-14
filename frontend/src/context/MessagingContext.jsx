import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { initSocket, getSocket, closeSocket } from '../utils/socketClient';

const MessagingContext = createContext(null);

export const MessagingProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const location = useLocation();
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const [totalUnread, setTotalUnread] = useState(0);
  const [conversationUnreadMap, setConversationUnreadMap] = useState({}); // key: partnerUserId -> count
  const [activeConversationUserId, setActiveConversationUserId] = useState(null);
  const fetchingRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [authError, setAuthError] = useState(null);
  const retryRef = useRef({ attempts: 0, timer: null });

  const fetchCounts = async () => {
    if (!isAuthenticated || !token) { setTotalUnread(0); setConversationUnreadMap({}); return; }
    if (fetchingRef.current) return; // prevent thundering herd
    fetchingRef.current = true;
    try {
      const [totalRes, convoRes] = await Promise.all([
        axios.get(`${API}/messages/unread/count`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/messages/unread/by-conversation`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const count = totalRes.data?.data?.unreadCount ?? 0;
      setTotalUnread(count);
      const map = {};
      (convoRes.data?.data || []).forEach(row => {
        if (row.partnerUserId) map[row.partnerUserId] = row.unreadCount;
      });
      setConversationUnreadMap(map);
    } catch (e) {
      // silent
    } finally {
      fetchingRef.current = false;
    }
  };

  // Centralized socket lifecycle management
  useEffect(() => {
    // Guard: need valid auth token
    if (!isAuthenticated || !token) {
      setConnected(false);
      setAuthError(null);
      // Ensure any existing socket is closed when user logs out
      closeSocket();
      return;
    }

    // Initialize socket if missing
    let sock = getSocket();
    if (!sock) {
      sock = initSocket(token);
    }

    const handleConnect = () => {
      setConnected(true);
      setAuthError(null);
      retryRef.current.attempts = 0;
    };
    const handleDisconnect = (reason) => {
      setConnected(false);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect (e.g., auth invalid) – attempt re-init
        scheduleAuthRetry();
      }
    };
    const handleConnectError = (err) => {
      const msg = err?.message || String(err);
      if (/auth/i.test(msg) || /Authentication error/i.test(msg)) {
        setAuthError(msg);
        setConnected(false);
        scheduleAuthRetry();
      }
    };

    const scheduleAuthRetry = () => {
      // Limit retries
      if (retryRef.current.attempts >= 5) return;
      if (retryRef.current.timer) return; // Already scheduled
      retryRef.current.attempts += 1;
      const delay = 1000 * retryRef.current.attempts; // simple linear backoff
      retryRef.current.timer = setTimeout(() => {
        retryRef.current.timer = null;
        // Only retry if still authenticated and token present
        if (isAuthenticated && token) {
          try { closeSocket(); } catch {}
          initSocket(token);
        }
      }, delay);
    };

    sock.on('connect', handleConnect);
    sock.on('disconnect', handleDisconnect);
    sock.on('connect_error', handleConnectError);

    const onReceive = (payload) => {
      const senderUserId = payload?.message?.sender_user_id || payload?.sender_user_id || payload?.from;
      if (!senderUserId) return;
      const onMessagesPage = location.pathname.startsWith('/messages');
      if (onMessagesPage && activeConversationUserId && senderUserId === activeConversationUserId) return;
      setTotalUnread(c => c + 1);
      setConversationUnreadMap(m => ({ ...m, [senderUserId]: (m[senderUserId] || 0) + 1 }));
    };
    sock.on('secure:receive', onReceive);

    return () => {
      try { sock.off('secure:receive', onReceive); } catch {}
      try { sock.off('connect', handleConnect); } catch {}
      try { sock.off('disconnect', handleDisconnect); } catch {}
      try { sock.off('connect_error', handleConnectError); } catch {}
      if (retryRef.current.timer) {
        clearTimeout(retryRef.current.timer);
        retryRef.current.timer = null;
      }
    };
  }, [isAuthenticated, token, activeConversationUserId, location.pathname]);

  // Refresh counts whenever user navigates to messages or authentication changes
  useEffect(() => {
    fetchCounts();
  }, [isAuthenticated, token, location.pathname]);

  const decrementForConversation = (partnerUserId, by = 1) => {
    setConversationUnreadMap(m => {
      const current = m[partnerUserId] || 0;
      const nextVal = Math.max(0, current - by);
      return { ...m, [partnerUserId]: nextVal };
    });
    setTotalUnread(t => Math.max(0, t - by));
  };

  const clearConversationUnread = (partnerUserId) => {
    const removed = conversationUnreadMap[partnerUserId] || 0;
    setConversationUnreadMap(m => ({ ...m, [partnerUserId]: 0 }));
    setTotalUnread(t => Math.max(0, t - removed));
  };

  const value = {
    totalUnread,
    conversationUnreadMap,
    activeConversationUserId,
    connected,
    authError,
    setActiveConversationUserId,
    refreshUnread: fetchCounts,
    decrementForConversation,
    clearConversationUnread,
  };

  return (
    <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
  );
};

export const useMessaging = () => {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used inside MessagingProvider');
  return ctx;
};

export default MessagingContext;
