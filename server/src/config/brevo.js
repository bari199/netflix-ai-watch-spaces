const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const sendEmail = async ({ to, subject, htmlContent }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Netflix AI Watch Spaces";

  if (!apiKey || !senderEmail) {
    throw new Error("Brevo environment variables are missing");
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to send email through Brevo");
  }

  return result;
};

export default sendEmail;
