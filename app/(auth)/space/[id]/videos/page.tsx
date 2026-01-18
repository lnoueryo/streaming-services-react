import { logger } from '@/lib/logger'
import { streamingRepositoryServer } from '@/lib/repositories/server/streaming.repository.server'
import Videos from './Videos'

export default async function VideoPage({
  params
}: {
  params: { id: string }
}) {
  return (
    <>
      <Videos />
    </>
  )
}
