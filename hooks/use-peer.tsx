import { TurnCredential } from '@/repositories/signaling.repository';
import { useEffect, useRef, useState } from 'react';
export type RemoteVideo = {
  id: string;
  stream: MediaStream;
}
const config: RTCConfiguration  = {
  iceTransportPolicy: 'all',
  iceCandidatePoolSize: 3
};
export default function usePeer() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideo[]>([]);
  const credentialRef = useRef<TurnCredential | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const onTrackHandler = useRef(onOriginalTrackHandler)
  const onICEConnectionStateHandler = useRef(onOriginalICEConnectionStateHandler)
  const onConnectionStateHandler = useRef(onOriginalConnectionStateHandler)
  const onICECandidateHandler = useRef<(e: RTCPeerConnectionIceEvent) => void>(null)
  const retry = useRef(0);
  const maxRetry = 20;

  const createPeer = async () => {
    if (pcRef.current) {
      console.log("Peer already exists");
      return;
    }

    const pc = new RTCPeerConnection({
      ...config,
      ...credentialRef.current,
    });
    pcRef.current = pc;
    const local = localStreamRef.current
    if (local) {
      local.getTracks().forEach((t) => pc.addTrack(t, local));
      console.log("[Peer] local tracks added");
    }

    pc.oniceconnectionstatechange = onICEConnectionStateHandler.current
    pc.onconnectionstatechange = onConnectionStateHandler.current
    pc.onsignalingstatechange = () => {
      console.log("%c[SIGNALING]", "color: cyan", performance.now(), pc.signalingState);
    }
    pc.onicegatheringstatechange = () => {
      console.log("%c[ICE GATHERING]", "color: purple", performance.now(), pc.iceGatheringState);
    }
    pc.ontrack = onTrackHandler.current

    if (!onICECandidateHandler.current) {
      throw new Error("onICECandidateHandler is null");
    }
    pc.onicecandidate = onICECandidateHandler.current
    retry.current = 0
  }

  const recreatePeer = async () => {
    setRemoteVideos([]);
    if (retry.current >= maxRetry) {
      console.error("WS failed to reconnect.");
      return false;
    }
    retry.current++;
    console.log("%c[RECONNECT SCHEDULED]", "color:orange", performance.now());
    return new Promise<boolean>((resolve) => {
      setTimeout(async () => {
        console.log("%c[RECONNECTING...]", "color:orange", `${retry.current}/${maxRetry}`, performance.now());
        try {
          await createPeer()
          resolve(true)
        } catch (error) {
          return await recreatePeer()
        }
      }, 2000);
    })
  }

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current!;
    try {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("[Peer] → answer");
      return answer
    } catch (e) {
      console.log("handleOffer error:", e);
    }
  };

  const disconnectPeerConnection = () => {
    try {
      pcRef.current?.close();
      pcRef.current = null
    } catch {}
  }

  useEffect(() => {
    window.addEventListener('beforeunload', function (event) {
      try {
        disconnectPeerConnection()
      } catch {}
    });
    return () => {
      disconnectPeerConnection()
    };
  }, []);

  async function onOriginalICEConnectionStateHandler(evt: Event) {
    console.log("%c[ICE CONNECTION]", "color: violet", performance.now(), pcRef.current?.iceConnectionState);

    if (pcRef.current?.iceConnectionState === "failed") {
      console.warn("ICE failed → recreatePeer()");
      pcRef.current.close()
      pcRef.current = null
      return await recreatePeer();
    }
  }

  async function onOriginalConnectionStateHandler(evt: Event) {
    console.log("%c[PC CONNECTION]", "color: yellow", performance.now(), pcRef.current?.connectionState);

    if (pcRef.current?.connectionState === "failed") {
      console.warn("❌ PeerConnection failed — restarting...");
      pcRef.current.close()
      pcRef.current = null
      return await recreatePeer();
    }
  }

  function onOriginalTrackHandler(evt: RTCTrackEvent) {
    if (evt.track.kind !== 'video') {
      return
    }
    const stream = evt.streams[0] || new MediaStream([evt.track]);
    const id = stream.id + "_" + evt.track.id;

    setRemoteVideos((prev) => {
      if (prev.some((v) => v.id === id)) return prev;
      return [...prev, { id, stream }];
    });

    evt.track.onended = () => {
      setRemoteVideos((prev) => prev.filter((v) => v.id !== id));
    };

    stream.onremovetrack = ({ track }) => {
      if (track.id === evt.track.id) {
        setRemoteVideos((prev) => prev.filter((v) => v.id !== id));
      }
    };
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
    remoteVideos,
    setRemoteVideos,
  }
}