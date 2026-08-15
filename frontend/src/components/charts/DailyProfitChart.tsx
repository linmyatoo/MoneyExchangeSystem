"use client";

import ReactECharts from "echarts-for-react";
import { DailyProfitPoint } from "@/lib/api/dashboard";

interface Props {
  data: DailyProfitPoint[];
}

export function DailyProfitChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.85)",
      borderColor: "#334155",
      textStyle: { color: "#f8fafc" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((d) => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      axisLabel: {
        color: "#94a3b8",
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "#94a3b8",
        formatter: (value: number) => {
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
          if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
          return value;
        },
      },
      splitLine: {
        lineStyle: {
          color: "rgba(148, 163, 184, 0.15)",
        },
      },
    },
    series: [
      {
        name: "Profit",
        type: "line",
        smooth: true,
        data: data.map((d) => d.profit),
        itemStyle: {
          color: "#10b981", // Emerald 500
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16, 185, 129, 0.4)" },
              { offset: 1, color: "rgba(16, 185, 129, 0.0)" },
            ],
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px", width: "100%" }} />;
}
