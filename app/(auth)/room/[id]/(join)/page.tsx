"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { TurnCredential } from "@/repositories/signaling.repository";
import { signalingRepositoryClient } from "@/lib/repositories/client/signaling.repository.client";
import { useLobby } from "./lobby-provider";
import { useUser } from "@/app/(auth)/user-provider";
import { roomRepositoryClient } from "@/lib/repositories/client/room.repository.client";
import Lobby from "./Lobby";
import { useSignaling } from "./signaling-provider";

export default function Page() {
  const { lobby, setLobby } = useLobby()
  const userRes = useUser()
  const {
    remoteVideos,
    customMessageHandlers,
    localStreamRef,
    connectWS,
    hangup,
  } = useSignaling()
  const [showLocal, setShowLocal] = useState(true);
  const remoteCount = remoteVideos.length;
  const localLobbyVideoRef = useRef<HTMLVideoElement>(null);
  const localRoomVideoRef = useRef<HTMLVideoElement>(null);
  const credentialRef = useRef<TurnCredential | null>(null);
  const [roomState, setRoomState] = useState<'reception' | 'lobby' | 'room' | 'exit'>('reception')

  useEffect(() => {
    console.log(lobby)
    start()
  }, [])
  // useEffect(() => {
  //   console.log('connectionState changed:', connectionState)
  //   if (connectionState === 'pending') {
  //     setRoomState('lobby')
  //   } else if (connectionState === 'stop') {
  //     setRoomState('exit')
  //   } else if (connectionState === 'ready') {
  //     setRoomState('room')
  //   }
  // }, [connectionState])
  useEffect(() => {
    requestAnimationFrame(() => {
      if (localLobbyVideoRef.current) {
        setVideoStream(localLobbyVideoRef.current);
      }
      if (localRoomVideoRef.current) {
        setVideoStream(localRoomVideoRef.current);
      }
    })
  }, [roomState])

  const setVideoStream = (video: HTMLVideoElement) => {
    video.pause();
    video.srcObject = null;
    video.srcObject = localStreamRef.current;
    video.play().catch(() => {});
  };
  customMessageHandlers.current['access'] = (data) => {
    const users = JSON.parse(data);
    console.log("[WS] ← users: ", users)
    setLobby(({
      ...lobby,
      users,
    }))
  }
  const start = async () => {
    try {
      await startCamera()
      await connectWS()
      credentialRef.current = await signalingRepositoryClient.generateTurnCredential()
      setRoomState('lobby')
    } catch (e) {
      console.log("getUserMedia error:", e);
      return;
    }
  }
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
  }

  const goBackToLobby = async () => {
    const newLobby = await roomRepositoryClient.enterLobby(lobby.id)
    setLobby(newLobby)
    await start()
  }

  // ============================================================
  // JSX
  // ============================================================
  return (
    <>
      {
        roomState === 'lobby' ?
        <Lobby setRoomState={setRoomState} />
        : roomState === 'room' ?
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
                    className="w-full h-full object-cover scale-x-[-1]"
                    ref={(el) => {
                      if (!el) return;
                      if (el.srcObject !== v.stream) {
                        el.srcObject = v.stream;
                        el.onloadedmetadata = () => {
                          el.play().catch(() => {});
                          el.muted = false;
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
              ref={localRoomVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
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
          {/* Bottom Control Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="
              absolute bottom-3 left-1/2 -translate-x-1/2
              flex items-center gap-3
              bg-black/40 backdrop-blur-md
              px-4 py-2 rounded-full shadow-lg
            "
          >
            <>
              {/* <button
                onClick={async() => await connectWS()}
                className="
                  flex items-center gap-1
                  bg-red-500/80 hover:bg-red-600
                  text-white px-3 py-1.5 rounded-full text-xs
                  transition-all
                "
              >
                WS
              </button>
              <button
                onClick={async() => await createPeer()}
                className="
                  flex items-center gap-1
                  bg-red-500/80 hover:bg-red-600
                  text-white px-3 py-1.5 rounded-full text-xs
                  transition-all
                "
              >
                Peer
              </button> */}
              <button
                onClick={async() => {
                  await hangup()
                  localStreamRef.current?.getTracks().forEach((t) => t.stop())
                  localStreamRef.current = null
                  setRoomState('exit')
                }}
                className="
                  flex items-center gap-1
                  bg-red-500/80 hover:bg-red-600
                  text-white px-3 py-1.5 rounded-full text-xs
                  transition-all
                "
              >
                切る
              </button>
              {/* <button
                onClick={async() => await closeWS()}
                className="
                  flex items-center gap-1
                  bg-red-500/80 hover:bg-red-600
                  text-white px-3 py-1.5 rounded-full text-xs
                  transition-all
                "
              >
                切る
              </button> */}
              {/* <button
                onClick={async () => await switchCamera()}
                className="
                  flex items-center gap-1
                  bg-white/10 hover:bg-white/20
                  text-white px-3 py-1.5 rounded-full text-xs
                  transition-all
                "
              >
                切り替え
              </button> */}
            </>
          </motion.div>
        </div>
        : roomState === 'exit' ?
        <div>
          <button onClick={async () => await goBackToLobby()}>再参加</button>
        </div>
        : null
      }
    </>
  );
}