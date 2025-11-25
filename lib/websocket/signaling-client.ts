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
  protected ws: WebSocket | null = null;
  public pc: RTCPeerConnection;
  private onTrackEvent: (event: RTCTrackEvent) => void;
  private heartbeatTimer: any = null;
  private retry = 0;
  private maxRetry = 20;

  constructor(url: string, onTrackEvent: (event: RTCTrackEvent) => void) {
    this.url = url;
    this.onTrackEvent = onTrackEvent;
    this.pc = new RTCPeerConnection(config);
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

    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ event: 'candidate', data: e.candidate });
    };

    this.pc.ontrack = this.onTrackEvent;
  }

  protected reconnect() {
    if (this.retry >= this.maxRetry) {
      console.error("WS failed to reconnect.");
      return;
    }
    this.retry++;
    setTimeout(() => this.connect(), 2000);
  }

  protected startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, 20000);
  }

  protected stopHeartbeat() {
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