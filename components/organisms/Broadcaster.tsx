'use client';

import React, { useEffect, useRef, useState } from 'react';

interface PageProps { id: string }
type MessageEventType = 'offer' | 'answer' | 'candidate';
type WSMessage = { event: MessageEventType; data?: any };

const Broadcaster: React.FC<PageProps> = ({ id }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<HTMLDivElement>(null);
  const [remoteCount, setRemoteCount] = useState(0);
  const [showLocal, setShowLocal] = useState(true);

  const toggleLocal = () => setShowLocal((v) => !v);

  const send = (ws: WebSocket, msg: WSMessage) => {
    ws.send(JSON.stringify(msg));
  };

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (event.track.kind === 'audio') return;

          const remoteStream =
            event.streams[0] || new MediaStream([event.track]);
          const videoEl = document.createElement('video');
          videoEl.srcObject = remoteStream;
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          videoEl.className =
            'w-full h-full object-cover rounded-lg shadow';

          remoteVideosRef.current?.appendChild(videoEl);

          setRemoteCount(remoteVideosRef.current?.children.length ?? 0);

          remoteStream.onremovetrack = () => {
            videoEl.remove();
            setRemoteCount(remoteVideosRef.current?.children.length ?? 0);
          };
        };

        const ws = new WebSocket(
          `${process.env.NEXT_PUBLIC_SIGNALING}/ws/live/${id}/${Math.floor(
            Math.random() * 10000
          )}`
        );

        pc.onicecandidate = (e) => {
          if (e.candidate) send(ws, { event: 'candidate', data: e.candidate });
        };

        ws.onopen = () => send(ws, { event: 'offer' });

        ws.onmessage = (evt) => {
          const msg = JSON.parse(evt.data);
          if (!msg.event) return;

          if (msg.event === 'offer') {
            pc.setRemoteDescription(msg.data);
            pc.createAnswer().then((answer) => {
              pc.setLocalDescription(answer);
              send(ws, { event: 'answer', data: answer });
            });
          }

          if (msg.event === 'candidate') {
            pc.addIceCandidate(new RTCIceCandidate(msg.data));
          }
        };

        // ---- 正しい cleanup を同期で返す ----
        cleanup = () => {
          ws.close();
          pc.close();
          stream.getTracks().forEach((t) => t.stop());
        };

      } catch (err) {
        alert(err);
      }
    };

    start();

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">

      {/* Participants Grid */}
      <div
        ref={remoteVideosRef}
        className={`
          grid gap-2 w-full h-full p-2 overflow-y-scroll

          ${remoteCount === 1 ? "grid-cols-1" : ""}

          /* ⭐ 2人のときは縦並び（1列）*/
          ${remoteCount === 2 ? "grid-cols-1 sm:grid-cols-2" : ""}
          /* 3人以上は元のレイアウト */
          ${remoteCount >= 3 ? "grid-cols-2 sm:grid-cols-3" : ""}
        `}
      ></div>

      {/* Local PiP */}
      <div
        className={`
          absolute bottom-3 right-3
          w-28 h-44 sm:w-36 sm:h-56
          rounded-lg overflow-hidden border border-white/20 bg-black/80 shadow-xl
          transition-all duration-200
          ${showLocal ? "opacity-100" : "opacity-0 pointer-events-none"}
        `}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* 非表示ボタン */}
        {showLocal && (
          <button
            onClick={toggleLocal}
            className="
              absolute top-1 right-1 bg-black/60 hover:bg-black/80
              text-white text-xs px-2 py-0.5 rounded
            "
          >
            ×
          </button>
        )}

        <p className="text-[10px] text-white/70 absolute bottom-0 w-full text-center bg-black/30">
          あなたの映像
        </p>
      </div>

      {/* 表示ボタン */}
      {!showLocal && (
        <button
          onClick={toggleLocal}
          className="
            absolute bottom-3 right-3
            bg-white/10 hover:bg-white/20 text-white
            px-3 py-2 text-xs rounded-lg shadow-xl
          "
        >
          あなたの映像を表示
        </button>
      )}
    </div>
  );
};

export default Broadcaster;