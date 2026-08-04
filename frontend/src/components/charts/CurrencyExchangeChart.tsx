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
      axisPointer: {
        type: "shadow",
      },
    },
    legend: {
      data: ["THB Bought", "THB Sold"],
      bottom: "0%",
      textStyle: {
        color: "#6b7280",
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
          color: "#6b7280",
        },
      },
    ],
    yAxis: [
      {
        type: "value",
        axisLabel: {
          color: "#6b7280",
          formatter: (value: number) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return value;
          },
        },
        splitLine: {
          lineStyle: {
            color: "#e5e7eb",
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
          color: "#3b82f6", // Blue 500
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: "THB Sold",
        type: "bar",
        data: data.map((d) => d.thb_sold),
        itemStyle: {
          color: "#a855f7", // Purple 500
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px", width: "100%" }} />;
}
