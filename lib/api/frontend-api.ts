import output from "@/config";
import { Client } from "./client";

export const frontendApi = new Client(output.streamingApiFrontendOrigin)