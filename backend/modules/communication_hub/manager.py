import imaplib
import smtplib
import email
from email.header import decode_header
from datetime import datetime
from django.utils import timezone
import quopri

class MailManager:
    @staticmethod
    def validate_credentials(config):
        """
        config: {imap_host, imap_port, smtp_host, smtp_port, email, password}
        Returns: (True, None) or (False, error_message)
        """
        # 1. Test IMAP
        try:
            imap = imaplib.IMAP4_SSL(config['imap_host'], int(config['imap_port']))
            imap.login(config['email'], config['password'])
            imap.logout()
        except Exception as e:
            return False, f"Incoming (IMAP) Login Failed: {str(e)}"

        # 2. Test SMTP
        try:
            smtp = smtplib.SMTP(config['smtp_host'], int(config['smtp_port']))
            smtp.starttls()
            smtp.login(config['email'], config['password'])
            smtp.quit()
        except Exception as e:
            return False, f"Outgoing (SMTP) Login Failed: {str(e)}"

        return True, None

    @staticmethod
    def fetch_latest_emails(account, folder='INBOX', limit=10):
        """
        Fetches the latest 'limit' emails from the specified folder.
        """
        try:
            imap = imaplib.IMAP4_SSL(account.imap_host, account.imap_port)
            imap.login(account.email_address, account.password)
            imap.select(folder)

            # Get latest UIDs
            status, messages = imap.uid('search', None, 'ALL')
            if status != 'OK':
                return []

            uids = messages[0].split()
            latest_uids = uids[-limit:] if len(uids) > limit else uids
            latest_uids.reverse() # Newest first

            email_data = []
            for uid in latest_uids:
                status, msg_data = imap.uid('fetch', uid, '(RFC822)')
                if status != 'OK':
                    continue

                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        # Decode Subject
                        subject, encoding = decode_header(msg["Subject"] or "")[0]
                        if isinstance(subject, bytes):
                            subject = subject.decode(encoding or "utf-8")
                        
                        # Decode From
                        from_header = msg.get("From")
                        
                        # Body & Attachment Extraction
                        body_html = ""
                        body_text = ""
                        attachments = []
                        
                        if msg.is_multipart():
                            for part in msg.walk():
                                content_type = part.get_content_type()
                                content_disposition = str(part.get("Content-Disposition"))
                                filename = part.get_filename()
                                
                                if filename:
                                    # This is an attachment
                                    try:
                                        payload = part.get_payload(decode=True)
                                        if payload:
                                            attachments.append({
                                                'filename': filename,
                                                'content_type': content_type,
                                                'content': payload,
                                                'size': len(payload)
                                            })
                                    except:
                                        continue
                                else:
                                    # Regular body part
                                    try:
                                        payload = part.get_payload(decode=True)
                                        if payload:
                                            payload = payload.decode(errors='ignore')
                                            if content_type == "text/plain":
                                                body_text += payload
                                            elif content_type == "text/html":
                                                body_html += payload
                                    except:
                                        continue
                        else:
                            content_type = msg.get_content_type()
                            payload = msg.get_payload(decode=True).decode(errors='ignore')
                            if content_type == "text/plain":
                                body_text = payload
                            elif content_type == "text/html":
                                body_html = payload

                        # Date
                        date_str = msg.get("Date")
                        try:
                            date_parsed = email.utils.parsedate_to_datetime(date_str)
                        except:
                            date_parsed = timezone.now()

                        email_data.append({
                            'uid': uid.decode(),
                            'subject': subject,
                            'sender': from_header,
                            'recipient': msg.get("To"),
                            'body_text': body_text,
                            'body_html': body_html or body_text,
                            'received_at': date_parsed,
                            'attachments': attachments,
                        })

            imap.logout()
            return email_data
        except Exception as e:
            print(f"Error fetching emails: {e}")
            return []

    @staticmethod
    def send_email(account, to_email, subject, body, cc=None, bcc=None, attachments=None):
        """
        Sends an email via SMTP with optional attachments.
        """
        try:
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            from email.mime.base import MIMEBase
            from email import encoders

            msg = MIMEMultipart()
            msg['From'] = account.email_address
            msg['To'] = to_email
            if cc: msg['Cc'] = cc
            msg['Subject'] = subject

            msg.attach(MIMEText(body, 'html'))

            # Handle Attachments
            if attachments:
                for f in attachments:
                    # f is expected to be a file-like object or a Django UploadedFile record
                    part = MIMEBase('application', 'octet-stream')
                    try:
                        # If it's a Django file object, it might have .read() and .name
                        part.set_payload(f.read())
                        encoders.encode_base64(part)
                        part.add_header('Content-Disposition', f'attachment; filename="{f.name}"')
                        msg.attach(part)
                    except Exception as fe:
                        print(f"Error attaching file: {fe}")

            recipients = [to_email]
            if cc: recipients.append(cc)
            if bcc: recipients.append(bcc)

            smtp = smtplib.SMTP(account.smtp_host, account.smtp_port)
            smtp.starttls()
            smtp.login(account.email_address, account.password)
            smtp.sendmail(account.email_address, recipients, msg.as_string())
            smtp.quit()
            return True, None
        except Exception as e:
            return False, str(e)
