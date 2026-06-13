
import { EMAIL_TEMPLATES } from '../src/lib/emailTemplates';

const BREVO_KEY = process.env.BREVO_API_KEY || "your_api_key_here";
const TARGET_EMAIL = "forceplayz127@gmail.com";

async function sendWelcome() {
  console.log(`📡 Dispatching welcome protocol to: ${TARGET_EMAIL}...`);
  
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "Nemesis Protocol", email: "shiresh.kashyap@gmail.com" },
        to: [{ email: TARGET_EMAIL }],
        subject: "Welcome to the Nexus | Identity Uplink Confirmed",
        htmlContent: EMAIL_TEMPLATES.welcome
      })
    });
    
    if (response.ok) {
      console.log("✅ Welcome template dispatched successfully!");
    } else {
      const error = await response.text();
      console.error("❌ Dispatch failed:", error);
    }
  } catch (err) {
    console.error("❌ Execution error:", err);
  }
}

sendWelcome();
