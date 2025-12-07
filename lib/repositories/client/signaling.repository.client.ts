import output from "@/config";
import { ClientFetch } from "@/lib/api/base-client/client-fetch";
import { SignalingRepository } from "@/repositories/signaling.repository";
const signalingClientFetch = new ClientFetch(output.signalingOrigin)
export const signalingRepositoryClient = new SignalingRepository(signalingClientFetch)