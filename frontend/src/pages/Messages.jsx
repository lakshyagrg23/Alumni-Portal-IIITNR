import React, { useEffect, useState, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../context/AuthContext'
import socketClient, { initSocket, getSocket, closeSocket } from '../utils/socketClient'
import * as crypto from '../utils/crypto'
import axios from 'axios'
import { useLocation } from 'react-router-dom'
import styles from './Messages.module.css'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}


const Messages = () => {
  const { user, token } = useAuth()
  const query = useQuery()
  const preTo = query.get('to')
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [conversations, setConversations] = useState([])
  const [toUserId, setToUserId] = useState(preTo || '')
  const [text, setText] = useState('')
  const localKeysRef = useRef(null)
  const aesKeyRef = useRef(null)
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const messagesListRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    if (!user) {
      return;
    }

    (async () => {
      // load or generate keys and publish public key
      let kp = null
      try {
        const storedPriv = localStorage.getItem('e2e_priv_jwk')
        const storedPub = localStorage.getItem('e2e_pub_raw')
        if (storedPriv && storedPub) {
          const privateKey = await crypto.importPrivateKey(storedPriv)
          const publicKey = await crypto.importPublicKey(storedPub)
          kp = { privateKey, publicKey }
        } else {
          kp = await crypto.generateKeyPair()
          const pub = await crypto.exportPublicKey(kp.publicKey)
          const priv = await crypto.exportPrivateKey(kp.privateKey)
          try {
            localStorage.setItem('e2e_pub_raw', pub)
            localStorage.setItem('e2e_priv_jwk', priv)
          } catch (e) {
            console.warn('Failed to persist keys in localStorage', e)
          }
          try {
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/public-key`, { publicKey: pub }, { headers: { Authorization: `Bearer ${token}` }})
          } catch (err) {
            console.warn('Failed to publish public key', err)
          }
        }
      } catch (err) {
        console.warn('E2E key load/generate error', err)
        kp = await crypto.generateKeyPair()
      }
      localKeysRef.current = kp

      const socket = initSocket(token)
      socket.on('connect', () => setConnected(true))
      socket.on('disconnect', () => setConnected(false))

      socket.on('secure:receive', async (payload) => {
        try {
          // server may send { message: <savedMessage>, from: <users.id>, clientId }
          const saved = payload.message || payload;
          // server now sends `from` as users.id (auth user id) and `alumniFrom` as alumni_profiles.id
          const from = payload.from || saved.sender_user_id || saved.sender_user_id || saved.sender_id || payload.alumniFrom

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
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/public-key/${from}`, { headers: { Authorization: `Bearer ${token}` }})
                const theirPub = res.data?.data?.public_key || res.data?.publicKey || res.data?.public_key
                if (theirPub) {
                  const imported = await crypto.importPublicKey(theirPub)
                  const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
                  const aes = await crypto.deriveAESGCMKey(shared)
                  aesKeyRef.current = { key: aes, peer: from }
                }
              } catch (err) {
                console.warn("Couldn't fetch sender public key for realtime message", err)
              }
            }
            usedAes = aesKeyRef.current?.key || null
          }

          let plain = 'Encrypted message'
          if (usedAes && iv && ciphertext) {
            try {
              plain = await crypto.decryptMessage(usedAes, iv, ciphertext)
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
            return [...prev, { id: saved.id, clientId: saved.client_id || payload.clientId || null, from, text: plain, sent_at: saved.sent_at }]
          })
        } catch (err) {
          console.error('Failed to decrypt incoming message', err)
        }
      })

  // reconcile sent ack: replace pending message with saved server message
      socket.on('secure:sent', (ack) => {
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
        console.warn('secure:error', err)
        if (err?.clientId) {
          setMessages((prev) => prev.map((m) => (m.clientId === err.clientId ? { ...m, pending: false, error: err.message } : m)))
        }
      })

      // load conversations list (includes partnerName & partnerAvatar)
      try {
        const convRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages`, { headers: { Authorization: `Bearer ${token}` }})
        setConversations(convRes.data?.data || [])
      } catch (e) {
        console.warn('Failed to load conversations', e)
      }

      // if a recipient is pre-selected, load conversation
      if (toUserId) {
        await loadConversation(toUserId, kp)
      }

      return () => {
        closeSocket()
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/conversation/${otherUserId}`, { headers: { Authorization: `Bearer ${token}` }})
      const old = res.data?.data || []
      const decoded = []
      // Try to derive a conversation AES key using the partner's public key once
      let convoAes = null
      try {
        const pkRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/public-key/${otherUserId}`, { headers: { Authorization: `Bearer ${token}` }})
        const partnerPub = pkRes.data?.data?.public_key || pkRes.data?.publicKey || pkRes.data?.public_key || null
        if (partnerPub) {
          const imported = await crypto.importPublicKey(partnerPub)
          const shared = await crypto.deriveSharedSecret(kp.privateKey, imported)
          convoAes = await crypto.deriveAESGCMKey(shared)
        }
      } catch (e) {
        // ignore and fallback to per-message keys
        convoAes = null
      }

      for (const m of old) {
        const fromAuthUserId = m.sender_id || m.from_user_id || m.from || m.fromUserId
        const ciphertext = m.content || m.ciphertext || m.metadata?.ciphertext
        const iv = m.iv || m.metadata?.iv
        const clientId = m.client_id || m.clientId || null
        if (!ciphertext) continue
        try {
          // If we have a derived conversation AES key use it for decryption
          if (convoAes && iv) {
            const plain = await crypto.decryptMessage(convoAes, iv, ciphertext)
            decoded.push({ id: m.id, clientId, from: fromAuthUserId, text: plain, sent_at: m.sent_at })
            continue
          }

          // Fallback: try per-message sender_public_key (stored with message) or try public-key endpoints
          let senderPub = m.sender_public_key || m.senderPublicKey || null
          if (!senderPub) {
            const tryIds = [m.sender_user_id, fromAuthUserId, m.sender_id, m.alumniFrom].filter(Boolean)
            for (const idToTry of tryIds) {
              try {
                const senderPubRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/public-key/${idToTry}`, { headers: { Authorization: `Bearer ${token}` }})
                senderPub = senderPubRes.data?.data?.public_key || senderPubRes.data?.publicKey || senderPubRes.data?.public_key
                if (senderPub) break
              } catch (e) {
                // ignore and try next
              }
            }
          }

          if (!senderPub) {
            decoded.push({ id: m.id, clientId, from: fromAuthUserId, text: 'Encrypted message (no pubkey)', sent_at: m.sent_at })
            continue
          }

          const senderPubKey = await crypto.importPublicKey(senderPub)
          const shared = await crypto.deriveSharedSecret(kp.privateKey, senderPubKey)
          const aes = await crypto.deriveAESGCMKey(shared)
          const plain = await crypto.decryptMessage(aes, iv, ciphertext)
          decoded.push({ id: m.id, clientId, from: fromAuthUserId, text: plain, sent_at: m.sent_at })
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

          decoded.push({ id: m.id, clientId, from: fromAuthUserId, text: 'Encrypted message (failed to decrypt)', sent_at: m.sent_at, raw: { iv, ciphertext } })
        }
      }
      setMessages(decoded)
    } catch (e) { console.error('failed to load conv', e) }
  }

  const handleSelectConversation = async (conv) => {
    // conv.partnerUserId is users.id (auth id) used to address the socket and public-key lookup
    if (!conv || !conv.partnerUserId) return
    setToUserId(conv.partnerUserId)
    if (localKeysRef.current) await loadConversation(conv.partnerUserId, localKeysRef.current)
  }

  const handleSend = async () => {
    setErrorMsg('')
    if (!toUserId || !text) {
      setErrorMsg('Recipient and message text are required')
      return;
    }

    setSending(true)
    try {
      // make sure socket is initialized and connected
      let socket = getSocket()
      if (!socket || !socket.connected) {
        socket = initSocket(token)
        // wait for connect or timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Socket connect timeout')), 5000)
          socket.once('connect', () => { clearTimeout(timeout); resolve() })
          socket.once('connect_error', (err) => { clearTimeout(timeout); reject(err) })
        })
      }

      // fetch recipient public key
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/public-key/${toUserId}`, { headers: { Authorization: `Bearer ${token}` }})
      const theirPub = res.data?.data?.public_key || res.data?.publicKey || res.data?.public_key
      if (!theirPub) throw new Error('Recipient public key not found')

      const imported = await crypto.importPublicKey(theirPub)
      const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
      const aes = await crypto.deriveAESGCMKey(shared)
      const enc = await crypto.encryptMessage(aes, text)

      // create a client-side id to track pending message
      const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`
      const payload = {
        toUserId,
        ciphertext: enc.ciphertext,
        metadata: { iv: enc.iv, ciphertext: enc.ciphertext, messageType: 'text', clientId },
        clientId,
      }

      socket.emit('secure:send', payload)
      // push pending message locally with clientId so we can reconcile when server acks
      setMessages((m) => [...m, { clientId, from: user.id, text, pending: true }])
      setText('')
    } catch (err) {
      console.error('send failed', err)
      setErrorMsg(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Messages - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>

      <div className={styles.container}>
        <h1>Messages</h1>

        <div className={`${styles.layout} ${!showSidebar ? 'collapsed' : ''}`}>
          {/* Conversations sidebar */}
          <aside style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>Conversations</h3>
              <button onClick={() => setShowSidebar((s) => !s)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>{showSidebar ? 'Hide' : 'Show'}</button>
            </div>
            {conversations.length === 0 ? (
              <div style={{ color: '#6b7280' }}>No conversations yet</div>
            ) : (
              conversations.map((c) => (
                <div key={c.partnerAlumniId} style={{ padding: 8, borderBottom: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }} onClick={() => handleSelectConversation(c)}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: '#e6eefc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a', fontWeight: 700 }}>{(c.partnerName || c.partnerUserId || 'U').slice(0,2).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{c.partnerName || c.partnerUserId}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.lastMessage ? (c.lastMessage.content || c.lastMessage.text || 'Encrypted') : ''}</div>
                  </div>
                </div>
              ))
            )}
          </aside>

          {/* Chat area */}
          <main style={{ background: 'transparent' }}>
            <div className={styles.controls}>
              <label style={{ marginRight: 8 }}>Recipient</label>
              <input value={toUserId} onChange={(e) => setToUserId(e.target.value)} placeholder="Recipient user id" />
              <button onClick={() => toUserId && loadConversation(toUserId, localKeysRef.current)} disabled={!toUserId}>Load</button>
            </div>

            <div className={styles.chatArea}>
              {/* Chat header */}
              <div className={styles.chatHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={styles.avatar}>{(conversations.find(c => c.partnerUserId === toUserId)?.partnerName || 'Chat').slice(0,2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{conversations.find(c => c.partnerUserId === toUserId)?.partnerName || 'Conversation'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{toUserId ? `User ID: ${toUserId}` : 'Select a conversation or load by user id'}</div>
                  </div>
                </div>
              </div>

              <div className={styles.messagesList} ref={messagesListRef}>
                {messages.length === 0 ? (
                  <div style={{ padding: '1rem', color: '#6b7280' }}>
                    No messages yet. If someone sent you a message, open this page while logged in to receive and decrypt it in real time.
                  </div>
                ) : (
                  messages.map((m) => {
                    const key = m.id || m.clientId || `${m.from}-${m.sent_at}`
                    const isOutgoing = m.from === user.id
                    const partner = conversations.find(c => c.partnerUserId === toUserId)
                    const avatar = isOutgoing ? (user?.profilePicture || (user?.firstName || user?.name || 'Y').slice(0,2).toUpperCase()) : (partner?.partnerName || m.sender_name || (m.from || '').slice(0,2).toUpperCase())
                    const nameLabel = isOutgoing ? 'You' : (partner?.partnerName || m.sender_name || m.from)
                    return (
                      <div key={key} className={isOutgoing ? styles.outgoing : styles.incoming} style={{ display: 'flex', alignItems: 'flex-end' }}>
                        {!isOutgoing && <div style={{ marginRight: 8, width: 40, textAlign: 'center' }}><div className={styles.avatar} style={{ width:32, height:32, borderRadius:16, fontSize:12 }}>{avatar}</div></div>}
                        <div>
                          <div className={styles.bubble}>
                            <div style={{ fontSize: 13, marginBottom: 4 }}><strong>{nameLabel}</strong></div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                            <small>{m.sent_at ? new Date(m.sent_at).toLocaleString() : ''}</small>
                            {m.pending && <span style={{ marginLeft: 8, color: '#9ca3af' }}> (sending…)</span>}
                            {m.error && <span style={{ marginLeft: 8, color: '#ef4444' }}> ({m.error})</span>}
                          </div>
                        </div>
                        {isOutgoing && <div style={{ marginLeft: 8, width: 40, textAlign: 'center' }}><div className={styles.avatar} style={{ width:32, height:32, borderRadius:16, fontSize:12 }}>{avatar}</div></div>}
                      </div>
                    )
                  })
                )}

                <div ref={messagesEndRef} />

                {/* simple debug panel to help diagnose missing messages */}
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: 'pointer', color: '#374151' }}>Debug: messages ({messages.length})</summary>
                  <pre style={{ maxHeight: 200, overflow: 'auto', background: '#f3f4f6', padding: 8 }}>{JSON.stringify({ connected, messages }, null, 2)}</pre>
                </details>
              </div>

              <div className={styles.composer}>
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
                <button onClick={handleSend} disabled={!connected || sending || !toUserId}>{sending ? 'Sending…' : 'Send Encrypted'}</button>
                {errorMsg && <div className={styles.error} style={{ marginTop: 8 }}>{errorMsg}</div>}
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default Messages
