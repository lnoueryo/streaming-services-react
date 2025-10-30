"use client";
import React, { useEffect, useRef } from "react";

interface PageProps {
  id: string
}
type MessageEventType = 'offer' | 'answer' | 'candidate'
type WSMessage = { event: MessageEventType; data?: any }

const Viewer: React.FC<PageProps> = ({ id }) => {
  const remoteVideosRef = useRef<HTMLDivElement>(null);
  const send = (ws: WebSocket, msg: WSMessage) => {
    ws.send(JSON.stringify(msg))
  }
  useEffect(() => {
    let mute = false;
    (async () => {
      try {
        await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
      } catch (error) {
        mute = true
      }
    })()
    const pc = new RTCPeerConnection();

    pc.ontrack = (event: RTCTrackEvent) => {
      if (event.track.kind === "audio") return;

      const el = document.createElement(event.track.kind) as HTMLVideoElement;
      el.srcObject = event.streams[0];
      el.autoplay = true;
      el.controls = true;
      el.muted = mute;
      el.playsInline = true;
      remoteVideosRef.current?.appendChild(el);
      event.streams[0].onremovetrack = () => {
        if (el.parentNode) el.parentNode.removeChild(el);
      };
    };

    const ws = new WebSocket(
      `ws://localhost:8080/ws/live/${id}/${Math.floor(Math.random() * 1000)}`
    );

    pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
      if (e.candidate) {
        send(ws, { event: "candidate", data: e.candidate.toJSON() });
      }
    };

    ws.onmessage = (evt: MessageEvent) => {
      try {
        const msg: WSMessage = JSON.parse(evt.data);
        if (!msg?.event) return;

        switch (msg.event) {
          case "offer":
            if (!msg.data) return console.error("Invalid offer");
            pc.setRemoteDescription(msg.data);
            pc.createAnswer().then((answer) => {
              pc.setLocalDescription(answer);
              send(ws, { event: "answer", data: answer });
            });
            break;

          case "candidate":
            if (!msg.data) return console.error("Invalid candidate");
            pc.addIceCandidate(new RTCIceCandidate(msg.data));
            break;
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    ws.onopen = () => {
      send(ws, { event: "offer" });
    };

    ws.onerror = (evt) => {
      console.error("WebSocket error:", evt);
    };

    return () => {
      ws.close();
      pc.close();
    };
  }, [id]);

  return (
    <div>
      <h3>Remote Video</h3>
      <div id="remoteVideos" ref={remoteVideosRef}></div>
    </div>
  );
};

export default Viewer;
