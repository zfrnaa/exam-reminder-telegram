# 🤖 Telegram Exam & Booking Reminder Engine for Google Sheets

> Never miss an exam registration deadline or study session again. Receive dynamic progress updates and time-sensitive reminders straight to your Telegram app!

---

## 📌 Overview

This Google Apps Script turns a custom Google Sheet into an automated exam tracking engine. It monitors your upcoming certification/exam dates, tracks your study progress across subjects, and delivers scheduled notification alerts to your private Telegram chat or channel.

---

## ✨ Features

- **🎟️ Booking & Voucher Alerts:** Warns you before voucher expiration or registration closing dates pass.
- **📚 Visual Study Progress:** Displays real-time progress bars (`🟩🟩🟩⬜⬜ 60%`) based on completed study topics.
- **⏰ Flexible Custom Schedules:** Configure reminders to run daily or on specific days (e.g., _Monday, Wednesday, Friday_) at your preferred time.

- **🔒 Privacy-First Design:** Bot credentials (Token & Chat ID) are stored securely inside Google's hidden `ScriptProperties`—never exposed inside cell text or public exports.

---

## 🚀 Quick Start & Setup Guide

### Step 1: Copy the Master Google Sheet Template

1. Open the [Exam Schedule Reminder Sheet Template](https://docs.google.com/spreadsheets/d/1JIqQNj2gPDhQR4NP1_yw8fDjBSo0PaDgOrZaue4HiCU/copy).
2. Click **Make a copy** to save a personal instance in your own Google Drive.

---

### Step 2: Create Your Telegram Bot

1. Open your Telegram app and search for **`@BotFather`**.
2. Send the command `/newbot` and follow the quick prompts to name your bot.
3. **Copy the HTTP API Token** provided by `@BotFather` (looks like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
4. Open the newly created bot, and tap **Start** and send one any message, like **"Hello"**.

---

### Step 3: Connect Bot to Your Google Sheet

1. Open your newly copied Google Sheet.
2. Refresh the page until you see the custom menu bar item: **🤖 Telegram Bot**.
3. Click **🤖 Telegram Bot > 1. Fetch Chat ID Automatically**.
4. When prompted, paste your **Telegram Bot Token** and click **OK**.
5. You will see a success message confirming your Chat ID was detected and saved!

---

### Step 4: Verify & Install Automated Schedule

1. Click **🤖 Telegram Bot > 2. Send Test Message**. Check your Telegram app for a confirmation notification.
2. Navigate to the **`Config`** tab at the bottom of your sheet:
   - **Cell B2:** Set the hour of the day to receive notifications (e.g., `9` for 9:00 AM).
   - **Cell B3:** Type the trigger days (e.g., `Monday, Wednesday, Friday` or `Everyday`).
3. Click **🤖 Telegram Bot > 3. Install Custom Schedule Triggers** to activate background execution.

---

> [!IMPORTANT]
> Important Cautions & Privacy Notes
>
> 🔒 **Keep Your Telegram Bot Token Secret:** A Telegram bot token grants the ability to send messages via your bot. Don’t share access to the Apps Script project or the spreadsheet editor status with people you don’t trust.
>
> 🕒 **Timezone Alignment:** Triggers run using your Google Sheet’s timezone. Verify it in **File > Settings > Timezone**.
>
> 🔑 **Authorization Prompt:** On first run, Google may show an authorization screen for your Apps Script project. Only approve if you trust the project and are running it from your own account.

---

## 💡 Pro Tips for Best Results

- 🔗 **Custom Markdown Links:** In the **Exams** tab, you can input raw URLs or custom Markdown links (e.g., `[Exam Portal](https://example.com)`) into the Study/Booking columns to make your Telegram notification buttons interactive.
- 📅 **Marking Exams Complete:** When you finish an exam, change its status in Column F to **"Completed"**. The script will automatically skip it during daily checks.
- 🧪 **Manual Test Run:** Want to preview how your reminder looks right now? Click **🤖 Telegram Bot > 4. Run Manual Check Now** at any time.

---

## 📜 License

Distributed under the [MIT License](LICENSE). Free for personal and educational use!
