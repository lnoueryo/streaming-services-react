import output from '@/config'
import { ApiFetchError, BaseClient } from '@/lib/api/base-client/base-client'

export class AppClient extends BaseClient {
  constructor(baseUrl: string) {
    const fetchFunc = async (url: string, options: RequestInit) => {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {})
        }
      })
      if (res.status >= 400) {
        const data = await res.json()
        throw new ApiFetchError(data)
      }
      return res
    }
    super(baseUrl, fetchFunc)
  }
}

export const appClient = new AppClient(output.streamingBackendApiOrigin.server)
