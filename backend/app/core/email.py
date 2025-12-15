import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

def send_visit_confirmation_email(
    to_email: str,
    buyer_name: str,
    property_title: str,
    property_address: str,
    visit_time: str,
    agent_name: str,
    agent_phone: str,
    agent_notes: str = None,
    property_image_url: str = None
):
    """
    Sends a professional HTML email to the buyer confirming their visit.
    """
    if not resend.api_key:
        print("WARNING: RESEND_API_KEY not found. Email not sent.")
        return

    google_maps_link = f"https://www.google.com/maps/search/?api=1&query={property_address.replace(' ', '+')}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }}
            .header {{ background-color: #f43f5e; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 30px; }}
            .property-card {{ background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 20px 0; display: flex; gap: 15px; }}
            .property-img {{ width: 100px; height: 100px; object-fit: cover; border-radius: 6px; }}
            .details {{ flex: 1; }}
            .button {{ display: inline-block; background-color: #f43f5e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }}
            .footer {{ background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #888; }}
            .notes {{ background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0;">Visit Confirmed! 🎉</h1>
            </div>
            <div class="content">
                <p>Hi <strong>{buyer_name}</strong>,</p>
                <p>Great news! Your visit request has been approved by the agent. Here are the details for your upcoming property tour:</p>
                
                <div class="property-card">
                    {f'<img src="{property_image_url}" class="property-img" alt="Property">' if property_image_url else ''}
                    <div class="details">
                        <h3 style="margin-top:0; margin-bottom:5px;">{property_title}</h3>
                        <p style="margin:0; font-size: 14px; color: #666;">{property_address}</p>
                        <p style="margin:5px 0 0 0; font-weight: bold; color: #f43f5e;">📅 {visit_time}</p>
                    </div>
                </div>

                {f'<div class="notes"><strong>📝 Agent Instructions:</strong><br>{agent_notes}</div>' if agent_notes else ''}

                <p><strong>Your Agent:</strong> {agent_name}<br>
                <strong>Contact:</strong> {agent_phone}</p>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="{google_maps_link}" class="button">📍 Get Directions</a>
                </div>
            </div>
            <div class="footer">
                <p>Sent via NestFind - The Future of Real Estate</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        r = resend.Emails.send({
            "from": "NestFind <onboarding@resend.dev>",
            "to": to_email,
            "subject": f"Visit Confirmed: {property_title}",
            "html": html_content
        })
        print(f"Email sent successfully: {r}")
    except Exception as e:
        print(f"Failed to send email: {e}")


def send_offer_accepted_email(
    to_email: str,
    buyer_name: str,
    property_title: str,
    property_address: str,
    offer_amount: float,
    token_amount: float,
    deal_url: str
):
    """
    Sends email to buyer when their offer is accepted with payment instructions.
    """
    if not resend.api_key:
        print("WARNING: RESEND_API_KEY not found. Email not sent.")
        return

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }}
            .header {{ background-color: #10b981; color: white; padding: 30px; text-align: center; }}
            .content {{ padding: 30px; }}
            .highlight-box {{ background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }}
            .info-card {{ background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .button {{ display: inline-block; background-color: #f43f5e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; }}
            .footer {{ background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #888; }}
            .steps {{ background-color: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0; font-size: 32px;">🎉 Offer Accepted!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Congratulations on your successful offer</p>
            </div>
            <div class="content">
                <p>Dear <strong>{buyer_name}</strong>,</p>
                <p>Fantastic news! Your offer for <strong>{property_title}</strong> has been accepted by the seller!</p>
                
                <div class="highlight-box">
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">Your Offer Amount</p>
                    <h2 style="margin: 5px 0; font-size: 36px;">₹{offer_amount:,.0f}</h2>
                </div>

                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f43f5e;">📍 Property Details</h3>
                    <p style="margin: 5px 0;"><strong>{property_title}</strong></p>
                    <p style="margin: 5px 0; color: #666;">{property_address}</p>
                </div>

                <div class="steps">
                    <h3 style="margin-top: 0;">⚡ Next Step: Reserve Your Booking</h3>
                    <p style="margin: 10px 0;">To secure this property and proceed with the deal settlement:</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Pay a booking token of <strong>₹{token_amount:,.0f}</strong> (0.1% of property value)</li>
                        <li>This reserves the property exclusively for you</li>
                        <li>You'll receive a reservation booking certificate</li>
                        <li>Payment is processed through our secure platform</li>
                    </ul>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="{deal_url}" class="button">Pay Token & Reserve Booking 🔒</a>
                </div>

                <p style="margin-top: 30px; font-size: 14px; color: #666;">
                    <strong>Important:</strong> Complete this step within the next 48 hours to secure your booking.
                </p>
            </div>
            <div class="footer">
                <p>Sent via NestFind - The Future of Real Estate</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        r = resend.Emails.send({
            "from": "NestFind <onboarding@resend.dev>",
            "to": to_email,
            "subject": f"🎉 Offer Accepted: {property_title}",
            "html": html_content
        })
        print(f"Offer acceptance email sent successfully: {r}")
    except Exception as e:
        print(f"Failed to send offer acceptance email: {e}")


def send_booking_reserved_email(
    to_email: str,
    buyer_name: str,
    property_title: str,
    property_address: str,
    token_amount: float,
    reservation_pdf_url: str,
    deal_url: str
):
    """
    Sends email to buyer after token payment with reservation booking PDF.
    """
    if not resend.api_key:
        print("WARNING: RESEND_API_KEY not found. Email not sent.")
        return

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }}
            .header {{ background-color: #8b5cf6; color: white; padding: 30px; text-align: center; }}
            .content {{ padding: 30px; }}
            .success-badge {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }}
            .pdf-card {{ background-color: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }}
            .button {{ display: inline-block; background-color: #f43f5e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; }}
            .button-secondary {{ display: inline-block; background-color: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-left: 10px; }}
            .footer {{ background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #888; }}
            .next-steps {{ background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0; font-size: 32px;">✅ Booking Reserved!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your property is now exclusively reserved</p>
            </div>
            <div class="content">
                <p>Dear <strong>{buyer_name}</strong>,</p>
                
                <div class="success-badge">
                    <h2 style="margin: 0; font-size: 28px;">🎊 Payment Successful!</h2>
                    <p style="margin: 10px 0 0 0; font-size: 18px;">Token Amount: ₹{token_amount:,.0f}</p>
                </div>

                <p>Congratulations! Your booking token has been successfully processed, and <strong>{property_title}</strong> is now reserved exclusively for you.</p>

                <div class="pdf-card">
                    <h3 style="margin-top: 0; color: #92400e;">📄 Your Reservation Certificate</h3>
                    <p style="margin: 10px 0;">Download your official reservation booking certificate:</p>
                    <a href="{reservation_pdf_url}" class="button">📥 Download Certificate</a>
                </div>

                <div class="next-steps">
                    <h3 style="margin-top: 0; color: #1e40af;">🚀 What's Next?</h3>
                    <ol style="margin: 10px 0; padding-left: 20px;">
                        <li style="margin: 8px 0;">The seller will schedule the registration date</li>
                        <li style="margin: 8px 0;">You'll need to pay the platform commission (0.9%)</li>
                        <li style="margin: 8px 0;">Complete the document verification</li>
                        <li style="margin: 8px 0;">Finalize the registration and get your property!</li>
                    </ol>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="{deal_url}" class="button-secondary">View Deal Progress 👉</a>
                </div>

                <p style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
                    Keep this certificate safe. You'll need it for the registration process.
                </p>
            </div>
            <div class="footer">
                <p>Sent via NestFind - The Future of Real Estate</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        r = resend.Emails.send({
            "from": "NestFind <onboarding@resend.dev>",
            "to": to_email,
            "subject": f"✅ Booking Reserved: {property_title}",
            "html": html_content
        })
        print(f"Booking reserved email sent successfully: {r}")
    except Exception as e:
        print(f"Failed to send booking reserved email: {e}")


def send_registration_scheduled_email(
    to_email: str,
    buyer_name: str,
    property_title: str,
    registration_date: str,
    is_rescheduled: bool = False
):
    """
    Sends email to buyer when registration date is scheduled or rescheduled.
    """
    if not resend.api_key:
        print("WARNING: RESEND_API_KEY not found. Email not sent.")
        return

    subject_prefix = "📅 Registration Rescheduled" if is_rescheduled else "📅 Registration Scheduled"
    title_text = "Registration Date Updated" if is_rescheduled else "Registration Date Set"
    message_text = "The registration date for your property has been updated." if is_rescheduled else "Great news! The registration date for your property has been scheduled."

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }}
            .header {{ background-color: #f59e0b; color: white; padding: 30px; text-align: center; }}
            .content {{ padding: 30px; }}
            .date-card {{ background-color: #fffbeb; border: 2px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }}
            .footer {{ background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #888; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0; font-size: 28px;">{title_text}</h1>
            </div>
            <div class="content">
                <p>Dear <strong>{buyer_name}</strong>,</p>
                <p>{message_text}</p>
                
                <div class="date-card">
                    <h3 style="margin-top: 0; color: #b45309;">Registration Date</h3>
                    <h2 style="margin: 10px 0; font-size: 24px; color: #1f2937;">{registration_date}</h2>
                    <p style="margin: 5px 0; font-size: 14px; color: #666;">Property: {property_title}</p>
                </div>

                <p>Please ensure you are available on this date with all necessary documents.</p>
            </div>
            <div class="footer">
                <p>Sent via NestFind - The Future of Real Estate</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        r = resend.Emails.send({
            "from": "NestFind <onboarding@resend.dev>",
            "to": to_email,
            "subject": f"{subject_prefix}: {property_title}",
            "html": html_content
        })
        print(f"Registration scheduled email sent successfully: {r}")
    except Exception as e:
        print(f"Failed to send registration scheduled email: {e}")


def send_email(to_email: str, subject: str, body: str):
    """
    Generic function to send specific HTML email.
    """
    if not resend.api_key:
        print("WARNING: RESEND_API_KEY not found. Email not sent.")
        return

    try:
        r = resend.Emails.send({
            "from": "NestFind <onboarding@resend.dev>",
            "to": to_email,
            "subject": subject,
            "html": body
        })
        print(f"Generic email sent successfully: {r}")
    except Exception as e:
        print(f"Failed to send email: {e}")


def send_visit_otp_email(
    to_email: str,
    buyer_name: str,
    property_title: str,
    property_address: str,
    otp: str,
    agent_name: str
):
    """
    Sends OTP via email to buyer for visit verification when agent starts the visit.
    """
    if not resend.api_key:
        print("WARNING: RESEND_API_KEY not found. OTP email not sent.")
        return

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; }}
            .content {{ padding: 30px; }}
            .otp-box {{ background-color: #1f2937; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }}
            .otp-code {{ font-size: 48px; font-weight: bold; color: #10b981; letter-spacing: 12px; margin: 10px 0; font-family: monospace; }}
            .otp-label {{ color: #9ca3af; font-size: 14px; margin-bottom: 5px; }}
            .info-card {{ background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .warning {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }}
            .footer {{ background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #888; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin:0; font-size: 28px;">🔐 Visit Verification Code</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Your agent has arrived!</p>
            </div>
            <div class="content">
                <p>Hi <strong>{buyer_name}</strong>,</p>
                <p>Your agent <strong>{agent_name}</strong> is ready to start the visit for the property you requested. Please share this verification code with them:</p>
                
                <div class="otp-box">
                    <p class="otp-label">YOUR VERIFICATION CODE</p>
                    <p class="otp-code">{otp}</p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">Valid for 15 minutes</p>
                </div>

                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f43f5e;">📍 Property Details</h3>
                    <p style="margin: 5px 0;"><strong>{property_title}</strong></p>
                    <p style="margin: 5px 0; color: #666;">{property_address}</p>
                </div>

                <div class="warning">
                    <strong>⚠️ Security Notice:</strong><br>
                    Only share this code when you meet the agent in person. The agent cannot start the visit without this code.
                </div>

                <p style="font-size: 14px; color: #666;">
                    Once verified, your agent will guide you through the property tour. After the visit, you'll be able to rate your experience.
                </p>
            </div>
            <div class="footer">
                <p>Sent via NestFind - The Future of Real Estate</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        r = resend.Emails.send({
            "from": "NestFind <onboarding@resend.dev>",
            "to": to_email,
            "subject": f"🔐 Visit Code: {otp} - {property_title}",
            "html": html_content
        })
        print(f"Visit OTP email sent successfully: {r}")
    except Exception as e:
        print(f"Failed to send visit OTP email: {e}")

