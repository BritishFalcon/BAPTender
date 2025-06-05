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
  realDob: boolean;
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
    realDob: false,
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
    if (!token) {
      console.log("No token yet, not opening SSE");
      return;
    }

    const scheme = window.location.protocol === "https:" ? "https" : "http";
    const host = window.location.host;
    const url = `${scheme}://${host}/api/realtime/events?token=${encodeURIComponent(token)}`;
    let es: EventSource | null = new EventSource(url);

    es.onmessage = (event) => {
      setRawMessage(event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === "init") {
          setState(data);
        } else if (data.type === "update") {
          const { user_id_updated, profile, drinks, states } = data;
          setState((prev) => {
            const newMembers = prev.members.map((m) =>
              m.id === user_id_updated ? { ...m, ...profile } : m,
            );
            const newSelf =
              prev.self.id === user_id_updated
                ? { ...prev.self, ...profile }
                : prev.self;
            return {
              ...prev,
              self: newSelf,
              members: newMembers,
              drinks: { ...prev.drinks, [user_id_updated]: drinks },
              states: { ...prev.states, [user_id_updated]: states },
            };
          });
        }
      } catch (e) {
        console.error("SSE parse error", e, event.data);
      }
    };

    es.addEventListener("revoke", () => {
      es?.close();
      es = new EventSource(url);
    });

    es.onerror = (err) => {
      console.error("SSE error", err);
    };

    return () => {
      es?.close();
    };
  }, [token]);

  // Fetch the initial state via REST to ensure state is populated even if SSE fails
  useEffect(() => {
    if (!token) {
      return;
    }
    const fetchState = async () => {
      try {
        const scheme = window.location.protocol === "https:" ? "https" : "http";
        const host = window.location.host;
        const stateUrl = `${scheme}://${host}/api/realtime/state?token=${encodeURIComponent(token)}`;
        const response = await fetch(stateUrl);
        if (response.ok) {
          const data = await response.json();
          setState(data);
        } else {
          console.error("Failed to fetch initial state", response.status);
        }
      } catch (err) {
        console.error("Error fetching initial state", err);
      }
    };
    fetchState();
  }, [token]);

  return (
    <BAPTenderContext.Provider value={{ state, rawMessage }}>
      {children}
    </BAPTenderContext.Provider>
  );
}
