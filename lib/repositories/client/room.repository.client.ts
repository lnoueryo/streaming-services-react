import output from "@/config";
import { ClientFetch } from "@/lib/api/base-client/client-fetch";
import { RoomRepository } from "@/repositories/room.repository";
const clientFetch = new ClientFetch(output.streamingBackendApiOrigin.client)
export const roomRepositoryClient = new RoomRepository(clientFetch)