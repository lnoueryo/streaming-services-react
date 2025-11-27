import { SignalingClient, ISignalingClient } from "./signaling-client";
const username = 'streaming'
const credential = '147d74531ecb2e76afb26a6286ce4579'
const iceServers = [
  { urls: ['turns:turn.jounetsism.biz:443?transport=tcp'], username, credential },
  { urls: ['turn:turn.jounetsism.biz:3478?transport=tcp'], username, credential },
  { urls: ['turn:turn.jounetsism.biz:3478?transport=udp'], username, credential }
];
const config: RTCConfiguration  = {
  iceServers,
  iceTransportPolicy: 'all',
  iceCandidatePoolSize: 3
};

export class BroadcasterClient extends SignalingClient implements ISignalingClient {
  private url: string;
  private retry = 0;
  private maxRetry = 20;
  public stream: MediaStream | null = null;

  constructor(url: string, onTrackEvent: (event: RTCTrackEvent) => void) {
    super(onTrackEvent)
    this.url = url;
  }
  async connect() {
    this.pc?.close();
    const pc = new RTCPeerConnection(config);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((track) => {
      const sender = pc?.addTrack(track, stream!);
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
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("WS connected");
      this.retry = 0;

      // keep-alive
      this.startHeartbeat();

      // 最初の offer 要求
      this.send('offer');
    };

    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (!msg.event) return;

      if (msg.event === "offer") {
        pc.setRemoteDescription(msg.data);
        pc.createAnswer().then((ans) => {
          pc.setLocalDescription(ans);
          this.send('answer', ans);
        });
      }

      if (msg.event === "candidate") {
        pc.addIceCandidate(new RTCIceCandidate(msg.data));
      }
    };

    this.ws.onerror = () => {};
    this.ws.onclose = () => {
      console.warn("WS closed, reconnecting...");
      this.stopHeartbeat();
      this.reconnect();
    };
    // ---- シミュルキャスト（低遅延寄り）----
    // --- WebRTC 切断検知 ---
    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
      if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed"
      ) {
        console.warn("🔥 ICE state failed/disconnected — reconnect WebRTC");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("PC state:", pc.connectionState);
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        console.warn("❌ PeerConnection disconnected — restarting...");
        this.send('offer');
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) this.send('candidate', e.candidate);
    };

    pc.ontrack = this.onTrackEvent;
    this.pc = pc
    this.stream = stream
  }

  reconnect() {
    if (this.retry >= this.maxRetry) {
      console.error("WS failed to reconnect.");
      return;
    }
    this.retry++;
    setTimeout(() => this.connect(), 2000);
  }
}