const verificationEmail = ({ name, verificationUrl }) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email</title>
      </head>
      <body style="margin:0; padding:24px; background:#f4f6f8; font-family:Arial,sans-serif;">
        <div style="max-width:520px; margin:auto; padding:32px; background:#ffffff; border-radius:12px;">
          <h2 style="color:#042630;">Welcome to Netflix AI Watch Spaces!</h2>

          <p>Hello ${name},</p>

          <p>
            Thank you for registering. Please verify your email address
            by clicking the button below.
          </p>

          <a
            href="${verificationUrl}"
            style="display:inline-block; padding:14px 24px; background:#042630; color:#ffffff; text-decoration:none; border-radius:6px;"
          >
            Verify Email
          </a>

          <p style="margin-top:24px; color:#666666; font-size:13px;">
            This verification link expires in 15 minutes.
            If you did not create this account, you can ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;
};

export default verificationEmail;
