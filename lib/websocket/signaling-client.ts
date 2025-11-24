export class SignalingClient {
  private url: string;
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private retry = 0;
  private maxRetry = 20;

  constructor(url: string, pc: RTCPeerConnection) {
    this.url = url;
    this.pc = pc;
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