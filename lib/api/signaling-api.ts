import output from "@/config";
import { Client } from "./client";

export const signalingApi = new Client(output.signalingOrigin)