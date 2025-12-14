import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@context/AuthContext'
import { useMessaging } from '@context/MessagingContext'
import { getSocket } from '../utils/socketClient'
import * as crypto from '../utils/crypto'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  BiMessageRounded, 
  BiSearch, 
  BiX, 
  BiSend, 
  BiDotsVerticalRounded, 
  BiBlock, 
  BiFlag,
  BiPaperclip,
  BiImage,
  BiFile
} from 'react-icons/bi'
import styles from './Messages.module.css'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

const MessageNew = () => {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const query = useQuery()
  const preTo = query.get('to')

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  // Connection
  const [connected, setConnected] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Conversations & Messages
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(preTo || '')
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  
  // Message Input
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [attachmentMeta, setAttachmentMeta] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // UI State
  const [showSidebar, setShowSidebar] = useState(true)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  
  // People Search (New Chat)
  const [peopleList, setPeopleList] = useState([])
  const [searchPeople, setSearchPeople] = useState('')
  const [loadingPeople, setLoadingPeople] = useState(false)

  // Block/Report
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportType, setReportType] = useState('harassment')
  const [reportDescription, setReportDescription] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [isBlocked, setIsBlocked] = useState(false)

  // Refs
  const messagesEndRef = useRef(null)
  const conversationKeysCache = useRef(new Map()) // userId -> { aesKey, publicKey }
  const markedReadSet = useRef(new Set())
  const localKeysRef = useRef(null)

  // Context
  const { conversationUnreadMap, clearConversationUnread, setActiveConversationUserId } = useMessaging()

  // ============================================================================
  // ENCRYPTION KEY MANAGEMENT (READ-ONLY FROM LOCALSTORAGE)
  // ============================================================================
  
  /**
   * Load encryption keys from localStorage ONLY.
   * No generation, no server fetching - those are AuthContext's responsibility.
   * If keys are missing, show clear error to user.
   */
  const loadLocalKeys = useCallback(() => {
    console.log('[MessageNew] Loading encryption keys from localStorage...')
    
    const publicKeyRaw = localStorage.getItem('e2e_pub_raw')
    const privateKeyJwk = localStorage.getItem('e2e_priv_jwk')
    
    if (!publicKeyRaw || !privateKeyJwk) {
      console.error('[MessageNew] ❌ Encryption keys not found in localStorage')
      setErrorMsg(
        '🔐 Encryption keys not found. Please log out and log back in to initialize your keys.'
      )
      return null
    }

    console.log('[MessageNew] ✅ Encryption keys loaded successfully')
    localKeysRef.current = { publicKeyRaw, privateKeyJwk }
    setErrorMsg('') // Clear any previous errors
    return { publicKeyRaw, privateKeyJwk }
  }, [])

  // ============================================================================
  // ENCRYPTION UTILITIES
  // ============================================================================

  /**
   * Get or derive AES key for conversation with a specific user
   */
  const getConversationAESKey = useCallback(async (partnerUserId, partnerPublicKey) => {
    // Check cache first
    const cached = conversationKeysCache.current.get(partnerUserId)
    if (cached) {
      return cached.aesKey
    }

    // Derive new AES key
    const keys = localKeysRef.current
    if (!keys) {
      throw new Error('Local keys not loaded')
    }

    const privateKey = await crypto.importPrivateKey(keys.privateKeyJwk)
    const publicKey = await crypto.importPublicKey(partnerPublicKey)
    const sharedSecret = await crypto.deriveSharedSecret(privateKey, publicKey)
    const aesKey = await crypto.deriveAESGCMKey(sharedSecret)

    // Cache it
    conversationKeysCache.current.set(partnerUserId, { aesKey, publicKey: partnerPublicKey })
    
    return aesKey
  }, [])

  /**
   * Encrypt a message for a specific user
   */
  const encryptForUser = useCallback(async (plaintext, partnerUserId, partnerPublicKey) => {
    const aesKey = await getConversationAESKey(partnerUserId, partnerPublicKey)
    return await crypto.encryptMessage(aesKey, plaintext)
  }, [getConversationAESKey])

  /**
   * Decrypt a message from a specific user
   */
  const decryptFromUser = useCallback(async (ciphertext, iv, partnerUserId, partnerPublicKey) => {
    const aesKey = await getConversationAESKey(partnerUserId, partnerPublicKey)
    return await crypto.decryptMessage(aesKey, iv, ciphertext)
  }, [getConversationAESKey])

  // ============================================================================
  // API CALLS
  // ============================================================================

  /**
   * Fetch all conversations for the current user
   */
  const fetchConversations = useCallback(async () => {
    if (!token) return

    try {
      const response = await axios.get(`${API}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const conversationList = response.data?.data || []
      setConversations(conversationList)
      console.log('[MessageNew] Loaded conversations:', conversationList.length)
    } catch (error) {
      console.error('[MessageNew] Failed to fetch conversations:', error)
      setErrorMsg('Failed to load conversations. Please refresh the page.')
    }
  }, [API, token])

  /**
   * Fetch messages for a specific conversation
   */
  const fetchMessages = useCallback(async (partnerUserId) => {
    if (!token || !partnerUserId) return

    try {
      const response = await axios.get(`${API}/messages/${partnerUserId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      const encryptedMessages = response.data?.data || []
      console.log('[MessageNew] Loaded messages:', encryptedMessages.length)

      // Decrypt messages
      const decryptedMessages = []
      for (const msg of encryptedMessages) {
        try {
          // Determine which user's public key to use for decryption
          const isOutgoing = msg.sender_user_id === user.id
          const decryptionPartnerId = isOutgoing ? msg.receiver_user_id : msg.sender_user_id
          const partnerPublicKey = isOutgoing ? msg.receiver_public_key : msg.sender_public_key

          if (!partnerPublicKey) {
            console.warn('[MessageNew] Missing public key for message:', msg.id)
            continue
          }

          const plaintext = await decryptFromUser(
            msg.content,
            msg.iv,
            decryptionPartnerId,
            partnerPublicKey
          )

          decryptedMessages.push({
            ...msg,
            decryptedContent: plaintext
          })
        } catch (decryptError) {
          console.error('[MessageNew] Failed to decrypt message:', msg.id, decryptError)
          decryptedMessages.push({
            ...msg,
            decryptedContent: '[Failed to decrypt]',
            decryptError: true
          })
        }
      }

      setMessages(decryptedMessages)

      // Mark messages as read
      if (decryptedMessages.length > 0) {
        markMessagesAsRead(partnerUserId)
      }
    } catch (error) {
      console.error('[MessageNew] Failed to fetch messages:', error)
      setErrorMsg('Failed to load messages.')
    }
  }, [API, token, user, decryptFromUser])

  /**
   * Send a new message
   */
  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !activeConversationId || sending) return

    const keys = localKeysRef.current
    if (!keys) {
      setErrorMsg('🔐 Encryption keys not available. Please refresh the page.')
      return
    }

    setSending(true)
    setErrorMsg('')

    try {
      // Get partner's public key
      const conversation = conversations.find(c => 
        c.other_user_id === activeConversationId || 
        c.user_id === activeConversationId
      )

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      const partnerPublicKey = conversation.other_public_key || conversation.partner_public_key

      if (!partnerPublicKey) {
        throw new Error('Partner public key not found')
      }

      // Encrypt message
      const { iv, ciphertext } = await encryptForUser(
        messageText,
        activeConversationId,
        partnerPublicKey
      )

      // Send to server
      const payload = {
        to: activeConversationId,
        content: ciphertext,
        iv,
        sender_public_key: keys.publicKeyRaw,
        receiver_public_key: partnerPublicKey,
        ...(attachmentMeta && { attachment: attachmentMeta })
      }

      await axios.post(`${API}/messages/send`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Add to local messages immediately (optimistic update)
      const newMessage = {
        id: `temp-${Date.now()}`,
        sender_user_id: user.id,
        receiver_user_id: activeConversationId,
        content: ciphertext,
        iv,
        decryptedContent: messageText,
        created_at: new Date().toISOString(),
        read: false
      }

      setMessages(prev => [...prev, newMessage])
      setMessageText('')
      setAttachmentMeta(null)

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)

      // Refresh conversations to update "last message"
      fetchConversations()

    } catch (error) {
      console.error('[MessageNew] Failed to send message:', error)
      setErrorMsg('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }, [messageText, activeConversationId, sending, conversations, encryptForUser, API, token, user, attachmentMeta, fetchConversations])

  /**
   * Mark messages as read
   */
  const markMessagesAsRead = useCallback(async (partnerUserId) => {
    if (markedReadSet.current.has(partnerUserId)) return
    
    try {
      await axios.put(
        `${API}/messages/${partnerUserId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      markedReadSet.current.add(partnerUserId)
      clearConversationUnread(partnerUserId)
    } catch (error) {
      console.error('[MessageNew] Failed to mark as read:', error)
    }
  }, [API, token, clearConversationUnread])

  /**
   * Fetch partner's public key
   */
  const fetchPartnerPublicKey = useCallback(async (userId) => {
    try {
      const response = await axios.get(`${API}/messages/public-key/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data?.data?.public_key
    } catch (error) {
      console.error('[MessageNew] Failed to fetch partner public key:', error)
      return null
    }
  }, [API, token])

  /**
   * Start new conversation
   */
  const startNewConversation = useCallback(async (selectedUser) => {
    setShowNewChatModal(false)
    setActiveConversationId(selectedUser.id)
    setMessages([])
    
    // Fetch partner's public key and cache it
    const publicKey = await fetchPartnerPublicKey(selectedUser.id)
    if (publicKey) {
      conversationKeysCache.current.set(selectedUser.id, { publicKey })
    }
    
    if (isMobile) {
      setShowSidebar(false)
    }
  }, [fetchPartnerPublicKey, isMobile])

  /**
   * Search for people to start new chat
   */
  const searchForPeople = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setPeopleList([])
      return
    }

    setLoadingPeople(true)
    try {
      const response = await axios.get(`${API}/users/search`, {
        params: { q: searchTerm },
        headers: { Authorization: `Bearer ${token}` }
      })
      setPeopleList(response.data?.data || [])
    } catch (error) {
      console.error('[MessageNew] Failed to search people:', error)
    } finally {
      setLoadingPeople(false)
    }
  }, [API, token])

  // ============================================================================
  // SOCKET.IO REAL-TIME MESSAGING
  // ============================================================================

  useEffect(() => {
    if (!user || !token) return

    const socket = getSocket()
    if (!socket) return

    // Connection status
    const handleConnect = () => {
      console.log('[MessageNew] Socket connected')
      setConnected(true)
    }

    const handleDisconnect = () => {
      console.log('[MessageNew] Socket disconnected')
      setConnected(false)
    }

    // Receive new message
    const handleReceiveMessage = async (payload) => {
      console.log('[MessageNew] Received message:', payload)

      try {
        const savedMessage = payload.message || payload
        const senderId = savedMessage.sender_user_id || payload.from
        const ciphertext = savedMessage.content || payload.ciphertext
        const iv = savedMessage.iv || payload.iv

        if (!senderId || !ciphertext || !iv) {
          console.warn('[MessageNew] Invalid message payload')
          return
        }

        // Decrypt message
        const senderPublicKey = savedMessage.sender_public_key || payload.sender_public_key
        if (!senderPublicKey) {
          console.warn('[MessageNew] Missing sender public key')
          return
        }

        const plaintext = await decryptFromUser(ciphertext, iv, senderId, senderPublicKey)

        const newMessage = {
          ...savedMessage,
          decryptedContent: plaintext
        }

        // Update messages if this is the active conversation
        if (senderId === activeConversationId || savedMessage.receiver_user_id === activeConversationId) {
          setMessages(prev => [...prev, newMessage])
          
          // Scroll to bottom
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }, 100)

          // Mark as read if conversation is active
          if (senderId === activeConversationId) {
            markMessagesAsRead(senderId)
          }
        }

        // Refresh conversation list
        fetchConversations()

      } catch (error) {
        console.error('[MessageNew] Failed to process received message:', error)
      }
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('secure:receive', handleReceiveMessage)

    // Cleanup
    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('secure:receive', handleReceiveMessage)
    }
  }, [user, token, activeConversationId, decryptFromUser, markMessagesAsRead, fetchConversations])

  // ============================================================================
  // LIFECYCLE & INITIALIZATION
  // ============================================================================

  // Load encryption keys on mount
  useEffect(() => {
    if (!user || !token) return

    const keys = loadLocalKeys()
    if (!keys) {
      // Error message already set by loadLocalKeys
      return
    }

    // Initial data fetch
    fetchConversations()
  }, [user, token, loadLocalKeys, fetchConversations])

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) return

    setMessages([])
    fetchMessages(activeConversationId)
    setActiveConversationUserId(activeConversationId)
  }, [activeConversationId, fetchMessages, setActiveConversationUserId])

  // Handle pre-selected conversation from URL
  useEffect(() => {
    if (preTo && conversations.length > 0) {
      setActiveConversationId(preTo)
      if (isMobile) {
        setShowSidebar(false)
      }
    }
  }, [preTo, conversations, isMobile])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredConversations = conversations.filter(conv => {
    if (!search) return true
    const name = conv.other_name || conv.partner_name || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const activeConversation = conversations.find(c => 
    c.other_user_id === activeConversationId || 
    c.user_id === activeConversationId
  )

  const partnerName = activeConversation?.other_name || 
                      activeConversation?.partner_name || 
                      'Unknown User'

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${API}/messages/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      setAttachmentMeta(response.data?.data)
    } catch (error) {
      console.error('[MessageNew] File upload failed:', error)
      setErrorMsg('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleBlock = async () => {
    if (!activeConversationId) return

    try {
      await axios.post(
        `${API}/messages/block`,
        { userId: activeConversationId, reason: blockReason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setIsBlocked(true)
      setShowBlockModal(false)
      setBlockReason('')
    } catch (error) {
      console.error('[MessageNew] Failed to block user:', error)
      setErrorMsg('Failed to block user')
    }
  }

  const handleReport = async () => {
    if (!activeConversationId) return

    try {
      await axios.post(
        `${API}/messages/report`,
        {
          userId: activeConversationId,
          type: reportType,
          description: reportDescription
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setShowReportModal(false)
      setReportDescription('')
      alert('Report submitted successfully')
    } catch (error) {
      console.error('[MessageNew] Failed to report user:', error)
      setErrorMsg('Failed to submit report')
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <p>Please log in to access messages</p>
        </div>
      </div>
    )
  }

  if (errorMsg && !localKeysRef.current) {
    return (
      <div className={styles.container}>
        <Helmet>
          <title>Messages - IIIT NR Alumni Portal</title>
        </Helmet>
        <div className={styles.errorState}>
          <p>{errorMsg}</p>
          <button onClick={() => navigate('/profile')}>Go to Profile</button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Helmet>
        <title>Messages - IIIT NR Alumni Portal</title>
      </Helmet>

      <div className={styles.layout}>
        {/* ===== SIDEBAR: Conversation List ===== */}
        {(!isMobile || showSidebar) && (
          <div className={styles.sidebarShell}>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.sidebarTitle}>
                <BiMessageRounded /> Messages
              </h2>
              <button
                className={styles.newChatBtn}
                onClick={() => setShowNewChatModal(true)}
                title="New Chat"
              >
                +
              </button>
            </div>

            {/* Search */}
            <div className={styles.searchBox}>
              <BiSearch />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <BiX
                  onClick={() => setSearch('')}
                  style={{ cursor: 'pointer' }}
                />
              )}
            </div>

            {/* Connection Status */}
            <div className={styles.connectionStatus}>
              <span className={connected ? styles.connected : styles.disconnected}>
                {connected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
            </div>

            {/* Conversations List */}
            <div className={styles.conversationsList}>
              {filteredConversations.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No conversations yet</p>
                  <button onClick={() => setShowNewChatModal(true)}>
                    Start a new chat
                  </button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const convUserId = conv.other_user_id || conv.user_id
                  const convName = conv.other_name || conv.partner_name || 'Unknown'
                  const lastMsg = conv.last_message || ''
                  const unreadCount = conversationUnreadMap[convUserId] || 0
                  const isActive = convUserId === activeConversationId

                  return (
                    <div
                      key={convUserId}
                      className={`${styles.conversationItem} ${isActive ? styles.active : ''}`}
                      onClick={() => {
                        setActiveConversationId(convUserId)
                        if (isMobile) setShowSidebar(false)
                      }}
                    >
                      <div className={styles.conversationAvatar}>
                        {convName.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.conversationMeta}>
                        <div className={styles.conversationName}>{convName}</div>
                        <div className={styles.conversationPreview}>
                          {lastMsg.substring(0, 40)}
                          {lastMsg.length > 40 ? '...' : ''}
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <div className={styles.unreadDot}></div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ===== CHAT AREA: Messages Thread ===== */}
        <div className={styles.chatShell}>
          {!activeConversationId ? (
            <div className={styles.emptyState}>
              <BiMessageRounded size={64} />
              <p>Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                {isMobile && (
                  <button
                    className={styles.showSidebarBtn}
                    onClick={() => setShowSidebar(true)}
                  >
                    ←
                  </button>
                )}
                <div className={styles.chatHeaderInfo}>
                  <div className={styles.avatar}>
                    {partnerName.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.chatTitle}>{partnerName}</div>
                </div>
                <div className={styles.actionsMenuContainer}>
                  <button
                    className={styles.actionsMenuBtn}
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                  >
                    <BiDotsVerticalRounded />
                  </button>
                  {showActionsMenu && (
                    <div className={styles.actionsDropdown}>
                      <button onClick={() => {
                        setShowBlockModal(true)
                        setShowActionsMenu(false)
                      }}>
                        <BiBlock /> Block User
                      </button>
                      <button onClick={() => {
                        setShowReportModal(true)
                        setShowActionsMenu(false)
                      }}>
                        <BiFlag /> Report User
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages List */}
              <div className={styles.messagesViewport}>
                {messages.length === 0 ? (
                  <div className={styles.emptyMessages}>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_user_id === user.id
                    return (
                      <div
                        key={msg.id}
                        className={`${styles.messageRow} ${isOwn ? styles.messageOutgoing : styles.messageIncoming}`}
                      >
                        <div className={`${styles.bubble} ${isOwn ? styles.bubbleOutgoing : styles.bubbleIncoming}`}>
                          {msg.decryptError && (
                            <span className={styles.decryptError}>⚠️ </span>
                          )}
                          {msg.decryptedContent}
                          {msg.attachment && (
                            <div className={styles.attachment}>
                              {msg.attachment.type?.startsWith('image/') ? (
                                <BiImage />
                              ) : (
                                <BiFile />
                              )}
                              <span>{msg.attachment.filename}</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.bubbleMeta}>
                          {new Date(msg.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className={styles.composerBox}>
                {attachmentMeta && (
                  <div className={styles.attachmentPreview}>
                    <span>{attachmentMeta.filename}</span>
                    <BiX onClick={() => setAttachmentMeta(null)} />
                  </div>
                )}
                <div className={styles.composerRow}>
                  <button
                    className={styles.composerIcon}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <BiPaperclip />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    onChange={handleFileSelect}
                  />
                  <textarea
                    className={styles.composerTextarea}
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    rows={1}
                  />
                  <button
                    className={styles.composerSubmit}
                    onClick={sendMessage}
                    disabled={!messageText.trim() || sending || uploading}
                  >
                    <BiSend />
                  </button>
                </div>
                {errorMsg && (
                  <div className={styles.inputError}>{errorMsg}</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      
      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className={styles.modal} onClick={() => setShowNewChatModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Start New Chat</h3>
              <BiX onClick={() => setShowNewChatModal(false)} />
            </div>
            <div className={styles.modalBody}>
              <input
                type="text"
                placeholder="Search people..."
                value={searchPeople}
                onChange={(e) => {
                  setSearchPeople(e.target.value)
                  searchForPeople(e.target.value)
                }}
              />
              {loadingPeople && <p>Searching...</p>}
              <div className={styles.peopleList}>
                {peopleList.map((person) => (
                  <div
                    key={person.id}
                    className={styles.personItem}
                    onClick={() => startNewConversation(person)}
                  >
                    <div className={styles.personAvatar}>
                      {person.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className={styles.personInfo}>
                      <div className={styles.personName}>{person.name}</div>
                      <div className={styles.personEmail}>{person.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className={styles.modal} onClick={() => setShowBlockModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Block User</h3>
              <BiX onClick={() => setShowBlockModal(false)} />
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to block {partnerName}?</p>
              <textarea
                placeholder="Reason (optional)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
              />
              <div className={styles.modalActions}>
                <button onClick={() => setShowBlockModal(false)}>Cancel</button>
                <button onClick={handleBlock} className={styles.dangerBtn}>
                  Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className={styles.modal} onClick={() => setShowReportModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Report User</h3>
              <BiX onClick={() => setShowReportModal(false)} />
            </div>
            <div className={styles.modalBody}>
              <label>Report Type:</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              >
                <option value="harassment">Harassment</option>
                <option value="spam">Spam</option>
                <option value="inappropriate">Inappropriate Content</option>
                <option value="other">Other</option>
              </select>
              <label>Description:</label>
              <textarea
                placeholder="Describe the issue..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={4}
                required
              />
              <div className={styles.modalActions}>
                <button onClick={() => setShowReportModal(false)}>Cancel</button>
                <button
                  onClick={handleReport}
                  className={styles.primaryBtn}
                  disabled={!reportDescription.trim()}
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageNew
