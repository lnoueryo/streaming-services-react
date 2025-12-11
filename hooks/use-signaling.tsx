import { signalingRepositoryClient } from '@/lib/repositories/client/signaling.repository.client';
import { TurnCredential } from '@/repositories/signaling.repository';
import React, { useEffect, useMemo, useRef, useState } from 'react';
export type RemoteVideoItem = {
  id: string;
  stream: MediaStream;
}
const config: RTCConfiguration  = {
  iceTransportPolicy: 'all',
  iceCandidatePoolSize: 3
};
export default function useBroadcaster(url: string) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideoItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const customMessageHandlers = useRef<Record<string, (data: any) => void>>({});
  const retry = useRef(0);
  const credentialRef = useRef<TurnCredential | null>(null);
  const maxRetry = 20;

  const queued = useMemo(() => ({ offer: null as RTCSessionDescriptionInit | null, candidates: [] as RTCIceCandidateInit[] }), []);

  const sendWS = (msg: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('❌ WS not open, skip send');
      return;
    }
    ws.send(JSON.stringify(msg));
  };

  const startCamera = async() => {
    console.log('[Peer] starting getUserMedia...');
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = localStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        // iOS対策
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play().catch(() => {});
        };
      }
      console.log('[Peer] local video stream set');
    } catch (e) {
      console.log('⚠️ getUserMedia failed:', String(e));
      return;
    }
  }

  const connectWS = async (timeoutMs = 5000) => {
    return new Promise(async (resolve, reject) => {
      credentialRef.current = await signalingRepositoryClient.generateTurnCredential()
      scheduleTurnRefresh(credentialRef.current.ttl)
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.close()
        reject(new Error("WebSocket connection timeout"));
      }, timeoutMs);
      ws.onopen = () => {
        clearTimeout(timer)
        console.log("%c[WS OPEN]", "color: #4caf50", performance.now(), url);
        retry.current = 0
        resolve(ws)
        ws.onclose = (e) => {
          console.log("%c[WS CLOSE]", "color: #4caf50", performance.now(), url);
          console.log(e.code)
          console.log(e.wasClean)
          if (!e.wasClean) {
            reconnect()
          }
        };
        ws.onerror = (err) => {
          console.log("%c[WS ERROR]", "color: orange", err);
        };
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        if (!msg.event) return;
        if (msg.event === 'offer') {
          console.log('[WS] ← offer', "color: #4caf50", performance.now(), url);
          const offer: RTCSessionDescriptionInit = msg.data;
          if (pcRef.current) {
            void handleOffer(offer);
          } else {
            queued.offer = offer;
          }
        } else if (msg.event === 'candidate') {
          console.log('[WS] ← candidate', "color: #4caf50", performance.now(), url);
          const cand: RTCIceCandidateInit = msg.data;
          const pc = pcRef.current;
          if (pc) {
            pc.addIceCandidate(new RTCIceCandidate(cand)).catch((e) =>
              console.log('[addIceCandidate ERROR]', "color: red", performance.now(),  e),
            );
          } else {
            queued.candidates.push(cand);
          }
        } else if (customMessageHandlers.current[msg.event]) {
          customMessageHandlers.current[msg.event](msg.data)
        } else {
          console.log('[WS] unknown event:', msg.event);
        }
      };
      wsRef.current = ws;
    })
  };

  const reconnect = () => {
    if (retry.current >= maxRetry) {
      console.error("WS failed to reconnect.");
      return;
    }
    retry.current++;
    setRemoteVideos([]);
    console.log("%c[RECONNECT SCHEDULED]", "color:orange", performance.now());
    setTimeout(async () => {
      console.log("%c[RECONNECTING...]", "color:orange", `${retry.current}/${maxRetry}`, performance.now());
      try {
        await connectWS();
        if (isPeerConnected()) {
          await connectPeer();
        }
      } catch (error) {
        reconnect()
      }
    }, 2000);
  }

  const connectPeer = async () => {
    if (!wsRef.current) {
      console.log('⚠️ WebSocket not open — 先に WS 接続してください');
      return;
    }
    if (pcRef.current) {
      console.log('[Peer] Already exists');
      return;
    }
    if (!credentialRef.current) {
      return
    }
    const pc = new RTCPeerConnection({
      ...config,
      ...credentialRef.current,
    });
    pcRef.current = pc;

    pc.ontrack = (e) => {
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

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('[ICE] → candidate');
        sendWS({ event: 'candidate', data: e.candidate });
      }
    };
    pc.oniceconnectionstatechange = () => {
      console.log("%c[ICE CONNECTION]", "color: violet", performance.now(), pc.iceConnectionState);

      if (pc.iceConnectionState === "failed") {
        console.warn("ICE failed → reconnect()");
        reconnect();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("%c[PC CONNECTION]", "color: yellow", performance.now(), pc.connectionState);

      if (pc.connectionState === "failed") {
        console.warn("❌ PeerConnection failed — restarting...");
        reconnect();
      }
    };

    pc.onsignalingstatechange = () => {
      console.log("%c[SIGNALING]", "color: cyan", performance.now(), pc.signalingState);
    };

    pc.onicegatheringstatechange = () => {
      console.log("%c[ICE GATHERING]", "color: purple", performance.now(), pc.iceGatheringState);
    };

    // queued処理
    if (queued.offer) {
      console.log('[Peer] applying queued offer');
      await handleOffer(queued.offer);
      queued.offer = null;
    }
    if (queued.candidates.length > 0) {
      for (const c of queued.candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch((e) =>
          console.log('addIceCandidate queued error:', e),
        );
      }
      queued.candidates = [];
    }

    console.log('[Peer] ready');

    // local tracks
    localStreamRef.current!.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    console.log('[Peer] added local tracks');

  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(offer);
      console.log('[Peer] setRemoteDescription(offer)');
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      sendWS({ event: 'answer', data: ans });
      console.log('[WS] → answer');
    } catch (e) {
      console.log('⚠️ handleOffer error:', String(e));
    }
  };

  const scheduleTurnRefresh = (ttl: number) => {
    const refreshTime = ttl * 0.8 * 1000; // 80%
    setTimeout(() => {
      console.log("[TURN REFRESH] refreshing TURN credentials before expiration");
      reconnect(); // ここで新しい TURN 信息を再取得
    }, refreshTime);
  }

  useEffect(() => {
    window.addEventListener('beforeunload', function (event) {
      try {
        resetCommunication()
      } catch {}
    });
    return () => {
      resetCommunication()
    };
  }, []);
  const hangUp = () => {
    disconnectPeerConnection()
    disconnectLocalCamera()
  }
  const resetCommunication = () => {
    disconnectPeerConnection()
    disconnectLocalCamera()
    disconnectWSConnection()
  }
  const closeWSConnection = () => {
    try {
      wsRef.current?.close();
    } catch {}
  }
  const closePeerConnection = () => {
    try {
      pcRef.current?.getSenders().forEach((s) => s.track?.stop());
      pcRef.current?.close();
    } catch {}
  }
  const closeLocalCamera = () => {
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
  }
  const disconnectWSConnection = () => {
    closeWSConnection()
    wsRef.current = null
  }
  const disconnectPeerConnection = () => {
    closePeerConnection()
    pcRef.current = null
  }
  const disconnectLocalCamera = () => {
    closeLocalCamera()
    localStreamRef.current = null
  }
  const isWSConnected = () => {
    return !!wsRef.current
  }
  const isPeerConnected = () => {
    return !!pcRef.current
  }
  return {
    remoteVideos,
    localStreamRef,
    customMessageHandlers,
    startCamera,
    connectWS,
    connectPeer,
    hangUp,
    isWSConnected,
  }
}