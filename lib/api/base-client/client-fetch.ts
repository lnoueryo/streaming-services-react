import { ApiFetchError, BaseClient } from "./base-client";
import AuthService from "../../auth/auth.service";
import { AuthError } from "@/lib/auth/auth-error";

export class ClientFetch extends BaseClient {
  constructor(baseUrl: string) {
    const fetchFunc = async (url: string, options: RequestInit) => {
      const token = await AuthService.getIdToken()

      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            authorization: `Bearer ${token}`,
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

      } catch (error) {
        console.error(error)
        if (error instanceof AuthError) {
          if (error.statusCode === 401) {
            await this.goToLoginPage.bind(this)()
          }
        }
        throw error
      }
    }
    super(baseUrl, fetchFunc)
  }
  private async goToLoginPage() {
    const next = window.location.pathname + window.location.search;
    const nextQuery = this.buildQuery({ next });
    window.location.href = `/login${nextQuery}`;
  }
}