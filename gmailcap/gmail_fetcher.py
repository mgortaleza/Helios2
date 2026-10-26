import imaplib
import email
import email.message
from email.header import decode_header
import datetime
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

EMAIL_ACCOUNT = os.getenv("GMAIL_ACCOUNT", "netyxmail@gmail.com")
APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "megl wvhl jtfm jbyl")

# Target output directory (Directly into the Helios apptst inbox UNC path)
TARGET_DIR = os.getenv("HELIOS_INBOX_DIR", r"\\apptst\inbox")

# Log & Status directory for HeliosAdmin diagnostics bridge
LOG_DIR = os.getenv("HELIOS_LOG_DIR", r"C:\helios-storage\logs")


def write_status(log_dir: str, status_data: dict) -> None:
    """
    Writes telemetry and heartbeat JSON to the Helios storage log folder
    so the HeliosAdmin diagnostic page can display real-time service health.
    """
    try:
        os.makedirs(log_dir, exist_ok=True)
        status_path = os.path.join(log_dir, "gmailcap_status.json")
        with open(status_path, "w", encoding="utf-8") as f:
            json.dump(status_data, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not write heartbeat file to {log_dir}: {e}")


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
    # Keep only alphanumeric characters, spaces, and hyphens
    cleaned = re.sub(r"[^\w\s-]", "", subject, flags=re.UNICODE)
    # Collapse multiple consecutive whitespaces into a single space
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
            # Check Content-Disposition to ensure attachments are skipped
            disposition = str(part.get("Content-Disposition", "")).lower()
            if "attachment" in disposition:
                continue

            content_type = part.get_content_type()
            # Isolate plain text parts
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    try:
                        body_content = payload.decode(charset, errors="replace")
                    except (LookupError, UnicodeDecodeError):
                        body_content = payload.decode("utf-8", errors="replace")
                    break  # Primary plain text body captured
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


def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else TARGET_DIR
    log_dir = sys.argv[2] if len(sys.argv) > 2 else LOG_DIR

    # Ensure target output directory exists
    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)

    mail = None
    processed_count = 0
    last_subject = ""
    err_msg = None

    try:
        # 1. Establish secure SSL connection to Gmail IMAP server
        print(f"Connecting to {IMAP_SERVER}...")
        mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
        mail.login(EMAIL_ACCOUNT, APP_PASSWORD)
        print("Logged in successfully.")

        # Select INBOX folder
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
            return

        print(f"Found {len(email_ids)} unseen email(s). Processing...")

        # 3. Process each unread email
        for eid in email_ids:
            email_id_str = eid.decode("utf-8")
            
            # Fetch raw RFC822 email bytes
            fetch_status, msg_data = mail.fetch(eid, "(RFC822)")
            if fetch_status != "OK" or not msg_data or not msg_data[0]:
                print(f"Warning: Failed to fetch email ID {email_id_str}. Skipping.")
                continue

            raw_email_bytes = msg_data[0][1]
            msg = email.message_from_bytes(raw_email_bytes)

            # Parse and decode headers dynamically
            subject = decode_mime_header(msg.get("Subject"))
            sender = decode_mime_header(msg.get("From"))
            date_str = decode_mime_header(msg.get("Date"))

            # Construct safe filename with sanitized subject and unique email ID
            safe_subject = sanitize_filename(subject)[:100]
            base_filename = f"{safe_subject}_{email_id_str}"

            # 4. Storage:
            # Save raw RFC822 message as .eml file into TARGET_DIR for automated inbox intake.
            eml_path = os.path.join(target_dir, f"{base_filename}.eml")
            with open(eml_path, "wb") as f_eml:
                f_eml.write(raw_email_bytes)

            processed_count += 1
            last_subject = subject
            print(f"Successfully saved ID {email_id_str}: {base_filename}.eml to {target_dir}")

    except Exception as ex:
        err_msg = str(ex)
        print(f"Error during Gmail capture: {ex}")
        raise
    finally:
        # 5. Clean termination phase: explicitly close mailbox and log out
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

        # 6. Publish heartbeat status for HeliosAdmin Diagnostics Page
        status_payload = {
            "service": "gmailcap",
            "status": "UP" if err_msg is None else "DEGRADED",
            "lastRun": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "lastRunEpoch": int(time.time()),
            "interval": "60s (Every 1 minute)",
            "emailsIngested": processed_count,
            "targetInbox": target_dir,
            "lastSubject": last_subject,
            "lastError": err_msg
        }
        write_status(log_dir, status_payload)


if __name__ == "__main__":
    main()
