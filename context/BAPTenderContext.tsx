"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type UserType = {
  id: string;
  displayName: string;
  isOwner: boolean;
  active: boolean;
  email: string;
  weight: number;
  gender: string;
  height: number;
  dob: string;
  real_dob: boolean;
};

type GroupType = {
  id: string;
  name: string;
  public: boolean;
};

type DrinkType = {
  id: string;
  nickname: string;
  volume: number;
  strength: number;
  time: number;
};

type UserDrinksType = {
  [key: string]: DrinkType[];
};

type BACStateType = {
  time: number;
  bac: number;
};

type UserStatesType = {
  [key: string]: BACStateType[];
};

type BAPTenderState = {
  self: UserType;
  group: GroupType;
  drinks: UserDrinksType;
  states: UserStatesType;
  members: UserType[];
};

const defaultState: BAPTenderState = {
  self: {
    id: "",
    displayName: "",
    isOwner: false,
    active: false,
    email: "",
    weight: -1,
    gender: "",
    height: -1,
    dob: "",
    real_dob: false,
  },
  group: {
    id: "",
    name: "",
    public: false,
  },
  drinks: {},
  states: {},
  members: [],
};

type BAPTenderContextType = {
  state: BAPTenderState;
  rawMessage: string;
};

const BAPTenderContext = createContext<BAPTenderContextType>({
  state: defaultState,
  rawMessage: "",
});

// Hook to consume the context
export const useBAPTender = () => {
  const context = useContext(BAPTenderContext);
  if (!context) {
    throw new Error("useBAPTender must be used within a BAPTenderProvider");
  }
  return context;
};

// Props now include `token`. We only open the WS if token is set.
export function BAPTenderProvider({
  children,
  token,
}: {
  children: React.ReactNode;
  token: string;
}) {
  const [state, setState] = useState<BAPTenderState>(defaultState);
  const [rawMessage, setRawMessage] = useState<string>("");

  // Log state changes for debugging
  useEffect(() => {
    console.log("BAPTenderContext state updated:", state);
  }, [state]);

  useEffect(() => {
    // If there's no token yet, don't open the WebSocket
    if (!token) {
      console.log("No token yet, not opening WS");
      return;
    }

    console.log("Opening WS with token:", token);
    const wsUrl = `ws://localhost:8000/realtime/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Provider WS connection opened");
    };

    ws.onmessage = (event) => {
      console.log("Provider Received WS message raw:", event.data);
      setRawMessage(event.data);
      try {
        const data = JSON.parse(event.data);
        console.log("Provider Parsed WS data:", data);

        if (data.type === "init") {
          console.log("Provider: Setting state with init message");
          // Replace entire state with incoming data
          setState(data);
        } else if (data.type === "update") {
          console.log("Provider: Updating state with update message");
          setState((prev) => ({
            ...prev,
            drinks: {
              ...prev.drinks,
              [data.user]: data.drinks,
            },
            states: {
              ...prev.states,
              [data.user]: data.states,
            },
          }));
        } else {
          console.warn("Provider: Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Provider: Error parsing WS message:", error, "Raw data:", event.data);
      }
    };

    ws.onerror = (error) => {
      console.error("Provider WS error:", error);
    };

    ws.onclose = (event) => {
      console.log("Provider WS closed:", event);
    };

    return () => {
      ws.close();
    };
  }, [token]);

  return (
    <BAPTenderContext.Provider value={{ state, rawMessage }}>
      {children}
    </BAPTenderContext.Provider>
  );
}
