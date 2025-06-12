"use client";

import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  MutableRefObject,
} from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { useBAPTender } from "@/context/BAPTenderContext";

ChartJS.register(
  TimeScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

// Types (as previously defined)
type DataPoint = { x: number; y: number };
type CustomDataset = {
  label: string;
  data: DataPoint[];
  borderColor: string;
  backgroundColor: string;
  fill: boolean | string;
  tension: number;
  pointRadius?: number;
  pointBackgroundColor?: string;
  borderWidth?: number;
};

// HELPER FUNCTION: Get theme colors from CSS variables
const getThemeColorsFromCSS = (): {
  primary: string;
  accent: string;
  text: string;
  cardBg: string;
} => {
  if (typeof window === "undefined") {
    return {
      primary: "#007bff",
      accent: "#6c757d",
      text: "#212529",
      cardBg: "#ffffff",
    };
  }
  const styles = getComputedStyle(document.documentElement);
  return {
    primary: styles.getPropertyValue("--primary-color").trim() || "#007bff",
    accent: styles.getPropertyValue("--accent-color").trim() || "#6c757d",
    text: styles.getPropertyValue("--text-color").trim() || "#212529",
    cardBg:
      styles.getPropertyValue("--card-bg").trim() || "rgba(255,255,255,0.85)",
  };
};

// HELPER FUNCTION: Theme-aware color cycling
const themeColorCycle = (
  index: number,
  themeColors: { primary: string; accent: string },
): string => {
  const colors = [
    themeColors.primary,
    themeColors.accent,
    "#4BC0C0",
    "#FFB347",
    "#9B59B6",
    "#3498DB",
  ];
  return colors[index % colors.length];
};

// HELPER FUNCTION: Calculate and APPLY X-axis padding
// Defined here at module level, before the component that uses it.
const applyXPaddedRange = (
  chart: ChartJS | null,
  datasets: CustomDataset[],
  currentTime: number,
  rangeRef?: React.MutableRefObject<{ min: number | undefined; max: number | undefined }>,
) => {
  if (!chart || !chart.options.scales?.x) {
    // console.warn("applyXPaddedRange: Chart or x-axis not ready.");
    return;
  }

  const allTimes = datasets.flatMap((ds) => ds.data.map((p) => p.x));
  let minVal: number, maxVal: number;

  if (allTimes.length === 0) {
    const defaultWindowMs = 3600000; // 1 hour
    const padMs = defaultWindowMs * 0.02;
    minVal = currentTime - defaultWindowMs / 2 - padMs;
    maxVal = currentTime + defaultWindowMs / 2 + padMs;
  } else {
    const historicalMin = Math.min(...allTimes);
    const currentMaxPoint = Math.max(
      ...allTimes.filter((t) => t <= currentTime),
      historicalMin,
    );
    const currentMaxWithNow = Math.max(currentTime, currentMaxPoint);

    const range = currentMaxWithNow - historicalMin;
    const pad = range > 0 ? range * 0.02 : 2.5 * 60 * 1000; // Min 2.5 min padding

    minVal = historicalMin - pad;
    maxVal = currentMaxWithNow + pad;

    if (minVal >= maxVal) {
      minVal = currentMaxWithNow - 30 * 60 * 1000;
      maxVal = currentMaxWithNow + 30 * 60 * 1000;
    }
  }
  // Directly modify the chart's options for min and max
  chart.options.scales.x.min = minVal;
  chart.options.scales.x.max = maxVal;
  if (rangeRef) {
    rangeRef.current.min = minVal;
    rangeRef.current.max = maxVal;
  }
  // console.log(`applyXPaddedRange: Applied X-Range: ${minVal} to ${maxVal}`);
};

interface GraphProps {
  currentThemeName: string;
}

export default function Graph({ currentThemeName }: GraphProps) {
  const { state } = useBAPTender();
  const chartRef = useRef<ChartJS<"line", DataPoint[], string> | null>(null);
  const chartDataRef = useRef<CustomDataset[]>([]);
  const xRangeRef = useRef<{ min: number | undefined; max: number | undefined }>({
    min: undefined,
    max: undefined,
  });

  const currentThemeColors = useMemo(
    () => getThemeColorsFromCSS(),
    [currentThemeName],
  );

  const buildSeriesData = useCallback((): CustomDataset[] => {
    const now = Date.now();
    const newDatasets: CustomDataset[] = [];
    let colorIndex = 0;

    for (const uid in state.states) {
      const points = state.states[uid];
      if (!points || points.length === 0) continue;

      let filtered = points;
      if (points.length > 1 && points[points.length - 1].bac === 0) {
        filtered = points.slice(0, -1);
      }
      if (filtered.length === 0 && points.length > 0) {
        filtered = [points[0]];
      } else if (filtered.length === 0) {
        continue;
      }

      const historical = filtered.map((p: any) => ({
        x: new Date(p.time).getTime(),
        y: parseFloat(p.bac) || 0,
      }));

      const lastHistPointForCalc =
        historical.length > 0
          ? historical[historical.length - 1]
          : { x: now, y: 0 };
      const hoursElapsed = Math.max(
        0,
        (now - lastHistPointForCalc.x) / 3600000,
      );
      const realTimeBAC = Math.max(
        0,
        lastHistPointForCalc.y - 0.015 * hoursElapsed,
      );

      const currentDataPoints = historical.length > 0 ? [...historical] : [];
      currentDataPoints.push({ x: now, y: realTimeBAC });
      currentDataPoints.sort((a, b) => a.x - b.x);

      const member = state.members.find((m: any) => m.id === uid);
      const label = member?.displayName || uid;
      const color = themeColorCycle(colorIndex++, currentThemeColors);

      newDatasets.push({
        label,
        data: currentDataPoints,
        borderColor: color,
        backgroundColor: `${color}33`,
        fill: "start",
        tension: 0.3,
        pointRadius: 2,
        pointBackgroundColor: color,
        borderWidth: 1.5,
      });
    }
    if (newDatasets.length === 0) {
      newDatasets.push({
        label: "BAC",
        data: [{ x: now, y: 0 }],
        borderColor: currentThemeColors.primary,
        backgroundColor: `${currentThemeColors.primary}33`,
        fill: "start",
        tension: 0.3,
        pointRadius: 2,
        pointBackgroundColor: currentThemeColors.primary,
        borderWidth: 1.5,
      });
    }
    return newDatasets;
  }, [state.states, state.members, currentThemeColors]);

  const options = useMemo(
    (): ChartOptions<"line"> => ({
      scales: {
        x: {
          type: "time",
          time: {
            unit: "minute",
            tooltipFormat: "HH:mm, MMM d",
            displayFormats: { minute: "HH:mm", hour: "HH:mm" },
          },
          min: xRangeRef.current.min,
          max: xRangeRef.current.max,
          title: {
            display: true,
            text: "Time",
            color: currentThemeColors.text,
          },
          ticks: {
            color: currentThemeColors.text,
            major: { enabled: true },
            source: "auto",
          },
          grid: {
            color: `${currentThemeColors.text}20`,
            borderColor: `${currentThemeColors.text}33`,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "BAC (%)",
            color: currentThemeColors.text,
          },
          ticks: { color: currentThemeColors.text, precision: 3 },
          grid: {
            color: `${currentThemeColors.text}20`,
            borderColor: `${currentThemeColors.text}33`,
          },
        },
      },
      plugins: {
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: currentThemeColors.cardBg,
          titleColor: currentThemeColors.text,
          bodyColor: currentThemeColors.text,
          borderColor: currentThemeColors.accent,
          borderWidth: 1,
          padding: 10,
        },
        legend: {
          display: true,
          position: "top",
          labels: {
            color: currentThemeColors.text,
            font: { family: "'Share Tech Mono', monospace", size: 12 },
          },
        },
      },
      animation: { duration: 600, easing: "easeInOutQuad" },
      responsive: true,
      maintainAspectRatio: false,
    }),
    [currentThemeColors],
  );

  useEffect(() => {
    if (!chartRef.current) return;
    // console.log("Graph: Initializing chart and applying first padding.");
    const initialDatasets = buildSeriesData();
    chartDataRef.current = initialDatasets;

    // Apply options which include themed colors BEFORE first data and range setting
    chartRef.current.options = options;

    applyXPaddedRange(chartRef.current, initialDatasets, Date.now(), xRangeRef);
    chartRef.current.data.datasets = initialDatasets;
    chartRef.current.update("none");
  }, []); // Run once on mount

  const prevThemeRef = useRef(currentThemeName);

  useEffect(() => {
    if (!chartRef.current) return;
    const freshData = buildSeriesData();
    const existing = chartRef.current.data.datasets as CustomDataset[];
    const themeChanged = prevThemeRef.current !== currentThemeName;
    prevThemeRef.current = currentThemeName;

    const existingMap = new Map(existing.map((ds) => [ds.label, ds]));
    const updatedDatasets: CustomDataset[] = [];

    for (const newDs of freshData) {
      const match = existingMap.get(newDs.label);
      if (match) {
        match.data = newDs.data;
        match.borderColor = newDs.borderColor;
        match.backgroundColor = newDs.backgroundColor;
        match.fill = newDs.fill;
        match.tension = newDs.tension;
        match.pointRadius = newDs.pointRadius;
        match.pointBackgroundColor = newDs.pointBackgroundColor;
        match.borderWidth = newDs.borderWidth;
        updatedDatasets.push(match);
        existingMap.delete(newDs.label);
      } else {
        updatedDatasets.push(newDs);
      }
    }

    chartDataRef.current = updatedDatasets;
    chartRef.current.data.datasets = updatedDatasets;
    applyXPaddedRange(chartRef.current, updatedDatasets, Date.now(), xRangeRef);
    // Skip animation if we only changed theme-related properties
    chartRef.current.update(themeChanged ? "none" : undefined);
  }, [state, buildSeriesData, currentThemeName]);

  useEffect(() => {
    const frameInterval = 1000 / 30;
    let lastFrame = performance.now();
    let animId: number;

    const frame = (timestamp: number) => {
      if (
        chartRef.current &&
        chartRef.current.data &&
        chartRef.current.data.datasets &&
        timestamp - lastFrame >= frameInterval
      ) {
        const now = Date.now();
        chartRef.current.data.datasets.forEach((ds: any) => {
          if (!ds.data || ds.data.length === 0) return;
          const currentNowPoint = ds.data[ds.data.length - 1];
          const lastHistPoint =
            ds.data.length > 1 ? ds.data[ds.data.length - 2] : currentNowPoint;
          const hoursElapsed = Math.max(0, (now - lastHistPoint.x) / 3600000);
          const newBAC = Math.max(0, lastHistPoint.y - 0.015 * hoursElapsed);

          currentNowPoint.x = now;
          currentNowPoint.y = newBAC;

          if (
            newBAC <= 0 &&
            lastHistPoint.y <= 0 &&
            now - lastHistPoint.x > 10 * 60 * 1000
          ) {
            currentNowPoint.y = 0;
          }
        });

        applyXPaddedRange(
          chartRef.current,
          chartRef.current.data.datasets as CustomDataset[],
          now,
          xRangeRef,
        );
        chartRef.current.update("none");
        lastFrame = timestamp;
      }
      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, []);

  // This useEffect specifically handles theme changes affecting options (like axis colors)
  // and ensures padding is re-applied correctly *after* new options are set.
  useEffect(() => {
    if (chartRef.current) {
      // console.log("Graph: Theme changed (options object updated), re-applying options and padding.");
      chartRef.current.options = options; // Apply new themed options
      applyXPaddedRange(
        chartRef.current,
        chartDataRef.current,
        Date.now(),
        xRangeRef,
      ); // Re-apply padding
      chartRef.current.update("none"); // Update to reflect changes
    }
  }, [options]); // `options` itself depends on `currentThemeName` via `currentThemeColors`

  return (
    <div className="w-full h-72 md:h-80 lg:h-96 chartjs-graph-container">
      <Line
        ref={chartRef as any}
        options={options}
        data={{ datasets: chartDataRef.current }}
      />
    </div>
  );
}
