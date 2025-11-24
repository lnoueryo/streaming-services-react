export class SignalingClient {
  private url: string;
  private ws: WebSocket | null = null;
  private heartbeatTimer: any = null;
  private retry = 0;
  private maxRetry = 20;

  private onMessageCallback: (msg: any) => void;
  private onOpenCallback: () => void;

  constructor(
    url: string,
    onMessage: (msg: any) => void,
    onOpen?: () => void
  ) {
    this.url = url;
    this.onMessageCallback = onMessage;
    this.onOpenCallback = onOpen || (() => {});
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("WS connected");
      this.retry = 0;

      this.startHeartbeat();
      this.onOpenCallback();
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.onMessageCallback(msg);
      } catch (e) {
        console.error("WS parse failed", e);
      }
    };

    this.ws.onerror = () => {};

    this.ws.onclose = () => {
      console.warn("WS closed, reconnect...");
      this.stopHeartbeat();
      this.reconnect();
    };
  }

  private reconnect() {
    if (this.retry >= this.maxRetry) return;

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
    this.ws?.send(JSON.stringify(data));
  }

  public close() {
    this.stopHeartbeat();
    this.ws?.close();
  }
}