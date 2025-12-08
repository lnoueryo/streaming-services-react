import { BaseClient } from "@/lib/api/base-client/base-client";

export class AuthRepository {
  constructor(private client: BaseClient) {}
  public async login(token: string) {
    const res = await this.client.post("/api/login", {
      token,
    });
    return res && await res.json()
  }

  public async logout() {
    await this.client.post("/api/logout");
  }
}