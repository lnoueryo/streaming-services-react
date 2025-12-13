import { useEffect, useRef, useState } from 'react';
import useWebsocket from './use-websocket';
import usePeer from './use-peer';

type ConnectionState = 'stop' | 'pending' | 'ready' | 'unstable';

export default function useSignaling(url: string) {
  const {
    customMessageHandlers,
    connectWS,
    sendWS,
    wsOpen,
    wsRef,
    disconnectWSConnection,
  } = useWebsocket(url)
  const {
    createPeer,
    setRemoteVideos,
    handleOffer,
    disconnectPeerConnection,
    pcRef,
    remoteVideos,
    onICECandidateHandler,
    onICEConnectionStateHandler,
    onOriginalICEConnectionStateHandler,
    onConnectionStateHandler,
    onOriginalConnectionStateHandler
  } = usePeer()

  const queuedRef = useRef({
    offer: null as RTCSessionDescriptionInit | null,
    candidates: [] as RTCIceCandidateInit[],
  });
  const localStreamRef = useRef<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('stop');

  customMessageHandlers.current['offer'] = async (data) => {
    const offer = JSON.parse(data);
    console.log+("[WS] ← offer");
    if (pcRef.current) {
      const answer = await handleOffer(offer);
      sendWS({ event: "answer", data: JSON.stringify(answer) });
    } else {
      queuedRef.current.offer = offer;
    }
  }
  customMessageHandlers.current['candidate'] = (data) => {
    const cand = JSON.parse(data);
    console.log("[WS] ← candidate");
    if (pcRef.current) {
      pcRef.current.addIceCandidate(cand).catch((e) =>
        console.log("addIceCandidate err:", e)
      );
    } else {
      queuedRef.current.candidates.push(cand);
    }
  }
  const connectPeer = async () => {
    if (!wsOpen) {
      console.log("WS not open");
      return;
    }
    console.log('set event')
    onICECandidateHandler.current = (e) => {
      if (e.candidate) {
        sendWS({
          event: "candidate",
          data: JSON.stringify(e.candidate),
        });
      }
    }
    onICEConnectionStateHandler.current = async (e) => {
      await new Promise(async (resolve) => {
        const timer = setInterval(() => {
          if (wsOpen) {
            clearTimeout(timer)
            resolve(true)
          }
        }, 2000)
      })
      if (pcRef.current) {
        if (await onOriginalICEConnectionStateHandler(e)) {
          await setupPeer()
        }
      }
    }
    onConnectionStateHandler.current = async (e) => {
      await new Promise(async (resolve) => {
        const timer = setInterval(() => {
          if (wsOpen) {
            clearTimeout(timer)
            resolve(true)
          }
        }, 2000)
      })
      if (pcRef.current) {
        if(await onOriginalConnectionStateHandler(e)) {
          await setupPeer()
        }
      }
    }
    console.log('createPeer')
    await createPeer()
    console.log('setup')
    await setupPeer()
  };
  const setupPeer = async () => {
    const local = localStreamRef.current!;
    if (local) {
      local.getTracks().forEach((t) => pcRef.current?.addTrack(t, local));
      console.log("[Peer] local tracks added");
    }

    console.log('queuedRef.current.offer', queuedRef.current.offer)
    if (queuedRef.current.offer) {
      const answer = await handleOffer(queuedRef.current.offer);
      console.log('answer', answer)
      sendWS({ event: "answer", data: JSON.stringify(answer) });
      queuedRef.current.offer = null;
    }

    // queued candidates
    for (const c of queuedRef.current.candidates) {
      await pcRef.current?.addIceCandidate(c).catch((e) => console.log("queued ICE err:", e));
    }
    queuedRef.current.candidates = [];

    sendWS({ event: "offer" });
    console.log("[Peer] ready");
  }
  const hangup = async () => {
    await disconnectPeerConnection()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    await disconnectWSConnection()
  }

  useEffect(() => {
    const ready = wsRef.current && pcRef.current
    const pending = wsRef.current && !pcRef.current
    const stop = !wsRef.current && !pcRef.current
    const unstable = !wsRef.current && pcRef.current
    let state: ConnectionState = 'stop'
    if (ready) {
      state = 'ready'
    } else if (pending) {
      state = 'pending'
    } else if (unstable) {
      state = 'unstable'
    }
    setConnectionState(state)
    console.log(state)
  }, [wsRef.current, pcRef.current]);
  return {
    connectWS,
    connectPeer,
    localStreamRef,
    remoteVideos,
    connectionState,
    customMessageHandlers,
    hangup,
  }
}