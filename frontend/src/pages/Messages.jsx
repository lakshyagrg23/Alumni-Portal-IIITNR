import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../context/AuthContext'
import { useMessaging } from '../context/MessagingContext'
import { getSocket, closeSocket, getLastSocketUrl } from '../utils/socketClient'
import * as crypto from '../utils/crypto'
import axios from 'axios'
import { useLocation } from 'react-router-dom'
import { BiMessageRounded, BiSearch, BiX, BiGroup, BiPaperclip, BiImage, BiFile,  BiSend, BiDotsVerticalRounded, BiBlock, BiFlag } from 'react-icons/bi'
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
  const conversationKeysRef = useRef(new Map()) // Cache: userId -> { aesKey, publicKey }
  const markedReadRef = useRef(new Set())
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const messagesListRef = useRef(null)
  const messagesEndRef = useRef(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [alumniList, setAlumniList] = useState([])
  const [searchAlumni, setSearchAlumni] = useState('')
  const [loadingAlumni, setLoadingAlumni] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState('harassment')
  const [reportDescription, setReportDescription] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  // Use global messaging context for unread counts
  const { conversationUnreadMap, clearConversationUnread, setActiveConversationUserId } = useMessaging()

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
        // Keys should already be fetched and decrypted during login
        // Priority 1: Check sessionStorage (current session)
        let storedPriv = sessionStorage.getItem('e2e_priv_jwk')
        let storedPub = sessionStorage.getItem('e2e_pub_raw')
        
        // Priority 2: Check localStorage (persistent, device-specific)
        if (!storedPriv || !storedPub) {
          storedPriv = localStorage.getItem('e2e_priv_jwk')
          storedPub = localStorage.getItem('e2e_pub_raw')
          
          // If found in localStorage, also store in sessionStorage for faster access
          if (storedPriv && storedPub) {
            sessionStorage.setItem('e2e_priv_jwk', storedPriv)
            sessionStorage.setItem('e2e_pub_raw', storedPub)
          }
        }
        
        // If still no keys, check if we can fetch and decrypt from server
        if (!storedPriv || !storedPub) {
          const decryptPw = sessionStorage.getItem('e2e_decrypt_pw')
          
          if (decryptPw) {
            try {
              console.log('[Messages] Keys not in storage, fetching from server...')
              const resp = await axios.get(`${API}/messages/public-key`, { 
                headers: { Authorization: `Bearer ${token}` }
              })
              
              if (resp.data?.data?.encrypted_private_key && resp.data?.data?.public_key) {
                console.log('[Messages] Decrypting keys from server...')
                const encryptedData = JSON.parse(resp.data.data.encrypted_private_key)
                const decryptedPrivKey = await crypto.decryptPrivateKeyWithPassword(
                  encryptedData,
                  decryptPw
                )
                
                storedPriv = decryptedPrivKey
                storedPub = resp.data.data.public_key
                
                // Cache for future use
                localStorage.setItem('e2e_priv_jwk', storedPriv)
                localStorage.setItem('e2e_pub_raw', storedPub)
                sessionStorage.setItem('e2e_priv_jwk', storedPriv)
                sessionStorage.setItem('e2e_pub_raw', storedPub)
                
                console.log('✅ Keys fetched and decrypted from server')
              }
            } catch (fetchErr) {
              console.warn('[Messages] Failed to fetch/decrypt keys from server:', fetchErr)
            }
          } else {
            console.warn('[Messages] No decryption password available. Please re-login to enable messaging.')
          }
        }
        
        if (storedPriv && storedPub) {
          const privateKey = await crypto.importPrivateKey(storedPriv)
          const publicKey = await crypto.importPublicKey(storedPub)
          kp = { privateKey, publicKey }
          publicKeyBase64 = storedPub // Use stored public key for upload
        } else {
          // Generate new keys as last resort
          kp = await crypto.generateKeyPair()
          const pub = await crypto.exportPublicKey(kp.publicKey)
          const priv = await crypto.exportPrivateKey(kp.privateKey)
          publicKeyBase64 = pub
          try {
            sessionStorage.setItem('e2e_pub_raw', pub)
            sessionStorage.setItem('e2e_priv_jwk', priv)
            localStorage.setItem('e2e_pub_raw', pub)
            localStorage.setItem('e2e_priv_jwk', priv)
          } catch (e) {
            console.warn('Failed to persist keys in storage', e)
          }
        }
        
        // Upload public key to server if we have one
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
      
      // Check if we already have a cached key for this conversation
      let convoAes = null
      let recipientHasKey = false
      const cachedKey = conversationKeysRef.current.get(otherUserId)
      
      if (cachedKey?.aesKey) {
        console.log('[Messages] Using cached conversation key for user:', otherUserId)
        convoAes = cachedKey.aesKey
        recipientHasKey = true
      } else {
        // Derive key for the first time and cache it
        try {
          console.log('[Messages] GET partner public-key userId=', otherUserId)
          const pkRes = await axios.get(`${API}/messages/public-key/${otherUserId}`, { headers: { Authorization: `Bearer ${token}` }})
          const partnerPub = pkRes.data?.data?.public_key || pkRes.data?.publicKey || pkRes.data?.public_key || null
          if (partnerPub) {
            const imported = await crypto.importPublicKey(partnerPub)
            const shared = await crypto.deriveSharedSecret(kp.privateKey, imported)
            convoAes = await crypto.deriveAESGCMKey(shared)
            recipientHasKey = true
            
            // Cache the key for future use
            conversationKeysRef.current.set(otherUserId, { aesKey: convoAes, publicKey: partnerPub })
            console.log('[Messages] Conversation key derived and cached')
          }
        } catch (e) {
          // Recipient hasn't generated encryption keys yet
          if (e.response?.status === 404) {
            console.warn('Recipient has not set up encrypted messaging keys yet.')
            setErrorMsg('Recipient has not initialized encryption keys. Ask them to open Messages once, then retry.')
          }
          // Fallback to per-message keys (will try again when sending)
          convoAes = null
        }
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
    } catch (e) { 
      console.error('failed to load conv', e?.message || e) 
    }
  }

  const handleSelectConversation = async (conv) => {
    // conv.partnerUserId is users.id (auth id) used to address the socket and public-key lookup
    if (!conv || !conv.partnerUserId) return
    const id = conv.partnerUserId
    setToUserId(id)
    setActiveConversationUserId(id)
    clearConversationUnread(id)
    if (localKeysRef.current) await loadConversation(id, localKeysRef.current)
    // Check if user is blocked
    checkIfBlocked(id)
    // On mobile, hide sidebar when conversation selected
    if (isMobile) {
      setShowSidebar(false)
    }
  }

  const checkIfBlocked = async (userId) => {
    try {
      const res = await axios.get(`${API}/moderation/check-blocked/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIsBlocked(res.data?.isBlocked || false)
    } catch (err) {
      console.error('Failed to check block status:', err)
    }
  }

  const handleBlockUser = async () => {
    try {
      await axios.post(`${API}/moderation/block`, {
        blockedUserId: toUserId,
        reason: blockReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIsBlocked(true)
      setShowBlockModal(false)
      setBlockReason('')
      setErrorMsg('')
      alert('User blocked successfully')
    } catch (err) {
      console.error('Failed to block user:', err)
      setErrorMsg(err.response?.data?.message || 'Failed to block user')
    }
  }

  const handleUnblockUser = async () => {
    try {
      await axios.delete(`${API}/moderation/unblock/${toUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setIsBlocked(false)
      setErrorMsg('')
      alert('User unblocked successfully')
    } catch (err) {
      console.error('Failed to unblock user:', err)
      setErrorMsg(err.response?.data?.message || 'Failed to unblock user')
    }
  }

  const handleReportUser = async () => {
    if (!reportDescription.trim()) {
      setErrorMsg('Please provide a description for the report')
      return
    }

    try {
      await axios.post(`${API}/moderation/report`, {
        reportedUserId: toUserId,
        reportType,
        description: reportDescription,
        evidenceMessageIds: [] // Could enhance this to select specific messages
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowReportModal(false)
      setReportDescription('')
      setReportType('harassment')
      setErrorMsg('')
      alert('Report submitted successfully. Our team will review it shortly.')
    } catch (err) {
      console.error('Failed to report user:', err)
      setErrorMsg(err.response?.data?.message || 'Failed to submit report')
    }
  }

  const handleSend = async () => {
    setErrorMsg('')
    console.log('handleSend called', { toUserId, text: text?.substring(0, 20), textLength: text?.length })
    
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

      // Check if we have a cached conversation key for this user
      let aes = null
      const cachedKey = conversationKeysRef.current.get(toUserId)
      
      if (cachedKey?.aesKey) {
        console.log('✅ Using cached conversation key for user:', toUserId)
        aes = cachedKey.aesKey
      } else {
        // Derive key for the first time and cache it
        console.log(`🔑 Fetching public key for user: ${toUserId}`)
        const res = await axios.get(`${API}/messages/public-key/${toUserId}`, { headers: { Authorization: `Bearer ${token}` }})
        console.log('✅ Public key fetched status=', res?.status)
        const theirPub = res.data?.data?.public_key || res.data?.publicKey || res.data?.public_key
        if (!theirPub) throw new Error('Recipient public key not found')

        console.log('🔐 Deriving shared encryption key (first time for this conversation)...')
        const imported = await crypto.importPublicKey(theirPub)
        const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
        aes = await crypto.deriveAESGCMKey(shared)
        
        // Cache the key for future messages
        conversationKeysRef.current.set(toUserId, { aesKey: aes, publicKey: theirPub })
        console.log('✅ Conversation key cached')
      }

      console.log('🔐 Encrypting message...')
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
      
      // Auto-scroll to bottom after sending message
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
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

  const loadAlumniList = async () => {
    if (loadingAlumni) return
    setLoadingAlumni(true)
    try {
      const res = await axios.get(`${API}/alumni`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 50, sortBy: 'first_name', sortOrder: 'ASC' }
      })
      const data = res.data?.data || []
      // Filter out current user and existing conversations
      const existingUserIds = new Set(conversations.map(c => c.partnerUserId))
      const filtered = data.filter(a => {
        const userId = a.userId || a.user_id
        return userId && userId !== user.id && !existingUserIds.has(userId)
      })
      setAlumniList(filtered)
    } catch (err) {
      console.error('Failed to load alumni list', err)
    } finally {
      setLoadingAlumni(false)
    }
  }

  const handleStartNewChat = async (alumni) => {
    const userId = alumni.userId || alumni.user_id
    if (!userId) return
    setToUserId(userId)
    setActiveConversationUserId(userId)
    setShowNewChatModal(false)
    if (localKeysRef.current) await loadConversation(userId, localKeysRef.current)
    // On mobile, hide sidebar when new chat starts
    if (isMobile) {
      setShowSidebar(false)
    }
  }

  const filteredAlumni = useMemo(() => {
    if (!searchAlumni) return alumniList
    const term = searchAlumni.toLowerCase()
    return alumniList.filter(a => {
      const name = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase()
      return name.includes(term)
    })
  }, [searchAlumni, alumniList])

  return (
    <>
      <Helmet><title>Messages - IIIT Naya Raipur Alumni Portal</title></Helmet>
      <div className={styles.container}>
        <div className={`${styles.layout} ${showSidebar ? '' : styles.collapsed} ${isMobile ? styles.mobileView : ''}`}> 
          {/* Sidebar */}
          {(showSidebar || !isMobile) && (
          <aside className={styles.sidebarShell} aria-label="Conversations list">
            <div className={styles.sidebarHeader}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h2 className={styles.sidebarTitle}>Conversations</h2>
                {isMobile && <button onClick={() => setShowSidebar(s => !s)} className={styles.toggleSidebarBtn} title="Hide sidebar">✕</button>}
              </div>
              <div className={styles.searchBox}>
                <span className={styles.searchIcon}><BiSearch size={18} /></span>
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
            
            {/* Floating Action Button - Inside Sidebar */}
            <button
              className={styles.fabInSidebar}
              onClick={() => {
                setShowNewChatModal(true)
                loadAlumniList()
              }}
              aria-label="Start new chat"
              title="Start new chat"
            >
              <span className={styles.fabIcon}><BiMessageRounded size={24} /></span>
            </button>
          </aside>
          )}

          {/* Chat */}
          {(!isMobile || !showSidebar) && (
          <section className={styles.chatShell} aria-label="Chat conversation">
            <header className={styles.chatHeader}>
              {!showSidebar && (
                <button onClick={() => setShowSidebar(true)} className={styles.showSidebarBtn} title="Show conversations">
                  <BiMessageRounded size={24} />
                </button>
              )}  
              <div style={{ display:'flex', alignItems:'center', gap:14, flex:1 }}>
                <div className={styles.avatar}>{(conversations.find(c => c.partnerUserId === toUserId)?.partnerName || 'Chat').slice(0,2).toUpperCase()}</div>
                <div style={{ flex:1 }}>
                  <div className={styles.chatTitle}>{conversations.find(c => c.partnerUserId === toUserId)?.partnerName || 'Messages'}</div>
                  <div className={styles.chatSubtitle}>{toUserId ? 'End-to-end encrypted' : 'Choose a conversation to start messaging'}</div>
                </div>
              </div>
              {/* Actions menu for block/report */}
              {toUserId && (
                <div className={styles.actionsMenuContainer}>
                  <button 
                    className={styles.actionsMenuBtn}
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    aria-label="User actions"
                  >
                    <BiDotsVerticalRounded size={24} />
                  </button>
                  {showActionsMenu && (
                    <div className={styles.actionsDropdown}>
                      {isBlocked ? (
                        <button onClick={() => { handleUnblockUser(); setShowActionsMenu(false); }} className={styles.actionItem}>
                          <BiBlock size={18} />
                          <span>Unblock User</span>
                        </button>
                      ) : (
                        <button onClick={() => { setShowBlockModal(true); setShowActionsMenu(false); }} className={styles.actionItem}>
                          <BiBlock size={18} />
                          <span>Block User</span>
                        </button>
                      )}
                      <button onClick={() => { setShowReportModal(true); setShowActionsMenu(false); }} className={styles.actionItem}>
                        <BiFlag size={18} />
                        <span>Report User</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </header>

            <div className={styles.messagesViewport} ref={messagesListRef}>
              {!toUserId ? (
                <div style={{ height:'100%', display:'grid', placeItems:'center' }}>
                  <div style={{ textAlign:'center', color:'#6b7280' }}>
                    <div style={{ fontSize:48, lineHeight:1 }}><BiMessageRounded size={64} /></div>
                    <div style={{ fontSize:16, marginTop:8 }}>Select a conversation to start messaging</div>
                  </div>
                </div>
              ) : (
                <>
                  {groupedMessages.length === 0 && <div style={{ padding:'1rem', fontSize:13, color:'#6b7280', display:'flex', alignItems:'center', gap:6 }}>No messages yet. Say hello </div>}
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
                            <BiPaperclip size={14} /> {m.file.name} ({Math.round(m.file.size/1024)} KB)
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
                  <button className={styles.attachButton} type="button" onClick={handleFileChoose} disabled={!toUserId || uploading}>
                    <BiPaperclip size={16} />
                    {uploading ? 'Uploading…' : 'Attach'}
                  </button>
                  <button className={styles.sendButton} onClick={handleSend} disabled={ !toUserId }>
                    <BiSend size={16} />
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
                {attachmentMeta && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginTop:6 }}>
                    <div style={{ padding:'4px 8px', background:'#e2e8f0', borderRadius:6, display:'flex', alignItems:'center', gap:4 }}>
                      {attachmentMeta.mimeType?.startsWith('image/') ? <><BiImage size={14} /> Image</> : <><BiFile size={14} /> File</>}: {attachmentMeta.name} ({Math.round(attachmentMeta.size/1024)} KB)
                    </div>
                    <button type="button" onClick={clearAttachment} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer' }} aria-label="Remove attachment"><BiX size={20} /></button>
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
          )}
        </div>

        {/* Block User Modal */}
        {showBlockModal && (
          <div className={styles.modalOverlay} onClick={() => setShowBlockModal(false)}>
            <div className={styles.modalCard} style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Block User</h3>
                <button className={styles.modalClose} onClick={() => setShowBlockModal(false)}>
                  <BiX size={24} />
                </button>
              </div>
              <div className={styles.modalContent} style={{ padding: '1.5rem' }}>
                <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
                  Are you sure you want to block this user? They will no longer be able to send you messages.
                </p>
                <textarea
                  className={styles.composerTextarea}
                  rows={3}
                  placeholder="Reason for blocking (optional)"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  style={{ marginBottom: '1rem' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setShowBlockModal(false)} 
                    className={styles.attachButton}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleBlockUser}
                    className={styles.sendButton}
                    style={{ background: '#ef4444' }}
                  >
                    <BiBlock size={16} />
                    Block User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report User Modal */}
        {showReportModal && (
          <div className={styles.modalOverlay} onClick={() => setShowReportModal(false)}>
            <div className={styles.modalCard} style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Report User</h3>
                <button className={styles.modalClose} onClick={() => setShowReportModal(false)}>
                  <BiX size={24} />
                </button>
              </div>
              <div className={styles.modalContent} style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.9375rem'
                    }}
                  >
                    <option value="harassment">Harassment</option>
                    <option value="spam">Spam</option>
                    <option value="inappropriate_content">Inappropriate Content</option>
                    <option value="impersonation">Impersonation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                    Description *
                  </label>
                  <textarea
                    className={styles.composerTextarea}
                    rows={4}
                    placeholder="Please describe the issue..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => setShowReportModal(false)} 
                    className={styles.attachButton}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleReportUser}
                    className={styles.sendButton}
                    disabled={!reportDescription.trim()}
                  >
                    <BiFlag size={16} />
                    Submit Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Chat Modal */}
        {showNewChatModal && (
          <div className={styles.modalOverlay} onClick={() => setShowNewChatModal(false)}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Start New Chat</h3>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowNewChatModal(false)}
                  aria-label="Close"
                >
                  <BiX size={24} />
                </button>
              </div>

              <div className={styles.modalSearch}>
                <span className={styles.searchIcon}><BiSearch size={18} /></span>
                <input
                  type="text"
                  className={styles.modalSearchInput}
                  placeholder="Search alumni..."
                  value={searchAlumni}
                  onChange={(e) => setSearchAlumni(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.modalContent}>
                {loadingAlumni ? (
                  <div className={styles.modalLoading}>
                    <div className={styles.spinner}></div>
                    <p>Loading alumni...</p>
                  </div>
                ) : filteredAlumni.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}><BiGroup size={48} /></span>
                    <p>No alumni found</p>
                  </div>
                ) : (
                  <div className={styles.alumniGrid}>
                    {filteredAlumni.map((alumni) => {
                      const userId = alumni.userId || alumni.user_id
                      const fullName = `${alumni.firstName || ''} ${alumni.lastName || ''}`.trim()
                      const initials = `${alumni.firstName?.charAt(0) || ''}${alumni.lastName?.charAt(0) || ''}`
                      return (
                        <div
                          key={userId}
                          className={styles.alumniItem}
                          onClick={() => handleStartNewChat(alumni)}
                        >
                          <div className={styles.alumniAvatar}>{initials}</div>
                          <div className={styles.alumniInfo}>
                            <div className={styles.alumniName}>{fullName}</div>
                            {alumni.currentCompany && (
                              <div className={styles.alumniMeta}>
                                {alumni.currentCompany}
                              </div>
                            )}
                            {alumni.graduationYear && (
                              <div className={styles.alumniMeta}>
                                Class of {alumni.graduationYear}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  )
}

export default Messages
