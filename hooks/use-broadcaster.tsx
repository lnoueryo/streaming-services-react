import { useRef } from "react";
import { useSignalingClient } from "./use-signaling-client";

export function useBroadcaster(url: string) {
  const {
    remoteVideos,
    ws,
    pc: _pc,
    retry,
    maxRetry,
    isConnected,
    customMessageHandlers,
    stream,
    connect: _connect,
    reconnect: _reconnect,
    connectPeer,
    send,
    close,
    setIsConnected,
  } = useSignalingClient(url)
  const isFrontCam = useRef(false)
  customMessageHandlers.current['close'] = () => hangUp()
  const connect = async() => {
    setIsConnected(true)
    await _connect();
  }

  const reconnect = () => {
    _reconnect();
    console.log("%c[RECONNECT SCHEDULED]", "color:orange", performance.now());
    setTimeout(async () => {
      console.log("%c[RECONNECTING...]", "color:orange", `${retry}/${maxRetry}`, performance.now());
      await connect();
    }, 1000);
  }

  const hangUp = () => {
    if (stream.current) {
      stream.current.getTracks().forEach(track => {
        track.stop();
      });
    }
    close()
    setIsConnected(false)
  }

  const switchCam = async() => {
    const _isFrontCam = !isFrontCam.current
    // 1) 新しいカメラ取得
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: _isFrontCam ? "user" : "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: true,
    });
    isFrontCam.current = _isFrontCam;
    const newTrack = newStream.getVideoTracks()[0];

    // 2) sender の video track を差し替え
    const sender = _pc.current?.getSenders().find(s => s.track?.kind === "video");
    if (!sender) {
      console.error("No sender found!");
      return;
    }
    await sender.replaceTrack(newTrack);

    // 3) 古い track は確実に停止
    if (stream.current) {
      stream.current.getVideoTracks().forEach(t => t.stop());
    }
    console.log(stream.current?.id, newStream.id)
    // 4) stream を置き換え
    stream.current = newStream
    console.log(stream.current?.id, newStream.id)
  }
  return {
    remoteVideos,
    ws,
    pc: _pc,
    stream,
    isFrontCam,
    isConnected,
    connect,
    reconnect,
    connectPeer,
    send,
    close,
    hangUp,
    switchCam,
  };
}