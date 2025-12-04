import output from "@/config";
import { Client } from "./client";

export const backendApi = new Client(output.streamingBackendApiOrigin)