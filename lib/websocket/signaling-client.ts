export type ISignalingClient = {
  connect: () => void
  reconnect: () => void
  send: (data: any) => void
  close: () => void
}
export abstract class SignalingClient {
  protected ws: WebSocket | null = null;
  protected pc: RTCPeerConnection | null = null;
  protected heartbeatTimer: any = null;
  constructor(
    protected onTrackEvent: (event: RTCTrackEvent) => void
  ) {}
  abstract connect(): void
  abstract reconnect(): void
  public send(data: any) {
    try {
      this.ws?.send(JSON.stringify(data));
    } catch {}
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
  public close() {
    try {
      this.ws?.close();
      this.pc?.close();
    } catch {}
  }
}
