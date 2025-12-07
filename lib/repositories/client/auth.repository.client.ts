import output from "@/config";
import { ClientFetch } from "@/lib/api/base-client/client-fetch";
import { AuthRepository } from "@/repositories/auth.repository";
const frontendClientFetch = new ClientFetch(output.streamingApiFrontendOrigin)
export const authRepositoryClient = new AuthRepository(frontendClientFetch)