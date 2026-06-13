import { 
  WELCOME_TEMPLATE, 
  OTP_TEMPLATE, 
  ACCOUNT_DELETED_TEMPLATE, 
  ACCOUNT_SUSPENDED_TEMPLATE, 
  FORGOT_PASSWORD_TEMPLATE 
} from '../src/lib/emailTemplates';

const BREVO_API_KEY = process.env.BREVO_API_KEY || "your_api_key_here";
const SENDER_EMAIL = "shiresh.kashyap@gmail.com";
const TARGET_EMAIL = "forceplayz127@gmail.com";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendMail(subject: string, html: string) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: "Nemesis Protocol", email: SENDER_EMAIL },
        to: [{ email: TARGET_EMAIL }],
        subject: `${subject} [Tier-Audit-${Math.random().toString(36).substring(7).toUpperCase()}]`,
        htmlContent: html
      })
    });

    if (response.ok) {
      console.log(`✅ Sent: ${subject} | Status: ${response.status}`);
    } else {
      const data = await response.json();
      console.error(`❌ Failed: ${subject} | Error: ${JSON.stringify(data)}`);
    }
  } catch (error: any) {
    console.error(`❌ Failed: ${subject} | Error: ${error.message}`);
  }
}

async function runAudit() {
  console.log(`🚀 Initiating Full Tier Audit Dispatch to ${TARGET_EMAIL}...`);
  
  await sendMail("Welcome to the Nexus", WELCOME_TEMPLATE("Shireesh"));
  await sleep(1500);
  
  await sendMail("Identity Access Protocol", OTP_TEMPLATE("777888"));
  await sleep(1500);
  
  await sendMail("Archive Protocol Activated", ACCOUNT_DELETED_TEMPLATE());
  await sleep(1500);
  
  await sendMail("Security Alert: Lockdown", ACCOUNT_SUSPENDED_TEMPLATE("Violation of Core Integrity Protocol Alpha-9"));
  await sleep(1500);
  
  await sendMail("Credential Recovery Sync", FORGOT_PASSWORD_TEMPLATE("https://nemesis-xi.vercel.app/reset-password?token=audit-token-ref-99"));
  
  console.log(`\n🏁 Audit Complete. Please check your inbox at ${TARGET_EMAIL}.`);
}

runAudit();
