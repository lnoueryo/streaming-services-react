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
  private reconnecting: boolean = false;

  constructor(url: string, onTrackEvent: (event: RTCTrackEvent) => void) {
    super(onTrackEvent)
    this.url = url;
  }
  async connect() {
    if (this.pc) {
      console.log("%c[PC DESTROY START]", "color:red", performance.now());

      this.pc.getSenders().forEach((s) => {
        console.log(" stop sender:", s.track?.id);
        try { s.track?.stop(); } catch {}
      });

      this.pc.oniceconnectionstatechange = null;
      this.pc.onconnectionstatechange = null;
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onsignalingstatechange = null;
      this.pc.onicegatheringstatechange = null;

      try { this.pc.close(); } catch {}
      console.log("%c[PC DESTROY END]", "color:red", performance.now());
    }
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
    if (this.ws) {
      console.log("%c[WS DESTROY]", "color:red", performance.now());
      try { this.ws.close(); } catch {}
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws = null;
    }
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
      this.stopHeartbeat();
      this.reconnect();
    };
    // ---- シミュルキャスト（低遅延寄り）----
    // --- WebRTC 切断検知 ---
    pc.oniceconnectionstatechange = () => {
      console.log("%c[ICE CONNECTION]", "color: violet", performance.now(), pc.iceConnectionState);
      if (
        pc.iceConnectionState === "disconnected" ||
        pc.iceConnectionState === "failed"
      ) {
        console.warn("🔥 ICE state failed/disconnected — reconnect WebRTC");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("%c[PC CONNECTION]", "color: yellow", performance.now(), pc.connectionState);
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        console.warn("❌ PeerConnection disconnected — restarting...");
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
      this.onTrackEvent(e);
    };
    this.pc = pc
    this.stream = stream
  }

reconnect() {
  if (this.reconnecting) {
    console.log("%c[RECONNECT SKIPPED — already reconnecting]", "color:gray");
    return;
  }
  this.reconnecting = true;

  if (this.retry >= this.maxRetry) {
    console.error("WS failed to reconnect.");
    this.reconnecting = false;
    return;
  }
  this.retry++;

  console.log("%c[RECONNECT SCHEDULED]", "color:orange", performance.now());

  setTimeout(async () => {
    await this.connect();
    this.reconnecting = false;
  }, 2000);
}
}