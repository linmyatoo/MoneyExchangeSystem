"use client";

import ReactECharts from "echarts-for-react";
import { WalletUsagePoint } from "@/lib/api/dashboard";

interface Props {
  data: WalletUsagePoint[];
}

export function WalletUsageChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(15, 23, 42, 0.85)",
      borderColor: "#334155",
      textStyle: { color: "#f8fafc" },
      formatter: "{b}: {c} ({d}%)",
    },
    color: ["#4f46e5", "#7c3aed", "#10b981", "#d97706", "#f43f5e", "#06b6d4"],
    legend: {
      bottom: "0%",
      left: "center",
      textStyle: {
        color: "#94a3b8",
      },
    },
    series: [
      {
        name: "Wallet Usage",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 5,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          show: false,
          position: "center",
        },
        emphasis: {
          label: {
            show: true,
            fontSize: "14",
            fontWeight: "bold",
          },
        },
        labelLine: {
          show: false,
        },
        data: data.map((d) => ({
          value: d.amount,
          name: d.wallet_type,
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "300px", width: "100%" }} />;
}
