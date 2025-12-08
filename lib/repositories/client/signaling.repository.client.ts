import output from "@/config";
import { ClientFetch } from "@/lib/api/base-client/client-fetch";
import { SignalingRepository } from "@/repositories/signaling.repository";
const clientFetch = new ClientFetch(output.streamingBackendApiOrigin.client)
export const signalingRepositoryClient = new SignalingRepository(clientFetch)