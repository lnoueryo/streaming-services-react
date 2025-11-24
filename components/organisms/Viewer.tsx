"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import output from "@/config";
import { SignalingClient } from "@/lib/websocket/signaling-client";

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
    let pc: RTCPeerConnection | null = null;
    let signaling: SignalingClient | null = null;

    const addStream = (stream: MediaStream) => {
      setRemoteVideos((prev) => {
        if (prev.some((v) => v.stream.id === stream.id)) return prev;
        return [...prev, { id: `${stream.id}`, stream }];
      });
    };

    const removeStream = (id: string) => {
      setRemoteVideos((prev) => prev.filter((v) => v.id !== id));
    };

    const startWebRTC = () => {
      pc = new RTCPeerConnection();

      pc.ontrack = (event) => {
        if (event.track.kind !== "video") return;

        const stream = event.streams[0] || new MediaStream([event.track]);
        addStream(stream);

        stream.onremovetrack = () => removeStream(stream.id);
      };

      pc.onconnectionstatechange = () => {
        if (
          pc!.connectionState === "failed" ||
          pc!.connectionState === "disconnected"
        ) {
          console.warn("Viewer WebRTC disconnected — restarting...");
          restart();
        }
      };

      // ---------- Signaling ----------
      signaling = new SignalingClient(
        `${output.websocketApiOrigin}/ws/live/${id}/${Math.random()}`,
        async (msg) => {
          if (msg.event === "offer") {
            await pc!.setRemoteDescription(msg.data);
            const ans = await pc!.createAnswer();
            await pc!.setLocalDescription(ans);
            signaling!.send({ event: "answer", data: ans });
          }

          if (msg.event === "candidate") {
            pc!.addIceCandidate(new RTCIceCandidate(msg.data));
          }
        },
        () => {
          // Viewer 初回は offer を送らない
          signaling!.send({ type: "ready" });
        }
      );

      signaling.connect();
    };

    const restart = () => {
      try {
        signaling?.close();
        pc?.close();
      } catch {}

      pc = null;
      signaling = null;

      setTimeout(() => startWebRTC(), 1000);
    };

    // start
    startWebRTC();

    return () => restart();
  }, [id]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden p-2">
      <motion.div
        layout
        className={`
          grid gap-2 w-full h-full

          ${remoteCount === 1 ? "grid-cols-1" : ""}
          ${remoteCount === 2 ? "grid-cols-1 sm:grid-cols-2" : ""}
          ${remoteCount >= 3 ? "grid-cols-2 sm:grid-cols-3" : ""}
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