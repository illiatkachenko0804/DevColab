package com.devcollab.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Sends transactional email through whatever SMTP relay is configured
 * ({@code spring.mail.*}) — works with any provider (Resend, Brevo, SendGrid,
 * Mailgun, SES, Outlook, …) and delivers to any recipient inbox.
 *
 * <p>When no SMTP is configured the code is logged instead, so the flow is
 * fully testable in dev without credentials.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final String from;

    public EmailService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${app.mail.from:DevCollab <no-reply@devcollab.app>}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    /** @return true if a real email was dispatched, false if it was only logged (dev). */
    public boolean sendVerificationCode(String to, String code) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.warn("================ DEV EMAIL (no SMTP configured) ================");
            log.warn("  Verification code for {}: {}", to, code);
            log.warn("================================================================");
            return false;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("Your DevCollab verification code");
            helper.setText(htmlBody(code), true);
            sender.send(message);
            log.info("Sent verification email to {}", to);
            return true;
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", to, e.getMessage());
            log.warn("[FALLBACK] Verification code for {}: {}", to, code);
            return false;
        }
    }

    private String htmlBody(String code) {
        return """
                <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:auto;padding:24px">
                  <h2 style="margin:0 0 8px">Verify your email</h2>
                  <p style="color:#555;margin:0 0 24px">Enter this code in DevCollab to finish creating your account.</p>
                  <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f5f5f7;border-radius:12px;padding:16px;text-align:center">%s</div>
                  <p style="color:#888;font-size:13px;margin-top:24px">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
                </div>
                """.formatted(code);
    }
}
