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
  const onICECandidateHandler = useRef<(e: RTCPeerConnectionIceEvent) => void>(null)
  const connectPeer = async () => {
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

    pc.ontrack = onTrackHandler.current
    if (!onICECandidateHandler.current) {
      throw new Error("onICECandidateHandler is null");
    }
    pc.onicecandidate = onICECandidateHandler.current
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
    connectPeer,
    handleOffer,
    disconnectPeerConnection,
    pcRef,
    onTrackHandler,
    onICECandidateHandler,
    remoteVideos,
    setRemoteVideos,
  }
}