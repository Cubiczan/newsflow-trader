'use client'

import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

export interface AgentEvent {
  type:
    | 'tick'
    | 'news_ingested'
    | 'sentiment'
    | 'decision'
    | 'order_submitted'
    | 'order_filled'
    | 'risk_block'
    | 'error'
    | 'status'
  message: string
  symbol?: string
  payload?: Record<string, unknown>
  ts: string
}

let _socket: Socket | null = null
export function getAgentSocket(): Socket {
  if (_socket) return _socket
  // IMPORTANT: client connects through the gateway with XTransformPort in query
  _socket = io('/?XTransformPort=3003', {
    transports: ['polling', 'websocket'],
    upgrade: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })
  return _socket
}

export function useAgentEvents(max: number = 100) {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    const s = getAgentSocket()
    const onEvent = (ev: AgentEvent) => {
      setEvents((prev) => {
        const next = [ev, ...prev]
        return next.slice(0, max)
      })
    }
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    s.on('agent:event', onEvent)
    s.on('connect', onConnect)
    s.on('disconnect', onDisconnect)
    // Initial sync — defer to avoid setState-in-effect lint
    Promise.resolve().then(() => {
      if (s.connected) setConnected(true)
    })
    return () => {
      s.off('agent:event', onEvent)
      s.off('connect', onConnect)
      s.off('disconnect', onDisconnect)
    }
  }, [max])
  return { events, connected }
}

// React Query client (singleton)
let _qc: QueryClient | null = null
export function getQueryClient(): QueryClient {
  if (!_qc) {
    _qc = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5000,
          refetchOnWindowFocus: true,
          retry: 1,
        },
      },
    })
  }
  return _qc
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => getQueryClient())
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

export { useQuery }
