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
  public stream: MediaStream | null = null;

  constructor(url: string, setRemoteVideos: React.Dispatch<React.SetStateAction<{ id: string; stream: MediaStream; }[]>>) {
    super(url, setRemoteVideos)
  }
  async connect() {
    super.connect();
  }

  reconnect() {
    super.reconnect();
    setTimeout(() => {
      console.log("%c[RECONNECTING...]", "color:orange", `${this.retry}/${this.maxRetry}`, performance.now());
      this.connect();
    }, 1000);
  }
}