'use client'

import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import Modal from '@/components/atoms/Modal'
import { Video } from '@/repositories/streaming.repository'
import ClientOnly from '@/components/atoms/ClientOnly'
import { signalingRepositoryClient } from '@/lib/repositories/client/streaming.repository.client'
import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { useLoading } from '@/app/LoadingContext'
import { useVideos } from './video-provider'
import output from '@/config'

export default function VideoList() {
  const { videos, setVideos } = useVideos()
  const { startLoading, endLoading } = useLoading()
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Video | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const openModal = (video: Video) => {
    setSelected(video)
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    setSelected(null)
  }

  const openDeleteModal = () => {
    setDeleteOpen(true)
  }

  const closeDeleteModal = () => {
    setDeleteOpen(false)
  }

  const deleteVideo = async () => {
    if (!selected) return

    try {
      startLoading()
      await signalingRepositoryClient.deleteVideo(
        selected.roomId,
        selected.recordingId
      )
      const updatedVideos = await signalingRepositoryClient.getVideos(
        selected.roomId
      )
      setVideos(updatedVideos.videos)
      setDeleteOpen(false)
      setOpen(false)
    } catch (error) {
      if (error instanceof ApiFetchError) {
        if (error.statusCode === 403) {
          alert(error.message)
          location.href = '/'
          return
        }
        if (error.statusCode === 404) {
          alert('ルームが見つかりませんでした')
          location.href = '/'
          return
        }
      }
      console.error(error)
    } finally {
      endLoading()
    }
  }

  /* -------- HLS 再生 -------- */
  useEffect(() => {
    if (!open || !selected || !videoRef.current) return

    const video = videoRef.current
    const src = `${output.streamingBackendApiOrigin.client}${selected.hlsUrl}`

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      video.play()
      return
    }

    if (Hls.isSupported()) {
      const hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
      return () => hls.destroy()
    }
  }, [open, selected])

  return (
    <ClientOnly>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4 text-white">Recordings</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div
              key={v.recordingId}
              onClick={() => openModal(v)}
              className="
                bg-gray-800 border border-gray-700 rounded-lg
                hover:bg-gray-700 transition cursor-pointer overflow-hidden
              "
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-black">
                {v.thumbnailUrl ? (
                  <img
                    src={`${output.streamingBackendApiOrigin.client}${v.thumbnailUrl}`}
                    alt="thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                    No Thumbnail
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="p-4">
                <div className="font-semibold text-sm break-all text-white">
                  {v.recordingId}
                </div>

                {v.size && (
                  <div className="mt-1 text-xs text-gray-400">
                    Size: {(v.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Created: {new Date(v.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== 再生モーダル ===== */}
        <Modal open={open} onClose={closeModal} size="xl" zIndex="high">
          {selected && (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-gray-300 break-all">
                {selected.recordingId}
              </div>

              <video
                ref={videoRef}
                controls
                autoPlay
                className="w-full max-h-[70vh] bg-black rounded"
              />

              <div className="flex justify-between">
                <button
                  onClick={openDeleteModal}
                  className="
                    px-4 py-2 rounded
                    bg-red-500/80 hover:bg-red-600
                    text-sm text-white
                  "
                >
                  Delete
                </button>

                <button
                  onClick={closeModal}
                  className="
                    px-4 py-2 rounded
                    bg-gray-700 hover:bg-gray-600
                    text-sm
                  "
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* ===== 削除確認モーダル ===== */}
        <Modal
          open={deleteOpen}
          onClose={closeDeleteModal}
          size="md"
          zIndex="max"
        >
          {selected && (
            <div className="flex flex-col gap-4">
              <div className="text-lg font-semibold text-white">
                Delete recording
              </div>

              <div className="text-sm text-gray-400 break-all">
                {selected.recordingId}
              </div>

              <div className="text-sm text-red-400">
                この録画は完全に削除され、復元できません。
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={closeDeleteModal}
                  className="
                    px-4 py-2 rounded
                    bg-gray-700 hover:bg-gray-600
                    text-sm
                  "
                >
                  Cancel
                </button>

                <button
                  onClick={deleteVideo}
                  className="
                    px-4 py-2 rounded
                    bg-red-500 hover:bg-red-600
                    text-sm text-white
                  "
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </ClientOnly>
  )
}
