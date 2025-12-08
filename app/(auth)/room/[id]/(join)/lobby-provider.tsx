"use client";

import { LobbyResponse } from "@/repositories/room.repository";
import { createContext, useContext } from "react";

const LobbyContext = createContext<LobbyResponse | null>(null);

export function LobbyProvider({
  lobby,
  children,
}: {
  lobby: LobbyResponse | null;
  children: React.ReactNode;
}) {
  return <LobbyContext.Provider value={lobby}>{children}</LobbyContext.Provider>;
}

export function useLobby(): LobbyResponse {
  const r = useContext(LobbyContext);
  if (!r) {
    throw new Error("useLobby must be used within LobbyProvider");
  }
  return r;
}