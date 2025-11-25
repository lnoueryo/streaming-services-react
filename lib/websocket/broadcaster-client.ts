import { SignalingClient } from "./signaling-client";

export class BroadcasterClient extends SignalingClient {
  private localStream: MediaStream;

  constructor(url: string, onTrackEvent: (event: RTCTrackEvent) => void, localStream: MediaStream) {
    super(url, onTrackEvent);
    this.localStream = localStream;
  }

  connect() {
    super.connect();
    this.ws!.onclose = () => {
      console.warn("WS closed, reconnecting...");
      super.stopHeartbeat();
      this.reconnect();
    };
    this.localStream.getTracks().forEach((track) => {
      const sender = this.pc.addTrack(track, this.localStream);
      if (track.kind === "video") {
        const params = sender.getParameters();
        if (!params.encodings) params.encodings = [{}];

        params.encodings = [
          { rid: "l", scaleResolutionDownBy: 3, maxBitrate: 200_000, maxFramerate: 20 },
          { rid: "m", scaleResolutionDownBy: 2, maxBitrate: 500_000, maxFramerate: 24 },
          { rid: "h", scaleResolutionDownBy: 1, maxBitrate: 1_200_000, maxFramerate: 30 },
        ];

        sender.setParameters(params).catch((err) => {
          console.warn("setParameters error:", err);
        });
      }
    });
  }

  protected reconnect() {
    setTimeout(() => this.connect(), 2000);
  }
}