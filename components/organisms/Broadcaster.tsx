'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import output from '@/config';
import { SignalingClient } from '@/lib/websocket/signaling-client';

interface PageProps { id: string; }
type MessageEventType = 'offer' | 'answer' | 'candidate';
type WSMessage = { event: MessageEventType; data?: any };

interface RemoteVideoItem {
  id: string;
  stream: MediaStream;
}

const Broadcaster: React.FC<PageProps> = ({ id }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [remoteVideos, setRemoteVideos] = useState<RemoteVideoItem[]>([]);
  const [showLocal, setShowLocal] = useState(true);
  const remoteCount = remoteVideos.length;

  const toggleLocal = () => setShowLocal((v) => !v);

  const send = (ws: WebSocket, msg: WSMessage) => ws.send(JSON.stringify(msg));

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const start = async () => {
      try {
        // ✅ ローカル取得
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          // iOS対策：loadedmetadata後に明示再生
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().catch(() => {});
          };
        }

        let pc = new RTCPeerConnection();
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));

        // --- WebRTC 切断検知 ---
        pc.oniceconnectionstatechange = () => {
          console.log("ICE state:", pc.iceConnectionState);

          if (
            pc.iceConnectionState === "disconnected" ||
            pc.iceConnectionState === "failed"
          ) {
            console.warn("🔥 ICE state failed/disconnected — reconnect WebRTC");
            reconnectWebRTC();
          }
        };

        pc.onconnectionstatechange = () => {
          console.log("PC state:", pc.connectionState);

          if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected" ||
            pc.connectionState === "closed"
          ) {
            console.warn("❌ PeerConnection disconnected — restarting...");
            reconnectWebRTC();
          }
        };

        // --- 再接続ロジック ---
        const reconnectWebRTC = async () => {
          try {
            pc.close();
          } catch (e) {}

          console.log("♻️ Reconnecting WebRTC...");

          // 新しい PeerConnection を生成しなおす
          const newPc = new RTCPeerConnection();
          stream.getTracks().forEach((t) => newPc.addTrack(t, stream));

          pc = newPc;
          signaling.send({ event: "offer" });
        };
                // ✅ リモート受信
        pc.ontrack = (event) => {
          if (event.track.kind === 'audio') return;

          const rStream = event.streams[0] || new MediaStream([event.track]);
          const id = `${rStream.id}-${event.track.id}-${Math.random()}`;

          setRemoteVideos((prev) => {
            // 重複防止：同じ MediaStream が既にある場合はスキップ
            if (prev.some((v) => v.stream.id === rStream.id)) return prev;
            return [...prev, { id, stream: rStream }];
          });

          // trackが止まったら消す
          event.track.onended = () => {
            setRemoteVideos((prev) => prev.filter((v) => v.stream.id !== rStream.id));
          };
          rStream.onremovetrack = () => {
            setRemoteVideos((prev) => prev.filter((v) => v.stream.id !== rStream.id));
          };
        };

        // ✅ シグナリング
        const signaling = new SignalingClient(
          `${output.websocketApiOrigin}/ws/live/${id}/${Math.floor(Math.random() * 10000)}`,
          pc
        );

        pc.onicecandidate = (e) => {
          if (e.candidate) signaling.send({ event: 'candidate', data: e.candidate });
        };

        signaling.connect();
        cleanup = () => {
          signaling.send({ type: "bye" });
          signaling.close();
          pc.close();
          stream.getTracks().forEach((t) => t.stop());
        };
      } catch (err) {
        console.error(err);
        alert(err);
      }
    };

    start();
    return () => { if (cleanup) cleanup(); };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Remote Grid（2人のときは縦並び、それ以降は通常） */}
      <motion.div
        layout
        className={`
          grid gap-2 w-full h-full p-2 overflow-y-scroll
          ${remoteCount === 1 ? 'grid-cols-1' : ''}
          ${remoteCount === 2 ? 'grid-cols-1 sm:grid-cols-2' : ''}
          ${remoteCount >= 3 ? 'grid-cols-2 sm:grid-cols-3' : ''}
        `}
      >
        <AnimatePresence>
          {remoteVideos.map((v) => (
            <motion.div
              key={v.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25 }}
              className="relative w-full h-full bg-black rounded-lg overflow-hidden"
            >
              <video
                playsInline
                autoPlay
                // 🔑 重要：最初は muted にして自動再生を通す
                muted
                className="w-full h-full object-cover"
                ref={(el) => {
                  if (!el) return;
                  if (el.srcObject !== v.stream) {
                    el.srcObject = v.stream;
                    // iOS/Chrome対策：loadedmetadata後に play を明示
                    el.onloadedmetadata = () => {
                      el.play().catch(() => {});
                    };
                  }
                }}
              />
              {/* クリックでミュート解除（任意） */}
              <button
                className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
                onClick={() => {
                  const video = (document.activeElement?.closest('div')?.querySelector('video') as HTMLVideoElement) || null;
                  if (video) {
                    video.muted = !video.muted;
                    if (!video.muted) {
                      video.play().catch(() => {});
                    }
                  }
                }}
              >
                音声切替
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Local PiP */}
      <div
        className={`
          absolute bottom-3 right-3
          w-28 h-44 sm:w-36 sm:h-56
          rounded-lg overflow-hidden border border-white/20 bg-black/80 shadow-xl
          transition-all duration-200
          ${showLocal ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {showLocal && (
          <button
            onClick={() => setShowLocal(false)}
            className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded"
          >
            ×
          </button>
        )}
        <p className="text-[10px] text-white/70 absolute bottom-0 w-full text-center bg-black/30">
          あなたの映像
        </p>
      </div>

      {!showLocal && (
        <button
          onClick={() => setShowLocal(true)}
          className="absolute bottom-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-2 text-xs rounded-lg shadow-xl"
        >
          あなたの映像を表示
        </button>
      )}
    </div>
  );
};

export default Broadcaster;