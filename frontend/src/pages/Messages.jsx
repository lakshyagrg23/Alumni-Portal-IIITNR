import React, { useEffect, useState, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../context/AuthContext'
import socketClient, { initSocket, getSocket, closeSocket } from '../utils/socketClient'
import * as crypto from '../utils/crypto'
import axios from 'axios'

const Messages = () => {
  const { user, token } = useAuth()
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [toUserId, setToUserId] = useState('')
  const [text, setText] = useState('')
  const localKeysRef = useRef(null)
  const aesKeyRef = useRef(null)

  useEffect(() => {
    if (!user) {
      return;
    }

    (async () => {
      // generate keys and publish public key
      const kp = await crypto.generateKeyPair()
      localKeysRef.current = kp
      const pub = await crypto.exportPublicKey(kp.publicKey)

      try {
        await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/public-key`, { publicKey: pub }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }})
      } catch (err) {
        console.warn('Failed to publish public key', err)
      }

      const socket = initSocket(localStorage.getItem('token'))
      socket.on('connect', () => setConnected(true))
      socket.on('disconnect', () => setConnected(false))

      socket.on('secure:receive', async (payload) => {
        try {
          const { from, ciphertext, metadata, id, sent_at } = payload
          // fetch sender public key and derive shared secret if not already
          if (!aesKeyRef.current || aesKeyRef.current.peer !== from) {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/public-key/${from}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }})
            const theirPub = res.data.data.public_key
            const imported = await crypto.importPublicKey(theirPub)
            const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
            const aes = await crypto.deriveAESGCMKey(shared)
            aesKeyRef.current = { key: aes, peer: from }
          }
          const iv = metadata?.iv
          const cipher = metadata?.ciphertext
          const plain = await crypto.decryptMessage(aesKeyRef.current.key, iv, cipher)
          setMessages((m) => [...m, { id, from, text: plain, sent_at }])
        } catch (err) {
          console.error('Failed to decrypt incoming message', err)
        }
      })

      return () => {
        closeSocket()
      }
    })()
  }, [user])

  const handleSend = async () => {
    if (!toUserId || !text) {
      return;
    }

    try {
      // fetch recipient public key
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/public-key/${toUserId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }})
      const theirPub = res.data.data.public_key
      const imported = await crypto.importPublicKey(theirPub)
      const shared = await crypto.deriveSharedSecret(localKeysRef.current.privateKey, imported)
      const aes = await crypto.deriveAESGCMKey(shared)
      const enc = await crypto.encryptMessage(aes, text)

      const payload = {
        toUserId,
        ciphertext: enc.ciphertext,
        metadata: { iv: enc.iv, ciphertext: enc.ciphertext, messageType: 'text' },
      }
      const socket = getSocket()
      socket.emit('secure:send', payload)
      setMessages((m) => [...m, { from: user.id, text, pending: true }])
      setText('')
    } catch (err) {
      console.error('send failed', err)
    }
  }

  return (
    <>
      <Helmet>
        <title>Messages - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      <div style={{ padding: '1.5rem' }}>
        <h1>Messages</h1>
        <div style={{ marginBottom: '1rem' }}>
          <label>To User ID:</label>
          <input value={toUserId} onChange={(e) => setToUserId(e.target.value)} placeholder="Recipient user id" />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} style={{ width: '100%' }} />
        </div>
        <button onClick={handleSend} disabled={!connected}>Send Encrypted</button>

        <div style={{ marginTop: '2rem' }}>
          <h2>Chat</h2>
          <div>
            {messages.map((m, idx) => (
              <div key={idx} style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                <strong>{m.from === user.id ? 'You' : m.from}</strong>: {m.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default Messages
