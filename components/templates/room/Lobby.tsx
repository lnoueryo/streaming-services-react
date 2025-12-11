'use client'
import { useLobby } from "@/app/(auth)/room/[id]/(join)/lobby-provider";
import Broadcaster from "@/components/organisms/Broadcaster";
import { ApiFetchError } from "@/lib/api/base-client/base-client";
import { roomRepositoryClient } from "@/lib/repositories/client/room.repository.client";
import { useEffect, useState } from "react";
import output from '@/config';
import useBroadcaster from "@/hooks/use-signaling";
import Modal from "@/components/atoms/modal";
import { useUser } from "@/app/(auth)/user-provider";

export default function Lobby() {
  // TODO Objectを元に409の処理
  const lobbyRes = useLobby()
  const userRes = useUser()
  const [lobby, setLobby] = useState(lobbyRes)
  const [isOpenRejoinConfirmation, setIsOpenRejoinConfirmation] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [rejoinModalFunc, setRejoinModalFunc] = useState<(next?: () => void) => Promise<void>>(async () => {});
  const {
    remoteVideos,
    localStreamRef,
    customMessageHandlers,
    startCamera,
    connectWS,
    connectPeer,
    hangUp,
    isWSConnected,
  } = useBroadcaster(`${output.signalingOrigin}/ws/live/${lobby.id}`);

  customMessageHandlers.current['access'] = (users) => {
    const newLobby = {
      ...lobby,
      users,
    }
    setLobby(newLobby)
  }

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const start = async () => {
      try {
        cleanup = () => {
          console.log("%c[CLEANUP START]", "color:red", performance.now());
          try { hangUp(); } catch {}
          console.log("%c[CLEANUP END]", "color:red", performance.now());
        };
        if (lobby.isJoined) {
          setRejoinModalFunc(async () => await rejoin())
          setIsOpenRejoinConfirmation(true)
        }
        await connectWS();
      } catch (err) {
        console.error(err);
        // alert(err);
      }
    };

    start();
    return () => {
      console.log('clean up')
    try {
      hangUp();
    } catch (e) {
      console.warn("hangUp failed:", e);
    }
    };
  }, [lobby.isJoined])
  const joinRoom = async () => {
    try {
      const lobbyRes = await roomRepositoryClient.enterLobby(lobby.id)
      setLobby(lobbyRes)
      if (!isWSConnected()) {
        await connectWS()
      }
      await startCamera()
      await connectPeer()
      setIsInRoom(true)
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 409) {
          setRejoinModalFunc(async () => {
            await rejoin(connectPeer)
            setIsInRoom(true)
          })
          setIsOpenRejoinConfirmation(true)
        }
        console.warn(error)
        return
      }
      alert('予期せぬエラーが発生しました')
    } finally {
      setIsOpenRejoinConfirmation(false);
    }
  }
  const rejoin = async (func = () => {}) => {
    try {
      await Promise.all([
        roomRepositoryClient.rejoinRoom(lobby.id),
        func()
      ])
    } catch (error) {
      if (error instanceof ApiFetchError) {
        console.warn(error)
        return
      }
      alert('予期せぬエラーが発生しました')
    } finally {
      setIsOpenRejoinConfirmation(false);
    }
  }
  const hangUpAndLeave = async () => {
    await hangUp()
    setIsInRoom(false)
  }
  const switchCam = async () => {}
  return (
    <>
      {
        isInRoom &&
        <
          Broadcaster
            {...{
              remoteVideos,
              connectWS,
              stream: localStreamRef,
              switchCam,
              hangUpAndLeave,
            }}
        />
        ||
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
                onClick={joinRoom}
                className="
                  bg-blue-500 hover:bg-blue-600
                  text-white font-semibold
                  px-6 py-2 rounded-lg
                  transition-all
                "
              >
                参加
              </button>
            </div>

          </div>
        </div>
      }
      {
        isOpenRejoinConfirmation &&
        <Modal open={isOpenRejoinConfirmation} onClose={() => setIsOpenRejoinConfirmation(false)}>
          <h2 className="text-lg font-semibold mb-2">確認</h2>
          <p className="mb-4">別の端末で既に参加されているようです。こちらの端末に切り替えますか。</p>

          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1 bg-gray-700 rounded"
              onClick={() => setIsOpenRejoinConfirmation(false)}
            >
              キャンセル
            </button>
            <button
              className="px-3 py-1 bg-red-500 rounded"
              onClick={() => rejoin()}
            >
              OK
            </button>
          </div>
        </Modal>
      }
    </>
  )
}
