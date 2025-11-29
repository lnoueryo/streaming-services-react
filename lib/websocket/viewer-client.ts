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

export class ViewerClient extends SignalingClient implements ISignalingClient {
  private retry = 0;
  private maxRetry = 20;
  public stream: MediaStream | null = null;

  constructor(private url: string, private setRemoteVideos: React.Dispatch<React.SetStateAction<{ id: string; stream: MediaStream; }[]>>) {
    super()
  }
  async connect() {
    this.pc?.close();
    const pc = new RTCPeerConnection(config);
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

  reconnect() {
    if (this.retry >= this.maxRetry) {
      console.error("WS failed to reconnect.");
      return;
    }
    this.retry++;
    setTimeout(() => this.connect(), 2000);
  }
}