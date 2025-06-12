"use client";

import React from "react";
import { useBAPTender } from "@/context/BAPTenderContext";

export default function UserBACStatusTable() {
  const { state } = useBAPTender();
  const now = new Date(); // Use a Date object from the start

  const tableData = Object.keys(state.states)
    .map((uid) => {
      const user = state.members.find((m) => m.id === uid);
      const displayName = user ? user.displayName : uid;

      const points = state.states[uid];
      if (!points || points.length === 0) {
        return {
          uid,
          displayName,
          currentBac: "0.000",
          sobrietyTime: "Sober",
          isSelf: uid === state.self.id,
        };
      }

      const lastPoint = points[points.length - 1];
      const hoursElapsed =
        (now.getTime() - new Date(lastPoint.time).getTime()) / (1000 * 60 * 60);
      const currentBac = Math.max(0, lastPoint.bac - 0.015 * hoursElapsed);

      // 1. Calculate sobriety time in minutes, as before.
      const sobrietyTimeMinutes = Math.round((currentBac / 0.015) * 60);

      // 2. Calculate the future sobriety time as a Date object.
      const sobrietyDate = new Date(
        now.getTime() + sobrietyTimeMinutes * 60000,
      );

      // 3. Format the date into a nice, readable time string (e.g., "6:31 AM").
      // We only do this if they are not already sober.
      const sobrietyTimeString =
        currentBac > 0
          ? sobrietyDate.toLocaleTimeString(navigator.language, {
              hour: "numeric",
              minute: "2-digit",
            })
          : "Sober";

      return {
        uid,
        displayName,
        currentBac: currentBac.toFixed(3),
        // 4. Use our new time string in the data object.
        sobrietyTime: sobrietyTimeString,
        isSelf: uid === state.self.id,
      };
    })
    .sort((a, b) => parseFloat(b.currentBac) - parseFloat(a.currentBac)); // Sort by BAC descending

  return (
    <div className="responsive-table-container my-[var(--base-spacing)]">
      <table className="themed-table">
        <thead>
          <tr>
            <th scope="col">User</th>
            <th scope="col">Current BAC (%)</th>
            {/* 👇 5. Updated Header Text */}
            <th scope="col">Sober At</th>
          </tr>
        </thead>
        <tbody>
          {tableData.length > 0 ? (
            tableData.map((row) => (
              <tr
                key={row.uid}
                className={row.isSelf ? "font-bold" : ""}
                style={
                  row.isSelf
                    ? {
                        backgroundColor: "var(--primary-color)",
                        color: "var(--bg-color)",
                      }
                    : {}
                }
              >
                <td>{row.displayName}</td>
                <td>{row.currentBac}</td>
                {/* 👇 6. Render the new formatted time string */}
                <td>{row.sobrietyTime}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center py-4 font-sharetech">
                No active drinkers. How boring.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
