"use client";
// TODO Viewerのカスタムフック作成
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import output from "@/config";
import { useViewer } from "@/hooks/use-viewer";

interface PageProps {
  id: string;
}

interface RemoteVideoItem {
  id: string;
  stream: MediaStream;
}

export default function Viewer({ id }: PageProps) {
  const {
    remoteVideos,
    connect,
    close,
  } = useViewer(`${output.signalingOrigin}/ws/live/${id}/viewer`);
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const start = async () => {
      try {

        // 初回 offer（SignalingClient の onopen 側が {event:"offer"} を送る実装でも動作します）
        await connect();
        cleanup = () => {
          console.log("%c[CLEANUP START]", "color:red", performance.now());
          try { close(); } catch {}
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
                className="w-full h-full object-cover scale-x-[-1]"
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