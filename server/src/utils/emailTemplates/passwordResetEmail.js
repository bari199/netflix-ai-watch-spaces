const passwordResetEmail = ({ name, otp }) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset OTP</title>
      </head>

      <body style="margin:0;padding:0;background:#080808;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:35px auto;background:#111;border-radius:14px;overflow:hidden;border:1px solid #292929;">

          <div style="background:#080808;padding:24px;text-align:center;">
            <h1 style="margin:0;color:#e50914;font-size:24px;letter-spacing:2px;">
              NETFLIX AI WATCH SPACES
            </h1>
          </div>

          <div style="background:#000;text-align:center;padding:5px 15px;">
            <img
              src="${(process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "")}/images/createwatch.png"
              alt="Netflix AI Watch Spaces"
              width="540"
              style="display:block;width:100%;max-width:540px;height:auto;margin:auto;border:0;"
            />
          </div>

          <div style="padding:30px;color:#eee;">
            <h2 style="color:#fff;">Password Reset Verification</h2>

            <p>Hello ${name || "there"},</p>

            <p style="color:#ccc;line-height:1.7;">
              We received a request to reset your account password.
              Use the verification code below to continue.
            </p>

            <div style="margin:30px 0;padding:22px;background:#1c1c1c;border-radius:8px;text-align:center;">
              <p style="margin:0 0 12px;color:#aaa;font-size:13px;">
                YOUR VERIFICATION CODE
              </p>

              <div style="color:#e50914;font-size:36px;font-weight:bold;letter-spacing:10px;">
                ${otp}
              </div>
            </div>

            <p style="color:#ccc;line-height:1.7;">
              This OTP expires in <strong style="color:#fff;">10 minutes</strong>.
              You have a maximum of 5 attempts to enter it correctly.
            </p>

            <p style="color:#ccc;line-height:1.7;">
              If you did not request this password reset, please ignore this email.
            </p>

            <p style="margin-top:30px;color:#ccc;">
              Regards,<br />
              <strong style="color:#fff;">Netflix AI Watch Spaces Team</strong>
            </p>
          </div>

          <div style="background:#080808;padding:20px;text-align:center;border-top:1px solid #292929;">
            <p style="margin:0;color:#888;font-size:12px;">
              © ${new Date().getFullYear()} Netflix AI Watch Spaces.
              All rights reserved.
            </p>
            <p style="margin:8px 0 0;color:#666;font-size:11px;">
              This is an automated email. Please do not reply.
            </p>
          </div>

        </div>
      </body>
    </html>
  `;
};

export default passwordResetEmail;
