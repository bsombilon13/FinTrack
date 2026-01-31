
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { DashboardData, FinancialEntry, TransactionStatus } from "../types";

// The jsPDF autotable plugin augments the jsPDF class at runtime.
// Using 'any' for the document instance is a robust way to handle plugin-added methods
// and avoid complex TypeScript declaration issues common with jsPDF and its plugins.

export const generateFinancialReport = async (data: DashboardData, stats: any, forecast: any[]) => {
  // Use 'any' to bypass strict type checking for augmented methods and ensure visibility of base jsPDF methods.
  const doc = new jsPDF() as any;
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const primaryColor = [99, 102, 241]; // Indigo-600

  // 1. BRAND HEADER
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("FinTrack Pro Report", 15, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on ${dateStr}`, 15, 33);
  doc.text("Proprietary Financial Strategy Dashboard", 140, 33);

  // 2. EXECUTIVE SUMMARY
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 15, 55);

  const summaryData = [
    ["Metric", "Value", "Notes"],
    ["Deployable Funds", `PHP ${stats.deployableFunds.toLocaleString()}`, "True liquid spending power"],
    ["Monthly Overhead", `PHP ${stats.totalMonthlyCommitments.toLocaleString()}`, "Total monthly capital drain"],
    ["Safety Factor", `${stats.safetyFactorValue.toFixed(0)}%`, `Covers ${ (stats.safetyFactorValue / 100).toFixed(1) } months of needs`],
    ["Total Debt", `PHP ${stats.totalDebtBalanceValue.toLocaleString()}`, "Aggregate active liabilities"],
    ["Vault Savings", `PHP ${stats.vaultSavings.toLocaleString()}`, "Secured reserve assets"]
  ];

  doc.autoTable({
    startY: 65,
    head: [summaryData[0]],
    body: summaryData.slice(1),
    theme: 'striped',
    headStyles: { fillColor: primaryColor },
    margin: { left: 15, right: 15 }
  });

  // 3. ASSET INVENTORY
  const startAssets = doc.lastAutoTable.finalY + 15;
  doc.text("Asset Inventory", 15, startAssets);

  const assetRows: any[] = [];
  data.accountBalances.forEach(e => assetRows.push(["Liquid Cash", e.label, `PHP ${e.amount.toLocaleString()}`, "Available"]));
  data.savingsAccounts.forEach(e => assetRows.push(["Vault Savings", e.label, `PHP ${e.amount.toLocaleString()}`, "Reserved"]));
  data.receivables.forEach(e => assetRows.push(["Receivable", e.label, `PHP ${e.amount.toLocaleString()}`, e.status || "Pending"]));

  doc.autoTable({
    startY: startAssets + 8,
    head: [["Category", "Label", "Amount", "Status"]],
    body: assetRows,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] },
    margin: { left: 15, right: 15 }
  });

  // 4. MONTHLY OBLIGATIONS
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Monthly Obligations Matrix", 15, 20);

  const obligationRows: any[] = [];
  const mapEntries = (entries: FinancialEntry[], cat: string) => {
    entries.forEach(e => obligationRows.push([cat, e.label, `PHP ${e.amount.toLocaleString()}`, e.status || TransactionStatus.UNPAID]));
  };

  mapEntries(data.loans, "Debt/Loans");
  mapEntries(data.utilities, "Utilities");
  mapEntries(data.mandatories, "Mandatory");
  mapEntries(data.subscriptions, "Subscriptions");
  mapEntries(data.plans, "Plans");
  mapEntries(data.savingsContribution, "Savings Goals");
  mapEntries(data.otherExpenses, "Other Expenses");

  doc.autoTable({
    startY: 30,
    head: [["Category", "Item", "Amount", "Status"]],
    body: obligationRows,
    theme: 'grid',
    headStyles: { fillColor: [225, 29, 72] }, // Rose-600
    margin: { left: 15, right: 15 }
  });

  // 5. 6-MONTH CASH FLOW FORECAST
  const startForecast = doc.lastAutoTable.finalY + 20;
  doc.text("6-Month Strategic Forecast", 15, startForecast);

  const forecastRows = forecast.map(f => [
    f.name, 
    `PHP ${f.inflow.toLocaleString()}`, 
    `PHP ${f.outflow.toLocaleString()}`, 
    `PHP ${f.net.toLocaleString()}`, 
    `PHP ${f.balance.toLocaleString()}`
  ]);

  doc.autoTable({
    startY: startForecast + 8,
    head: [["Month", "Est. Inflow", "Est. Outflow", "Net Change", "Projected Balance"]],
    body: forecastRows,
    theme: 'striped',
    headStyles: { fillColor: [124, 58, 237] }, // Violet-600
    margin: { left: 15, right: 15 }
  });

  // FOOTER ON ALL PAGES
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount} - FinTrack Pro Confidential`, 15, 287);
  }

  doc.save(`FinTrack_Pro_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};
