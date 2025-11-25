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
export class SignalingClient {
  private url: string;
  private ws: WebSocket | null = null;
  public pc: RTCPeerConnection;
  private localStream: MediaStream;
  private onTrackEvent?: (event: RTCTrackEvent) => void;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private retry = 0;
  private maxRetry = 20;

  constructor(url: string, localStream: MediaStream, onTrackEvent?: (event: RTCTrackEvent) => void) {
    this.url = url;
    this.pc = new RTCPeerConnection(config);
    this.localStream = localStream;
    this.onTrackEvent = onTrackEvent;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("WS connected");
      this.retry = 0;

      // keep-alive
      this.startHeartbeat();

      // 最初の offer 要求
      this.send({ event: "offer" });
    };

    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (!msg.event) return;

      if (msg.event === "offer") {
        this.pc.setRemoteDescription(msg.data);
        this.pc.createAnswer().then((ans) => {
          this.pc.setLocalDescription(ans);
          this.send({ event: "answer", data: ans });
        });
      }

      if (msg.event === "candidate") {
        this.pc.addIceCandidate(new RTCIceCandidate(msg.data));
      }
    };

    this.ws.onerror = () => {};
    this.ws.onclose = () => {
      console.warn("WS closed, reconnecting...");
      this.stopHeartbeat();
      this.reconnect();
    };
    if (this.pc.connectionState === 'closed' || this.pc.iceConnectionState === 'closed') {
      this.pc.close();
      this.pc = new RTCPeerConnection(config);
    }
    // ---- シミュルキャスト（低遅延寄り）----
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
    // --- WebRTC 切断検知 ---
    this.pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", this.pc.iceConnectionState);
      if (
        this.pc.iceConnectionState === "disconnected" ||
        this.pc.iceConnectionState === "failed"
      ) {
        console.warn("🔥 ICE state failed/disconnected — reconnect WebRTC");
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log("PC state:", this.pc.connectionState);
      if (
        this.pc.connectionState === "failed" ||
        this.pc.connectionState === "disconnected" ||
        this.pc.connectionState === "closed"
      ) {
        console.warn("❌ PeerConnection disconnected — restarting...");
        this.send({ event: "offer" });
      }
    };

    // ✅ リモート受信
    if (this.onTrackEvent) {
      this.pc.ontrack = this.onTrackEvent
    }
    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ event: 'candidate', data: e.candidate });
    };
  }

  private reconnect() {
    if (this.retry >= this.maxRetry) {
      console.error("WS failed to reconnect.");
      return;
    }
    this.retry++;
    setTimeout(() => this.connect(), 2000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  public send(data: any) {
    try {
      this.ws?.send(JSON.stringify(data));
    } catch {}
  }

  public close() {
    try {
      this.stopHeartbeat();
      this.ws?.close();
    } catch {}
  }
}