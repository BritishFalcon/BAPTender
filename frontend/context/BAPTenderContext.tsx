"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";

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
  id:string;
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
  group: GroupType | null;
  drinks: UserDrinksType;
  states: UserStatesType;
  members: UserType[];
};

const defaultState: BAPTenderState = {
  self: { id: "", displayName: "", isOwner: false, active: false, email: "", weight: -1, gender: "", height: -1, dob: "", realDob: false },
  group: null,
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

export const useBAPTender = () => {
    const context = useContext(BAPTenderContext);
    if (!context) {
        throw new Error("useBAPTender must be used within a BAPTenderProvider");
    }
    return context;
};

export function BAPTenderProvider({ children, token }: { children: React.ReactNode; token: string; }) {
  const [state, setState] = useState<BAPTenderState>(defaultState);
  const [rawMessage, setRawMessage] = useState<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) return;

    const initialize = async () => {
      try {
        console.log("Fetching initial state...");
        const res = await fetch("/api/realtime/initial-state", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch initial state: ${res.status}`);
        }
        const initialState: BAPTenderState = await res.json();
        setState(initialState);
        console.log("Provider: Set initial state", initialState);

        const selfId = initialState.self?.id;
        if (!selfId) throw new Error("Initial state is missing self.id");

        eventSourceRef.current?.close();

        // --- CORRECTED LINE ---
        const url = `/api/realtime/stream/${selfId}?token=${encodeURIComponent(token)}`;
        // --- END CORRECTION ---

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => console.log("SSE connection opened and ready.");

        es.onmessage = (event) => {
          console.log("--> GENERIC 'onmessage' EVENT RECEIVED! Data:", event.data);
          setRawMessage(event.data);
          try {
            const data = JSON.parse(event.data);

            if (data.type === "update") {
              const { user_id_updated, profile, drinks, states } = data;

              setState((prev) => {
                const memberExists = prev.members.some(m => m.id === user_id_updated);
                const newMembers = memberExists
                  ? prev.members.map(member =>
                      member.id === user_id_updated ? profile : member
                    )
                  : [...prev.members, profile];

                const newState: BAPTenderState = {
                  ...prev,
                  self: prev.self.id === user_id_updated ? profile : prev.self,
                  members: newMembers,
                  drinks: {
                    ...prev.drinks,
                    [user_id_updated]: drinks,
                  },
                  states: {
                    ...prev.states,
                    [user_id_updated]: states,
                  },
                };
                return newState;
              });
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error, "Raw data:", event.data);
          }
        };

        es.onerror = (err) => {
          console.error("!!!!!!!! EventSource ERROR !!!!!!!!", err);
          es.close();
          scheduleReconnect();
        };

      } catch (error) {
        console.error("Failed to initialize BAPTender context:", error);
      }
    };

    function scheduleReconnect() {
      if (reconnectTimer.current) return;
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        initialize();
      }, 1000);
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleReconnect();
      }
    };

    const handleFocus = () => scheduleReconnect();

    initialize();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      console.log("Closing SSE connection.");
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      eventSourceRef.current?.close();
    };
  }, [token]);

  return (
    <BAPTenderContext.Provider value={{ state, rawMessage }}>
      {children}
    </BAPTenderContext.Provider>
  );
}