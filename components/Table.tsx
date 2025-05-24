"use client";

import React from "react";
import { useBAPTender } from "@/context/BAPTenderContext";

export default function UserBACStatusTable() {
  const { state } = useBAPTender();
  const now = Date.now();

  const tableData = Object.keys(state.states).map((uid) => {
    const user = state.members.find(m => m.id === uid);
    const displayName = user ? user.displayName : uid;

    const points = state.states[uid];
    if (!points || points.length === 0) {
      return { uid, displayName, currentBac: "0.000", sobrietyTime: 0, isSelf: uid === state.self.id };
    }

    const lastPoint = points[points.length - 1];
    const hoursElapsed = (now - new Date(lastPoint.time).getTime()) / (1000 * 60 * 60); // Ensure lastPoint.time is parsed as Date
    const currentBac = Math.max(0, lastPoint.bac - 0.015 * hoursElapsed);
    const sobrietyTimeMinutes = Math.round((currentBac / 0.015) * 60);

    return {
      uid,
      displayName,
      currentBac: currentBac.toFixed(3),
      sobrietyTime: currentBac > 0 ? sobrietyTimeMinutes : 0, // Show 0 if already sober
      isSelf: uid === state.self.id,
    };
  }).sort((a, b) => parseFloat(b.currentBac) - parseFloat(a.currentBac)); // Sort by BAC descending

  return (
    // Parent div in app/page.tsx has .themed-card and themed-card-header
    <div className="responsive-table-container mt-4">
      <table className="themed-table">
        <thead>
          <tr>
            <th scope="col">User</th>
            <th scope="col">Current BAC (%)</th>
            <th scope="col">Time to Sobriety (min)</th>
          </tr>
        </thead>
        <tbody>
          {tableData.length > 0 ? tableData.map((row) => (
            <tr key={row.uid} className={row.isSelf ? 'font-bold' : ''} style={row.isSelf ? {backgroundColor: 'var(--primary-color)', color: 'var(--bg-color)'} : {}}>
              <td>{row.displayName}</td>
              <td>{row.currentBac}</td>
              <td>{row.currentBac === "0.000" ? "Sober" : `${row.sobrietyTime} min`}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={3} className="text-center py-4 font-sharetech">No active drinkers. How boring.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}