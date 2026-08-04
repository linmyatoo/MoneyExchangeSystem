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
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      bottom: "0%",
      left: "center",
      textStyle: {
        color: "#6b7280",
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
