import type { ReportData, Table } from "@/lib/report";

const MARGIN = 40;
const PAGE_W = 595;
const PAGE_H = 842;
const ACCENT = "#6366f1";

const COLORS = {
  habits: "#8b5cf6",
  sport: "#10b981",
  mood: "#f59e0b",
  nutrition: "#f97316",
  weight: "#a855f7",
};

/** jsPDF's built-in fonts only cover Latin-1: drop emoji and other glyphs it cannot draw. */
function clean(text: string) {
  return text
    .replace(/[^\u0020-\u007E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u20AC]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function downloadReportPdf(data: ReportData) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 0;

  // ---------- Header band ----------
  doc.setFillColor(...hexToRgb(ACCENT));
  doc.rect(0, 0, PAGE_W, 92, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("track.perso", MARGIN, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(clean(`Bilan ${data.mode === "year" ? "annuel" : "mensuel"} - ${data.periodLabel}`), MARGIN, 66);
  doc.setFontSize(9);
  doc.text(clean(data.userName), PAGE_W - MARGIN, 44, { align: "right" });
  doc.text(clean(`Généré le ${data.generatedAt}`), PAGE_W - MARGIN, 60, { align: "right" });
  y = 118;

  // ---------- KPI boxes ----------
  const gap = 10;
  const boxW = (PAGE_W - MARGIN * 2 - gap * 3) / 4;
  data.kpis.forEach((k, i) => {
    const x = MARGIN + i * (boxW + gap);
    const [r, g, b] = hexToRgb(k.color);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(1.2);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, boxW, 56, 8, 8, "FD");
    doc.setTextColor(110, 110, 125);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(clean(k.label), x + 10, y + 18);
    doc.setTextColor(r, g, b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(clean(k.value), x + 10, y + 42);
  });
  y += 56 + 26;

  // ---------- Helpers ----------
  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - 50) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function heading(title: string, color: string) {
    ensureSpace(70);
    const [r, g, b] = hexToRgb(color);
    doc.setFillColor(r, g, b);
    doc.roundedRect(MARGIN, y, 4, 18, 2, 2, "F");
    doc.setTextColor(r, g, b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(clean(title), MARGIN + 12, y + 14);
    y += 28;
  }

  function subheading(text: string) {
    ensureSpace(50);
    doc.setTextColor(90, 90, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(clean(text), MARGIN, y + 8);
    y += 14;
  }

  function note(text: string) {
    ensureSpace(30);
    doc.setTextColor(120, 120, 135);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(clean(text), MARGIN, y + 8);
    y += 20;
  }

  function drawTable(table: Table, color: string, opts: { numericFrom?: number } = {}) {
    let endY = y;
    const numericFrom = opts.numericFrom ?? 1;
    const columnStyles: Record<number, { halign: "right" }> = {};
    table.head.forEach((_, i) => {
      if (i >= numericFrom) columnStyles[i] = { halign: "right" };
    });
    autoTable(doc, {
      startY: y,
      head: [table.head.map(clean)],
      body: table.rows.map((row) => row.map(clean)),
      margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 50 },
      theme: "striped",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4, textColor: [40, 40, 55] },
      headStyles: { fillColor: hexToRgb(color), textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 247, 252] },
      columnStyles,
      didDrawPage: (hook) => {
        endY = hook.cursor?.y ?? endY;
      },
    });
    y = endY + 16;
  }

  function summary(rows: string[][], color: string) {
    if (rows.length === 0) return;
    drawTable({ head: ["Indicateur", "Valeur"], rows }, color, { numericFrom: 1 });
  }

  // ---------- Sections ----------
  heading("Habitudes", COLORS.habits);
  if (data.habits.table) {
    note(data.habits.total);
    if (data.habits.monthly) {
      subheading("Évolution mois par mois");
      drawTable(data.habits.monthly, COLORS.habits);
    }
    subheading("Détail par habitude");
    drawTable(data.habits.table, COLORS.habits);
  } else {
    note("Aucune habitude prévue sur la période.");
  }

  heading("Sport et musculation", COLORS.sport);
  if (data.sport.sessions) {
    summary(data.sport.summary, COLORS.sport);
    subheading(data.mode === "year" ? "Séances mois par mois" : "Séances du mois");
    drawTable(data.sport.sessions, COLORS.sport, { numericFrom: data.mode === "year" ? 1 : 2 });
    if (data.sport.exercises) {
      subheading("Exercices (records de la période)");
      drawTable(data.sport.exercises, COLORS.sport, { numericFrom: 2 });
    }
    if (data.sport.muscles) {
      subheading("Répartition des séries par muscle");
      drawTable(data.sport.muscles, COLORS.sport);
    }
  } else {
    note("Aucune séance enregistrée sur la période.");
  }

  heading("Humeur", COLORS.mood);
  if (data.mood.table) {
    summary(data.mood.summary, COLORS.mood);
    drawTable(data.mood.table, COLORS.mood, { numericFrom: data.mode === "year" ? 1 : 1 });
  } else {
    note("Aucune humeur notée sur la période.");
  }

  heading("Nutrition", COLORS.nutrition);
  if (data.nutrition.table) {
    summary(data.nutrition.summary, COLORS.nutrition);
    subheading(data.mode === "year" ? "Moyennes mois par mois" : "Détail jour par jour");
    drawTable(data.nutrition.table, COLORS.nutrition);
  } else {
    note("Aucun repas enregistré sur la période.");
  }

  heading("Poids", COLORS.weight);
  if (data.weight.table) {
    summary(data.weight.summary, COLORS.weight);
    drawTable(data.weight.table, COLORS.weight);
  } else {
    note("Aucune pesée enregistrée sur la période.");
  }

  // ---------- Footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(225, 225, 235);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, PAGE_H - 34, PAGE_W - MARGIN, PAGE_H - 34);
    doc.setTextColor(140, 140, 155);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(clean(`track.perso - ${data.periodLabel}`), MARGIN, PAGE_H - 20);
    doc.text(`Page ${i} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 20, { align: "right" });
  }

  const slug = data.periodLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  doc.save(`track-perso-${slug}.pdf`);
}
