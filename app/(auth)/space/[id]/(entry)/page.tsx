'use client'

import { useState, useEffect, useRef } from 'react'
import { TurnCredential } from '@/repositories/signaling.repository'
import { signalingRepositoryClient } from '@/lib/repositories/client/signaling.repository.client'
import { useRoom } from './room-provider'
import { spaceRepositoryClient } from '@/lib/repositories/client/space.repository.client'
import Lobby from './components/Lobby'
import { useSignaling } from './signaling-provider'
import Room from './components/Room'
import Exit from './components/Exit'

export default function Page() {
  const { room, setRoom } = useRoom()
  const {
    customMessageHandlers,
    localStreamRef,
    connectWS,
    hangup
  } = useSignaling()
  const credentialRef = useRef<TurnCredential | null>(null)
  const [spaceState, setSpaceState] = useState<
    'reception' | 'lobby' | 'room' | 'exit'
  >('reception')

  customMessageHandlers.current['close'] = async (data) => {
    await hangup()
    setSpaceState('exit')
  }
  useEffect(() => {
    // start()
  }, [])
  useEffect(() => {
    console.log('spaceState changed:', spaceState)
    if (spaceState === 'reception') {
      start()
    }
  }, [spaceState])

  customMessageHandlers.current['access'] = (data) => {
    const participants = JSON.parse(data)
    console.log('[WS] ← participants: ', participants)
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
      console.log('getUserMedia error:', e)
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

  const goBackToLobby = async () => {
    const newLobby = await spaceRepositoryClient.enterLobby(room.id)
    setRoom(newLobby)
    await start()
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
