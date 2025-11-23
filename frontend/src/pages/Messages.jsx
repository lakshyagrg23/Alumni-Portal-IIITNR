import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../context/AuthContext'
import { useMessaging } from '../context/MessagingContext'
import { getSocket, closeSocket, getLastSocketUrl } from '../utils/socketClient'
import * as crypto from '../utils/crypto'
import axios from 'axios'
import { useLocation } from 'react-router-dom'
import styles from './Messages.module.css'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}


const Messages = () => {
  const { user, token } = useAuth()
  // Fallback to port 5000 to match backend default
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const query = useQuery()
  const preTo = query.get('to')
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([]) // decrypted messages for active conversation
  const [conversations, setConversations] = useState([]) // conversation list
  const [toUserId, setToUserId] = useState(preTo || '') // active conversation partner (users.id)
  const [text, setText] = useState('')
  const [attachmentMeta, setAttachmentMeta] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const [search, setSearch] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef(null)
  const localKeysRef = useRef(null)
  const aesKeyRef = useRef(null)
  const markedReadRef = useRef(new Set())
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const messagesListRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [showSidebar, setShowSidebar] = useState(true)
  // Use global messaging context for unread counts
  const { conversationUnreadMap, clearConversationUnread, setActiveConversationUserId } = useMessaging()

  useEffect(() => {
    if (!user || !token) {
      try {
        console.warn('[Messages] missing user/token. user?', !!user, 'token?', !!token)
      } catch {}
      return;
    }

    (async () => {
      try {
        console.group('[Messages] mount/init')
        console.log('env VITE_API_URL=', import.meta.env.VITE_API_URL)
        console.log('env VITE_API_WS_URL=', import.meta.env.VITE_API_WS_URL)
        console.log('computed API=', API)
        console.log('preTo=', preTo, 'userId=', user?.id, 'tokenLen=', token?.length)
        console.groupEnd()
      } catch {}
      // load or generate keys and publish public key
      let kp = null
      let publicKeyBase64 = null
      
      try {
        const storedPriv = localStorage.getItem('e2e_priv_jwk')
        const storedPub = localStorage.getItem('e2e_pub_raw')
        if (storedPriv && storedPub) {
          const privateKey = await crypto.importPrivateKey(storedPriv)
          const publicKey = await crypto.importPublicKey(storedPub)
          kp = { privateKey, publicKey }
          publicKeyBase64 = storedPub // Use stored public key for upload
        } else {
          kp = await crypto.generateKeyPair()
          const pub = await crypto.exportPublicKey(kp.publicKey)
          const priv = await crypto.exportPrivateKey(kp.privateKey)
          publicKeyBase64 = pub
          try {
            localStorage.setItem('e2e_pub_raw', pub)
            localStorage.setItem('e2e_priv_jwk', priv)
          } catch (e) {
            console.warn('Failed to persist keys in localStorage', e)
          }
        }
        
        // Always upload public key to server (in case it's missing or outdated)
        if (publicKeyBase64) {
          try {
            console.log('[Messages] POST public-key ...')
            const resp = await axios.post(`${API}/messages/public-key`, { publicKey: publicKeyBase64 }, { headers: { Authorization: `Bearer ${token}` }})
            console.log('✅ public-key uploaded', resp?.status)
          } catch (err) {
            console.error('❌ public-key upload failed', err?.message || err)
          }
        }
      } catch (err) {
        console.warn('E2E key load/generate error', err)
        kp = await crypto.generateKeyPair()
      }
      localKeysRef.current = kp

      const socket = getSocket()
      if (!socket) {
        try { console.warn('[Messages] socket not ready yet (context will initialize). Skipping listeners this cycle.') } catch {}
      }
      if (!socket) return; // Defer until MessagingContext initializes
      try { console.log('[Messages] socket url=', getLastSocketUrl()) } catch {}
      // Connection lifecycle now handled in MessagingContext; keep minimal connected state mirror
      socket.on('connect', () => { setConnected(true) })
      socket.on('disconnect', () => { setConnected(false) })

      socket.on('secure:receive', async (payload) => {
        try { console.log('[Messages] secure:receive payload', payload) } catch {}
        try {
          // server may send { message: <savedMessage>, from: <users.id>, clientId }
          const saved = payload.message || payload;
          // Use sender_user_id as primary identifier for consistent key lookups
          const from = saved.sender_user_id || payload.from || saved.from_user_id || saved.sender_id || payload.alumniFrom

          const ciphertext = saved.content || saved.ciphertext || saved.metadata?.ciphertext || payload.ciphertext
          const iv = saved.iv || saved.metadata?.iv || payload.iv

          if (!from || !ciphertext) return

          // If message carries a sender_public_key snapshot, use it directly to derive the per-message AES key
          let usedAes = null
          if (saved.sender_public_key) {
            try {
              const imported = await crypto.importPublicKey(saved.sender_public_key)
              const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
              usedAes = await crypto.deriveAESGCMKey(shared)
            } catch (e) {
              console.warn('Failed to derive aes from sender_public_key snapshot', e)
            }
          }

          // If no per-message snapshot, fall back to conversation-level aes stored in aesKeyRef
          if (!usedAes) {
            if (!aesKeyRef.current || aesKeyRef.current.peer !== from) {
              try {
                console.log('[Messages] GET sender public-key for from=', from)
                const res = await axios.get(`${API}/messages/public-key/${from}`, { headers: { Authorization: `Bearer ${token}` }})
                const theirPub = res.data?.data?.public_key || res.data?.publicKey || res.data?.public_key
                if (theirPub) {
                  const imported = await crypto.importPublicKey(theirPub)
                  const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
                  const aes = await crypto.deriveAESGCMKey(shared)
                  aesKeyRef.current = { key: aes, peer: from }
                }
              } catch (err) {
                console.warn("Couldn't fetch sender public key for realtime message", err?.message || err)
              }
            }
            usedAes = aesKeyRef.current?.key || null
          }

          let plain = 'Encrypted message'
          let fileData = null
          if (usedAes && iv && ciphertext) {
            try {
              plain = await crypto.decryptMessage(usedAes, iv, ciphertext)
              // Attempt to parse structured JSON for file attachments
              try {
                const obj = JSON.parse(plain)
                if (obj && typeof obj === 'object') {
                  if (obj.file) fileData = obj.file
                  if (obj.caption) plain = obj.caption
                  else if (obj.text) plain = obj.text
                }
              } catch {/* not JSON */}
            } catch (err) {
              plain = 'Encrypted message (failed to decrypt)'
              console.warn('Decrypt failed (realtime). debug=', {
                payloadId: saved.id || payload.id,
                from,
                usedSnapshot: !!saved.sender_public_key,
                iv,
                ciphertextPreview: ciphertext?.slice?.(0, 40),
                err: err && (err.message || err.toString()),
              })
            }
          }

          // Avoid duplicates: if a message with this id already exists, skip
          setMessages((prev) => {
            const msgId = saved.id || payload.id || saved.client_id || payload.clientId
            if (msgId && prev.some((x) => x.id === msgId || x.clientId === msgId)) return prev
            return [...prev, { 
              id: saved.id, 
              clientId: saved.client_id || payload.clientId || null, 
              from, 
              text: plain, 
              file: fileData,
              sent_at: saved.sent_at,
              sender_name: saved.sender_name,
              receiver_name: saved.receiver_name,
              isOutgoing: from === user.id
            }]
          })

          // If viewing this conversation, mark the incoming message read
          try {
            if (toUserId && (from === toUserId) && saved.id && !markedReadRef.current.has(saved.id)) {
              console.log('[Messages] PUT mark-read realtime id=', saved.id)
              await axios.put(`${API}/messages/${saved.id}/read`, {}, { headers: { Authorization: `Bearer ${token}` }})
              markedReadRef.current.add(saved.id)
            }
          } catch (e) {
            // non-fatal
            try { console.error('[Messages] mark-read realtime failed', e?.message || e) } catch {}
          }
        } catch (err) {
          console.error('Failed to decrypt incoming message', err)
        }
      })

  // reconcile sent ack: replace pending message with saved server message
      socket.on('secure:sent', (ack) => {
        try { console.log('[Messages] secure:sent ack', ack) } catch {}
        try {
          // ack may include { clientId, message }
          const ackClientId = ack?.clientId || ack?.client_id
          const saved = ack?.message || ack
          if (!ackClientId) return
          setMessages((prev) => {
            // find pending message by clientId (we store clientId on pending messages)
            const foundIdx = prev.findIndex((m) => m.clientId === ackClientId)
            if (foundIdx === -1) return prev
            const updated = [...prev]
            updated[foundIdx] = { ...updated[foundIdx], id: saved?.id || updated[foundIdx].id, pending: false, sent_at: saved?.sent_at || new Date().toISOString() }
            return updated
          })
        } catch (e) {
          console.warn('Error handling secure:sent ack', e)
        }
      })

      // When receiving any message in realtime, try to scroll to bottom after updating
      socket.on('secure:receive', () => {
        // small timeout to allow state update to flush
        setTimeout(() => {
          if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }, 80)
      })

      // handle server-side errors
      socket.on('secure:error', (err) => {
        console.error('🚨 secure:error from server:', err)
        setErrorMsg(err?.message || 'Server error occurred')
        if (err?.details) {
          console.error('Error details:', err.details)
        }
        if (err?.clientId) {
          setMessages((prev) => prev.map((m) => (m.clientId === err.clientId ? { ...m, pending: false, error: err.message } : m)))
        }
      })

      // load conversations list (includes partnerName & partnerAvatar)
      try {
        console.log('[Messages] GET /messages (conversations)')
        const convRes = await axios.get(`${API}/messages`, { headers: { Authorization: `Bearer ${token}` }})
        console.log('[Messages] conversations status', convRes?.status, 'count', convRes?.data?.data?.length)
        setConversations(convRes.data?.data || [])
      } catch (e) {
        console.warn('Failed to load conversations', e?.message || e)
      }

      // if a recipient is pre-selected, load conversation
      if (toUserId) {
        await loadConversation(toUserId, kp)
      }

      return () => {
        try { console.log('[Messages] cleanup: closing socket') } catch {}
        closeSocket()
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token])

  // Mark messages as read when opening/viewing a conversation
  useEffect(() => {
    const markAllVisibleIncomingAsRead = async () => {
      if (!toUserId || !token) return
      const base = API
      const toMark = messages.filter(m => m && m.id && !m.isOutgoing && !markedReadRef.current.has(m.id))
      for (const m of toMark) {
        try {
          console.log('[Messages] PUT mark-read (visible) id=', m.id)
          await axios.put(`${base}/messages/${m.id}/read`, {}, { headers: { Authorization: `Bearer ${token}` }})
          markedReadRef.current.add(m.id)
        } catch (e) {
          console.error('[Messages] mark-read (visible) failed id=', m.id, e?.message || e)
        }
      }
    }
    markAllVisibleIncomingAsRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, toUserId, token])

  useEffect(() => {
    // if preTo changes externally update
    if (preTo && preTo !== toUserId) {
      setToUserId(preTo)
      if (localKeysRef.current) loadConversation(preTo, localKeysRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preTo])

  const loadConversation = async (otherUserId, kp) => {
    try {
      console.log('[Messages] GET conversation with', otherUserId)
      const res = await axios.get(`${API}/messages/conversation/${otherUserId}`, { headers: { Authorization: `Bearer ${token}` }})
      console.log('[Messages] conversation status', res?.status, 'items', res?.data?.data?.length)
      const old = res.data?.data || []
      const decoded = []
      // Try to derive a conversation AES key using the partner's public key once
      let convoAes = null
      let recipientHasKey = false
      try {
        console.log('[Messages] GET partner public-key userId=', otherUserId)
        const pkRes = await axios.get(`${API}/messages/public-key/${otherUserId}`, { headers: { Authorization: `Bearer ${token}` }})
        const partnerPub = pkRes.data?.data?.public_key || pkRes.data?.publicKey || pkRes.data?.public_key || null
        if (partnerPub) {
          const imported = await crypto.importPublicKey(partnerPub)
          const shared = await crypto.deriveSharedSecret(kp.privateKey, imported)
          convoAes = await crypto.deriveAESGCMKey(shared)
          recipientHasKey = true
        }
      } catch (e) {
        // Recipient hasn't generated encryption keys yet
        if (e.response?.status === 404) {
          console.warn('⚠️ Recipient has not set up encrypted messaging keys yet.')
          setErrorMsg('Recipient has not initialized encryption keys. Ask them to open Messages once, then retry.')
        }
        // Fallback to per-message keys (will try again when sending)
        convoAes = null
      }

      for (const m of old) {
        // Use sender_user_id as the primary identifier for 'from' since that's what we use for public key lookups
        const fromAuthUserId = m.sender_user_id || m.from_user_id || m.from || m.fromUserId
        const ciphertext = m.content || m.ciphertext || m.metadata?.ciphertext
        const iv = m.iv || m.metadata?.iv
        const clientId = m.client_id || m.clientId || null
        if (!ciphertext) continue
        
        // Add message metadata for better identification
        const messageData = {
          id: m.id,
          clientId,
          from: fromAuthUserId,
          sender_name: m.sender_name,
          receiver_name: m.receiver_name,
          sent_at: m.sent_at,
          isOutgoing: fromAuthUserId === user.id
        };
        
        try {
          // If we have a derived conversation AES key use it for decryption
          if (convoAes && iv) {
            let plain = await crypto.decryptMessage(convoAes, iv, ciphertext)
            let fileData = null
            try {
              const obj = JSON.parse(plain)
              if (obj?.file) fileData = obj.file
              if (obj?.caption) plain = obj.caption
              else if (obj?.text) plain = obj.text
            } catch {/* not JSON */}
            decoded.push({ ...messageData, text: plain, file: fileData })
            continue
          }

          // Fallback: try per-message sender_public_key (stored with message) or try public-key endpoints
          let senderPub = m.sender_public_key || m.senderPublicKey || null
          if (!senderPub) {
            const tryIds = [m.sender_user_id, fromAuthUserId, m.sender_id, m.alumniFrom].filter(Boolean)
            for (const idToTry of tryIds) {
              try {
                console.log('[Messages] GET sender public-key idToTry=', idToTry)
                const senderPubRes = await axios.get(`${API}/messages/public-key/${idToTry}`, { headers: { Authorization: `Bearer ${token}` }})
                senderPub = senderPubRes.data?.data?.public_key || senderPubRes.data?.publicKey || senderPubRes.data?.public_key
                if (senderPub) break
              } catch (e) {
                // ignore and try next
              }
            }
          }

          if (!senderPub) {
            decoded.push({ ...messageData, text: 'Encrypted message (no pubkey)' })
            continue
          }

          const senderPubKey = await crypto.importPublicKey(senderPub)
          const shared = await crypto.deriveSharedSecret(kp.privateKey, senderPubKey)
          const aes = await crypto.deriveAESGCMKey(shared)
          let plain = await crypto.decryptMessage(aes, iv, ciphertext)
          let fileData = null
          try {
            const obj = JSON.parse(plain)
            if (obj?.file) fileData = obj.file
            if (obj?.caption) plain = obj.caption
            else if (obj?.text) plain = obj.text
          } catch {/* not JSON */}
          decoded.push({ ...messageData, text: plain, file: fileData })
        } catch (e) {
          // provide extra debugging info in console to help diagnose stored-message decryption failures
          try {
            const debugInfo = {
              messageId: m.id,
              fromAuthUserId,
              sender_user_id: m.sender_user_id,
              sender_profile_id: m.sender_id,
              iv,
              ciphertextPreview: ciphertext?.slice?.(0, 80),
              clientId,
              error: e && (e.message || e.toString()),
            }
            console.warn('Stored message decryption failed', debugInfo)
          } catch (logErr) {
            console.warn('Stored message decryption failed (and debug logging failed)', logErr)
          }

          decoded.push({ 
            ...messageData, 
            text: 'Encrypted message (failed to decrypt)', 
            raw: { iv, ciphertext, error: e.message } 
          })
        }
      }
      setMessages(decoded)
    } catch (e) { console.error('failed to load conv', e?.message || e) }
  }

  const handleSelectConversation = async (conv) => {
    // conv.partnerUserId is users.id (auth id) used to address the socket and public-key lookup
    if (!conv || !conv.partnerUserId) return
    const id = conv.partnerUserId
    setToUserId(id)
    setActiveConversationUserId(id)
    clearConversationUnread(id)
    if (localKeysRef.current) await loadConversation(id, localKeysRef.current)
  }

  const handleSend = async () => {
    setErrorMsg('')
    console.log('🔍 handleSend called', { toUserId, text: text?.substring(0, 20), textLength: text?.length })
    
    if (!toUserId || (!text && !attachmentMeta)) {
      setErrorMsg('Provide a message or attachment for a recipient')
      console.error('❌ Missing toUserId or content', { toUserId, textLength: text?.length, hasAttachment: !!attachmentMeta })
      return;
    }

    setSending(true)
    try {
      console.log('📡 Initializing socket...')
      // make sure socket is initialized and connected
      let socket = getSocket()
      if (!socket || !socket.connected) {
        console.log('🔌 Socket not connected, reconnecting...')
        socket = initSocket(token)
        // wait for connect or timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Socket connect timeout')), 5000)
          socket.once('connect', () => { clearTimeout(timeout); console.log('✅ Socket connected'); resolve() })
          socket.once('connect_error', (err) => { clearTimeout(timeout); console.error('❌ Socket connect error:', err); reject(err) })
        })
      } else {
        console.log('✅ Socket already connected')
      }

      // fetch recipient public key
      console.log(`🔑 Fetching public key for user: ${toUserId}`)
      const res = await axios.get(`${API}/messages/public-key/${toUserId}`, { headers: { Authorization: `Bearer ${token}` }})
      console.log('✅ Public key fetched status=', res?.status)
      const theirPub = res.data?.data?.public_key || res.data?.publicKey || res.data?.public_key
      if (!theirPub) throw new Error('Recipient public key not found')

      console.log('🔐 Encrypting message...')
      const imported = await crypto.importPublicKey(theirPub)
      const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
      const aes = await crypto.deriveAESGCMKey(shared)
      const payloadObject = attachmentMeta ? { file: attachmentMeta, caption: text } : { text }
      const enc = await crypto.encryptMessage(aes, JSON.stringify(payloadObject))
      console.log('✅ Message encrypted')

      // create a client-side id to track pending message
      const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
      const payload = {
        toUserId,
        ciphertext: enc.ciphertext,
        metadata: { iv: enc.iv, ciphertext: enc.ciphertext, messageType: attachmentMeta ? 'file' : 'text', clientId },
        clientId,
      }

      console.log('📤 Emitting secure:send...', { toUserId, clientId })
      try { console.log('📤 Emitting secure:send payload=', payload) } catch {}
      socket.emit('secure:send', payload)
      // push pending message locally with clientId so we can reconcile when server acks
      setMessages((m) => [...m, { clientId, from: user.id, text, file: attachmentMeta || null, pending: true }])
      setText('')
      setAttachmentMeta(null)
      console.log('✅ Message sent!')
    } catch (err) {
      console.error('❌ send failed', err?.message || err)
      setErrorMsg(`Send error: ${err.message || 'Failed to send message'}`)
    } finally {
      setSending(false)
    }
  }

  // Attachment handlers
  const handleFileChoose = () => { if (fileInputRef.current) fileInputRef.current.click() }
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorMsg('')
    setUploading(true)
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('File exceeds 5MB limit')
      const form = new FormData()
      form.append('file', file)
      console.log('[Messages] POST /messages/upload name=', file.name, 'size=', file.size)
      const res = await axios.post(`${API}/messages/upload`, form, { headers: { Authorization: `Bearer ${token}` } })
      console.log('[Messages] upload status', res?.status)
      const meta = res.data?.data
      setAttachmentMeta(meta)
    } catch (err) {
      console.error('[Messages] upload failed', err?.message || err)
      setErrorMsg(`Upload error: ${err.message || 'Upload failed'}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  const clearAttachment = () => { setAttachmentMeta(null); if (fileInputRef.current) fileInputRef.current.value = '' }

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    if (!search) return conversations
    const term = search.toLowerCase()
    return conversations.filter(c => (c.partnerName || '').toLowerCase().includes(term) || String(c.partnerUserId).includes(term))
  }, [search, conversations])

  // Group messages by date for separators
  const groupedMessages = useMemo(() => {
    if (!messages.length) return []
    const groups = []
    let currentDate = null
    messages.forEach(m => {
      const d = m.sent_at ? new Date(m.sent_at) : new Date()
      const label = d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
      if (label !== currentDate) {
        groups.push({ type:'date', label })
        currentDate = label
      }
      groups.push({ type:'message', data:m })
    })
    return groups
  }, [messages])

  const onTextChange = (e) => {
    setText(e.target.value)
    setIsTyping(true)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 1200)
  }

  return (
    <>
      <Helmet><title>Messages - IIIT Naya Raipur Alumni Portal</title></Helmet>
      <div className={styles.container}>
        <div className={`${styles.layout} ${showSidebar ? '' : styles.collapsed}`}> 
          {/* Sidebar */}
          <aside className={styles.sidebarShell} aria-label="Conversations list">
            <div className={styles.sidebarHeader}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h2 className={styles.sidebarTitle}>Conversations</h2>
                <button onClick={() => setShowSidebar(s => !s)} style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:12, color:'#1e3a8a' }}>{showSidebar ? 'Hide' : 'Show'}</button>
              </div>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}>🔍</span>
                <input className={styles.searchInput} placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search conversations" />
              </div>
            </div>
            <div className={styles.conversationList} role="list">
              {filteredConversations.length === 0 && <div style={{ padding:'0.5rem', fontSize:12, color:'#6b7280' }}>No conversations</div>}
              {filteredConversations.map(c => {
                const active = c.partnerUserId === toUserId
                const unreadCount = conversationUnreadMap?.[c.partnerUserId] || 0
                return (
                  <div key={c.partnerAlumniId} role="listitem" tabIndex={0} className={`${styles.conversationItem} ${active ? styles.active : ''}`} onClick={() => handleSelectConversation(c)} onKeyDown={(e) => { if (e.key==='Enter') handleSelectConversation(c) }}>
                    <div className={styles.conversationAvatar}>{(c.partnerName || 'User').slice(0,2).toUpperCase()}</div>
                    <div className={styles.conversationMeta}>
                      <div className={styles.conversationName}>{c.partnerName || 'User'}</div>
                      {unreadCount > 0 && !active && (
                        <div style={{ marginTop:4 }}>
                          <span style={{
                            display:'inline-block',
                            background:'#1e3a8a',
                            color:'#fff',
                            fontSize:11,
                            padding:'2px 6px',
                            borderRadius:12,
                            minWidth:24,
                            textAlign:'center',
                            boxShadow:'0 1px 2px rgba(0,0,0,0.15)'
                          }} aria-label={`Unread messages: ${unreadCount}`}>{unreadCount}</span>
                        </div>
                      )}
                        {/* {c.lastMessage ? (
                          c.lastMessage.message_type === 'file' ? 'Encrypted file' : (c.lastMessage.content || c.lastMessage.text || 'Encrypted')
                        ) : 'No messages yet'} */}
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>

          {/* Chat */}
          <section className={styles.chatShell} aria-label="Chat conversation">
            <header className={styles.chatHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div className={styles.avatar}>{(conversations.find(c => c.partnerUserId === toUserId)?.partnerName || 'Chat').slice(0,2).toUpperCase()}</div>
                <div>
                  <div className={styles.chatTitle}>{conversations.find(c => c.partnerUserId === toUserId)?.partnerName || 'Messages'}</div>
                  <div className={styles.chatSubtitle}>{toUserId ? 'End-to-end encrypted' : 'Choose a conversation to start messaging'}</div>
                </div>
              </div>
              {/* Presence indicator removed per request to hide socket status */}
            </header>

            <div className={styles.messagesViewport} ref={messagesListRef}>
              {!toUserId ? (
                <div style={{ height:'100%', display:'grid', placeItems:'center' }}>
                  <div style={{ textAlign:'center', color:'#6b7280' }}>
                    <div style={{ fontSize:48, lineHeight:1 }}>💬</div>
                    <div style={{ fontSize:16, marginTop:8 }}>Select a conversation to start messaging</div>
                  </div>
                </div>
              ) : (
                <>
                  {groupedMessages.length === 0 && <div style={{ padding:'1rem', fontSize:13, color:'#6b7280' }}>No messages yet. Say hello 👋</div>}
                  {groupedMessages.map((g, idx) => {
                if (g.type === 'date') return <div key={`d-${idx}`} className={styles.dateSeparator}>{g.label}</div>
                const m = g.data
                const key = m.id || m.clientId || `${m.from}-${m.sent_at}-${idx}`
                const isOutgoing = m.isOutgoing !== undefined ? m.isOutgoing : (m.from === user.id)
                const bubbleClass = `${styles.bubble} ${isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming}`
                return (
                  <div key={key} className={`${styles.messageRow} ${isOutgoing ? styles.messageOutgoing : styles.messageIncoming}`}> 
                    <div className={bubbleClass}> 
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>{isOutgoing ? 'You' : (m.sender_name || conversations.find(c => c.partnerUserId === toUserId)?.partnerName || 'User')}</div>
                      {m.file && m.file.mimeType?.startsWith('image/') && (
                        <div style={{ marginBottom:6 }}>
                          <a href={m.file.url} target="_blank" rel="noopener noreferrer" style={{ display:'inline-block' }}>
                            <img src={m.file.url} alt={m.file.name} style={{ maxWidth:'240px', borderRadius:8, boxShadow:'0 2px 4px rgba(0,0,0,0.08)' }} />
                          </a>
                        </div>
                      )}
                      {m.file && !m.file.mimeType?.startsWith('image/') && (
                        <div style={{ marginBottom:6 }}>
                          <a href={m.file.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:'none', color:'#1e3a8a', fontSize:12, display:'flex', alignItems:'center', gap:6 }}>
                            📎 {m.file.name} ({Math.round(m.file.size/1024)} KB)
                          </a>
                        </div>
                      )}
                      <div style={{ whiteSpace:'pre-wrap' }}>{m.text}</div>
                      <div className={styles.bubbleMeta}> 
                        <span>{m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : 'Now'}</span>
                        {m.pending && <span className={`${styles.statusDot} ${styles.statusSending}`} title="Sending" />}
                        {m.error && <span className={`${styles.statusDot} ${styles.statusError}`} title={m.error} />}
                        <span className={styles.encryptedBadge} title="End-to-end encrypted">E2E</span>
                      </div>
                    </div>
                  </div>
                    )
                  })}
                  {isTyping && toUserId && (
                    <div className={styles.typingIndicator} aria-live="polite">
                      <div className={styles.typingDots}><span /><span /><span /></div><span>Typing…</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className={styles.composerShell}>
              <div className={styles.composerRow}>
                <textarea 
                  value={text} 
                  onChange={onTextChange} 
                  className={styles.composerTextarea} 
                  rows={2} 
                  placeholder={toUserId ? 'Type a message…' : 'Select a conversation to start messaging'}
                  disabled={!toUserId }
                  aria-label="Message input"
                />
                <div className={styles.composerActions}>
                  <input ref={fileInputRef} type="file" style={{ display:'none' }} onChange={handleFileChange} accept="image/*,application/pdf" />
                  <button className={styles.attachButton} type="button" onClick={handleFileChoose} disabled={!toUserId || uploading}>{uploading ? 'Uploading…' : '📎 Attach'}</button>
                  <button className={styles.sendButton} onClick={handleSend} disabled={ !toUserId }>{sending ? 'Sending…' : 'Send'}</button>
                </div>
                {attachmentMeta && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginTop:6 }}>
                    <div style={{ padding:'4px 8px', background:'#e2e8f0', borderRadius:6 }}>
                      {attachmentMeta.mimeType?.startsWith('image/') ? '🖼️ Image' : '📄 File'}: {attachmentMeta.name} ({Math.round(attachmentMeta.size/1024)} KB)
                    </div>
                    <button type="button" onClick={clearAttachment} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer' }} aria-label="Remove attachment">✕</button>
                  </div>
                )}
              </div>
              {errorMsg && (
                <div className={styles.errorBanner} role="alert">
                  {errorMsg}
                  {errorMsg.includes('encryption keys') && (
                    <button type="button" onClick={() => { if (toUserId && localKeysRef.current) loadConversation(toUserId, localKeysRef.current) }} style={{ marginLeft:8, background:'transparent', border:'1px solid #1e3a8a', color:'#1e3a8a', borderRadius:4, padding:'2px 6px', cursor:'pointer', fontSize:11 }}>
                      Retry
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

export default Messages
