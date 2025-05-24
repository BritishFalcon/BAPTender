"use client";

import React, { useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { useBAPTender } from "@/context/BAPTenderContext";

ChartJS.register(TimeScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

type DataPoint = { x: number; y: number };
type CustomDataset = {
  label: string;
  data: DataPoint[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  tension: number;
};

function generateColorFromString(str: string): string {
  if (!str) return "#000000";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).slice(-2);
  }
  return color;
}

export default function Graph() {
  const { state } = useBAPTender();
  const chartRef = useRef<ChartJS | null>(null);

  // We'll keep a local reference to the "plotted data" so we can detect new points
  // and only animate when there's truly new data.
  const chartDataRef = useRef<CustomDataset[]>([]);

  // Build fresh data from state (without worrying about real-time point yet).
  // This is the "historical" data plus a real-time point appended.
  function buildSeriesData(): CustomDataset[] {
    const now = Date.now();
    const newDatasets: CustomDataset[] = [];

    for (const uid in state.states) {
      const points = state.states[uid];
      if (!points || points.length === 0) continue;

      // Drop final point if it's BAC=0
      let filtered = points;
      if (points[points.length - 1].bac === 0) {
        filtered = points.slice(0, -1);
      }
      if (filtered.length === 0) continue;

      // Convert to DataPoint
      const historical = filtered.map((p: any) => ({
        x: Date.parse(p.time),
        y: p.bac,
      }));

      // Append a real-time point: (last BAC) - (0.015 * hoursElapsed)
      const lastHist = historical[historical.length - 1];
      const hoursElapsed = (now - lastHist.x) / (3600000); // hours
      const realTimeBAC = Math.max(0, lastHist.y - 0.015 * hoursElapsed);
      const fullData = [...historical, { x: now, y: realTimeBAC }];

      // Grab a display name
      const member = state.members.find((m: any) => m.id === uid);
      if (!member) continue;
      const label = member.display_name || uid;

      newDatasets.push({
        label,
        data: fullData,
        borderColor: generateColorFromString(label),
        backgroundColor: generateColorFromString(label),
        fill: false,
        tension: 0.3,
      });
    }
    return newDatasets;
  }

  // Chart.js options: we keep animations on, but we only trigger them
  // when truly new data arrives (see the "detect-new-data" effect).
  const options = {
    scales: {
      x: {
        type: "time" as const,
        time: { unit: "minute" },
        title: { display: true, text: "Time" },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "BAC" },
      },
    },
    plugins: {
      tooltip: { mode: "nearest" as const, intersect: false },
      legend: { display: true },
    },
    animation: {
      duration: 600, // a bit over half a second
      easing: "easeInOutQuad",
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  // On first mount, set up the chart data with an animation (the "initial load" animation).
  useEffect(() => {
    if (!chartRef.current) return;
    const initialData = buildSeriesData();
    chartDataRef.current = initialData;
    chartRef.current.data.datasets = initialData;
    chartRef.current.update();
  }, []);

  // #1. DETECT NEW DATA effect:
  // Whenever 'state' changes, we check if new data points or new lines have appeared.
  // If so, we do a normal update() to animate them in. If not, do a quick update w/ no animation.
  useEffect(() => {
    if (!chartRef.current) return;
    const freshData = buildSeriesData();

    const oldData = chartDataRef.current;
    let foundNewPoint = false;

    // Create a map from label -> dataset for easier diffing
    const oldMap = new Map<string, CustomDataset>();
    oldData.forEach((ds) => oldMap.set(ds.label, ds));

    // We'll produce the final array of datasets:
    const finalDatasets: CustomDataset[] = [];

    // Check each new dataset
    for (const newDS of freshData) {
      const oldDS = oldMap.get(newDS.label);
      if (!oldDS) {
        // brand new dataset => definitely animate
        foundNewPoint = true;
        finalDatasets.push(newDS);
      } else {
        // same dataset (by label): see if there's an extra data point
        if (newDS.data.length > oldDS.data.length) {
          foundNewPoint = true;
        }
        finalDatasets.push(newDS);
      }
      // remove it from oldMap so we know it's matched
      oldMap.delete(newDS.label);
    }

    // If there's leftover old datasets, that means they've disappeared
    // from new data. Let's remove them from the graph.
    // This might or might not require an animation.
    // We'll just do it—it's a "change" so let's animate.
    if (oldMap.size > 0) {
      foundNewPoint = true; // because something was removed
    }

    // Final result
    chartDataRef.current = finalDatasets;
    chartRef.current.data.datasets = finalDatasets;

    // If no new point, do an update with no animation
    // If new point(s)/dataset(s), let normal update animate
    if (foundNewPoint) {
      chartRef.current.update();
    } else {
      // update instantly, no animation
      chartRef.current.update("none");
    }
  }, [state]);

  // #2. REALTIME TICKER:
  // We'll continuously recalc & update ONLY the last point of each dataset
  // with no animation, so it appears real-time.
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!chartRef.current) return;
      const now = Date.now();

      // for each dataset in chartDataRef, recalc the final point
      for (const ds of chartDataRef.current) {
        if (ds.data.length < 2) continue;
        const lastHistPoint = ds.data[ds.data.length - 2]; // the "real" historical point
        const realTimePoint = ds.data[ds.data.length - 1]; // the appended real-time point

        const hoursElapsed = (now - lastHistPoint.x) / 3600000;
        const newBAC = lastHistPoint.y - 0.015 * hoursElapsed;

        if (newBAC < 0) {
          // If BAC is negative, we need to remove the user from the graph

          // Remove the dataset from chartDataRef and chartRef
          chartDataRef.current = chartDataRef.current.filter((d) => d.label !== ds.label);
          chartRef.current.data.datasets = chartDataRef.current;

          chartRef.current.update("none");
          return;
        }

        realTimePoint.x = now;
        realTimePoint.y = newBAC;
      }

      // Recompute min X and max X with a bit of padding
      const allTimes = chartDataRef.current.flatMap((ds) => ds.data.map((p) => p.x));
      if (allTimes.length > 0) {
        const historicalMin = Math.min(...allTimes);
        const range = now - historicalMin;
        const pad = range * 0.05;
        chartRef.current.options.scales!.x!.min = historicalMin - pad;
        chartRef.current.options.scales!.x!.max = now + pad;
      }

      // do an update with no animation, so it smoothly shifts
      chartRef.current.update("none");
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="p-4 bg-orange-100 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-orange-800 mb-4">Real-time BAC Graph</h2>
      <div className="w-full h-72">
        <Line
          ref={(ref) => {
            if (ref) {
              chartRef.current = (ref as any).chartInstance || ref;
            }
          }}
          options={options}
          data={{ datasets: chartDataRef.current }}
        />
      </div>
    </div>
  );
}
