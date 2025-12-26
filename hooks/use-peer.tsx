import { logger } from '@/lib/logger'
import { TurnCredential } from '@/repositories/signaling.repository'
import { credential } from 'firebase-admin'
import { useEffect, useRef, useState } from 'react'
export type RemoteStream = {
  id: string
  stream: MediaStream
  streamId: string
}
const config: RTCConfiguration = {
  iceTransportPolicy: 'all',
  iceCandidatePoolSize: 3
}
export default function usePeer() {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const channelsRef = useRef<Record<string, RTCDataChannel>>({})
  const customOpenHandlers = useRef<Record<keyof typeof channelsRef.current, (ev: Event) => void>>({})
  const customDataMessageHandlers = useRef<Record<keyof typeof channelsRef.current, Record<string, (data: any) => void>>>({})
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([])
  const credentialRef = useRef<TurnCredential | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const onTrackHandler = useRef(onOriginalTrackHandler)
  const onICEConnectionStateHandler = useRef(
    onOriginalICEConnectionStateHandler
  )
  const onConnectionStateHandler = useRef(onOriginalConnectionStateHandler)
  const onICECandidateHandler =
    useRef<(e: RTCPeerConnectionIceEvent) => void>(null)
  const retry = useRef(0)
  const maxRetry = 20

  const createPeer = async () => {
    if (pcRef.current) {
      logger.warn('PC', 'Peer already exists')
      return
    }
    console.log(credentialRef.current)
    const pc = new RTCPeerConnection({
      ...config,
      ...credentialRef.current
    })
    pcRef.current = pc
    const local = localStreamRef.current
    if (local) {
      local.getTracks().forEach((t) => pc.addTrack(t, local))
      logger.debug('PC', 'local tracks added')
    }

    pc.oniceconnectionstatechange = onICEConnectionStateHandler.current
    pc.onconnectionstatechange = onConnectionStateHandler.current
    pc.onsignalingstatechange = () => {
      logger.debug(
        'PC SignalStatechange',
        'color: cyan',
        performance.now(),
        pc.signalingState
      )
    }
    pc.onicegatheringstatechange = () => {
      logger.debug(
        'PC ICEGatheringStatechange',
        'color: purple',
        performance.now(),
        pc.iceGatheringState
      )
    }
    pc.ontrack = onTrackHandler.current

    if (!onICECandidateHandler.current) {
      throw new Error('onICECandidateHandler is null')
    }
    pc.onicecandidate = onICECandidateHandler.current

    // data channel
    pc.ondatachannel = (event) => {
      const dc = event.channel
      channelsRef.current[dc.label] = dc
      if (dc.label in customDataMessageHandlers.current === false) {
        customDataMessageHandlers.current[dc.label] = {}
      }
      logger.info(
        'DC Register',
        'color: purple',
        performance.now(),
        dc.label
      )
      dc.onopen = (ev) => {
        logger.info(
          'DC Open',
          'color: green',
          performance.now(),
          ev
        )
        customOpenHandlers.current[dc.label]?.(ev)
      }
      dc.onmessage = (event) => {
        logger.debug(
          'DC EVENT',
          'color: blue',
          performance.now(),
          event.data
        )
        try {
          const text = new TextDecoder().decode(event.data)
          const data = JSON.parse(text)
          handleDataChannelMessage(dc.label, data)
        } catch {
          logger.error('DC ERROR', 'failed to parse message', event.data)
        }
      }
      dc.onclose = () => {
        logger.info('DC CLOSE', 'DataChannel closed', dc.label)
      }
      dc.onerror = (err) => {
        logger.error('DC ERROR', 'DataChannel error', err)
      }
    }
    retry.current = 0
  }

  const recreatePeer = async () => {
    setRemoteStreams([])
    if (retry.current >= maxRetry) {
      logger.error('WS failed to reconnect.')
      return false
    }
    retry.current++
    logger.debug('%RECONNECT SCHEDULED', performance.now())
    return new Promise<boolean>((resolve) => {
      setTimeout(async () => {
        logger.log(
          'PC',
          'RECONNECTING...',
          `${retry.current}/${maxRetry}`,
          performance.now()
        )
        try {
          await createPeer()
          resolve(true)
        } catch (error) {
          return await recreatePeer()
        }
      }, 2000)
    })
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current!
    try {
      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      logger.debug('PC', 'answer')
      return answer
    } catch (e) {
      logger.error('handleOffer error:', e)
    }
  }

  const disconnectPeerConnection = () => {
    try {
      pcRef.current?.close()
      pcRef.current = null
      retry.current = 0
    } catch {}
  }

  const handleDataChannelMessage = async (label: string, data: any) => {
    const messageHandlers = customDataMessageHandlers.current[label]
    if (messageHandlers) {
      const messageHandler = messageHandlers[data.event]
      if (messageHandler) {
          logger.debug(
            'DC EVENT',
            performance.now(),
            data
          )
        return await messageHandler(data.message)
      }
      logger.warn('DC', 'unknown event:', label, data)
    } else {
      logger.warn('DC', 'unknown channel:', label, data)
    }
  }

  useEffect(() => {
    window.addEventListener('beforeunload', function (event) {
      try {
        disconnectPeerConnection()
      } catch {}
    })
    return () => {
      disconnectPeerConnection()
    }
  }, [])

  async function onOriginalICEConnectionStateHandler(evt: Event) {
    logger.debug(
      'PC ICE CONNECTION',
      performance.now(),
      pcRef.current?.iceConnectionState
    )

    if (pcRef.current?.iceConnectionState === 'failed') {
      logger.debug('ICE failed → recreatePeer()')
      pcRef.current.close()
      pcRef.current = null
      return await recreatePeer()
    }
  }

  async function onOriginalConnectionStateHandler(evt: Event) {
    logger.info(
      '%c[PC CONNECTION]',
      performance.now(),
      pcRef.current?.connectionState
    )

    if (pcRef.current?.connectionState === 'failed') {
      logger.debug('PC', '❌ PeerConnection failed — restarting...')
      pcRef.current.close()
      pcRef.current = null
      return await recreatePeer()
    }
  }

  function onOriginalTrackHandler(evt: RTCTrackEvent) {
    logger.info(
      'PC REMOTE TRACK RECEIVED',
      'color: #00bcd4',
      evt.streams[0]?.id,
      evt.track.kind,
      evt.track.id,
      performance.now()
    )
    if (evt.track.kind !== 'video') {
      return
    }
    const stream = evt.streams[0] || new MediaStream([evt.track])
    const id = stream.id + '_' + evt.track.id
    const streamId = stream.id

    setRemoteStreams((prev) => {
      if (prev.some((v) => v.id === id)) return prev
      return [...prev, { id, stream, streamId }]
    })

    evt.track.onended = () => {
      setRemoteStreams((prev) => prev.filter((v) => v.id !== id))
    }

    stream.onremovetrack = ({ track }) => {
      logger.info(
        'PC REMOTE REMOVED',
        'color: #ff8a65',
        stream.id,
        track.kind,
        track.id,
        performance.now()
      )
      if (track.id === evt.track.id) {
        setRemoteStreams((prev) => prev.filter((v) => v.id !== id))
      }
    }
  }

  return {
    createPeer,
    recreatePeer,
    onOriginalConnectionStateHandler,
    onOriginalICEConnectionStateHandler,
    handleOffer,
    disconnectPeerConnection,
    pcRef,
    onTrackHandler,
    onICECandidateHandler,
    onICEConnectionStateHandler,
    onConnectionStateHandler,
    remoteStreams,
    credentialRef,
    customOpenHandlers,
    customDataMessageHandlers,
    channelsRef,
    setRemoteStreams
  }
}
