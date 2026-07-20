from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "Mondesa_Health_Dashboard_User_Guide.pdf"

GREEN = colors.HexColor("#18332D")
BRAND_GREEN = colors.HexColor("#1F5A4C")
GOLD = colors.HexColor("#8C6526")
MUTED = colors.HexColor("#60736D")
LINE = colors.HexColor("#D9E3DF")
SOFT = colors.HexColor("#F2F7F5")
WARM = colors.HexColor("#FBF6EC")
WHITE = colors.HexColor("#FBFDFC")

pdfmetrics.registerFont(TTFont("Onest", str(ROOT / "public/fonts/Onest-Variable.ttf")))
pdfmetrics.registerFont(TTFont("InterTight", str(ROOT / "public/fonts/InterTight-SemiBold.ttf")))
pdfmetrics.registerFont(TTFont("InterTightBold", str(ROOT / "public/fonts/InterTight-Bold.ttf")))


def draw_mark(canvas, x: float, y: float, size: float) -> None:
    canvas.saveState()
    canvas.setFillColor(BRAND_GREEN)
    canvas.roundRect(x, y, size, size, size * 0.23, fill=1, stroke=0)
    canvas.setStrokeColor(WHITE)
    canvas.setLineWidth(size * 0.055)
    canvas.setLineCap(1)
    left = x + size * 0.30
    right = x + size * 0.70
    top = y + size * 0.78
    mid = y + size * 0.53
    canvas.line(left, top, left, mid)
    canvas.line(right, top, right, mid)
    canvas.line(x + size * 0.40, top, x + size * 0.40, y + size * 0.64)
    canvas.line(x + size * 0.60, top, x + size * 0.60, y + size * 0.64)
    path = canvas.beginPath()
    path.moveTo(left, mid)
    path.curveTo(left, y + size * 0.28, right, y + size * 0.28, right, mid)
    canvas.drawPath(path, stroke=1, fill=0)
    canvas.line(right, y + size * 0.43, x + size * 0.78, y + size * 0.43)
    canvas.line(x + size * 0.78, y + size * 0.43, x + size * 0.84, y + size * 0.50)
    canvas.circle(x + size * 0.86, y + size * 0.60, size * 0.075, fill=0, stroke=1)
    canvas.restoreState()


def draw_wordmark(canvas, x: float, y: float, scale: float = 1.0) -> None:
    canvas.saveState()
    canvas.setFont("InterTightBold", 9.2 * scale)
    canvas.setFillColor(GREEN)
    canvas.drawString(x, y + 12 * scale, "MONDESA")
    canvas.setFillColor(GOLD)
    canvas.drawString(x, y + 3 * scale, "HEALTH")
    canvas.setFont("InterTight", 4.5 * scale)
    canvas.setFillColor(MUTED)
    canvas.drawString(x, y - 3.4 * scale, "POLYCLINIC")
    canvas.restoreState()


def first_page(canvas, doc) -> None:
    width, height = A4
    canvas.saveState()
    draw_mark(canvas, 28 * mm, height - 45 * mm, 18 * mm)
    draw_wordmark(canvas, 49 * mm, height - 36.5 * mm, 1.35)
    canvas.setStrokeColor(LINE)
    canvas.line(28 * mm, 22 * mm, width - 28 * mm, 22 * mm)
    canvas.setFont("Onest", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(28 * mm, 16.5 * mm, "Mondesa Health Polyclinic")
    canvas.drawRightString(width - 28 * mm, 16.5 * mm, "Dashboard user guide · July 2026")
    canvas.restoreState()


def later_pages(canvas, doc) -> None:
    width, height = A4
    canvas.saveState()
    draw_mark(canvas, 18 * mm, height - 18 * mm, 8 * mm)
    draw_wordmark(canvas, 28 * mm, height - 13.2 * mm, 0.72)
    canvas.setFont("InterTight", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 18 * mm, height - 11.5 * mm, "Dashboard module guide")
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, height - 22 * mm, width - 18 * mm, height - 22 * mm)
    canvas.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    canvas.setFont("Onest", 6.8)
    canvas.drawString(18 * mm, 10 * mm, "Use only the modules permitted for your staff role.")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


class SectionRule(Flowable):
    def __init__(self, color=LINE, space_before=3, space_after=6):
        super().__init__()
        self.color = color
        self.space_before = space_before
        self.space_after = space_after
        self.height = space_before + 1 + space_after

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(0.6)
        self.canv.line(0, self.space_after, self._availWidth, self.space_after)

    def wrap(self, avail_width, avail_height):
        self._availWidth = avail_width
        return avail_width, self.height


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="GuideTitle", fontName="InterTightBold", fontSize=28, leading=29, textColor=GREEN, spaceAfter=7))
styles.add(ParagraphStyle(name="GuideSubtitle", fontName="Onest", fontSize=11.5, leading=15, textColor=MUTED, spaceAfter=17))
styles.add(ParagraphStyle(name="Kicker", fontName="InterTight", fontSize=8, leading=10, textColor=GOLD, spaceAfter=7, tracking=1.2))
styles.add(ParagraphStyle(name="Intro", fontName="Onest", fontSize=9.5, leading=14, textColor=GREEN, spaceAfter=13))
styles.add(ParagraphStyle(name="CoverHeading", fontName="InterTightBold", fontSize=13, leading=15, textColor=GREEN, spaceBefore=8, spaceAfter=6))
styles.add(ParagraphStyle(name="CoverBody", fontName="Onest", fontSize=8.5, leading=12, textColor=GREEN, spaceAfter=5))
styles.add(ParagraphStyle(name="ModuleHeading", fontName="InterTightBold", fontSize=11.4, leading=13, textColor=WHITE, backColor=BRAND_GREEN, borderPadding=(5, 7, 5, 7), borderRadius=4, spaceBefore=2, spaceAfter=6))
styles.add(ParagraphStyle(name="Purpose", fontName="Onest", fontSize=7.7, leading=10.2, textColor=MUTED, spaceAfter=5))
styles.add(ParagraphStyle(name="Step", fontName="Onest", fontSize=8.15, leading=11, textColor=GREEN, leftIndent=13, firstLineIndent=-13, spaceAfter=3.2))
styles.add(ParagraphStyle(name="Note", fontName="Onest", fontSize=7.2, leading=9.4, textColor=GREEN, backColor=SOFT, borderColor=LINE, borderWidth=0.5, borderPadding=(5, 6, 5, 6), borderRadius=4, spaceBefore=3, spaceAfter=7))
styles.add(ParagraphStyle(name="Caution", parent=styles["Note"], backColor=WARM, borderColor=colors.HexColor("#E9D6AD")))
styles.add(ParagraphStyle(name="Group", fontName="InterTightBold", fontSize=9, leading=11, textColor=GOLD, spaceBefore=4, spaceAfter=2))
styles.add(ParagraphStyle(name="Index", fontName="Onest", fontSize=8.2, leading=11, textColor=GREEN, spaceAfter=2))
styles.add(ParagraphStyle(name="EndTitle", fontName="InterTightBold", fontSize=14, leading=17, textColor=GREEN, alignment=TA_CENTER, spaceAfter=7))
styles.add(ParagraphStyle(name="EndBody", fontName="Onest", fontSize=8.2, leading=12, textColor=MUTED, alignment=TA_CENTER, spaceAfter=6))


MODULES = [
    ("01", "Overview", "See the day at a glance and move quickly to common work.", [
        "Open <b>Overview</b> after signing in.",
        "Review today’s appointments, pending requests, reminders, claims needing attention, balances, and payments received.",
        "Use <b>Today’s agenda</b> to confirm patient, time, reason, and status.",
        "Use <b>Quick actions</b> for frequent tasks, or open the required module from the sidebar.",
    ], "The next available time is calculated from weekly hours, blocks, lunch breaks, and existing bookings."),
    ("02", "Appointments", "Create, review, confirm, reschedule, complete, cancel, and communicate appointments.", [
        "Select <b>New appointment</b>. Choose an existing or new patient, source, service area, service/provider, date/time, and reason.",
        "Use search, quick views, status, source, date, and sort filters to find an appointment.",
        "Open the appointment. Complete missing patient details before clinical or billing work.",
        "Confirm a request, propose/approve a reschedule, mark completed or no-show, or cancel with confirmation.",
        "Review the clinical intake summary and patient images when your role allows it. Correct and approve the summary before relying on it.",
        "Use the share panel to copy or open the WhatsApp/email update. Sharing is a manual staff action.",
    ], "From a completed visit, authorised staff can create a Sick Note. Reminder messages are prepared, not sent automatically."),
    ("03", "Patients", "Maintain the master patient record used by appointments, claims, finance, and Sick Notes.", [
        "Select <b>Add patient</b> and enter legal name, date of birth, gender, cellphone, email, and preferred communication.",
        "Add the current medical-aid fund and membership number when verified.",
        "Search or sort the list, then use the edit action to update details.",
        "Open <b>Medical aid</b> for the patient’s benefit profile and consent details.",
        "Use the Sick Note action when authorised, or archive an inactive/duplicate patient after confirmation.",
    ], "Do not create a second record until you have searched by name, phone, and patient number."),
    ("04", "Medical Aid Claims", "Prepare validated claims with fund, member, procedure, diagnosis, and supporting evidence.", [
        "Select <b>Create claim</b>, then start from a completed appointment or a patient record.",
        "Open the claim number. Confirm claim details, fund membership, practitioner, service dates, and internal notes.",
        "Add claim lines. Select a configured procedure or enter a verified manual item; confirm quantity and amount.",
        "Add a primary ICD-10 code and any relevant secondary codes. Add NAPPI or pre-authorisation values when required.",
        "Upload supporting PDF/JPG/PNG files with the correct attachment type.",
        "Select <b>Save draft</b>, then <b>Validate</b>. Resolve every validation message before batching.",
        "After submission, record acknowledgements, payments, rejection reasons, or create a controlled resubmission.",
    ], "Submitted claims are locked. Configure claim contacts, active ICD-10 data, funds, and procedure tariffs before submission."),
    ("05", "Claim Batches", "Group ready claims for one fund and submission type, then track the submission lifecycle.", [
        "Validate claims until their status is <b>Ready to submit</b>.",
        "Select <b>Create batch</b>. Choose the fund, submission method, and first submission/resubmission type.",
        "Tick the eligible claims and create the batch.",
        "Download the cover sheet, manifest PDF, or manifest CSV for the chosen submission method.",
        "Select <b>Mark submitted</b>, enter the external submission reference and date, then confirm.",
        "When responses arrive, mark the batch acknowledged and then complete it.",
    ], "A batch contains claims for one medical-aid fund and one submission type only."),
    ("06", "Sick Notes", "Draft, issue, verify, share, and revoke medical certificates.", [
        "Select <b>Create sick note</b>. Choose patient, optional appointment, authorised doctor, purpose, dates, and fitness status.",
        "Record diagnosis only when patient consent is documented. Clinician notes are required and remain internal.",
        "Write certificate wording or use <b>Draft wording with AI</b>, then review every word clinically.",
        "Preview and <b>Save draft</b> while editing is still required. Select <b>Issue sick note</b> only when final.",
        "Use <b>View</b>, <b>PDF</b>, or <b>Share</b> for an issued certificate. Sharing offers WhatsApp, email, copy message/link, and device options.",
        "To invalidate it, select <b>Revoke</b>, enter a clear reason, and confirm.",
    ], "Issued certificates cannot be edited. Revoked certificates stay visible and their public QR page shows REVOKED."),
    ("07", "Finance", "Create invoices, record payments, issue receipts, and share financial documents.", [
        "Select <b>Create invoice</b>. Choose the patient, payment responsibility, description, and amount.",
        "Use <b>Record payment</b> on the invoice. Select payer and payment method, add a note if needed, and confirm the amount.",
        "Download or share the generated receipt after payment.",
        "Use <b>View</b> for PDF preview, <b>PDF</b> to download, and <b>Share</b> for a secure expiring link.",
        "Void an unpaid draft only when necessary; enter a reason so the audit trail remains clear.",
    ], "Confirm the payer and responsibility before recording money. Opening a share option does not prove delivery."),
    ("08", "Availability", "Control public booking, weekly hours, reminders, and temporary closures.", [
        "Choose the public booking mode and save it.",
        "Enable or disable reminder preparation, set the lead time, and save reminder settings.",
        "For each weekday, enable the day and set opening time, closing time, and appointment duration; then save.",
        "Add blocked time with start, end, and reason for leave, meetings, or closures.",
        "Review upcoming blocks and remove a block only when the time should become bookable again.",
    ], "Availability changes affect the live appointment slots offered to patients."),
    ("09", "Services & Providers", "Maintain the public directory and booking choices.", [
        "Select <b>Add department</b>. Enter its name, description, booking state, public state, and order.",
        "Open a department and add or edit its services and providers.",
        "Set each item’s public visibility, booking availability, sort order, and AI-assisted intake option.",
        "Save each item, then select <b>Save order</b> after changing sequence values.",
        "Use the public site preview to confirm names, ordering, and visibility.",
    ], "Publish only verified provider and service information. Directory records are preserved during operational data reset."),
    ("10", "Website Content", "Edit public-facing text and preview the website before publishing changes.", [
        "Open each content section and update only the required text, links, lists, or labels.",
        "Use <b>Preview website</b> to review the public result in context.",
        "Check spelling, contact wording, service claims, mobile length, and whether every statement is verified.",
        "Select <b>Save changes</b> or <b>Save website content</b> and wait for the success confirmation.",
    ], "Unsaved content does not update the public website. Keep patient-facing wording plain and factual."),
    ("11", "Medical Aid", "Configure funds, procedures/tariffs, submission methods, and ICD-10 datasets.", [
        "Under <b>Funds</b>, add/edit a verified medical aid, abbreviation, administrator, accepted methods, public/active state, and ordering.",
        "Under <b>Procedure items</b>, add codes, names, categories, default amounts, and NAPPI/pre-authorisation requirements.",
        "Under <b>ICD-10 dataset</b>, upload the approved file and version details.",
        "Review imported row counts, then activate the correct version. Only one current dataset should guide coding.",
        "Update or remove inactive datasets carefully; do not delete the active version until its replacement is ready.",
    ], "Only enter confirmed fund, tariff, and code data. These settings directly affect claim validation."),
    ("12", "Settings", "Maintain practice, document, public-site, claims, emergency, AI, storage, and reset settings.", [
        "Use the tabs: <b>Practice</b>, <b>Documents</b>, <b>Public site</b>, <b>Claims</b>, <b>Medical aids</b>, <b>Emergency & AI</b>, and <b>Data reset</b>.",
        "Edit one tab at a time, then use that tab’s save button and wait for the <b>Saved</b> state.",
        "In Emergency & AI, maintain active emergency contacts and save global AI/intake-image choices.",
        "Use Data reset only as owner: review counts, type the exact confirmation, and approve the custom warning dialog.",
    ], "Data reset removes operational records such as patients, appointments, finance, claims, attachments, Sick Notes, and logs. Services/providers remain. This action is irreversible without a backup.", True),
    ("13", "Staff Users", "Create staff accounts and control role-based access.", [
        "Select <b>New staff account</b>. Enter display name and login email.",
        "Choose the role, review every permission, and generate or enter a temporary password.",
        "Create the account, then securely copy and deliver the temporary password to the staff member.",
        "Use edit access to change role/permissions, disable/enable to control login, or reset the temporary password.",
        "Delete permanently only when the account has no protected history; otherwise disable it.",
    ], "Use least privilege. Never share one staff login between people, and do not disable the current signed-in account."),
    ("14", "Activity Log", "Review the immutable audit trail and export a filtered record.", [
        "Search by text or filter by action, staff member, from date, and to date.",
        "Select <b>Apply filters</b> and review the time, action, summary, and actor.",
        "Use Previous/Next to move through 50-record pages.",
        "Select <b>Export CSV</b> to download the currently filtered results.",
    ], "Activity entries document patient, staff, and system actions. They are not edited from this module."),
    ("15", "Profile & Security", "Maintain your own identity, avatar, email, and password.", [
        "Open your profile from the signed-in user area.",
        "Upload or remove your profile image, then update display name or login email if authorised.",
        "To change password, enter the current password and a strong new password.",
        "Select <b>Save profile</b> and wait for confirmation before leaving.",
        "Sign out when using a shared or public device.",
    ], "Keep credentials private. Staff access and permissions are managed separately in Staff Users."),
]


def module_block(number, title, purpose, steps, note, caution=False):
    parts = [
        Paragraph(f"{number}&nbsp;&nbsp; {title}", styles["ModuleHeading"]),
        Paragraph(f"<b>Use it for:</b> {purpose}", styles["Purpose"]),
    ]
    parts.extend(Paragraph(f"<b>{index}.</b>&nbsp; {step}", styles["Step"]) for index, step in enumerate(steps, 1))
    parts.append(Paragraph(f"<b>{'Caution' if caution else 'Remember'}:</b> {note}", styles["Caution" if caution else "Note"]))
    return KeepTogether(parts)


def build() -> Path:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    width, height = A4
    first_frame = Frame(28 * mm, 28 * mm, width - 56 * mm, height - 78 * mm, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0, id="cover")
    gap = 7 * mm
    col_width = (width - 36 * mm - gap) / 2
    left = Frame(18 * mm, 19 * mm, col_width, height - 45 * mm, leftPadding=0, rightPadding=2.5 * mm, topPadding=0, bottomPadding=0, id="left")
    right = Frame(18 * mm + col_width + gap, 19 * mm, col_width, height - 45 * mm, leftPadding=2.5 * mm, rightPadding=0, topPadding=0, bottomPadding=0, id="right")
    doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=25 * mm, bottomMargin=19 * mm, title="Mondesa Health Dashboard User Guide", author="Mondesa Health Polyclinic", subject="Step-by-step module guide")
    doc.addPageTemplates([
        PageTemplate(id="First", frames=[first_frame], onPage=first_page, autoNextPageTemplate="Modules"),
        PageTemplate(id="Modules", frames=[left, right], onPage=later_pages),
    ])

    story = [Spacer(1, 29 * mm), Paragraph("STAFF REFERENCE", styles["Kicker"]), Paragraph("Dashboard user guide", styles["GuideTitle"]), Paragraph("A compact, step-by-step guide to every Mondesa Health dashboard module.", styles["GuideSubtitle"]), Paragraph("Use this guide beside the live dashboard. Button names are written exactly as they appear where practical. What each staff member can see depends on their role and permissions.", styles["Intro"]), SectionRule(), Paragraph("Start here", styles["CoverHeading"])]
    for i, step in enumerate([
        "Sign in with your own staff email and password.",
        "Choose a module from the left sidebar. On mobile, open the menu button first.",
        "Complete the required fields, then use the visible save or confirm action.",
        "Wait for the success toast or Saved state before leaving the page.",
    ], 1):
        story.append(Paragraph(f"<b>{i}.</b>&nbsp; {step}", styles["Step"]))
    story.extend([Paragraph("Module map", styles["CoverHeading"]), Paragraph("<b>Practice</b>&nbsp;&nbsp; 01 Overview · 02 Appointments · 03 Patients", styles["Index"]), Paragraph("<b>Operations</b>&nbsp;&nbsp; 04 Claims · 05 Claim Batches · 06 Sick Notes · 07 Finance · 08 Availability", styles["Index"]), Paragraph("<b>System</b>&nbsp;&nbsp; 09 Services & Providers · 10 Website Content · 11 Medical Aid · 12 Settings · 13 Staff Users · 14 Activity Log", styles["Index"]), Paragraph("<b>Account</b>&nbsp;&nbsp; 15 Profile & Security", styles["Index"]), Spacer(1, 6), Paragraph("Core operating rules", styles["CoverHeading"]), Paragraph("<b>Save first.</b> A success toast or Saved indicator confirms the update. Unsaved changes may be discarded when navigating away.", styles["CoverBody"]), Paragraph("<b>Preview before sharing.</b> WhatsApp and email actions open another app; staff remain responsible for confirming the recipient and sending.", styles["CoverBody"]), Paragraph("<b>Protect patient data.</b> Use only your account, minimum necessary information, and the permissions assigned to your role.", styles["CoverBody"]), Paragraph("<b>Use reasons for reversals.</b> Cancellation, voiding, rejection, and revocation reasons become part of the audit trail.", styles["CoverBody"]), PageBreak()])

    for module in MODULES:
        if module[0] == "12":
            story.append(PageBreak())
        story.append(module_block(*module))

    story.extend([Spacer(1, 8), SectionRule(), Paragraph("Before you finish", styles["EndTitle"]), Paragraph("Confirm the save state, close protected documents, clear any filters that could confuse the next task, and sign out on shared devices.", styles["EndBody"]), Paragraph("For access problems, ask the practice owner to review your Staff Users role and permissions. For incorrect public or clinical information, stop and correct the source record before sharing a document.", styles["EndBody"])])
    doc.build(story)
    return OUT


if __name__ == "__main__":
    print(build())
