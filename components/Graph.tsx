"use client";

import React, { useEffect, useRef } from "react";
import { useBAPTender } from "@/context/BAPTenderContext";

// Declare jQuery on window for TS
declare global {
  interface Window {
    $: any;
  }
}

// Define a type for your data point (assuming time is in ms)
type DataPoint = { x: number; y: number };

export default function Graph() {
  const { state } = useBAPTender();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const epochChartRef = useRef<any>(null);

  // Initialize the Epoch chart once when the component mounts
  useEffect(() => {
    if (!chartContainerRef.current) return;
    // Ensure that jQuery and epoch.min.js are loaded and attached properly.
    epochChartRef.current = window.$(chartContainerRef.current).epoch({
      type: "time.line",
      data: [],
      axes: ["left", "bottom"],
      // Optional: add a custom theme using orange palette (if Epoch supports theme options)
      // You might need to check Epoch's docs for theme overrides.
    });
  }, []);

  // Build series data from state
  function buildSeriesData() {
    const now = Date.now();
    const series: Array<{ label: string; values: DataPoint[] }> = [];

    // Loop through each user's state in state.states
    for (const uid in state.states) {
      const points = state.states[uid];
      if (!points || points.length === 0) continue;

      // Ignore final state if sober (bac = 0)
      let filtered = points;
      if (points[points.length - 1].bac === 0) {
        filtered = points.slice(0, -1);
      }
      if (filtered.length === 0) continue;

      // Map historical points
      const values: DataPoint[] = filtered.map((p: any) => ({
        x: p.time,
        y: p.bac,
      }));

      // Compute "current" BAC from last point
      const lastPoint = values[values.length - 1];
      const hoursElapsed = (now - lastPoint.x) / (1000 * 60 * 60);
      const currentBac = Math.max(0, lastPoint.y - 0.015 * hoursElapsed);
      values.push({ x: now, y: currentBac });

      series.push({ label: uid, values });
    }
    return series;
  }

  // Use requestAnimationFrame for smooth continuous updates
  useEffect(() => {
    let animationFrameId: number;
    function updateChart() {
      if (epochChartRef.current) {
        const seriesData = buildSeriesData();
        console.log("Updating chart with series:", seriesData);
        epochChartRef.current.update(seriesData);
      }
      animationFrameId = requestAnimationFrame(updateChart);
    }
    animationFrameId = requestAnimationFrame(updateChart);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state]);

  return (
    <div className="p-4 bg-orange-100 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-orange-800 mb-4">Real-time BAC Graph</h2>
      <div ref={chartContainerRef} className="w-full h-72"></div>
    </div>
  );
}
