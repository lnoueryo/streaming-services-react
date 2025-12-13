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
      console.log(
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
      console.log(
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
        console.log('%c[WS OPEN]', 'color: #4caf50', performance.now(), url)
        clearTimeout(timer)
        retry.current = 0
        ws.onclose = (e) => {
          console.log('%c[WS CLOSE]', 'color: #4caf50', performance.now(), url)
          setWsOpen(false)
          onClose.current(e)
        }
        ws.onerror = (e) => {
          console.log('%c[WS ERROR]', 'color: orange', e)
          onError.current(e)
        }
        setWsOpen(true)
        resolve(ws)
      }

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data)
        if (!msg.event) return
        console.log('[WS EVENT] ', msg.event)
        if (customMessageHandlers.current[msg.event]) {
          customMessageHandlers.current[msg.event](msg.data)
        } else {
          console.log('[WS] unknown event:', msg.event)
        }
      }

      wsRef.current = ws
    })
  }

  const reconnectWS = async () => {
    if (retry.current >= maxRetry) {
      console.error('WS failed to reconnect.')
      return
    }
    retry.current++
    console.log('%c[RECONNECT SCHEDULED]', 'color:orange', performance.now())
    setTimeout(async () => {
      console.log(
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
    }, 2000)
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
