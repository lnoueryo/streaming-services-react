export type ISignalingClient = {
  connect: () => void
  reconnect: () => void
  send: (data: any) => void
  close: () => void
}
const username = 'streaming'
const credential = process.env.NEXT_PUBLIC_TURN_SERVER_CREDENTIAL
const iceServers = [
  { urls: ['turn:turn.jounetsism.biz:3478?transport=udp'], username, credential },
  { urls: ['turn:turn.jounetsism.biz:3478?transport=tcp'], username, credential },
  { urls: ['turns:turn.jounetsism.biz:443?transport=tcp'], username, credential },
];
const config: RTCConfiguration  = {
  iceServers,
  iceTransportPolicy: 'all',
  iceCandidatePoolSize: 3
};
export abstract class SignalingClient {
  protected ws: WebSocket | null = null;
  protected pc: RTCPeerConnection | null = null;
  protected heartbeatTimer: any = null;
  protected retry = 0;
  protected maxRetry = 20;
  constructor(protected url: string, protected setRemoteVideos: React.Dispatch<React.SetStateAction<{ id: string; stream: MediaStream; }[]>>) { }
  protected connect(): void {
    this.pc?.close();
    const pc = new RTCPeerConnection(config);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("%c[WS OPEN]", "color: #4caf50", performance.now(), this.url);
      this.retry = 0;
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

    this.ws.onerror = (err) => {
      console.log("%c[WS ERROR]", "color: orange", err);
    };
    this.ws.onclose = () => {
      console.log("%c[WS CLOSE]", "color: #4caf50", performance.now(), this.url);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("%c[ICE CONNECTION]", "color: violet", performance.now(), pc.iceConnectionState);

      if (pc.iceConnectionState === "failed") {
        console.warn("ICE failed → reconnect()");
        this.reconnect();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("%c[PC CONNECTION]", "color: yellow", performance.now(), pc.connectionState);

      if (pc.connectionState === "failed") {
        console.warn("❌ PeerConnection failed — restarting...");
        this.reconnect();
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) this.send('candidate', e.candidate);
    };
    pc.onsignalingstatechange = () => {
      console.log("%c[SIGNALING]", "color: cyan", performance.now(), pc.signalingState);
    };

    pc.onicegatheringstatechange = () => {
      console.log("%c[ICE GATHERING]", "color: purple", performance.now(), pc.iceGatheringState);
    };

    pc.ontrack = (e) => {
      console.log("%c[ONTRACK]", "color:#0af", e.track.kind, e.track.id);
      console.log("%c[REMOTE TRACK RECEIVED]",
        "color: #00bcd4",
        e.track.kind,
        e.track.id,
        performance.now()
      );

      const rStream = e.streams[0] || new MediaStream([e.track]);
      const id = `${rStream.id}-${e.track.id}-${Math.random()}`;

      this.setRemoteVideos((prev) => {
        if (prev.some((v) =>
            v.stream.id === rStream.id &&
            v.stream.getTracks().some(t => t.id === e.track.id)
        )) {
          return prev;
        }
        return [...prev, { id, stream: rStream }];
      });

      e.track.onended = () => {
        console.log("%c[REMOTE TRACK ENDED]",
          "color: #ff7043",
          e.track.kind,
          e.track.id,
          performance.now()
        );
        this.setRemoteVideos((prev) => prev.filter((v) => v.stream.id !== rStream.id));
      };
      rStream.onremovetrack = ({track}) => {
        console.log("%c[REMOTE REMOVED]",
          "color: #ff8a65",
          track.kind,
          track.id,
          performance.now()
        );
        this.setRemoteVideos((prev) => prev.filter((v) => v.stream.id !== rStream.id));
      };
    };
    this.pc = pc
  }
  protected reconnect(): void {
      if (this.retry >= this.maxRetry) {
      console.error("WS failed to reconnect.");
      return;
    }
    this.retry++;
  }
  public send(event: string, data?: any) {
    try {
      this.ws?.send(JSON.stringify({ event, data }));
    } catch {}
  }
  protected startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send('ping');
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
