import imaplib
import smtplib
import email
import email.message
import email.utils
from email.header import decode_header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import datetime
import html
import json
import os
import re
import sys
import time

# ==============================================================================
# Configuration & Credentials
# ==============================================================================
IMAP_SERVER = os.getenv("GMAIL_IMAP_SERVER", "imap.gmail.com")
IMAP_PORT = int(os.getenv("GMAIL_IMAP_PORT", "993"))

SMTP_SERVER = os.getenv("GMAIL_SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("GMAIL_SMTP_PORT", "587"))

EMAIL_ACCOUNT = os.getenv("GMAIL_ACCOUNT", "netyxmail@gmail.com")
APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "megl wvhl jtfm jbyl")

AUTO_REPLY_ENABLED = os.getenv("GMAIL_AUTO_REPLY", "true").strip().lower() in ("true", "1", "yes")
SENDER_DISPLAY_NAME = os.getenv("HELIOS_SENDER_NAME", "Helios Underwriting Team")

# Target output directory (Directly into the Helios apptst inbox UNC path)
TARGET_DIR = os.getenv("HELIOS_INBOX_DIR", r"\\apptst\inbox")

# Primary and fallback log directories for HeliosAdmin telemetry bridge
LOG_DIR = os.getenv("HELIOS_LOG_DIR", r"\\apptst\logs" if os.path.exists(r"\\apptst\logs") else r"C:\helios-storage\logs")


def write_status(log_dir: str, status_data: dict) -> None:
    """
    Writes telemetry and heartbeat JSON to both the primary log folder
    and the centralized \\apptst\logs network share so the HeliosAdmin
    diagnostic page can display real-time service health across hosts.
    """
    destinations = [log_dir, r"\\apptst\logs", r"C:\helios-storage\logs"]
    seen = set()
    for dest in destinations:
        if not dest or dest in seen:
            continue
        seen.add(dest)
        try:
            os.makedirs(dest, exist_ok=True)
            status_path = os.path.join(dest, "gmailcap_status.json")
            with open(status_path, "w", encoding="utf-8") as f:
                json.dump(status_data, f, indent=2)
        except Exception as e:
            pass


def decode_mime_header(header_value: str | None) -> str:
    """
    Dynamically decodes MIME-encoded email headers (Subject, From, Date) into unicode strings.
    Handles multiple encoded words and varying character sets gracefully.
    """
    if not header_value:
        return ""
    
    decoded_fragments = decode_header(header_value)
    header_parts = []
    
    for fragment, charset in decoded_fragments:
        if isinstance(fragment, bytes):
            encoding = charset or "utf-8"
            try:
                header_parts.append(fragment.decode(encoding, errors="replace"))
            except (LookupError, UnicodeDecodeError):
                header_parts.append(fragment.decode("utf-8", errors="replace"))
        else:
            header_parts.append(str(fragment))
            
    return "".join(header_parts)


def sanitize_filename(subject: str) -> str:
    """
    Cleans the email subject line of any non-alphanumeric characters (except spaces and hyphens).
    Limits output length to ensure safe filesystem filenames across platforms.
    """
    cleaned = re.sub(r"[^\w\s-]", "", subject, flags=re.UNICODE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned if cleaned else "No_Subject"


def extract_plain_text_body(msg: email.message.Message) -> str:
    """
    Walks email structure to isolate the 'text/plain' body format.
    Ignores HTML parts and safely skips any file attachments.
    """
    body_content = ""

    if msg.is_multipart():
        for part in msg.walk():
            disposition = str(part.get("Content-Disposition", "")).lower()
            if "attachment" in disposition:
                continue

            content_type = part.get_content_type()
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    try:
                        body_content = payload.decode(charset, errors="replace")
                    except (LookupError, UnicodeDecodeError):
                        body_content = payload.decode("utf-8", errors="replace")
                    break
    else:
        if msg.get_content_type() == "text/plain":
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or "utf-8"
                try:
                    body_content = payload.decode(charset, errors="replace")
                except (LookupError, UnicodeDecodeError):
                    body_content = payload.decode("utf-8", errors="replace")

    return body_content


def should_skip_auto_reply(msg: email.message.Message, sender_email: str) -> tuple[bool, str]:
    """
    Performs standard RFC 3834 and anti-loop validation to verify if the message
    should be exempted from receiving an automated receipt reply.
    """
    if not sender_email or "@" not in sender_email:
        return True, "No valid sender email address found"

    # 1. Prevent replying to self (our own intake account)
    if sender_email.strip().lower() == EMAIL_ACCOUNT.strip().lower():
        return True, f"Sender is self intake account ({EMAIL_ACCOUNT})"

    # 2. Check RFC 3834 Auto-Submitted header
    auto_submitted = str(msg.get("Auto-Submitted", "")).strip().lower()
    if auto_submitted and auto_submitted != "no":
        return True, f"Auto-Submitted header present: {auto_submitted}"

    # 3. Check Precedence / X-Precedence headers
    precedence = str(msg.get("Precedence", "")).strip().lower()
    if precedence in ("bulk", "list", "junk", "auto_reply"):
        return True, f"Precedence header indicates automated/bulk: {precedence}"

    # 4. Check mailing list headers
    if msg.get("List-Id") or msg.get("List-Unsubscribe"):
        return True, "Mailing list header present (List-Id / List-Unsubscribe)"

    # 5. Check no-reply / daemon sender patterns
    lower_sender = sender_email.lower()
    if any(pat in lower_sender for pat in ("no-reply", "noreply", "mailer-daemon", "postmaster")):
        return True, f"Sender address appears automated: {sender_email}"

    # 6. Check subject for automated response prefixes
    subj = decode_mime_header(msg.get("Subject", "")).lower()
    auto_prefixes = (
        "auto-reply", "autoreply", "automatic reply", "out of office",
        "undeliverable", "delivery status notification", "failure notice"
    )
    if any(subj.startswith(p) for p in auto_prefixes):
        return True, f"Subject starts with automated prefix: {subj}"

    return False, ""


def send_auto_reply(
    to_name: str,
    to_email: str,
    original_subject: str,
    original_msg_id: str | None,
    email_id_str: str,
) -> tuple[bool, str]:
    """
    Sends an auto-reply acknowledging receipt of the insurance submission,
    informing the applicant/broker that the underwriting team is reviewing
    and will respond shortly.
    """
    if not AUTO_REPLY_ENABLED:
        return False, "Auto-reply is disabled via configuration"

    received_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")
    clean_subj = original_subject.strip() if original_subject else "Insurance Submission"
    reply_subject = clean_subj if clean_subj.lower().startswith("re:") else f"Re: {clean_subj}"

    # Build Multipart Message (Alternative: Plain Text + Responsive HTML)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = reply_subject
    msg["From"] = email.utils.formataddr((SENDER_DISPLAY_NAME, EMAIL_ACCOUNT))
    msg["To"] = email.utils.formataddr((to_name, to_email)) if to_name else to_email
    msg["Date"] = email.utils.formatdate(localtime=True)

    if original_msg_id:
        msg["In-Reply-To"] = original_msg_id
        msg["References"] = original_msg_id

    # Anti-loop RFC 3834 headers
    msg["Auto-Submitted"] = "auto-replied"
    msg["X-Auto-Response-Suppress"] = "All"
    msg["Precedence"] = "bulk"

    greeting_name = to_name.strip() if to_name else "Applicant / Broker"

    # 1. Plain Text Version
    text_content = f"""Dear {greeting_name},

Thank you for your submission. We have successfully received your insurance application documentation.

SUBMISSION RECEIPT SUMMARY
----------------------------------------------------------------------
Reference ID : HELIOS-SUB-{email_id_str}
Subject      : {clean_subj}
Received     : {received_time}
Status       : UNDERWRITING REVIEW
----------------------------------------------------------------------

Our underwriting team is actively reviewing your submission and documentation. You can expect a response shortly with an initial status update, request for supplementary details, or preliminary terms.

If you have supplementary files (loss runs, statement of values, ACORD forms) to provide, simply reply directly to this email and they will be automatically indexed into your underwriting file.

Sincerely,
Helios Underwriting Desk
Commercial Lines & Specialty Programs
Helios Insurance Management Suite
"""

    # 2. Branded HTML Version
    escaped_name = html.escape(greeting_name)
    escaped_subj = html.escape(clean_subj)
    escaped_id = html.escape(email_id_str)

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }}
  .wrapper {{ width: 100%; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
  .header {{ background-color: #013a12; padding: 24px 32px; border-bottom: 4px solid #f59e0b; }}
  .brand {{ color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }}
  .subbrand {{ color: #94a3b8; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 4px; }}
  .content {{ padding: 32px; }}
  .greeting {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }}
  .lead {{ font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px; }}
  .info-card {{ background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px; border: 1px solid #e2e8f0; border-left-width: 4px; }}
  .info-title {{ font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }}
  .info-row {{ font-size: 13px; line-height: 1.8; color: #0f172a; }}
  .info-label {{ font-weight: 600; color: #64748b; }}
  .badge {{ display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; }}
  .footer {{ background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5; }}
</style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand">Helios Insurance Suite</div>
      <div class="subbrand">Underwriting &amp; Submissions Intake Portal</div>
    </div>
    <div class="content">
      <div class="greeting">Dear {escaped_name},</div>
      <p class="lead">
        Thank you for your submission. We have successfully received your insurance application documentation.
      </p>
      <div class="info-card">
        <div class="info-title">Submission Receipt Summary</div>
        <div class="info-row"><span class="info-label">Reference ID:</span> <strong>HELIOS-SUB-{escaped_id}</strong></div>
        <div class="info-row"><span class="info-label">Subject:</span> {escaped_subj}</div>
        <div class="info-row"><span class="info-label">Received:</span> {received_time}</div>
        <div class="info-row"><span class="info-label">Status:</span> <span class="badge">UNDERWRITING REVIEW</span></div>
      </div>
      <p class="lead">
        Our underwriting team is actively reviewing your submission and documentation. You can expect a response shortly with an initial status update, request for supplementary details, or preliminary terms.
      </p>
      <p class="lead" style="font-size: 13px; color: #64748b;">
        <em>Note: If you have supplementary files (loss runs, statement of values, ACORD forms) to provide, simply reply directly to this email and they will be automatically indexed into your underwriting file.</em>
      </p>
    </div>
    <div class="footer">
      <strong>Helios Underwriting Desk</strong> &bull; Commercial Lines &amp; Specialty Programs<br>
      This is an automated confirmation sent by the Helios Intake Gateway.
    </div>
  </div>
</body>
</html>
"""

    part_text = MIMEText(text_content, "plain", "utf-8")
    part_html = MIMEText(html_content, "html", "utf-8")
    msg.attach(part_text)
    msg.attach(part_html)

    # Deliver via SMTP over TLS
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=20) as server:
            server.starttls()
            server.login(EMAIL_ACCOUNT, APP_PASSWORD)
            server.send_message(msg)
        return True, "Auto-reply sent successfully"
    except Exception as ex:
        return False, str(ex)


def run_intake_cycle(target_dir: str, log_dir: str) -> dict:
    """
    Executes a single polling iteration against Gmail IMAP:
    1. Connects over SSL and queries UNSEEN emails.
    2. Downloads RFC822 messages and saves them as .eml files.
    3. Sends an automated receipt confirmation back to the applicant/broker.
    4. Updates telemetry and returns status summary.
    """
    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)

    mail = None
    processed_count = 0
    auto_replies_sent = 0
    auto_replies_skipped = 0
    last_subject = ""
    last_auto_reply_to = ""
    err_msg = None

    try:
        # 1. Establish secure SSL connection to Gmail IMAP server
        print(f"Connecting to IMAP {IMAP_SERVER}:{IMAP_PORT}...")
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(EMAIL_ACCOUNT, APP_PASSWORD)
        print("Logged into IMAP successfully.")

        status, _ = mail.select("INBOX")
        if status != "OK":
            raise RuntimeError("Failed to select INBOX.")

        # 2. Search for unread emails matching 'UNSEEN' criteria
        status, search_data = mail.search(None, "UNSEEN")
        if status != "OK":
            raise RuntimeError("Failed to execute search for UNSEEN emails.")

        email_ids = search_data[0].split()
        if not email_ids:
            print("No unseen emails found in INBOX.")
        else:
            print(f"Found {len(email_ids)} unseen email(s). Processing...")

            # 3. Process each unread email
            for eid in email_ids:
                email_id_str = eid.decode("utf-8")
                
                fetch_status, msg_data = mail.fetch(eid, "(RFC822)")
                if fetch_status != "OK" or not msg_data or not msg_data[0]:
                    print(f"Warning: Failed to fetch email ID {email_id_str}. Skipping.")
                    continue

                raw_email_bytes = msg_data[0][1]
                msg = email.message_from_bytes(raw_email_bytes)

                # Parse and decode headers
                subject = decode_mime_header(msg.get("Subject"))
                sender_raw = decode_mime_header(msg.get("From"))
                msg_id = msg.get("Message-ID")

                # Extract sender name and clean email address
                to_name, to_email = email.utils.parseaddr(sender_raw)

                # Construct safe filename with sanitized subject and unique email ID
                safe_subject = sanitize_filename(subject)[:100]
                base_filename = f"{safe_subject}_{email_id_str}"

                # 4. Storage: Save raw RFC822 message as .eml file
                eml_path = os.path.join(target_dir, f"{base_filename}.eml")
                with open(eml_path, "wb") as f_eml:
                    f_eml.write(raw_email_bytes)

                processed_count += 1
                last_subject = subject
                print(f"Successfully saved ID {email_id_str}: {base_filename}.eml to {target_dir}")

                # 5. Send Auto-Reply
                skip, skip_reason = should_skip_auto_reply(msg, to_email)
                if skip:
                    auto_replies_skipped += 1
                    print(f"Skipping auto-reply for ID {email_id_str} ({to_email}): {skip_reason}")
                else:
                    print(f"Sending auto-reply to '{to_name}' <{to_email}> for ID {email_id_str}...")
                    ok, reply_info = send_auto_reply(
                        to_name=to_name,
                        to_email=to_email,
                        original_subject=subject,
                        original_msg_id=msg_id,
                        email_id_str=email_id_str,
                    )
                    if ok:
                        auto_replies_sent += 1
                        last_auto_reply_to = to_email
                        print(f"Auto-reply sent successfully to {to_email}")
                    else:
                        print(f"Warning: Failed to deliver auto-reply to {to_email}: {reply_info}")

    except Exception as ex:
        err_msg = str(ex)
        print(f"Error during Gmail capture: {ex}")
    finally:
        # 6. Clean termination phase
        if mail is not None:
            try:
                mail.close()
            except Exception:
                pass
            try:
                mail.logout()
            except Exception:
                pass
        print("IMAP session closed.")

        # 7. Publish heartbeat status for HeliosAdmin Diagnostics Page
        status_payload = {
            "service": "gmailcap",
            "status": "UP" if err_msg is None else "DEGRADED",
            "health": "ONLINE" if err_msg is None else "ERROR",
            "lastRun": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "lastRunEpoch": int(time.time()),
            "interval": "60s (Every 1 minute)",
            "emailsIngested": processed_count,
            "targetInbox": target_dir,
            "lastSubject": last_subject,
            "autoReplyEnabled": AUTO_REPLY_ENABLED,
            "autoRepliesSent": auto_replies_sent,
            "autoRepliesSkipped": auto_replies_skipped,
            "lastAutoReplyTo": last_auto_reply_to,
            "lastError": err_msg
        }
        write_status(log_dir, status_payload)
        return status_payload


def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else TARGET_DIR
    log_dir = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else LOG_DIR

    loop_mode = "--loop" in sys.argv
    loop_interval = 60
    if loop_mode:
        idx = sys.argv.index("--loop")
        if idx + 1 < len(sys.argv) and sys.argv[idx + 1].isdigit():
            loop_interval = int(sys.argv[idx + 1])
        print(f"Starting GmailCap intake daemon in persistent loop mode (interval: {loop_interval}s)...")
        while True:
            try:
                run_intake_cycle(target_dir, log_dir)
            except Exception as e:
                print(f"Cycle encountered unhandled error: {e}")
            time.sleep(loop_interval)
    else:
        run_intake_cycle(target_dir, log_dir)


if __name__ == "__main__":
    main()
