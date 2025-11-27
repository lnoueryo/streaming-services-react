"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import output from '@/config';
import { BroadcasterClient } from '@/lib/websocket/broadcaster-client';

interface PageProps { id: string; }
type MessageEventType = 'offer' | 'answer' | 'candidate';
type WSMessage = { event: MessageEventType; data?: any };

interface RemoteVideoItem {
  id: string;
  stream: MediaStream;
}

const Broadcaster: React.FC<PageProps> = ({ id }) => {
  console.log('Broadcaster component rendered with id:', id);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [remoteVideos, setRemoteVideos] = useState<RemoteVideoItem[]>([]);
  const [showLocal, setShowLocal] = useState(true);
  const remoteCount = remoteVideos.length;

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const start = async () => {
      try {
        // ✅ ローカル取得
        const onTackEvent = (event: RTCTrackEvent) => {
          if (event.track.kind === 'audio') return;

          const rStream = event.streams[0] || new MediaStream([event.track]);
          const id = `${rStream.id}-${event.track.id}-${Math.random()}`;

          setRemoteVideos((prev) => {
            if (prev.some((v) => v.stream.id === rStream.id)) return prev;
            return [...prev, { id, stream: rStream }];
          });

          event.track.onended = () => {
            setRemoteVideos((prev) => prev.filter((v) => v.stream.id !== rStream.id));
          };
          rStream.onremovetrack = () => {
            setRemoteVideos((prev) => prev.filter((v) => v.stream.id !== rStream.id));
          };
        };
        // ✅ シグナリング
        const signaling = new BroadcasterClient(
          `${output.websocketApiOrigin}/ws/live/${id}/${Math.floor(Math.random() * 10000)}`,
          onTackEvent,
        );
        // 初回 offer（SignalingClient の onopen 側が {event:"offer"} を送る実装でも動作します）
        await signaling.connect();
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = signaling.stream;
          // iOS対策：loadedmetadata後に明示再生
          localVideoRef.current.onloadedmetadata = () => {
            localVideoRef.current?.play().catch(() => {});
          };
        }
        cleanup = () => {
          // try { signaling.send({ type: "bye" }); } catch {}
          try { signaling.close(); } catch {}
          try { signaling.stream?.getTracks().forEach((t) => t.stop()); } catch {}
        };
      } catch (err) {
        console.error(err);
        alert(err);
      }
    };

    start();
    console.log('useEffect finished')
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
                muted
                className="w-full h-full object-cover"
                ref={(el) => {
                  if (!el) return;
                  if (el.srcObject !== v.stream) {
                    el.srcObject = v.stream;
                    el.onloadedmetadata = () => {
                      el.play().catch(() => {});
                    };
                  }
                }}
              />
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