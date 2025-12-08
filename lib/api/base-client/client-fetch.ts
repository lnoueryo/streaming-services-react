import { ApiFetchError, BaseClient } from "./base-client";
export class ClientFetch extends BaseClient {
  constructor(baseUrl: string) {
    const fetchFunc = async (url: string, options: RequestInit) => {
      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          ...(options.headers || {}),
        }
      });
      if (res.status >= 400) {
        if (res.status === 401) {
          await this.goToLoginPage.bind(this)()
        }
        const data = await res.json()
        throw new ApiFetchError(data)
      }
      return res;
    }
    super(baseUrl, fetchFunc)
  }
  private async goToLoginPage() {
    const next = window.location.pathname + window.location.search;
    const nextQuery = this.buildQuery({ next });
    window.location.href = `/login${nextQuery}`;
  }
}