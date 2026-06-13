
import json
import requests

import os
BREVO_KEY = os.environ.get("BREVO_API_KEY", "your_api_key_here")
TARGET_EMAIL = "forceplayz127@gmail.com"

# The 5-card template provided by the user
WELCOME_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #f0f9ff; font-family: 'Inter', sans-serif; color: #1e293b; }
        .wrapper { background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #e0f2fe 100%); padding: 40px 20px; }
        .container { max-width: 960px; margin: 0 auto; background: rgba(255, 255, 255, 0.7); border: 2px solid #ffffff; border-radius: 40px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); backdrop-filter: blur(10px); }
        .header { display: flex; align-items: center; justify-content: center; padding: 30px; text-align: left; }
        .logo { width: 70px; height: 70px; margin: 0 20px 0 0; filter: drop-shadow(0 10px 15px rgba(14,165,233,0.1)); }
        .app-name { font-size: 32px; font-weight: 900; letter-spacing: -0.05em; margin: 0; color: #0ea5e9; }
        .tagline { color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; margin-top: 4px; }
        .hero { text-align: center; padding: 0 30px 30px; }
        .hero h2 { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 10px; letter-spacing: -0.02em; }
        .hero p { color: #475569; line-height: 1.7; font-size: 16px; }
        .section { padding: 0 20px 20px; text-align: center; font-size: 0; }
        .card { background: rgba(255, 255, 255, 0.5); border: 2px solid #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.03); margin: 0 1% 25px; transition: all 0.3s ease; display: inline-block; width: 31%; text-align: left; font-size: 14px; vertical-align: top; }
        .card-img { width: 100%; height: 160px; object-fit: cover; display: block; border-bottom: 1px solid #f1f5f9; image-rendering: -webkit-optimize-contrast; }
        .card-content { padding: 15px; }
        .card-title { color: #0ea5e9; font-size: 16px; font-weight: 900; margin: 0 0 10px 0; letter-spacing: -0.04em; }
        .card-text { color: #64748b; font-size: 11px; line-height: 1.5; margin: 0; }
        .cta-container { text-align: center; padding: 0 20px 40px; clear: both; }
        .cta-button { display: inline-block; padding: 20px 50px; background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); color: #ffffff !important; border-radius: 20px; text-decoration: none; font-weight: 800; font-size: 17px; box-shadow: 0 15px 30px rgba(14, 165, 233, 0.3); }
        .footer { padding: 30px; text-align: center; background: rgba(255, 255, 255, 0.4); border-top: 1px solid rgba(255, 255, 255, 0.5); clear: both; }
        .footer-text { font-size: 11px; color: #94a3b8; margin: 6px 0; line-height: 1.5; }
        .footer-v { font-weight: 800; color: #64748b; }
        @media only screen and (max-width: 640px) {
            .container { max-width: 680px; border-radius: 24px; padding: 10px; }
            .header { display: block; text-align: center; padding: 40px 20px 20px; }
            .logo { margin: 0 auto 20px; width: 80px; height: 80px; }
            .card { display: block; width: 96%; margin: 0 auto 25px; }
            .card-img { height: auto; object-fit: contain; }
            .card-title { font-size: 19px; }
            .card-text { font-size: 13px; }
            .section { padding: 0 20px 20px; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="logo-container">
                    <img src="https://hzostigkcsursgbbqudn.supabase.co/storage/v1/object/public/system-assets/logo.png" alt="" class="logo">
                </div>
                <div class="header-text">
                    <h1 class="app-name">NEMESIS</h1>
                    <p class="tagline">Intelligence Protocol Activated</p>
                </div>
            </div>
            <div class="hero">
                <h2>Welcome to the Nexus</h2>
                <p>Your identity uplink is now active. Explore the most advanced academic platform designed to expand your cognitive potential.</p>
            </div>
            <div class="section">
                <div class="card">
                    <img src="https://hzostigkcsursgbbqudn.supabase.co/storage/v1/object/public/system-assets/nemesis_home.png" alt="" class="card-img">
                    <div class="card-content">
                        <h3 class="card-title">01. Dashboard</h3>
                        <p class="card-text">Monitor tasks, shared files, and upcoming deadlines in one sleek view.</p>
                    </div>
                </div>
                <div class="card">
                    <img src="https://hzostigkcsursgbbqudn.supabase.co/storage/v1/object/public/system-assets/nemesis_organizer.png" alt="" class="card-img">
                    <div class="card-content">
                        <h3 class="card-title">02. Organizer</h3>
                        <p class="card-text">Structure your subjects and topics with frictionless ease.</p>
                    </div>
                </div>
                <div class="card">
                    <img src="https://hzostigkcsursgbbqudn.supabase.co/storage/v1/object/public/system-assets/nemesis_groups.png" alt="" class="card-img">
                    <div class="card-content">
                        <h3 class="card-title">03. Groups</h3>
                        <p class="card-text">Collaborate with your team in high-bandwidth spaces.</p>
                    </div>
                </div>
                <div class="card">
                    <img src="https://hzostigkcsursgbbqudn.supabase.co/storage/v1/object/public/system-assets/nemesis_planner.png" alt="" class="card-img">
                    <div class="card-content">
                        <h3 class="card-title">04. Planner</h3>
                        <p class="card-text">Track deadlines and milestones through an intelligent matrix.</p>
                    </div>
                </div>
                <div class="card">
                    <img src="https://hzostigkcsursgbbqudn.supabase.co/storage/v1/object/public/system-assets/nemesis_profile.png" alt="" class="card-img">
                    <div class="card-content">
                        <h3 class="card-title">05. Profile</h3>
                        <p class="card-text">Track your progress and customized identity profile.</p>
                    </div>
                </div>
            </div>
            <div class="cta-container">
                <a href="https://nemesis-xi.vercel.app" class="cta-button">LAUNCH THE PLATFORM</a>
            </div>
            <div class="footer">
                <p class="footer-text"><span class="footer-v">Automatic Notification Engine v1.0.4</span></p>
                <p class="footer-text">Built with ❤️ by Team Genesis. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

def send_welcome():
    print(f"📡 Dispatching final welcome protocol to: {TARGET_EMAIL}...")
    
    payload = {
        "sender": {"name": "Nemesis Protocol", "email": "shiresh.kashyap@gmail.com"},
        "to": [{"email": TARGET_EMAIL}],
        "subject": "Welcome to the Nexus | Identity Uplink Confirmed",
        "htmlContent": WELCOME_HTML
    }
    
    response = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={
            "accept": "application/json",
            "api-key": BREVO_KEY,
            "content-type": "application/json"
        },
        data=json.dumps(payload)
    )
    
    if response.status_code in [201, 202, 200]:
        print("✅ Welcome template dispatched successfully!")
    else:
        print(f"❌ Dispatch failed: {response.text}")

if __name__ == "__main__":
    send_welcome()
