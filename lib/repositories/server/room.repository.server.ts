import output from "@/config";
import { ServerFetch } from "@/lib/api/base-client/server-fetch";
import { RoomRepository } from "@/repositories/room.repository";
const serverFetch = new ServerFetch(output.streamingBackendApiOrigin.server)
export const roomRepositoryServer = new RoomRepository(serverFetch)