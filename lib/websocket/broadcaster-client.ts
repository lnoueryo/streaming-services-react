import React from "react";
import { SignalingClient, ISignalingClient } from "./signaling-client";
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

export class BroadcasterClient extends SignalingClient implements ISignalingClient {
  private retry = 0;
  private maxRetry = 20;
  public stream: MediaStream | null = null;

  constructor(private url: string, private setRemoteVideos: React.Dispatch<React.SetStateAction<{ id: string; stream: MediaStream; }[]>>) {
    super()
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

        if (params.encodings && params.encodings.length > 0) {
          console.log("Re-use existing encodings:", params.encodings);

          params.encodings.forEach((enc) => {
            enc.maxBitrate = 800_000; // 変更したい場合だけ
          });

        } else {
          // 初回のみ encodings を設定
          params.encodings = [
            { rid: "l", scaleResolutionDownBy: 3, maxBitrate: 200_000, maxFramerate: 20 },
            { rid: "m", scaleResolutionDownBy: 2, maxBitrate: 500_000, maxFramerate: 24 },
            { rid: "h", scaleResolutionDownBy: 1, maxBitrate: 1_200_000, maxFramerate: 30 },
          ];
        }

        sender.setParameters(params).catch((err) => {
          console.warn("setParameters error:", err);
        });
      }
    });
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
    this.stream = stream
  }

  reconnect() {
    if (this.retry >= this.maxRetry) {
      console.error("WS failed to reconnect.");
      return;
    }
    this.retry++;

    console.log("%c[RECONNECT SCHEDULED]", "color:orange", performance.now());

    setTimeout(async () => {
      console.log("%c[RECONNECTING...]", "color:orange", `${this.retry}/${this.maxRetry}`, performance.now());
      this.setRemoteVideos([]);
      await this.connect();
    }, 1000);
  }

  hangUp() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
    }
    this.close()
  }
}