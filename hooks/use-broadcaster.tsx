import { useRef, useState } from "react";
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
    connect: _connect,
    reconnect: _reconnect,
    send,
    close,
    setIsConnected,
  } = useSignalingClient(url)
  const stream = useRef<MediaStream | null>(null)
  const isFrontCam = useRef(false)
  customMessageHandlers.current['close'] = () => hangUp()
  const connect = async() => {
    setIsConnected(true)
    stream.current = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: isFrontCam ? "user" : "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: true,
    });
    await _connect();
    const pc = _pc.current
    if (!pc) {
      throw new Error('Peer Connection is not connected')
    }
    stream.current.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, stream.current!);
      if (track.kind === "video") {
        const params = sender.getParameters();

        if (params.encodings && params.encodings.length > 0) {
          console.log("Re-use existing encodings:", params.encodings);

          params.encodings.forEach((enc) => {
            enc.maxBitrate = 800_000; // 変更したい場合だけ
          });

        } else {
          // 初回のみ encodings を設定
          params.encodings = [
            { rid: "f", scaleResolutionDownBy: 1, maxBitrate: 2_500_000 },
            { rid: "h", scaleResolutionDownBy: 2, maxBitrate: 500_000 },
            { rid: "q", scaleResolutionDownBy: 4, maxBitrate: 150_000 },
          ];
        }

        sender.setParameters(params).catch((err) => {
          console.warn("setParameters error:", err);
        });
      }
    });
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
    send,
    close,
    hangUp,
    switchCam,
  };
}