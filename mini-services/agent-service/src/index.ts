import { createServer } from 'http'
import { Server } from 'socket.io'
import { AgentOrchestrator, type AgentEvent } from './orchestrator'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path — Caddy uses it to forward to this port
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Rolling buffer of recent events sent to new clients so they have immediate context
const recentEvents: AgentEvent[] = []
const MAX_BUFFER = 50

const emitFn = (ev: AgentEvent) => {
  recentEvents.push(ev)
  if (recentEvents.length > MAX_BUFFER) recentEvents.shift()
  io.emit('agent:event', ev)
}

const orchestrator = new AgentOrchestrator(emitFn)

io.on('connection', (socket) => {
  console.log('[socket] client connected:', socket.id)
  // Replay recent events so the new client has immediate context
  for (const ev of recentEvents) socket.emit('agent:event', ev)

  socket.on('agent:start', async () => {
    try { await orchestrator.startLoop() } catch (e: any) { console.error(e) }
  })
  socket.on('agent:stop', async () => {
    try { await orchestrator.stopLoop() } catch (e: any) { console.error(e) }
  })
  socket.on('agent:run-once', async () => {
    try { await orchestrator.runOnce() } catch (e: any) { console.error(e) }
  })
  socket.on('agent:close-all', async () => {
    try { await orchestrator.closeAllPositions() } catch (e: any) { console.error(e) }
  })
  socket.on('agent:config-update', async (patch) => {
    try { await orchestrator.updateConfig(patch) } catch (e: any) { console.error(e) }
  })
  socket.on('disconnect', () => {
    console.log('[socket] client disconnected:', socket.id)
  })
})

const PORT = 3003
httpServer.listen(PORT, async () => {
  console.log(`[agent-service] socket.io listening on port ${PORT}`)
  try {
    await orchestrator.init()
    console.log('[agent-service] orchestrator initialized — agent idle. Send "agent:start" to begin.')
  } catch (e: any) {
    console.error('[agent-service] init failed:', e)
  }
})

process.on('SIGTERM', () => {
  console.log('[agent-service] SIGTERM, shutting down')
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[agent-service] SIGINT, shutting down')
  httpServer.close(() => process.exit(0))
})
