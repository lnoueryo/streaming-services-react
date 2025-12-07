import { signalingRepositoryClient } from "@/lib/repositories/client/signaling.repository.client"
import AuthService from "../lib/auth/auth.service"
import { useRef, useState } from "react"

export type ISignalingClient = {
  connect: () => void
  reconnect: () => void
  send: (data: any) => void
  close: () => void
}
const config: RTCConfiguration  = {
  iceTransportPolicy: 'all',
  iceCandidatePoolSize: 3
};

type RemoteVideoItem = {
  id: string;
  stream: MediaStream;
}

export function useSignalingClient(url: string) {
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideoItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const retry = useRef(0);
  const maxRetry = 20;
  const customMessageHandlers = useRef<Record<string, () => void>>({})

  const connect = async() => {
    const credential = await signalingRepositoryClient.generateTurnCredential()
    scheduleTurnRefresh(credential.ttl)
    const idToken = await AuthService.getIdToken()
    pc.current?.close();
    const newPc = new RTCPeerConnection({
      ...config,
      ...credential,
    });

    const newWs = new WebSocket(`${url}?token=${idToken}`)

    newWs.onopen = () => {
      console.log("%c[WS OPEN]", "color: #4caf50", performance.now(), url);
      retry.current = 0
    };

    newWs.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (!msg.event) return;

      if (msg.event === "offer") {
        newPc.setRemoteDescription(msg.data);
        newPc.createAnswer().then((ans) => {
          newPc.setLocalDescription(ans);
          send('answer', ans);
        });
      }

      if (msg.event === "candidate") {
        newPc.addIceCandidate(new RTCIceCandidate(msg.data));
      }
      const handler = customMessageHandlers.current[msg.event]
      if (!!handler) handler()
    };

    newWs.onerror = (err) => {
      console.log("%c[WS ERROR]", "color: orange", err);
    };
    newWs.onclose = () => {
      console.log("%c[WS CLOSE]", "color: #4caf50", performance.now(), url);
    };

    newPc.oniceconnectionstatechange = () => {
      console.log("%c[ICE CONNECTION]", "color: violet", performance.now(), newPc.iceConnectionState);

      if (newPc.iceConnectionState === "failed") {
        console.warn("ICE failed → reconnect()");
        reconnect();
      }
    };

    newPc.onconnectionstatechange = () => {
      console.log("%c[PC CONNECTION]", "color: yellow", performance.now(), newPc.connectionState);

      if (newPc.connectionState === "failed") {
        console.warn("❌ PeerConnection failed — restarting...");
        reconnect();
      }
    };

    newPc.onicecandidate = (e) => {
      if (e.candidate) send('candidate', e.candidate);
    };
    newPc.onsignalingstatechange = () => {
      console.log("%c[SIGNALING]", "color: cyan", performance.now(), newPc.signalingState);
    };

    newPc.onicegatheringstatechange = () => {
      console.log("%c[ICE GATHERING]", "color: purple", performance.now(), newPc.iceGatheringState);
    };

    newPc.ontrack = (e) => {
      console.log("%c[ONTRACK]", "color:#0af", e.track.kind, e.track.id);
      console.log("%c[REMOTE TRACK RECEIVED]",
        "color: #00bcd4",
        e.track.kind,
        e.track.id,
        performance.now()
      );

      const rStream = e.streams[0] || new MediaStream([e.track]);
      const id = `${rStream.id}-${e.track.id}-${Math.random()}`;

      setRemoteVideos((prev) => {
        if (prev.some((v) =>
            v.stream.id === rStream.id &&
            v.stream.getTracks().some(t => t.id === e.track.id)
        )) {
          return prev;
        }
        return [...prev, { id, stream: rStream }];
      });

      e.track.onended = () => {
        console.log("%c[REMOTE TRACK ENDED]",
          "color: #ff7043",
          e.track.kind,
          e.track.id,
          performance.now()
        );
        setRemoteVideos((prev) => prev.filter((v) => v.stream.id !== rStream.id));
      };
      rStream.onremovetrack = ({track}) => {
        console.log("%c[REMOTE REMOVED]",
          "color: #ff8a65",
          track.kind,
          track.id,
          performance.now()
        );
        setRemoteVideos((prev) => prev.filter((v) => v.stream.id !== rStream.id));
      };
    };
    ws.current = newWs
    pc.current = newPc
  }
  const reconnect = () => {
      if (retry.current >= maxRetry) {
      console.error("WS failed to reconnect.");
      return;
    }
    retry.current++;
    setRemoteVideos([]);
  }
  const send = (event: string, data?: any) => {
    try {
      ws.current?.send(JSON.stringify({ event, data }));
    } catch {}
  }
  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimer.current = setInterval(() => {
      send('ping');
    }, 20000)
  }
  const stopHeartbeat = () => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
    };
  }
  const close = () => {
    try {
      ws.current?.close();
      pc.current?.close();
    } catch {}
  }

  const scheduleTurnRefresh = (ttl: number) => {
    const refreshTime = ttl * 0.8 * 1000; // 80%
    setTimeout(() => {
      console.log("[TURN REFRESH] refreshing TURN credentials before expiration");
      reconnect(); // ここで新しい TURN 信息を再取得
    }, refreshTime);
  }
  return {
    remoteVideos,
    ws,
    pc,
    retry,
    maxRetry,
    isConnected,
    customMessageHandlers,
    connect,
    reconnect,
    send,
    close,
    setIsConnected,
  };
}