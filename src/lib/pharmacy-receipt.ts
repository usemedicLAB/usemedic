import { jsPDF } from "jspdf";

export type ReceiptOrder = {
  ref: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  paid_at?: string | null;
  payment_ref?: string | null;
  created_at: string;
  patient_name?: string | null;
  patient_email?: string | null;
  items: { name: string; quantity: number; unit_price: number }[];
};

const naira = (n: number) => `NGN ${Number(n).toLocaleString()}`;

export function downloadPharmacyReceipt(o: ReceiptOrder) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 48;

  // Header bar
  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, W, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Medic Pharmacy", 40, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Order Receipt", 40, 58);

  doc.setFontSize(10);
  doc.text(`#${o.ref}`, W - 40, 38, { align: "right" });
  doc.text(new Date(o.created_at).toLocaleString(), W - 40, 54, { align: "right" });

  y = 110;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Billed to", 40, y);
  doc.text("Payment", W / 2, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 16;
  doc.text(o.patient_name || "Customer", 40, y);
  doc.text(`Reference: ${o.payment_ref || "—"}`, W / 2, y);
  y += 14;
  if (o.patient_email) doc.text(o.patient_email, 40, y);
  doc.text(`Status: ${o.paid_at ? "PAID" : "PENDING"}`, W / 2, y);
  y += 14;
  doc.text(`Provider: Paystack`, W / 2, y);

  y += 24;
  doc.setFont("helvetica", "bold");
  doc.text("Delivery address", 40, y);
  doc.setFont("helvetica", "normal");
  y += 14;
  const addrLines = doc.splitTextToSize(o.delivery_address, W - 80);
  doc.text(addrLines, 40, y);
  y += addrLines.length * 12 + 10;

  // Items table
  doc.setFillColor(245, 247, 250);
  doc.rect(40, y, W - 80, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Item", 50, y + 15);
  doc.text("Qty", W - 220, y + 15);
  doc.text("Unit", W - 160, y + 15);
  doc.text("Total", W - 50, y + 15, { align: "right" });
  y += 30;

  doc.setFont("helvetica", "normal");
  o.items.forEach((it) => {
    if (y > 740) { doc.addPage(); y = 60; }
    const lineTotal = it.quantity * it.unit_price;
    const nameLines = doc.splitTextToSize(it.name, W - 280);
    doc.text(nameLines, 50, y);
    doc.text(String(it.quantity), W - 220, y);
    doc.text(naira(it.unit_price), W - 160, y);
    doc.text(naira(lineTotal), W - 50, y, { align: "right" });
    y += Math.max(14, nameLines.length * 12) + 4;
  });

  y += 10;
  doc.setDrawColor(220, 224, 230);
  doc.line(40, y, W - 40, y);
  y += 18;

  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 10);
    doc.text(label, W - 200, y);
    doc.text(value, W - 50, y, { align: "right" });
    y += bold ? 20 : 16;
  };
  row("Subtotal", naira(o.subtotal));
  row("Delivery", naira(o.delivery_fee));
  row("Total", naira(o.total), true);

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for shopping with Medic Pharmacy.", 40, 800);
  doc.text("Questions? support@usemedic.app", 40, 814);

  doc.save(`Medic-Receipt-${o.ref}.pdf`);
}
