"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";

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

  // This ref is to prevent a potential race condition where multiple events
  // might try to reconnect at the exact same time.
  const isConnectingRef = useRef<boolean>(false);

  const initializeConnection = useCallback(async () => {
    // If we're already in the process of connecting, don't start another one.
    if (isConnectingRef.current || !token) return;

    isConnectingRef.current = true;

    eventSourceRef.current?.close();

    try {
      console.log("INITIALIZE: Fetching full state and establishing SSE connection...");
      const res = await fetch("/api/realtime/initial-state", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch initial state: ${res.status}`);

      const initialState: BAPTenderState = await res.json();
      setState(initialState);
      console.log("Provider: Set initial state", initialState);

      const selfId = initialState.self?.id;
      if (!selfId) throw new Error("Initial state is missing self.id");

      const url = `/api/realtime/stream/${selfId}?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => console.log("SSE connection opened.");

      es.onmessage = (event) => {
        setRawMessage(event.data);
        try {
          const data = JSON.parse(event.data);
          if (data.type === "update") {
            const { user_id_updated, profile, drinks, states } = data;
            setState((prev) => {
              const memberExists = prev.members.some(m => m.id === user_id_updated);
              const newMembers = memberExists ? prev.members.map(member => member.id === user_id_updated ? profile : member) : [...prev.members, profile];
              const newState: BAPTenderState = { ...prev, self: prev.self.id === user_id_updated ? profile : prev.self, members: newMembers, drinks: { ...prev.drinks, [user_id_updated]: drinks }, states: { ...prev.states, [user_id_updated]: states } };
              return newState;
            });
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error, "Raw data:", event.data);
        }
      };

      es.onerror = (err) => {
        // We no longer trigger reconnection here, we let the lifecycle events handle it.
        // This is now purely for logging unexpected errors during an active connection.
        console.error("SSE error on active stream:", err);
      };

    } catch (error) {
      console.error("Failed to initialize BAPTender context:", error);
    } finally {
      // Allow new connection attempts once this one has finished (or failed).
      isConnectingRef.current = false;
    }
  }, [token]);

  // Initial setup effect
  useEffect(() => {
    if (token) {
        initializeConnection();
    }
    return () => {
        eventSourceRef.current?.close();
    };
  }, [initializeConnection, token]);


  // Effect for handling browser lifecycle events to ensure reconnection
  useEffect(() => {
    // Fires when the tab becomes visible again
    const handleVisibilityChange = () => {
      // If the tab is now visible, we assume the connection might be stale and reconnect.
      if (document.visibilityState === 'visible') {
        console.log("LIFECYCLE: Tab is now visible. Re-initializing connection to be safe.");
        initializeConnection();
      }
    };

    // Fires when a page is restored from the Back/Forward Cache (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      // event.persisted is true if the page was restored from bfcache
      if (event.persisted) {
        console.log("LIFECYCLE: Page restored from bfcache. Connection is dead. Re-initializing.");
        initializeConnection();
      }
    };

    console.log("LIFECYCLE: Adding visibilitychange and pageshow event listeners.");
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    // Cleanup listeners on unmount
    return () => {
      console.log("LIFECYCLE: Removing visibilitychange and pageshow event listeners.");
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [initializeConnection]);


  return (
    <BAPTenderContext.Provider value={{ state, rawMessage }}>
      {children}
    </BAPTenderContext.Provider>
  );
}