"use client";

import React from "react";
import { useBAPTender } from "@/context/BAPTenderContext";

export default function UserBACStatusTable() {
  const { state } = useBAPTender();
  const now = Date.now();

  const tableData = Object.keys(state.states).map((uid) => {
    const points = state.states[uid];
    if (!points || points.length === 0) {
      return { uid, currentBac: 0, sobrietyTime: 0 };
    }

    const lastPoint = points[points.length - 1];
    const hoursElapsed = (now - lastPoint.time) / (1000 * 60 * 60);
    const currentBac = Math.max(0, lastPoint.bac - 0.015 * hoursElapsed);
    const sobrietyTimeMinutes = Math.round((currentBac / 0.015) * 60);

    return {
      uid,
      currentBac: currentBac.toFixed(3),
      sobrietyTime: sobrietyTimeMinutes,
    };
  });

  return (
    <div className="w-full overflow-x-auto">
      <h2 className="text-lg font-semibold mb-4">User BAC Status</h2>
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-left">User</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Current BAC</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Time to Sobriety (min)</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.uid}>
              <td className="border border-gray-300 px-4 py-2">{row.uid}</td>
              <td className="border border-gray-300 px-4 py-2">{row.currentBac}</td>
              <td className="border border-gray-300 px-4 py-2">{row.sobrietyTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
