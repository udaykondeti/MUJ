#!/usr/bin/env python3
"""Generate the 2-3 page Project Overview PDF for the capstone submission."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, HRFlowable,
)
from reportlab.lib.enums import TA_LEFT

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "screenshots")
OUT = os.path.join(HERE, "Project_Overview.pdf")

NAVY = colors.HexColor("#10192e")
BLUE = colors.HexColor("#2563eb")
GREY = colors.HexColor("#667085")
LINE = colors.HexColor("#e5e9f2")

styles = getSampleStyleSheet()
def S(name, **kw):
    return ParagraphStyle(name, parent=styles["Normal"], **kw)

body = S("body", fontSize=10, leading=15, spaceAfter=6)
h1 = S("h1", fontSize=20, leading=24, textColor=NAVY, spaceAfter=2, fontName="Helvetica-Bold")
h2 = S("h2", fontSize=13, leading=17, textColor=BLUE, spaceBefore=10, spaceAfter=4, fontName="Helvetica-Bold")
sub = S("sub", fontSize=10, leading=14, textColor=GREY, spaceAfter=8)
small = S("small", fontSize=8.5, leading=11, textColor=GREY)
cap = S("cap", fontSize=8.5, leading=11, textColor=GREY, spaceBefore=2, spaceAfter=10)
bullet = S("bullet", fontSize=10, leading=14, leftIndent=10, spaceAfter=2, bulletIndent=0)

story = []

# ---- Header ----
story.append(Paragraph("ProcureWise", h1))
story.append(Paragraph("Vendor Comparison &amp; Procurement Assistant", sub))
story.append(HRFlowable(width="100%", color=LINE, spaceAfter=8))

meta = Table([
    ["Capstone topic", "04 — Vendor Comparison and Procurement Assistant"],
    ["Track", "Gen AI for Business"],
    ["Learner", "Uday Kiran Kondeti"],
    ["Repository", "github.com/udaykondeti/muj  ·  branch: claude/full-project-7yb6fd  ·  /Capstone"],
], colWidths=[32*mm, 138*mm])
meta.setStyle(TableStyle([
    ("FONT", (0,0), (-1,-1), "Helvetica", 9),
    ("FONT", (0,0), (0,-1), "Helvetica-Bold", 9),
    ("TEXTCOLOR", (0,0), (0,-1), NAVY),
    ("TEXTCOLOR", (1,0), (1,-1), colors.HexColor("#1a2233")),
    ("BOTTOMPADDING", (0,0), (-1,-1), 3),
    ("TOPPADDING", (0,0), (-1,-1), 3),
    ("LINEBELOW", (0,0), (-1,-2), 0.4, LINE),
]))
story.append(meta)
story.append(Spacer(1, 8))

# ---- Summary ----
story.append(Paragraph("Summary", h2))
story.append(Paragraph(
    "ProcureWise is a working web application that turns messy vendor quotations "
    "(arriving as emails, PDFs and spreadsheets) into a standardised, transparently "
    "scored comparison and a <b>human-approved</b> procurement recommendation. A "
    "deterministic engine handles the maths and compliance rules so every number is "
    "reproducible and auditable; generative AI (Anthropic Claude) reads the messy "
    "quotes, explains the recommendation in plain language, drafts vendor emails and "
    "answers procurement-policy questions. The system deliberately never places an "
    "order — a named human signs off every award.", body))

# ---- Problem ----
story.append(Paragraph("Problem / Opportunity", h2))
story.append(Paragraph(
    "Buyers compare inconsistent quotes by hand, miss compliance requirements such as "
    "security certification or warranty minimums, and rarely record <i>why</i> a vendor "
    "was chosen. The opportunity is to standardise quotes automatically, score them "
    "reproducibly against weighted criteria and policy, and keep an auditable, "
    "human-approved decision — cutting sourcing cycle time while improving transparency "
    "and governance.", body))

# ---- Solution overview ----
story.append(Paragraph("Solution overview — one working journey", h2))
for t in [
    "<b>Standardise:</b> paste any quote; AI extracts it into one comparable structure.",
    "<b>Score:</b> a deterministic engine normalises each criterion, applies the buyer's weights, computes Total Cost of Ownership and ranks vendors.",
    "<b>Gate on compliance:</b> a vendor failing a mandatory policy check (e.g. no ISO 27001) is never recommended, even if cheapest.",
    "<b>Explain:</b> AI writes a plain-language rationale from the scoring table.",
    "<b>Review &amp; decide:</b> a named human approves, overrides or rejects; the system cannot transact.",
    "<b>Communicate &amp; audit:</b> AI drafts clarification emails and grounded policy answers; every decision is logged and an exportable memo is produced.",
]:
    story.append(Paragraph(t, bullet, bulletText="•"))

story.append(PageBreak())

# ---- Page 2: AI vs deterministic ----
story.append(Paragraph("Where Gen AI adds value vs. deterministic logic", h2))
story.append(Paragraph(
    "This separation is deliberate. AI is used for language; the numbers, rules and the "
    "purchase decision are not left to AI.", sub))
tbl = Table([
    ["Concern", "Handled by"],
    ["Reading messy free-text quotes", "Gen AI (Claude)"],
    ["Explaining the recommendation", "Gen AI"],
    ["Drafting vendor clarification emails", "Gen AI"],
    ["Procurement-policy Q&A (grounded)", "Gen AI"],
    ["Normalisation, TCO, weighted score, ranking", "Deterministic engine"],
    ["Mandatory compliance gating", "Deterministic engine"],
    ["Placing an order / financial commitment", "Nobody — a human approves"],
], colWidths=[110*mm, 60*mm])
tbl.setStyle(TableStyle([
    ("FONT", (0,0), (-1,-1), "Helvetica", 9.5),
    ("FONT", (0,0), (-1,0), "Helvetica-Bold", 9.5),
    ("BACKGROUND", (0,0), (-1,0), NAVY),
    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f6fb")]),
    ("GRID", (0,0), (-1,-1), 0.4, LINE),
    ("TOPPADDING", (0,0), (-1,-1), 5),
    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ("TEXTCOLOR", (1,5), (1,6), BLUE),
    ("TEXTCOLOR", (1,7), (1,7), colors.HexColor("#b45309")),
]))
story.append(tbl)

story.append(Paragraph("Key deliverables", h2))
for t in [
    "Working application (zero-dependency Node.js server + vanilla single-page dashboard).",
    "Deterministic scoring engine with 16 passing unit tests (determinism, bounds, compliance gating).",
    "Gen AI module (Claude) with a deterministic fallback so the app runs with no API key.",
    "Automated Playwright walkthrough and 9 screenshots of the full journey.",
    "Exportable Markdown decision memo; architecture notes; this overview.",
]:
    story.append(Paragraph(t, bullet, bulletText="•"))

story.append(Paragraph("Business metrics the solution could improve", h2))
for t in [
    "<b>Sourcing cycle time</b> — hours of manual comparison reduced to minutes.",
    "<b>Realised savings</b> — quantified per award (4.9% under budget in the demo).",
    "<b>Compliance adherence</b> — mandatory checks are enforced, not optional.",
    "<b>Audit completeness</b> — 100% of awards carry a named approver and rationale.",
]:
    story.append(Paragraph(t, bullet, bulletText="•"))

story.append(Spacer(1, 6))
story.append(HRFlowable(width="100%", color=LINE, spaceAfter=6))
story.append(Paragraph(
    "Limitations: data is synthetic; production would need vendor master data, "
    "authentication, and a database. The system is decision-support only and cannot "
    "make purchases.", small))

story.append(PageBreak())

# ---- Page 3: screenshots ----
story.append(Paragraph("Screenshots", h2))
def shot(fn, caption):
    p = os.path.join(SHOTS, fn)
    if not os.path.exists(p):
        return
    img = Image(p)
    maxw = 170*mm
    ratio = img.imageHeight / img.imageWidth
    img.drawWidth = maxw
    img.drawHeight = maxw * ratio
    # cap height so two fit per page
    maxh = 108*mm
    if img.drawHeight > maxh:
        img.drawHeight = maxh
        img.drawWidth = maxh / ratio
    img.hAlign = "LEFT"
    story.append(img)
    story.append(Paragraph(caption, cap))

shot("04-comparison.png", "Comparison matrix — each cell shows raw value then normalised→weighted contribution, so every score is reproducible. CoreVantage is blocked for missing ISO 27001.")
shot("05-recommendation.png", "Recommendation &amp; Review — AI rationale (left) built from the numbers; the mandatory human decision (right). The system never places an order.")

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm, topMargin=16*mm, bottomMargin=14*mm,
    title="ProcureWise — Capstone Project Overview", author="Uday Kiran Kondeti",
)
doc.build(story)
print("Wrote", OUT)
