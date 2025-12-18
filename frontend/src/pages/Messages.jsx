import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@context/AuthContext'
import { useMessaging } from '@context/MessagingContext'
import { getSocket, closeSocket, getLastSocketUrl, initSocket } from '../utils/socketClient'
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
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const API = `${API_BASE}`
  const query = useQuery()
  
  console.log('[Messages] \ud83c\udfaf API Configuration:', { 
    VITE_API_URL: import.meta.env.VITE_API_URL,
    API_BASE,
    API,
    fullPublicKeyURL: `${API}/messages/public-key`
  })
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
  const [peopleList, setPeopleList] = useState([])
  const [searchPeople, setSearchPeople] = useState('')
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedPartnerName, setSelectedPartnerName] = useState('')

  // DEBUG: Expose key info to console for troubleshooting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.debugE2EKeys = () => {
        const pub = localStorage.getItem('e2e_pub_raw') || sessionStorage.getItem('e2e_pub_raw')
        const priv = localStorage.getItem('e2e_priv_jwk') || sessionStorage.getItem('e2e_priv_jwk')
        const pw = localStorage.getItem('e2e_decrypt_pw') || sessionStorage.getItem('e2e_decrypt_pw')
        console.log('🔑 Encryption Keys Debug:')
        console.log('Public Key (first 50 chars):', pub?.slice(0, 50))
        console.log('Private Key exists:', !!priv)
        console.log('Decrypt password exists:', !!pw)
        console.log('Keys stored in:', {
          localStorage: { pub: !!localStorage.getItem('e2e_pub_raw'), priv: !!localStorage.getItem('e2e_priv_jwk'), pw: !!localStorage.getItem('e2e_decrypt_pw') },
          sessionStorage: { pub: !!sessionStorage.getItem('e2e_pub_raw'), priv: !!sessionStorage.getItem('e2e_priv_jwk'), pw: !!sessionStorage.getItem('e2e_decrypt_pw') }
        })
      }
      console.log('💡 Run window.debugE2EKeys() to check encryption keys')
    }
  }, [])
  const [reportType, setReportType] = useState('harassment')
  const [reportDescription, setReportDescription] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)
  // Use global messaging context for unread counts
  const { conversationUnreadMap, clearConversationUnread, setActiveConversationUserId } = useMessaging()
  
  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [debugLogs, setDebugLogs] = useState([])
  const [networkRequests, setNetworkRequests] = useState([])
  
  // Add debug log function
  const addDebugLog = useCallback((type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [{
      id: Date.now() + Math.random(),
      timestamp,
      type, // 'info', 'success', 'error', 'warning'
      message,
      data
    }, ...prev].slice(0, 50)) // Keep last 50 logs
  }, [])
  
  // Add network request tracker
  const addNetworkRequest = useCallback((method, url, status, response = null) => {
    const timestamp = new Date().toLocaleTimeString()
    setNetworkRequests(prev => [{
      id: Date.now() + Math.random(),
      timestamp,
      method,
      url,
      status,
      response
    }, ...prev].slice(0, 20)) // Keep last 20 requests
  }, [])

  // Ensure we have the user's encryption keys available locally; fetch/decrypt from server if needed
  const ensureLocalKeys = useCallback(async () => {
    if (!user || !token) return null

    let kp = null
    let publicKeyBase64 = null

    try {
      // Priority 1: sessionStorage (current tab)
      let storedPriv = sessionStorage.getItem('e2e_priv_jwk')
      let storedPub = sessionStorage.getItem('e2e_pub_raw')
      let decryptPw = sessionStorage.getItem('e2e_decrypt_pw') || localStorage.getItem('e2e_decrypt_pw')

      // Priority 2: localStorage (persisted)
      // if (!storedPriv || !storedPub) {
      //   storedPriv = localStorage.getItem('e2e_priv_jwk')
      //   storedPub = localStorage.getItem('e2e_pub_raw')
      //   if (storedPriv && storedPub) {
      //     sessionStorage.setItem('e2e_priv_jwk', storedPriv)
      //     sessionStorage.setItem('e2e_pub_raw', storedPub)
      //   }
      // }

      // Priority 3: fetch from server (no prompts; relies on stored password)
      if (!storedPriv || !storedPub) {
        let encryptedRecord = null
        try {
          console.log('[Messages] \ud83d\udce1 Keys not in storage, fetching from server...')
          console.log('[Messages] \ud83d\udd17 Fetching from:', `${API}/messages/public-key`)
          console.log('[Messages] \ud83d\udd11 Token present:', !!token, 'Token length:', token?.length)
          
          const resp = await axios.get(`${API}/messages/public-key`, { 
            headers: { Authorization: `Bearer ${token}` } 
          })
          
          console.log('[Messages] \ud83d\udcca Response status:', resp.status)
          console.log('[Messages] \ud83d\udce6 Response data:', resp.data)
          encryptedRecord = resp.data?.data || null
        } catch (fetchErr) {
          console.error('[Messages] \u274c Failed to fetch keys from server:', fetchErr)
          console.error('[Messages] \ud83d\udcca Error status:', fetchErr.response?.status)
          console.error('[Messages] \ud83d\udce6 Error response:', fetchErr.response?.data)
          console.error('[Messages] \ud83d\udd17 Request URL:', fetchErr.config?.url)
          
          const errorMessage = fetchErr.response?.status === 404 
            ? '\u26a0\ufe0f No encryption keys found. Click here to generate keys, or log out and log in again.'
            : `\u274c Failed to retrieve encryption keys (${fetchErr.response?.status || 'Network Error'}). Please log out and log in again.`
          setErrorMsg(errorMessage)
          return null
        }

        if (encryptedRecord?.encrypted_private_key && encryptedRecord?.public_key) {
          // Build candidate passwords to try (email only now)
          const candidates = []
          if (decryptPw) candidates.push(decryptPw)
          // Primary pattern: email only
          if (user?.email) {
            candidates.push(user.email.toLowerCase())
          }

          const uniqueCandidates = [...new Set(candidates.filter(Boolean))]

          if (!uniqueCandidates.length) {
            console.warn('[Messages] No decryption password available to restore keys')
            setErrorMsg('Encryption password missing. Please log out and log back in to re-sync secure messaging keys.')
            return null
          }

          let decryptedPrivKey = null
          let usedPassword = null
          const encryptedData = JSON.parse(encryptedRecord.encrypted_private_key)
          for (const cand of uniqueCandidates) {
            try {
              decryptedPrivKey = await crypto.decryptPrivateKeyWithPassword(encryptedData, cand)
              usedPassword = cand
              break
            } catch (e) {
              // try next
            }
          }

          if (!decryptedPrivKey) {
            console.warn('[Messages] Failed to decrypt server keys with provided password(s)')
            console.log('[Messages] 🔄 Generating new encryption keys to replace incompatible ones...')
            
            // Generate new keys since old ones use incompatible encryption
            try {
              const newKeyPair = await crypto.generateKeyPair()
              const newPublicKey = await crypto.exportPublicKey(newKeyPair.publicKey)
              const newPrivateKey = await crypto.exportPrivateKey(newKeyPair.privateKey)
              
              // Encrypt with current email pattern
              const encryptionPassword = user.email.toLowerCase()
              const encryptedNewPrivKey = await crypto.encryptPrivateKeyWithPassword(
                newPrivateKey,
                encryptionPassword
              )
              
              // Upload to server
              console.log('[Messages] 📤 Uploading new keys to server...')
              await axios.post(
                `${API}/messages/public-key`,
                {
                  publicKey: newPublicKey,
                  encryptedPrivateKey: JSON.stringify(encryptedNewPrivKey)
                },
                { headers: { Authorization: `Bearer ${token}` } }
              )
              
              // Store new keys
              storedPriv = newPrivateKey
              storedPub = newPublicKey
              
              localStorage.setItem('e2e_priv_jwk', storedPriv)
              localStorage.setItem('e2e_pub_raw', storedPub)
              sessionStorage.setItem('e2e_priv_jwk', storedPriv)
              sessionStorage.setItem('e2e_pub_raw', storedPub)
              sessionStorage.setItem('e2e_decrypt_pw', encryptionPassword)
              localStorage.setItem('e2e_decrypt_pw', encryptionPassword)
              
              console.log('[Messages] ✅ New encryption keys generated and stored successfully')
              
              // Clear any previous errors
              setErrorMsg('')
              
              // Keys are already in storedPriv/storedPub, continue below
            } catch (genErr) {
              console.error('[Messages] ❌ Failed to generate new keys:', genErr)
              setErrorMsg('Could not generate new encryption keys. Please refresh the page and try again.')
              return null
            }
          } else {
            // Successfully decrypted existing keys
            storedPriv = decryptedPrivKey
            storedPub = encryptedRecord.public_key

            // Persist the working password so future loads skip prompt
            sessionStorage.setItem('e2e_decrypt_pw', usedPassword)
            localStorage.setItem('e2e_decrypt_pw', usedPassword)

            localStorage.setItem('e2e_priv_jwk', storedPriv)
            localStorage.setItem('e2e_pub_raw', storedPub)
            sessionStorage.setItem('e2e_priv_jwk', storedPriv)
            sessionStorage.setItem('e2e_pub_raw', storedPub)

            console.log('✅ Keys fetched and decrypted from server')
          }
        } else {
          console.warn('[Messages] Server returned no encrypted private key for user')
          setErrorMsg('No encryption keys found on server. Please log out and log in again to regenerate them.')
          return null
        }
      }

      if (!storedPriv || !storedPub) {
        console.error('❌ No encryption keys available after all attempts')
        console.error('storedPriv exists:', !!storedPriv)
        console.error('storedPub exists:', !!storedPub)
        setErrorMsg('⚠️ Encryption keys not found. Please refresh the page or log out and log back in.')
        return null
      }

      // Validate and import keys with automatic regeneration on failure
      console.log('[Messages] 🔍 Validating stored keys...')
      console.log('[Messages] storedPriv preview:', storedPriv?.slice(0, 100))
      console.log('[Messages] storedPub preview:', storedPub?.slice(0, 100))
      
      let needsRegeneration = false
      
      // Try to import keys - if it fails, regenerate
      try {
        console.log('[Messages] 🔓 Attempting to import encryption keys...')
        const privateKey = await crypto.importPrivateKey(storedPriv)
        const publicKey = await crypto.importPublicKey(storedPub)
        kp = { privateKey, publicKey }
        publicKeyBase64 = storedPub
        localKeysRef.current = kp
        console.log('[Messages] ✅ Encryption keys imported successfully')
      } catch (importErr) {
        console.warn('[Messages] ⚠️ Failed to import stored keys, will regenerate:', importErr.message)
        needsRegeneration = true
      }
      
      // If import failed, clear storage and generate fresh keys
      if (needsRegeneration) {
        console.log('[Messages] 🧹 Clearing corrupted keys from storage...')
        localStorage.removeItem('e2e_priv_jwk')
        localStorage.removeItem('e2e_pub_raw')
        sessionStorage.removeItem('e2e_priv_jwk')
        sessionStorage.removeItem('e2e_pub_raw')
        
        try {
          console.log('[Messages] 🔄 Generating fresh encryption keys...')
          const newKeyPair = await crypto.generateKeyPair()
          const newPublicKey = await crypto.exportPublicKey(newKeyPair.publicKey)
          const newPrivateKey = await crypto.exportPrivateKey(newKeyPair.privateKey)
          
          console.log('[Messages] 📝 New key preview:', newPrivateKey?.slice(0, 100))
          
          // Encrypt with current email pattern
          const encryptionPassword = user.email.toLowerCase()
          const encryptedNewPrivKey = await crypto.encryptPrivateKeyWithPassword(
            newPrivateKey,
            encryptionPassword
          )
          
          // Upload to server
          console.log('[Messages] 📤 Uploading fresh keys to server...')
          await axios.post(
            `${API}/messages/public-key`,
            {
              publicKey: newPublicKey,
              encryptedPrivateKey: JSON.stringify(encryptedNewPrivKey)
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
          
          // Store new keys
          localStorage.setItem('e2e_priv_jwk', newPrivateKey)
          localStorage.setItem('e2e_pub_raw', newPublicKey)
          sessionStorage.setItem('e2e_priv_jwk', newPrivateKey)
          sessionStorage.setItem('e2e_pub_raw', newPublicKey)
          sessionStorage.setItem('e2e_decrypt_pw', encryptionPassword)
          localStorage.setItem('e2e_decrypt_pw', encryptionPassword)
          
          // Import the newly generated keys
          const privateKey = await crypto.importPrivateKey(newPrivateKey)
          const publicKey = await crypto.importPublicKey(newPublicKey)
          kp = { privateKey, publicKey }
          publicKeyBase64 = newPublicKey
          localKeysRef.current = kp
          
          console.log('[Messages] ✅ Fresh encryption keys generated, uploaded, and imported successfully')
          setErrorMsg('')
        } catch (genErr) {
          console.error('[Messages] ❌ Failed to generate fresh keys:', genErr)
          setErrorMsg('Could not recover from corrupted keys. Please log out and log back in.')
          return null
        }
      }

      // Upload public key to server if we have one
      if (publicKeyBase64) {
        try {
          console.log('[Messages] 📤 Uploading public key to server...')
          console.log('[Messages] 🔗 POST to:', `${API}/messages/public-key`)
          console.log('[Messages] 📝 Public key preview:', publicKeyBase64.slice(0, 50))
          
          const resp = await axios.post(
            `${API}/messages/public-key`, 
            { publicKey: publicKeyBase64 }, 
            { headers: { Authorization: `Bearer ${token}` }}
          )
          
          console.log('[Messages] ✅ Public key uploaded successfully, status:', resp?.status)
          console.log('[Messages] 📦 Upload response:', resp?.data)
        } catch (err) {
          console.error('[Messages] ❌ Public key upload failed')
          console.error('[Messages] 📊 Error status:', err.response?.status)
          console.error('[Messages] 📦 Error response:', err.response?.data)
          console.error('[Messages] Error message:', err?.message || err)
        }
      }

      return kp
    } catch (err) {
      console.error('[Messages] ❌ E2E key load error:', err)
      console.error('[Messages] Error stack:', err.stack)
      addDebugLog('error', 'E2E key load error', { error: err.message, stack: err.stack })
      setErrorMsg('⚠️ Encryption keys not found. Please log out and log back in to sync them.')
      return null
    }
  }, [API, token, user, addDebugLog, addNetworkRequest])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Keyboard shortcut to toggle debug panel (Ctrl+Shift+D or Cmd+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setShowDebugPanel(prev => {
          const newState = !prev
          addDebugLog('info', `Debug panel ${newState ? 'opened' : 'closed'} via keyboard shortcut`)
          return newState
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addDebugLog])

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
      const kp = await ensureLocalKeys()
      if (!kp) return

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

          // Refresh conversations list to show latest message in sidebar
          try {
            const convRes = await axios.get(`${API}/messages`, { headers: { Authorization: `Bearer ${token}` }})
            setConversations(convRes.data?.data || [])
          } catch (e) {
            console.warn('Failed to refresh conversations list', e?.message || e)
          }

          // CRITICAL: Determine which public key to use for decryption
          // If this is OUR OWN message from another device (from === user.id), 
          // we need to decrypt using the RECEIVER's public key, not our own!
          const isOwnMessage = from === user.id
          const decryptionPartnerId = isOwnMessage ? saved.receiver_user_id : from
          
          console.log('[Messages] Decryption logic:', { 
            from, 
            userId: user.id, 
            isOwnMessage, 
            decryptionPartnerId,
            receiverUserId: saved.receiver_user_id 
          })

          // If message carries public key snapshots, use the appropriate one
          let usedAes = null
          const relevantPublicKey = isOwnMessage ? saved.receiver_public_key : saved.sender_public_key
          
          if (relevantPublicKey) {
            try {
              const imported = await crypto.importPublicKey(relevantPublicKey)
              const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
              usedAes = await crypto.deriveAESGCMKey(shared)
              console.log('[Messages] Using snapshot public key for decryption')
            } catch (e) {
              console.warn('Failed to derive aes from snapshot public key', e)
            }
          }

          // If no snapshot, fall back to fetching the partner's public key
          if (!usedAes) {
            if (!aesKeyRef.current || aesKeyRef.current.peer !== decryptionPartnerId) {
              try {
                console.log('[Messages] GET public-key for decryptionPartnerId=', decryptionPartnerId)
                const res = await axios.get(`${API}/messages/public-key/${decryptionPartnerId}`, { headers: { Authorization: `Bearer ${token}` }})
                const theirPub = res.data?.data?.public_key || res.data?.publicKey || res.data?.public_key
                if (theirPub) {
                  const imported = await crypto.importPublicKey(theirPub)
                  const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
                  const aes = await crypto.deriveAESGCMKey(shared)
                  aesKeyRef.current = { key: aes, peer: decryptionPartnerId }
                  console.log('[Messages] Fetched and cached public key for', decryptionPartnerId)
                }
              } catch (err) {
                console.warn("Couldn't fetch public key for realtime message", err?.message || err)
              }
            } else {
              console.log('[Messages] Using cached AES key for', decryptionPartnerId)
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
            
            // CROSS-DEVICE SYNC: Check if this message is for the currently active conversation
            // If user is viewing conversation with X and receives a message (from self or X), add it
            const isForActiveConversation = toUserId && (
              (from === user.id && saved.receiver_user_id === toUserId) || // Message from self (other device) to current partner
              (from === toUserId && saved.receiver_user_id === user.id)    // Message from current partner to self
            )
            
            // If viewing a different conversation, don't add to messages array but still update conversations list
            if (!isForActiveConversation && toUserId) {
              console.log('[Messages] Message for different conversation, skipping display')
              return prev
            }
            
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

          // CRITICAL FIX: If this message is for a conversation that's not currently active,
          // but we're viewing Messages page, reload that conversation when user switches to it
          // This ensures cross-device sync works properly
          if (toUserId && (from === toUserId || saved.receiver_user_id === toUserId)) {
            // Message is for the currently active conversation - already added above
            // No additional action needed
          } else if (from !== user.id) {
            // This is an incoming message for a different conversation
            // Trigger a visual indicator or auto-reload if user is on messages page
            console.log('[Messages] New message in other conversation from:', from)
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

          // Fallback: try per-message public key snapshots
          // CRITICAL: If this is OUR message (isOutgoing), use receiver_public_key
          // Otherwise, use sender_public_key
          const isOwnMessage = fromAuthUserId === user.id
          let relevantPubKey = isOwnMessage ? (m.receiver_public_key || m.receiverPublicKey) : (m.sender_public_key || m.senderPublicKey)
          
          // If no snapshot, fetch the appropriate public key
          if (!relevantPubKey) {
            // For our own messages, fetch the OTHER person's key (otherUserId)
            // For incoming messages, fetch the sender's key
            const keyUserId = isOwnMessage ? otherUserId : fromAuthUserId
            const tryIds = [keyUserId, m.sender_user_id, m.receiver_user_id, m.sender_id, m.alumniFrom].filter(Boolean)
            
            for (const idToTry of tryIds) {
              try {
                console.log('[Messages] GET public-key for historical message, idToTry=', idToTry, 'isOwnMessage=', isOwnMessage)
                const pubKeyRes = await axios.get(`${API}/messages/public-key/${idToTry}`, { headers: { Authorization: `Bearer ${token}` }})
                relevantPubKey = pubKeyRes.data?.data?.public_key || pubKeyRes.data?.publicKey || pubKeyRes.data?.public_key
                if (relevantPubKey) break
              } catch (e) {
                // ignore and try next
              }
            }
          }

          if (!relevantPubKey) {
            decoded.push({ ...messageData, text: 'Encrypted message (no pubkey)' })
            continue
          }

          const pubKey = await crypto.importPublicKey(relevantPubKey)
          const shared = await crypto.deriveSharedSecret(kp.privateKey, pubKey)
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
    setSelectedPartnerName(conv.partnerName || '')
    setActiveConversationUserId(id)
    clearConversationUnread(id)
    // Clear marked read messages when switching conversations
    markedReadRef.current.clear()
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

    let keyPair = localKeysRef.current
    if (!keyPair) {
      keyPair = await ensureLocalKeys()
    }
    if (!keyPair) {
      setErrorMsg('Encryption keys not loaded. Please log out and log back in to re-sync secure messaging.')
      return
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
        const shared = await crypto.deriveSharedSecret(keyPair.privateKey, imported)
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
      
      // Refresh conversations list to update cross-device state
      try {
        const convRes = await axios.get(`${API}/messages`, { headers: { Authorization: `Bearer ${token}` }})
        setConversations(convRes.data?.data || [])
        console.log('✅ Conversations list refreshed after send')
      } catch (e) {
        console.warn('Failed to refresh conversations after send', e?.message || e)
      }
      
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

  const loadPeopleList = async () => {
    if (loadingPeople) return
    setLoadingPeople(true)
    try {
      const [alumniRes, studentRes] = await Promise.all([
        axios.get(`${API}/alumni`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 50, sortBy: 'first_name', sortOrder: 'ASC', studentType: 'alumni' }
        }),
        axios.get(`${API}/alumni`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 50, sortBy: 'first_name', sortOrder: 'ASC', studentType: 'current' }
        })
      ])
      const alumniData = alumniRes.data?.data || []
      const studentData = studentRes.data?.data || []
      // Filter out current user, existing conversations, and deduplicate by user id
      const existingUserIds = new Set(conversations.map(c => c.partnerUserId))
      const seen = new Set()
      const combined = [...alumniData, ...studentData].filter(person => {
        const userId = person.userId || person.user_id
        if (!userId || userId === user.id || existingUserIds.has(userId) || seen.has(userId)) return false
        seen.add(userId)
        return true
      })
      setPeopleList(combined)
    } catch (err) {
      console.error('Failed to load directory list', err)
    } finally {
      setLoadingPeople(false)
    }
  }

  const handleStartNewChat = async (person) => {
    const userId = person.userId || person.user_id
    if (!userId) return
    const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'User'
    setToUserId(userId)
    setSelectedPartnerName(fullName)
    setActiveConversationUserId(userId)
    setShowNewChatModal(false)
    // Clear marked read messages when starting new conversation
    markedReadRef.current.clear()
    if (localKeysRef.current) await loadConversation(userId, localKeysRef.current)
    // On mobile, hide sidebar when new chat starts
    if (isMobile) {
      setShowSidebar(false)
    }
  }

  const filteredPeople = useMemo(() => {
    if (!searchPeople) return peopleList
    const term = searchPeople.toLowerCase()
    return peopleList.filter(p => {
      const name = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase()
      return name.includes(term)
    })
  }, [searchPeople, peopleList])

  // Keep selected partner name in sync with loaded conversations (for new chats not yet in list)
  useEffect(() => {
    if (!toUserId) return
    const conv = conversations.find(c => c.partnerUserId === toUserId)
    if (conv?.partnerName) setSelectedPartnerName(conv.partnerName)
  }, [conversations, toUserId])

  const activeConversation = conversations.find(c => c.partnerUserId === toUserId)
  const activePartnerName = activeConversation?.partnerName || selectedPartnerName || (toUserId ? 'Chat' : 'Messages')
  const activePartnerInitials = activePartnerName.slice(0, 2).toUpperCase()

  // Debug panel data
  const debugData = {
    api: {
      baseUrl: API_BASE,
      apiUrl: API,
      publicKeyEndpoint: `${API}/messages/public-key`,
      conversationsEndpoint: `${API}/messages`,
    },
    user: {
      id: user?.id,
      email: user?.email,
      role: user?.role,
    },
    connection: {
      connected,
      socketUrl: getLastSocketUrl(),
    },
    encryptionKeys: {
      publicKey: (localStorage.getItem('e2e_pub_raw') || sessionStorage.getItem('e2e_pub_raw'))?.slice(0, 50) + '...',
      privateKeyExists: !!(localStorage.getItem('e2e_priv_jwk') || sessionStorage.getItem('e2e_priv_jwk')),
      decryptPasswordExists: !!(localStorage.getItem('e2e_decrypt_pw') || sessionStorage.getItem('e2e_decrypt_pw')),
      localKeysLoaded: !!localKeysRef.current,
      aesKeyLoaded: !!aesKeyRef.current,
      conversationKeysCount: conversationKeysRef.current?.size || 0,
    },
    conversation: {
      activeUserId: toUserId,
      activePartnerName,
      conversationsCount: conversations.length,
      messagesCount: messages.length,
      unreadCount: conversationUnreadMap?.[toUserId] || 0,
    },
    state: {
      sending,
      uploading,
      isTyping,
      showSidebar,
      errorMsg,
    },
  }

  return (
    <>
      <Helmet><title>Messages - IIIT Naya Raipur Alumni Portal</title></Helmet>
      <div className={styles.container}>
        {/* Encryption Error Banner */}
        {errorMsg && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#991b1b',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <strong>Encryption Key Error:</strong> {errorMsg}
            </div>
            <button 
              onClick={() => setErrorMsg('')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#991b1b',
                padding: '4px 8px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Debug Panel Toggle Button */}
        <button
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 9999,
            background: '#1e3a8a',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '56px',
            height: '56px',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s, background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title={showDebugPanel ? 'Hide Debug Panel' : 'Show Debug Panel'}
        >
          🐛
        </button>

        {/* Debug Panel Overlay */}
        {showDebugPanel && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '450px',
            maxHeight: '80vh',
            background: '#1f2937',
            color: '#f3f4f6',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            zIndex: 9998,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {/* Debug Panel Header */}
            <div style={{
              background: '#111827',
              padding: '12px 16px',
              borderBottom: '1px solid #374151',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🐛</span>
                <strong style={{ fontSize: '14px' }}>Debug Panel</strong>
                <span style={{
                  background: connected ? '#10b981' : '#ef4444',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {connected ? '● CONNECTED' : '○ DISCONNECTED'}
                </span>
              </div>
              <button
                onClick={() => {
                  setDebugLogs([])
                  setNetworkRequests([])
                }}
                style={{
                  background: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                Clear
              </button>
            </div>

            {/* Debug Panel Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px'
            }}>
              {/* Section: API Configuration */}
              <DebugSection title="🌐 API Configuration">
                <DebugItem label="Base URL" value={debugData.api.baseUrl} />
                <DebugItem label="API URL" value={debugData.api.apiUrl} />
                <DebugItem label="Public Key Endpoint" value={debugData.api.publicKeyEndpoint} copyable />
              </DebugSection>

              {/* Section: User Info */}
              <DebugSection title="👤 User Info">
                <DebugItem label="User ID" value={debugData.user.id} copyable />
                <DebugItem label="Email" value={debugData.user.email} />
                <DebugItem label="Role" value={debugData.user.role} />
              </DebugSection>

              {/* Section: Connection */}
              <DebugSection title="🔌 Connection">
                <DebugItem 
                  label="Status" 
                  value={debugData.connection.connected ? 'Connected ✅' : 'Disconnected ❌'} 
                  valueColor={debugData.connection.connected ? '#10b981' : '#ef4444'}
                />
                <DebugItem label="Socket URL" value={debugData.connection.socketUrl} />
              </DebugSection>

              {/* Section: Encryption Keys */}
              <DebugSection title="🔐 Encryption Keys">
                <DebugItem label="Public Key" value={debugData.encryptionKeys.publicKey} copyable />
                <DebugItem 
                  label="Private Key Exists" 
                  value={debugData.encryptionKeys.privateKeyExists ? 'Yes ✅' : 'No ❌'}
                  valueColor={debugData.encryptionKeys.privateKeyExists ? '#10b981' : '#ef4444'}
                />
                <DebugItem 
                  label="Decrypt Password Exists" 
                  value={debugData.encryptionKeys.decryptPasswordExists ? 'Yes ✅' : 'No ❌'}
                  valueColor={debugData.encryptionKeys.decryptPasswordExists ? '#10b981' : '#ef4444'}
                />
                <DebugItem 
                  label="Local Keys Loaded" 
                  value={debugData.encryptionKeys.localKeysLoaded ? 'Yes ✅' : 'No ❌'}
                  valueColor={debugData.encryptionKeys.localKeysLoaded ? '#10b981' : '#ef4444'}
                />
                <DebugItem label="AES Key Loaded" value={debugData.encryptionKeys.aesKeyLoaded ? 'Yes' : 'No'} />
                <DebugItem label="Cached Conversation Keys" value={debugData.encryptionKeys.conversationKeysCount} />
              </DebugSection>

              {/* Section: Active Conversation */}
              <DebugSection title="💬 Active Conversation">
                <DebugItem label="Partner User ID" value={debugData.conversation.activeUserId || 'None'} />
                <DebugItem label="Partner Name" value={debugData.conversation.activePartnerName} />
                <DebugItem label="Total Conversations" value={debugData.conversation.conversationsCount} />
                <DebugItem label="Messages Loaded" value={debugData.conversation.messagesCount} />
                <DebugItem label="Unread Count" value={debugData.conversation.unreadCount} />
              </DebugSection>

              {/* Section: State */}
              <DebugSection title="⚙️ Component State">
                <DebugItem label="Sending" value={debugData.state.sending ? 'Yes' : 'No'} />
                <DebugItem label="Uploading" value={debugData.state.uploading ? 'Yes' : 'No'} />
                <DebugItem label="Typing" value={debugData.state.isTyping ? 'Yes' : 'No'} />
                <DebugItem label="Sidebar Visible" value={debugData.state.showSidebar ? 'Yes' : 'No'} />
                <DebugItem label="Error Message" value={debugData.state.errorMsg || 'None'} valueColor={debugData.state.errorMsg ? '#ef4444' : '#10b981'} />
              </DebugSection>

              {/* Section: Network Requests */}
              <DebugSection title="🌍 Recent Network Requests">
                {networkRequests.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' }}>
                    No requests captured yet
                  </div>
                ) : (
                  networkRequests.slice(0, 5).map(req => (
                    <div key={req.id} style={{
                      background: '#374151',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '6px',
                      fontSize: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ 
                          background: req.status >= 200 && req.status < 300 ? '#10b981' : '#ef4444',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontWeight: 'bold'
                        }}>
                          {req.method} {req.status}
                        </span>
                        <span style={{ color: '#9ca3af' }}>{req.timestamp}</span>
                      </div>
                      <div style={{ 
                        color: '#d1d5db',
                        wordBreak: 'break-all',
                        fontSize: '9px'
                      }}>
                        {req.url}
                      </div>
                    </div>
                  ))
                )}
              </DebugSection>

              {/* Section: Debug Logs */}
              <DebugSection title="📋 Debug Logs">
                {debugLogs.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '11px', fontStyle: 'italic' }}>
                    No logs yet
                  </div>
                ) : (
                  debugLogs.slice(0, 10).map(log => (
                    <div key={log.id} style={{
                      background: '#374151',
                      padding: '8px',
                      borderRadius: '4px',
                      marginBottom: '6px',
                      fontSize: '10px',
                      borderLeft: `3px solid ${
                        log.type === 'error' ? '#ef4444' :
                        log.type === 'warning' ? '#f59e0b' :
                        log.type === 'success' ? '#10b981' :
                        '#3b82f6'
                      }`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ 
                          color: log.type === 'error' ? '#fca5a5' :
                                 log.type === 'warning' ? '#fcd34d' :
                                 log.type === 'success' ? '#6ee7b7' :
                                 '#93c5fd',
                          fontWeight: 'bold'
                        }}>
                          {log.type === 'error' ? '❌' :
                           log.type === 'warning' ? '⚠️' :
                           log.type === 'success' ? '✅' :
                           'ℹ️'} {log.type.toUpperCase()}
                        </span>
                        <span style={{ color: '#9ca3af' }}>{log.timestamp}</span>
                      </div>
                      <div style={{ color: '#d1d5db' }}>{log.message}</div>
                      {log.data && (
                        <pre style={{
                          marginTop: '6px',
                          padding: '6px',
                          background: '#1f2937',
                          borderRadius: '3px',
                          fontSize: '9px',
                          overflow: 'auto',
                          maxHeight: '100px'
                        }}>
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </DebugSection>

              {/* Section: Quick Actions */}
              <DebugSection title="⚡ Quick Actions">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    onClick={() => {
                      window.debugE2EKeys()
                      addDebugLog('info', 'Ran window.debugE2EKeys() in console')
                    }}
                    style={{
                      background: '#374151',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Check Keys
                  </button>
                  <button
                    onClick={() => {
                      const data = {
                        localStorage: {
                          pub: localStorage.getItem('e2e_pub_raw')?.slice(0, 50),
                          priv: !!localStorage.getItem('e2e_priv_jwk'),
                          pw: !!localStorage.getItem('e2e_decrypt_pw')
                        }
                      }
                      addDebugLog('info', 'LocalStorage keys checked', data)
                    }}
                    style={{
                      background: '#374151',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Check Storage
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const resp = await axios.get(`${API}/messages/public-key`, {
                          headers: { Authorization: `Bearer ${token}` }
                        })
                        addDebugLog('success', 'Fetched public key from server', resp.data)
                        addNetworkRequest('GET', `${API}/messages/public-key`, resp.status, resp.data)
                      } catch (err) {
                        addDebugLog('error', 'Failed to fetch public key', {
                          status: err.response?.status,
                          message: err.message
                        })
                        addNetworkRequest('GET', `${API}/messages/public-key`, err.response?.status || 0, err.response?.data)
                      }
                    }}
                    style={{
                      background: '#374151',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Test Key Fetch
                  </button>
                  <button
                    onClick={() => {
                      const socket = getSocket()
                      addDebugLog('info', 'Socket status', {
                        connected: socket?.connected,
                        id: socket?.id,
                        url: getLastSocketUrl()
                      })
                    }}
                    style={{
                      background: '#374151',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Check Socket
                  </button>
                </div>
              </DebugSection>
            </div>
          </div>
        )}
        
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
                loadPeopleList()
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
                <div className={styles.avatar}>{activePartnerInitials}</div>
                <div style={{ flex:1 }}>
                  <div className={styles.chatTitle}>{activePartnerName}</div>
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
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>{isOutgoing ? 'You' : (m.sender_name || activePartnerName || 'User')}</div>
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
                <input
                  type="text"
                  className={styles.modalSearchInput}
                  placeholder="Search alumni or students..."
                  value={searchPeople}
                  onChange={(e) => setSearchPeople(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.modalContent}>
                {loadingPeople ? (
                  <div className={styles.modalLoading}>
                    <div className={styles.spinner}></div>
                    <p>Loading people...</p>
                  </div>
                ) : filteredPeople.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}><BiGroup size={48} /></span>
                    <p>No people found</p>
                  </div>
                ) : (
                  <div className={styles.alumniGrid}>
                    {filteredPeople.map((person) => {
                      const userId = person.userId || person.user_id
                      const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim()
                      const initials = `${person.firstName?.charAt(0) || ''}${person.lastName?.charAt(0) || ''}`
                      return (
                        <div
                          key={userId}
                          className={styles.alumniItem}
                          onClick={() => handleStartNewChat(person)}
                        >
                          <div className={styles.alumniAvatar}>{initials}</div>
                          <div className={styles.alumniInfo}>
                            <div className={styles.alumniName}>{fullName}</div>
                            {person.currentCompany && (
                              <div className={styles.alumniMeta}>
                                {person.currentCompany}
                              </div>
                            )}
                            {person.graduationYear && (
                              <div className={styles.alumniMeta}>
                                Class of {person.graduationYear}
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

// Helper Components for Debug Panel
const DebugSection = ({ title, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <div style={{
      fontSize: '13px',
      fontWeight: 'bold',
      marginBottom: '8px',
      color: '#f9fafb',
      borderBottom: '1px solid #374151',
      paddingBottom: '6px'
    }}>
      {title}
    </div>
    <div style={{ paddingLeft: '4px' }}>
      {children}
    </div>
  </div>
)

const DebugItem = ({ label, value, valueColor, copyable }) => {
  const [copied, setCopied] = React.useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 8px',
      marginBottom: '4px',
      background: '#374151',
      borderRadius: '4px',
      fontSize: '11px'
    }}>
      <span style={{ color: '#9ca3af', minWidth: '120px' }}>{label}:</span>
      <span style={{
        color: valueColor || '#d1d5db',
        flex: 1,
        textAlign: 'right',
        wordBreak: 'break-all',
        marginLeft: '8px'
      }}>
        {value || 'N/A'}
      </span>
      {copyable && (
        <button
          onClick={handleCopy}
          style={{
            background: copied ? '#10b981' : '#4b5563',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            padding: '2px 6px',
            marginLeft: '8px',
            cursor: 'pointer',
            fontSize: '9px',
            transition: 'background 0.2s'
          }}
        >
          {copied ? '✓' : '📋'}
        </button>
      )}
    </div>
  )
}

export default Messages
