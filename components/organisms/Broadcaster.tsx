'use client';

import React, { useEffect, useRef } from 'react';

interface PageProps {
  id: string
}
type MessageEventType = 'offer' | 'answer' | 'candidate'
type WSMessage = { event: MessageEventType; data?: any }

const Broadcaster: React.FC<PageProps> = ({ id }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // let ctx: CanvasRenderingContext2D | null
  const remoteVideosRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const send = (ws: WebSocket, msg: WSMessage) => {
    ws.send(JSON.stringify(msg))
  }
  useEffect(() => {

    // const localVideo = localVideoRef.current
    // const canvas = canvasRef.current
    // if (!localVideo || !canvas) {
    //   return
    // }

    // const ctx = canvas.getContext('2d')!;
    // const caption = 'テスト配信中...';

    // draw(caption, ctx, localVideo, canvas);
    const start = async () => {
      try {
        // ✅ カメラ・マイクの取得
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // ✅ PeerConnection 作成
        const pc = new RTCPeerConnection();

        // テロップ
        // const mixedStream = canvasRef.current!.captureStream(30); // 30fps
        // const audioTrack = stream.getAudioTracks()[0];
        // mixedStream.addTrack(audioTrack);
        // mixedStream.getTracks().forEach(track => pc.addTrack(track, mixedStream));

        // ローカルのトラックを追加
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // ✅ リモートトラック受信時の処理
        pc.ontrack = (event: RTCTrackEvent) => {
          if (event.track.kind === 'audio') return;

          const remoteStream = event.streams[0] || new MediaStream([event.track]);
          const videoEl = document.createElement('video');
          videoEl.srcObject = remoteStream;
          videoEl.autoplay = true;
          videoEl.controls = true;
          videoEl.muted = true;
          videoEl.playsInline = true;

          remoteVideosRef.current?.appendChild(videoEl);

          event.track.onunmute = () => videoEl.play();

          remoteStream.onremovetrack = () => {
            if (videoEl.parentNode) videoEl.parentNode.removeChild(videoEl);
          };

          videoEl.muted = false;
        };

        // ✅ WebSocket接続
        const ws = new WebSocket(
          `ws://localhost:8080/ws/live/${id}/${Math.floor(Math.random() * (10000 + 1))}`
        );

        pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
          if (e.candidate) {
            send(ws, { event: 'candidate', data: e.candidate });
          }
        };

        ws.onopen = () => {
          log('WebSocket connected');
          send(ws, { event: 'offer' });
        };

        ws.onclose = () => {
          log('WebSocket closed');
        };

        ws.onmessage = (evt: MessageEvent) => {
          try {
            const msg = JSON.parse(evt.data);
            if (!msg || !msg.event) return;

            switch (msg.event) {
              case 'offer':
                const offer = msg.data;
                if (!offer) return log('Invalid offer');
                pc.setRemoteDescription(offer);
                pc.createAnswer().then((answer) => {
                  pc.setLocalDescription(answer);
                  send(ws, { event: 'answer', data: answer });
                });
                break;

              case 'candidate':
                const candidate = msg.data;
                if (!candidate) return log('Invalid candidate');
                pc.addIceCandidate(new RTCIceCandidate(candidate));
                break;
            }
          } catch (err) {
            log('Failed to parse WebSocket message: ' + err);
          }
        };

        ws.onerror = (evt: Event) => {
          log('WebSocket error');
        };

        // ✅ ログ表示関数
        function log(msg: string) {
          console.log(msg);
          if (logsRef.current) {
            const p = document.createElement('p');
            p.textContent = msg;
            logsRef.current.appendChild(p);
          }
        }

        // ✅ 終了時クリーンアップ
        return () => {
          ws.close();
          pc.close();
          stream.getTracks().forEach((track) => track.stop());
        };
      } catch (err) {
        alert(err);
      }
    };

    const cleanupPromise = start();

    // Reactのクリーンアップ
    return () => {
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, []);

  function draw(caption: string, ctx: CanvasRenderingContext2D, video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    if (video.readyState >= 2) {
      const videoAspect = video.videoWidth / video.videoHeight;
      const canvasAspect = canvas.width / canvas.height;
      let renderWidth, renderHeight, x, y;

      // --- アスペクト比を維持して中央に描画 ---
      if (videoAspect > canvasAspect) {
        // カメラが横長 → 縦合わせ
        renderHeight = canvas.height;
        renderWidth = renderHeight * videoAspect;
        x = (canvas.width - renderWidth) / 2;
        y = 0;
      } else {
        // カメラが縦長 → 横合わせ
        renderWidth = canvas.width;
        renderHeight = renderWidth / videoAspect;
        x = 0;
        y = (canvas.height - renderHeight) / 2;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, x, y, renderWidth, renderHeight);

      // --- テロップ ---
      ctx.font = '24px sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      const boxHeight = 40;
      ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);
      ctx.fillStyle = 'white';
      ctx.fillText(caption, 20, canvas.height - 12);
    }
    requestAnimationFrame(() => draw(caption, ctx, video, canvas));
  }

  return (
    <div>
      <h3>Local Video</h3>
      <video
        ref={localVideoRef}
        width={160}
        height={120}
        autoPlay
        muted
        playsInline
      />
      {/* <canvas ref={canvasRef} width={1280} height={720}></canvas> */}
      <br />

      <h3>Remote Video</h3>
      <div ref={remoteVideosRef}></div>
      <br />

      <h3>Logs</h3>
      <div ref={logsRef}></div>
    </div>
  );
};

export default Broadcaster;
