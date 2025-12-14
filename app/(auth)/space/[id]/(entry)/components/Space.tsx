'use client'

import { useState, useEffect, useRef } from 'react'
import { TurnCredential } from '@/repositories/signaling.repository'
import { signalingRepositoryClient } from '@/lib/repositories/client/signaling.repository.client'
import { useRoom } from '../room-provider'
import Lobby from './Lobby'
import { useSignaling } from '../signaling-provider'
import Room from './Room'
import Exit from './Exit'
import { logger } from '@/lib/logger'

export default function SpacePage() {
  const { room, setRoom } = useRoom()
  const { customMessageHandlers, localStreamRef, connectWS, hangup } =
    useSignaling()
  const credentialRef = useRef<TurnCredential | null>(null)
  const [spaceState, setSpaceState] = useState<
    'reception' | 'lobby' | 'room' | 'exit'
  >('reception')

  customMessageHandlers.current['close'] = async (data) => {
    await hangup()
    setSpaceState('exit')
  }
  useEffect(() => {
    logger.info('Space', `spaceState changed: ${spaceState}`)
    if (spaceState === 'reception') {
      start()
    }
  }, [spaceState])

  customMessageHandlers.current['access'] = (data) => {
    const participants = JSON.parse(data)
    logger.log('WS EVENT', 'access: ', participants)
    setRoom({
      ...room,
      participants
    })
  }
  const start = async () => {
    try {
      await startCamera()
      await connectWS()
      credentialRef.current =
        await signalingRepositoryClient.generateTurnCredential()
      setSpaceState('lobby')
    } catch (e) {
      logger.error('getUserMedia error:', e)
      return
    }
  }
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    localStreamRef.current = stream
  }

  // ============================================================
  // JSX
  // ============================================================
  return (
    <>
      {spaceState === 'lobby' ? (
        <Lobby setSpaceState={setSpaceState} />
      ) : spaceState === 'room' ? (
        <Room setSpaceState={setSpaceState} />
      ) : spaceState === 'exit' ? (
        <Exit setSpaceState={setSpaceState} />
      ) : null}
    </>
  )
}
