/**
 * Tiny socket.io helper that the Next.js API routes use to send control
 * commands (start/stop/run-once/close-all/config-update) to the agent-service
 * mini-service running on port 3003.
 *
 * The frontend browser connects to the same service via `io("/?XTransformPort=3003")`
 * to stream live events. Server-side we connect directly via localhost:3003
 * (no XTransformPort needed for internal traffic).
 */

import { io, type Socket } from 'socket.io-client'

let _socket: Socket | null = null

export function getAgentSocket(): Socket {
  if (_socket && _socket.connected) return _socket
  if (_socket) _socket.disconnect()
  _socket = io('http://localhost:3003', {
    path: '/',
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 3,
    timeout: 2000,
  })
  return _socket
}

export function sendToAgent(event: string, payload?: unknown, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = getAgentSocket()
    let settled = false
    const done = (err?: Error) => {
      if (settled) return
      settled = true
      if (err) reject(err)
      else resolve()
    }
    const timer = setTimeout(() => done(new Error('agent socket timeout')), timeoutMs)
    if (!socket.connected) {
      socket.once('connect', () => {
        clearTimeout(timer)
        socket.emit(event, payload)
        // Small grace so the emit flushes; agent logs the action via agent:event
        setTimeout(() => done(), 200)
      })
      socket.once('connect_error', (e) => {
        clearTimeout(timer)
        done(new Error('agent socket connect_error: ' + e.message))
      })
    } else {
      socket.emit(event, payload)
      clearTimeout(timer)
      setTimeout(() => done(), 200)
    }
  })
}

