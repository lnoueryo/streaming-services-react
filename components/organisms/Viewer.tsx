"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import output from "@/config";
import { SignalingClient } from "@/lib/websocket/signaling-client";
import { ViewerClient } from "@/lib/websocket/viewer-client";

interface PageProps {
  id: string;
}

interface RemoteVideoItem {
  id: string;
  stream: MediaStream;
}

export default function Viewer({ id }: PageProps) {
  const [remoteVideos, setRemoteVideos] = useState<RemoteVideoItem[]>([]);
  const remoteCount = remoteVideos.length;

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const start = async () => {
      try {
        const onTackEvent = (event: RTCTrackEvent) => {
          console.log("%c[REMOTE TRACK RECEIVED]",
            "color: #00bcd4",
            event.track.kind,
            event.track.id,
            performance.now()
          );

          const rStream = event.streams[0] || new MediaStream([event.track]);
          const id = `${rStream.id}-${event.track.id}-${Math.random()}`;

          setRemoteVideos((prev) => {
            if (prev.some((v) =>
                v.stream.id === rStream.id &&
                v.stream.getTracks().some(t => t.id === event.track.id)
            )) {
              return prev;
            }
            return [...prev, { id, stream: rStream }];
          });

          event.track.onended = () => {
            console.log("%c[REMOTE TRACK ENDED]",
              "color: #ff7043",
              event.track.kind,
              event.track.id,
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
        // ✅ シグナリング
        const signaling = new ViewerClient(
          `${output.websocketApiOrigin}/ws/live/${id}/${Math.floor(Math.random() * 10000)}`,
          onTackEvent,
        );

        // 初回 offer（SignalingClient の onopen 側が {event:"offer"} を送る実装でも動作します）
        await signaling.connect();
        cleanup = () => {
          console.log("%c[CLEANUP START]", "color:red", performance.now());
          try { signaling.close(); } catch {}
          try { signaling.stream?.getTracks().forEach((t) => t.stop()); } catch {}
          console.log("%c[CLEANUP END]", "color:red", performance.now());
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
    <div className="w-full h-screen bg-black overflow-hidden p-2">
      <motion.div
        layout
        className={`
          grid gap-2 w-full h-full grid-cols-2 sm:grid-cols-3

        `}
      >
        <AnimatePresence>
          {remoteVideos.map((v) => (
            <motion.div
              key={v.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
              className="relative rounded-lg overflow-hidden shadow-lg bg-black"
            >
              <video
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                ref={(el) => {
                  if (el && el.srcObject !== v.stream) {
                    el.srcObject = v.stream;
                    el.onloadedmetadata = () => el.play().catch(() => {});
                  }
                }}
              />

              <button
                className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
                onClick={(e) => {
                  const video = (
                    e.currentTarget.parentNode as HTMLElement
                  ).querySelector("video")!;
                  video.muted = !video.muted;
                  if (!video.muted) video.play().catch(() => {});
                }}
              >
                音声
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}