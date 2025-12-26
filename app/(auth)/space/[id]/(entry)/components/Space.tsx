'use client'

import { useState, useEffect, useRef } from 'react'
import { signalingRepositoryClient } from '@/lib/repositories/client/signaling.repository.client'
import { useSpace } from '../space-provider'
import Lobby from './Lobby'
import { useSignaling } from '../signaling-provider'
import Room from './Room'
import Exit from './Exit'
import { logger } from '@/lib/logger'
import { SpaceMember } from '@/repositories/space-member.repository'
import {
  RemoteVideoType
} from '@/components/organisms/RemoteVideo'
type TrackParticipant = {
  [streamId: string]: {
    id: string
    name: string
    email: string
    image: string
    trackId: string
    streamId: string
  }
}

export default function SpacePage() {
  const { space, setSpace } = useSpace()
  const { customMessageHandlers, localStreamRef, credentialRef, remoteStreams, customOpenHandlers, customDataMessageHandlers, connectWS, hangup } =
    useSignaling()
  const [spaceState, setSpaceState] = useState<
    'reception' | 'lobby' | 'room' | 'exit'
  >('reception')
  const [entryRequests, setEntryRequests] = useState<SpaceMember[]>([])
  const [requestList, setRequestList] = useState<SpaceMember[]>([])
  const [participantTrack, setParticipantTrack] = useState<TrackParticipant>({})
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideoType[]>([])
  customMessageHandlers.current['request-decision'] = (data: string) => {
    const participant = JSON.parse(data)
    logger.log('WS EVENT', 'request-decision: ', participant)
    if (participant.status === 'rejected') {
      return (location.href = '/')
    }
    setSpace({
      ...space,
      membership: {
        ...space.membership,
        status: participant.status
      }
    })
  }
  customMessageHandlers.current['close'] = async (data) => {
    await hangup()
    setSpaceState('exit')
  }
  customMessageHandlers.current['accept-invitation'] = (data: string) => {
    const spaceMember = JSON.parse(data)
    setRequestList((prev) => {
      if (prev.some((r) => r.id === spaceMember.id)) {
        return prev.map((r) => {
          if (r.id === spaceMember.id) {
            return spaceMember
          }
          return r
        })
      }
      return [...prev, spaceMember]
    })
    logger.log('WS EVENT', 'participant-request: ', spaceMember)
  }
  customMessageHandlers.current['participant-request'] = (data: string) => {
    const participant = JSON.parse(data)
    setEntryRequests((prev) => {
      return [...prev, participant]
    })
    logger.log('WS EVENT', 'participant-request: ', participant)
  }
  customMessageHandlers.current['access'] = (data) => {
    const participants = JSON.parse(data)
    logger.log('WS EVENT', 'access: ', participants)
    setSpace({
      ...space,
      participants
    })
  }
  customMessageHandlers.current['accept-invitation'] = (data: string) => {
    const spaceMember = JSON.parse(data)
    setRequestList((prev) => {
      if (prev.some((r) => r.id === spaceMember.id)) {
        return prev.map((r) => {
          if (r.id === spaceMember.id) {
            return spaceMember
          }
          return r
        })
      }
      return [...prev, spaceMember]
    })
  }
  customDataMessageHandlers.current['room'] = {}
  customDataMessageHandlers.current['room']['test'] = (data: any) => {
    logger.log('DC EVENT', 'test: ', data)
  }
  customDataMessageHandlers.current['room']['track-participant'] = (data: TrackParticipant) => {
    setParticipantTrack(data)
    logger.log('DC EVENT', 'track-participant: ', participantTrack)
  }
  customDataMessageHandlers.current['room']['duplicate-participant'] = () => {
    alert('別の端末から同じアカウントで入室があったため、退室します。')
    setSpaceState('exit')
    logger.log('DC EVENT', 'duplicate-participant: ', participantTrack)
  }
  useEffect(() => {
    logger.info('Space', `spaceState changed: ${spaceState}`)
    if (spaceState === 'reception') {
      start()
    }
  }, [spaceState])

  useEffect(() => {
    // track追加と参加者の情報取得は順不同の可能性が高いので、両方のstateが変化したらマージしてremoteVideosを更新する
    const newRemoteVideos: RemoteVideoType[] = []
    for (const remoteStream of remoteStreams) {
      if (remoteStream.streamId in participantTrack === false) {
        continue
      }
      newRemoteVideos.push({
        ...remoteStream,
        ...participantTrack[remoteStream.streamId]
      })
    }
    setRemoteVideos(newRemoteVideos)
  }, [remoteStreams, participantTrack])
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
        <Room
          setSpaceState={setSpaceState}
          remoteVideos={remoteVideos}
          entryRequests={entryRequests}
          requestList={requestList}
          setRequestList={setRequestList}
          setEntryRequests={setEntryRequests}
        />
      ) : spaceState === 'exit' ? (
        <Exit setSpaceState={setSpaceState} />
      ) : null}
    </>
  )
}
