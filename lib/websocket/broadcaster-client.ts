import React from "react";
import { SignalingClient, ISignalingClient } from "./signaling-client";


export class BroadcasterClient extends SignalingClient implements ISignalingClient {
  public stream: MediaStream | null = null;
  public useFront: boolean = true;

  constructor(url: string, setRemoteVideos: React.Dispatch<React.SetStateAction<{ id: string; stream: MediaStream; }[]>>) {
    super(url, setRemoteVideos)
  }
  async connect() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: this.useFront ? "user" : "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: true,
    });
    await super.connect();
    const pc = this.pc!;
    stream.getTracks().forEach((track) => {
      const sender = pc?.addTrack(track, stream!);
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
    this.stream = stream
  }

  reconnect() {
    super.reconnect();
    console.log("%c[RECONNECT SCHEDULED]", "color:orange", performance.now());
    setTimeout(async () => {
      console.log("%c[RECONNECTING...]", "color:orange", `${this.retry}/${this.maxRetry}`, performance.now());
      this.setRemoteVideos([]);
      await this.connect();
    }, 1000);
  }

  hangUp() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
    }
    this.close()
  }

  async switchCamera() {
    this.useFront = !this.useFront;

    // 1) 新しいカメラ取得
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: this.useFront ? "user" : "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false,
    });
    const newTrack = newStream.getVideoTracks()[0];

    // 2) sender の video track を差し替え
    const sender = this.pc?.getSenders().find(s => s.track?.kind === "video");
    if (!sender) {
      console.error("No sender found!");
      return;
    }
    await sender.replaceTrack(newTrack);

    // 3) 古い track は確実に停止
    if (this.stream) {
      this.stream.getVideoTracks().forEach(t => t.stop());
    }

    // 4) stream を置き換え
    this.stream = newStream;
  }
}