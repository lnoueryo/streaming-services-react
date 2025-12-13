"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type LobbyResponse = {
  id: string;
  privacy: string;
  users: {
    id: string;
    name: string;
    email: string;
    image: string;
  }[];
  isJoined: boolean;
};

type LobbyContextValue = {
  lobby: LobbyResponse;
  setLobby: (lobby: LobbyResponse) => void;
};

const LobbyContext = createContext<LobbyContextValue | null>(null);

export function LobbyProvider({
  initialLobby,
  children,
}: {
  initialLobby: LobbyResponse;
  children: ReactNode;
}) {
  const [lobby, setLobby] = useState<LobbyResponse>(
    initialLobby
  );

  return (
    <LobbyContext.Provider value={{ lobby, setLobby }}>
      {children}
    </LobbyContext.Provider>
  );
}

export function useLobby() {
  const ctx = useContext(LobbyContext);
  if (!ctx) throw new Error("useLobby must be used within LobbyProvider");
  return ctx;
}