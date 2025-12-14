import { logger } from '@/lib/logger'
import { useEffect, useRef, useState } from 'react'
export type RemoteVideoItem = {
  id: string
  stream: MediaStream
}
const config: RTCConfiguration = {
  iceTransportPolicy: 'all',
  iceCandidatePoolSize: 3
}
export default function useWebsocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const [wsOpen, setWsOpen] = useState(false)
  const customMessageHandlers = useRef<Record<string, (data: any) => void>>({})
  const retry = useRef(0)
  const maxRetry = 20
  const onClose = useRef(async (e: CloseEvent) => {
    if (!e.wasClean) await reconnectWS()
  })
  const onError = useRef(async (e: Event) => {})

  const sendWS = (msg: any) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.debug(
        '%c[WS SEND ERROR] ws not open',
        'color: orange',
        performance.now(),
        url
      )
      return
    }
    ws.send(JSON.stringify(msg))
  }

  const connectWS = (timeoutMs = 5000) => {
    if (wsOpen) {
      logger.debug(
        '%c[WS ALREADY OPEN]',
        'color: #c6c623ff',
        performance.now(),
        url
      )
      return
    }
    return new Promise(async (resolve, reject) => {
      const ws = new WebSocket(url)

      const timer = setTimeout(() => {
        ws.close()
        reject(new Error('WebSocket connection timeout'))
      }, timeoutMs)

      ws.onopen = () => {
        logger.info('WS OPEN', performance.now(), url)
        clearTimeout(timer)
        retry.current = 0
        ws.onclose = (e) => {
          logger.info('[WS CLOSE]', performance.now(), url)
          setWsOpen(false)
          onClose.current(e)
        }
        ws.onerror = (e) => {
          logger.error('[WS ERROR]', performance.now(), url, e)
          onError.current(e)
        }
        setWsOpen(true)
        resolve(ws)
      }

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data)
        if (!msg.event) return
        logger.debug('[WS EVENT] ', msg.event)
        if (customMessageHandlers.current[msg.event]) {
          customMessageHandlers.current[msg.event](msg.data)
        } else {
          logger.warn('WS', 'unknown event:', msg.event)
        }
      }

      wsRef.current = ws
    })
  }

  const reconnectWS = async () => {
    if (retry.current >= maxRetry) {
      logger.error('WS failed to reconnect.')
      return
    }
    retry.current++
    logger.debug('%c[RECONNECT SCHEDULED]', 'color:orange', performance.now())
    setTimeout(async () => {
      logger.log(
        '%c[RECONNECTING...]',
        'color:orange',
        `${retry.current}/${maxRetry}`,
        performance.now()
      )
      try {
        await connectWS()
      } catch (error) {
        await reconnectWS()
      }
    }, 1000)
  }

  const disconnectWSConnection = () => {
    try {
      wsRef.current?.close()
      wsRef.current = null
    } catch {}
  }

  useEffect(() => {
    window.addEventListener('beforeunload', function (event) {
      try {
        disconnectWSConnection()
      } catch {}
    })
    return () => {
      disconnectWSConnection()
    }
  }, [])

  return {
    connectWS,
    reconnectWS,
    disconnectWSConnection,
    sendWS,
    customMessageHandlers,
    wsOpen,
    wsRef
  }
}
