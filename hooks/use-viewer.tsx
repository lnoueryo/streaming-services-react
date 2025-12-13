import { useRef } from 'react'
import { useSignalingClient } from './use-signaling-client'

export function useViewer(url: string) {
  const {
    remoteVideos,
    ws,
    pc: _pc,
    retry,
    maxRetry,
    isConnected,
    connect: _connect,
    reconnect: _reconnect,
    send,
    close
  } = useSignalingClient(url)
  const stream = useRef<MediaStream | null>(null)
  const isFrontCam = useRef(false)
  const connect = async () => {
    await _connect()
  }

  const reconnect = () => {
    _reconnect()
    console.log('%c[RECONNECT SCHEDULED]', 'color:orange', performance.now())
    setTimeout(async () => {
      console.log(
        '%c[RECONNECTING...]',
        'color:orange',
        `${retry}/${maxRetry}`,
        performance.now()
      )
      await connect()
    }, 1000)
  }
  return {
    remoteVideos,
    ws,
    pc: _pc,
    stream,
    isFrontCam,
    isConnected,
    connect,
    reconnect,
    send,
    close
  }
}
