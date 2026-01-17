import { ApiFetchError } from '@/lib/api/base-client/base-client'
import { spaceRepositoryServer } from '@/lib/repositories/server/space.repository.server'
import { forbidden, notFound } from 'next/navigation'
import { logger } from '@/lib/logger'
import { SpaceMemberProvider } from '../space-member-provider'
import { VideosProvider } from './video-provider'
import { streamingRepositoryServer } from '@/lib/repositories/server/streaming.repository.server'

export default async function ViewerLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  try {
    const [space, { videos }] = await Promise.all([
      spaceRepositoryServer.getTargetSpace(id),
      streamingRepositoryServer.getVideos(id)
    ])
    return (
      <SpaceMemberProvider initialSpace={space}>
        <VideosProvider initialVideos={videos}>{children}</VideosProvider>
      </SpaceMemberProvider>
    )
  } catch (error) {
    if (error instanceof ApiFetchError) {
      if (error.statusCode === 403) {
        return forbidden()
      }
      if (error.statusCode === 404) {
        return notFound()
      }
    }
    logger.error(error)
    throw error
  }
}
