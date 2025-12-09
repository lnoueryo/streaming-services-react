'use client';

import output from '@/config';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function SfuBroadcastPage() {
  // ====== 設定 ======
  // 例: /websocket/broadcast → nginx等で /websocket/broadcast をWSにリバースプロキシ
  const WS_PATH = '/websocket/broadcast';

  // ====== refs / state ======
  const logRef = useRef<HTMLDivElement | null>(null);
  const remoteContainerRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [wsOpen, setWsOpen] = useState(false);

  const queued = useMemo(() => ({ offer: null as RTCSessionDescriptionInit | null, candidates: [] as RTCIceCandidateInit[] }), []);

  // ====== logger ======
  const log = (...args: any[]) => {
    const t = (performance.now() / 1000).toFixed(3);
    const line = `[${t}] ${args.join(' ')}\n`;
    // consoleにも出す
    // eslint-disable-next-line no-console
    console.debug(...args);

    if (logRef.current) {
      logRef.current.textContent += line;
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  };

  const sendWS = (msg: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      log('❌ WS not open, skip send');
      return;
    }
    ws.send(JSON.stringify(msg));
  };

  // ====== WS 接続 ======
  const connectWS = () => {
    if (wsOpen) {
      log('[WS] already open');
      return;
    }
    const url = `${output.signalingOrigin}/ws/live/1`
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsOpen(true);
      log('[WS] open →', url);
    };
    ws.onclose = () => {
      setWsOpen(false);
      log('❌ WS closed');
    };
    ws.onerror = (e) => {
      setWsOpen(false);
      log('❌ WS error:', String(e));
    };
    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        log('invalid JSON:', ev.data);
        return;
      }

      if (msg.event === 'offer') {
        log('[WS] ← offer');
        const offer: RTCSessionDescriptionInit = msg.data;
        if (pcRef.current) {
          void handleOffer(offer);
        } else {
          queued.offer = offer;
        }
      } else if (msg.event === 'candidate') {
        log('[WS] ← candidate');
        const cand: RTCIceCandidateInit = msg.data;
        const pc = pcRef.current;
        if (pc) {
          pc.addIceCandidate(new RTCIceCandidate(cand)).catch((e) =>
            log('addIceCandidate error:', e),
          );
        } else {
          queued.candidates.push(cand);
        }
      } else {
        log('[WS] unknown event:', msg.event);
      }
    };
  };

  // ====== Peer開始 ======
  const startPeer = async () => {
    if (!wsOpen) {
      log('⚠️ WebSocket not open — 先に WS 接続してください');
      return;
    }
    if (pcRef.current) {
      log('[Peer] Already exists');
      return;
    }

    log('[Peer] starting getUserMedia...');
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
      log('[Peer] local video stream set');
    } catch (e) {
      log('⚠️ getUserMedia failed:', String(e));
      return;
    }

    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    pc.ontrack = (evt) => {
      if (evt.track.kind !== 'video') return;

      const stream = evt.streams[0] || new MediaStream([evt.track]);
      const key = `${stream.id}_${evt.track.id}`;
      if (document.getElementById(key)) {
        log('duplicate remote track skip:', key);
        return;
      }
      log('[Peer] remote track — video, key:', key);

      const v = document.createElement('video');
      v.id = key;
      v.autoplay = true;
      v.playsInline = true;
      v.muted = false; // リモートは音出す想定
      v.srcObject = stream;

      remoteContainerRef.current?.appendChild(v);

      evt.track.onended = () => {
        const el = document.getElementById(key);
        if (el) el.remove();
        log('[Peer] track ended — removed:', key);
      };
      stream.onremovetrack = ({ track }) => {
        if (track.id === evt.track.id) {
          const el = document.getElementById(key);
          if (el) el.remove();
          log('[Peer] stream removed track — removed:', key);
        }
      };
    };

    // local tracks
    localStreamRef.current!.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    log('[Peer] added local tracks');

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        log('[ICE] → candidate');
        sendWS({ event: 'candidate', data: e.candidate });
      }
    };

    // queued処理
    if (queued.offer) {
      log('[Peer] applying queued offer');
      await handleOffer(queued.offer);
      queued.offer = null;
    }
    if (queued.candidates.length > 0) {
      for (const c of queued.candidates) {
        await pc.addIceCandidate(new RTCIceCandidate(c)).catch((e) =>
          log('addIceCandidate queued error:', e),
        );
      }
      queued.candidates = [];
    }

    log('[Peer] ready');
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(offer);
      log('[Peer] setRemoteDescription(offer)');
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      sendWS({ event: 'answer', data: ans });
      log('[WS] → answer');
    } catch (e) {
      log('⚠️ handleOffer error:', String(e));
    }
  };

  // ====== クリーンアップ ======
  useEffect(() => {
    window.addEventListener('beforeunload', function (event) {
      try { 
        wsRef.current?.close()
                pcRef.current?.getSenders().forEach((s) => s.track?.stop());
        pcRef.current?.close();
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
       } catch {}
    });
    return () => {
      // cleanup
      try {
        wsRef.current?.close();
      } catch {}
      try {
        pcRef.current?.getSenders().forEach((s) => s.track?.stop());
        pcRef.current?.close();
      } catch {}
      try {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
    };
  }, []);

  // ====== UI ======
  return (
    <div style={{ background: '#111', color: '#eee', fontFamily: 'sans-serif', minHeight: '100vh', padding: 16 }}>
      <h2>SFU Broadcast (WS / Peer 分離)</h2>

      <div style={{ marginBottom: 12 }}>
        <button onClick={connectWS} style={{ margin: 4, padding: '8px 12px' }}>
          ① Connect WebSocket
        </button>
        <button onClick={startPeer} style={{ margin: 4, padding: '8px 12px' }}>
          ② Start PeerConnection &amp; Camera
        </button>
      </div>

      <h3>Local Video</h3>
      <video
        id="localVideo"
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        style={{ width: 320, margin: 4, background: '#000' }}
      />

      <h3>Remote Video(s)</h3>
      <div
        id="remoteVideos"
        ref={remoteContainerRef}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      />

      <h3>Log</h3>
      <div
        id="log"
        ref={logRef}
        style={{
          whiteSpace: 'pre-wrap',
          background: '#222',
          padding: 8,
          height: 200,
          overflowY: 'auto',
          marginTop: 12,
        }}
      />
    </div>
  );
}