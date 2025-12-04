import { Client } from "@/lib/api/client";
import { frontendApi } from "@/lib/api/frontend-api";

class AuthRepository {
  constructor(private client: Client) {}
  public async login(idToken: string) {
    const res = await this.client.post("/api/login", {
      token: JSON.stringify({ idToken })
    });
    return await res.json()
  }

  public async logout(idToken: string) {
    const res = await this.client.post("/api/logout");

  }  
}
export const authRepository = new AuthRepository(frontendApi)