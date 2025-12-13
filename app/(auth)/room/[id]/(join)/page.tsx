"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import output from "@/config";
import { TurnCredential } from "@/repositories/signaling.repository";
import { signalingRepositoryClient } from "@/lib/repositories/client/signaling.repository.client";
import { useLobby } from "./lobby-provider";
import { useUser } from "@/app/(auth)/user-provider";
import { roomRepositoryClient } from "@/lib/repositories/client/room.repository.client";
import { ApiFetchError } from "@/lib/api/base-client/base-client";
import useWebsocket from "@/hooks/use-websocket";
import usePeer from "@/hooks/use-peer";

export default function Page() {
  const lobbyRes = useLobby()
  const userRes = useUser()
  const {
    customMessageHandlers,
    connectWS,
    sendWS,
    wsOpen,
  } = useWebsocket(`${output.signalingOrigin}/ws/live/1`)
  const {
    connectPeer,
    setRemoteVideos,
    handleOffer,
    disconnectPeerConnection,
    pcRef,
    remoteVideos,
    onICECandidateHandler,
  } = usePeer()
  const [lobby, setLobby] = useState(lobbyRes);
  const [logText, setLogText] = useState("");
  const [showLocal, setShowLocal] = useState(true);
  const remoteCount = remoteVideos.length;
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const queuedRef = useRef({
    offer: null as RTCSessionDescriptionInit | null,
    candidates: [] as RTCIceCandidateInit[],
  });
  const credentialRef = useRef<TurnCredential | null>(null);
  const [roomState, setRoomState] = useState<'lobby' | 'room' | 'exit'>('lobby')

  useEffect(() => {
    console.log(lobby)
    start()
  }, [])
  customMessageHandlers.current['offer'] = async (data) => {
    const offer = JSON.parse(data);
    console.log+("[WS] ← offer");
    if (pcRef.current) {
      const answer = await handleOffer(offer);
      sendWS({ event: "answer", data: JSON.stringify(answer) });
    } else {
      queuedRef.current.offer = offer;
    }
  }
  customMessageHandlers.current['candidate'] = (data) => {
    const cand = JSON.parse(data);
    console.log("[WS] ← candidate");
    if (pcRef.current) {
      pcRef.current.addIceCandidate(cand).catch((e) =>
        console.log("addIceCandidate err:", e)
      );
    } else {
      queuedRef.current.candidates.push(cand);
    }
  }
  customMessageHandlers.current['access'] = (data) => {
    const users = JSON.parse(data);
    console.log("[WS] ← users: ", users)
    setLobby({
      ...lobby,
      users,
    })
  }
  const start = async () => {
    try {
      await startCamera()
      await connectWS()
      credentialRef.current = await signalingRepositoryClient.generateTurnCredential()
    } catch (e) {
      log("getUserMedia error:", e);
      return;
    }
  }
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.onloadedmetadata = () => {
        localVideoRef.current?.play().catch(() => {});
      };
    }
  }
  const joinRoom = async () => {
    try {
      const lobbyRes = await roomRepositoryClient.enterLobby(lobby.id)
      setLobby(lobbyRes)
      // if (!wsRef.current) {
      //   await connectWS()
      // }
      // await startCamera()
      if (!wsOpen) {
        log("WS not open");
        return;
      }
      await createPeer()
      setRoomState('room')
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 409) {
          console.log('409')
          // setRejoinModalFunc(async () => {
          //   await rejoin(connectPeer)
          //   setIsInRoom(true)
          // })
          // setIsOpenRejoinConfirmation(true)
        }
        console.warn(error)
        return
      }
      alert('予期せぬエラーが発生しました')
    } finally {
      // setIsOpenRejoinConfirmation(false);
    }
  }

  const hangup = async () => {
    await disconnectPeerConnection()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setRoomState('exit')
  }

  const goBackToLobby = async () => {
    const lobbyRes = await roomRepositoryClient.enterLobby(lobby.id)
    setLobby(lobbyRes)
    setRoomState('lobby')
    await start()
  }

  const log = (...args: any[]) => {
    setLogText((prev) => prev + args.join(" ") + "\n");
    console.log(...args);
  };

  const createPeer = async () => {
    if (!wsOpen) {
      log("WS not open");
      return;
    }
    onICECandidateHandler.current = (e) => {
      if (e.candidate) {
        sendWS({
          event: "candidate",
          data: JSON.stringify(e.candidate),
        });
      }
    }
    await connectPeer()

    const local = localStreamRef.current!;
    local.getTracks().forEach((t) => pcRef.current?.addTrack(t, local));
    log("[Peer] local tracks added");

    console.log('queuedRef.current.offer', queuedRef.current.offer)
    if (queuedRef.current.offer) {
      const answer = await handleOffer(queuedRef.current.offer);
      console.log('answer', answer)
      sendWS({ event: "answer", data: JSON.stringify(answer) });
      queuedRef.current.offer = null;
    }

    // queued candidates
    for (const c of queuedRef.current.candidates) {
      await   pcRef.current?.addIceCandidate(c).catch((e) => log("queued ICE err:", e));
    }
    queuedRef.current.candidates = [];

    sendWS({ event: "offer" });
    log("[Peer] ready");
  };

  // ============================================================
  // 4. close
  // ============================================================
  const closePeer = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRemoteVideos([]);
    log("[Peer] closed");
  };
  // ============================================================
  // JSX
  // ============================================================
  return (
    <>
      {
        roomState === 'lobby' ?
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-gray-800 w-full max-w-md rounded-xl shadow-2xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-4 text-center">
              現在の参加者
            </h2>

            <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {lobby.users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center gap-3 bg-gray-700 px-3 py-2 rounded-lg"
                >
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="text-sm">{user.name}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex justify-center">
              <button
                onClick={async () => await joinRoom()}
                className="
                  bg-blue-500 hover:bg-blue-600
                  text-white font-semibold
                  px-6 py-2 rounded-lg
                  transition-all
                "
                disabled={!wsOpen}
              >
                参加
              </button>
            </div>

          </div>
        </div>
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
              ref={localVideoRef}
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
                onClick={async() => await hangup()}
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
        :
        <div>
          <button onClick={async () => await goBackToLobby()}>再参加</button>
        </div>
      }
    </>
  );
}