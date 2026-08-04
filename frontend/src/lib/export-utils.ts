import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToCSV = (filename: string, headers: string[], data: any[][]) => {
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (filename: string, headers: string[], data: any[][]) => {
  const wsData = [headers, ...data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (filename: string, title: string, headers: string[], data: any[][]) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [headers],
    body: data,
    theme: "striped",
    headStyles: { fillColor: [66, 135, 245] },
  });

  doc.save(`${filename}.pdf`);
};
