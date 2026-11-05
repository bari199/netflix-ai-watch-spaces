const welcomeEmail = ({ name }) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Netflix AI Watch Spaces</title>
      </head>

      <body style="margin:0; padding:24px; background:#f4f6f8; font-family:Arial,sans-serif;">
        <div style="max-width:520px; margin:auto; padding:32px; background:#ffffff; border-radius:12px;">

          <h1 style="color:#E50914; text-align:center;">
            NETFLIX
          </h1>

          <h2 style="color:#042630;">
            Welcome aboard, ${name}!
          </h2>

          <p>
            Your email has been successfully verified.
          </p>

          <p>
            Welcome to Netflix AI Watch Spaces!
            Your account is now ready.
          </p>

          <p>
            Get ready to enjoy synchronized watch parties,
            real-time interactions and AI-powered experiences.
          </p>

          <p style="margin-top:28px; color:#666666; font-size:13px;">
            Thank you for joining us.
            <br />
            The Netflix AI Watch Spaces Team
          </p>

        </div>
      </body>
    </html>
  `;
};

export default welcomeEmail;
