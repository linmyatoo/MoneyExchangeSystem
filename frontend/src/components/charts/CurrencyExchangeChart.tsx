"use client";

import ReactECharts from "echarts-for-react";
import { CurrencyExchangePoint } from "@/lib/api/dashboard";

interface Props {
  data: CurrencyExchangePoint[];
}

export function CurrencyExchangeChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.85)",
      borderColor: "#334155",
      textStyle: { color: "#f8fafc" },
      valueFormatter: (value: any) => new Intl.NumberFormat("en-US").format(value ?? 0) + " ฿",
      axisPointer: {
        type: "shadow",
      },
    },
    legend: {
      data: ["THB Bought", "THB Sold"],
      bottom: "0%",
      textStyle: {
        color: "#94a3b8",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "10%",
      containLabel: true,
    },
    xAxis: [
      {
        type: "category",
        data: data.map((d) => {
          const date = new Date(d.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        axisLabel: {
          color: "#94a3b8",
        },
      },
    ],
    yAxis: [
      {
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
    ],
    series: [
      {
        name: "THB Bought",
        type: "bar",
        data: data.map((d) => d.thb_bought),
        itemStyle: {
          color: "#4f46e5", // Sapphire Indigo
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: "THB Sold",
        type: "bar",
        data: data.map((d) => d.thb_sold),
        itemStyle: {
          color: "#7c3aed", // Royal Violet
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px", width: "100%" }} />;
}
