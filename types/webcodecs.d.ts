declare class MediaStreamTrackProcessor {
  constructor(init: MediaStreamTrack)
  readonly readable: ReadableStream<VideoFrame | AudioFrame>
}