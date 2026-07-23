/**
 * Dynamic Telegram Exam & Booking Reminder Engine
 * Public Release Master Script (Container-Bound to Google Sheet)
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🤖 Telegram Bot')
    .addItem('1. Fetch Chat ID Automatically', 'fetchChatId')
    .addItem('2. Send Test Message', 'sendTestMessage')
    .addSeparator()
    .addItem('3. Install Custom Schedule Triggers', 'setupCustomTriggers')
    .addItem('4. Run Manual Check Now', 'sendTelegramReminder')
    .addToUi();
}

/**
 * 1. CONFIG & CREDENTIAL HELPERS (Secured via Script Properties)
 */
function getBotConfig_() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_BOT_TOKEN') || "";
  const chatId = props.getProperty('TELEGRAM_CHAT_ID') || "";

  return { token: token, chatId: chatId };
}

/**
 * Prompts user for Bot Token, detects Chat ID via API, and saves to Script Properties.
 */
function fetchChatId() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();

  // Prompt user to enter Token securely if not set
  let token = props.getProperty('TELEGRAM_BOT_TOKEN');
  
  if (!token) {
    const response = ui.prompt(
      "Setup Step 1: Telegram Bot Token",
      "Please paste your Telegram Bot Token below:",
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() !== ui.Button.OK || !response.getResponseText().trim()) {
      ui.alert("Setup Cancelled", "Bot Token is required to connect Telegram.", ui.ButtonSet.OK);
      return;
    }

    token = response.getResponseText().trim();
    props.setProperty('TELEGRAM_BOT_TOKEN', token);
  }

  // Fetch Chat ID from Telegram API
  const url = `https://api.telegram.org/bot${token}/getUpdates`;

  try {
    const response = UrlFetchApp.fetch(url);
    const data = JSON.parse(response.getContentText());

    if (!data.ok || !data.result || data.result.length === 0) {
      ui.alert(
        "No Messages Found Yet",
        "Your bot hasn't received any messages yet!\n\n1. Open Telegram and search for your bot.\n2. Tap 'Start' or send any text message (e.g., 'Hello').\n3. Click this menu item again.",
        ui.ButtonSet.OK
      );
      return;
    }

    const lastUpdate = data.result[data.result.length - 1];
    const chatId = lastUpdate.message ? lastUpdate.message.chat.id : lastUpdate.my_chat_member.chat.id;

    // Save Chat ID securely
    props.setProperty('TELEGRAM_CHAT_ID', chatId.toString());

    ui.alert(
      "Success! Connected 🎉", 
      `Chat ID (${chatId}) was detected and securely saved to your Script Properties!\n\nYou can now run a test message or set up triggers.`, 
      ui.ButtonSet.OK
    );
  } catch (error) {
    // Clear token if invalid so user can retry
    props.deleteProperty('TELEGRAM_BOT_TOKEN');
    ui.alert("Connection Error", `Failed to connect. Token might be invalid.\n\nDetails: ${error.toString()}`, ui.ButtonSet.OK);
  }
}

/**
 * Sends a test notification to verify credentials.
 */
function sendTestMessage() {
  const ui = SpreadsheetApp.getUi();
  const config = getBotConfig_();

  if (!config.token || !config.chatId || config.chatId === "TELEGRAM_CHAT_ID") {
    ui.alert(
      "Setup Incomplete", 
      "Please complete Steps 1 & 2 first:\n\n• Cell B2: Bot Token\n• Cell B3: Run 'Fetch Chat ID Automatically'", 
      ui.ButtonSet.OK
    );
    return;
  }

  const message = "✅ *Telegram Bot Connected Successfully!*\nYour Google Sheet exam reminder automation is active.";
  const success = sendMessage_(config.token, config.chatId, message);

  if (success) {
    ui.alert("Test Notification Sent!", "Check your Telegram app—you should have received a confirmation message.", ui.ButtonSet.OK);
  } else {
    ui.alert("Delivery Failed", "Failed to send message. Double-check your Bot Token (B2) and Chat ID (B3).", ui.ButtonSet.OK);
  }
}

/**
 * 2. PARSING & PROGRESS HELPERS
 */

/**
 * Parses user link input (supports custom Markdown `[Label](URL)` or raw URLs).
 */
function formatLink_(cellValue, defaultLabel) {
  if (!cellValue) return "";
  const str = cellValue.toString().trim();
  if (!str) return "";

  if (/^\[.+\]\(https?:\/\/.+\)$/i.test(str)) {
    return str;
  }

  if (/^https?:\/\//i.test(str)) {
    return `[${defaultLabel}](${str})`;
  }

  return str;
}

/**
 * Safely parses dates from Google Sheets without UTC timezone shifting.
 */
function parseSheetDate_(val) {
  if (!val) return null;

  if (val instanceof Date) {
    val.setHours(0, 0, 0, 0);
    return val;
  }

  const parts = val.toString().trim().split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  return null;
}

/**
 * Calculates subject study progress from the 'Progress' tab and returns a visual bar.
 */
function getProgressSummary_(subjectName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Progress");
  if (!sheet) return "";

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return "";

  let totalTopics = 0;
  let completedTopics = 0;

  for (let i = 1; i < data.length; i++) {
    // Column A: ID, Column B: Subject, Column C: Topic Name, Column D: Status (Column E: Notes)
    const [, rowSubject, topicName, status] = data[i];

    if (rowSubject && rowSubject.toString().trim().toLowerCase() === subjectName.toLowerCase() && topicName) {
      totalTopics++;
      if (status && status.toString().trim().toLowerCase() === "completed") {
        completedTopics++;
      }
    }
  }

  if (totalTopics === 0) return "";

  const percentage = Math.round((completedTopics / totalTopics) * 100);
  const filledBlocks = Math.round(percentage / 10);
  const emptyBlocks = 10 - filledBlocks;

  const progressBar = "🟩".repeat(filledBlocks) + "⬜".repeat(emptyBlocks);

  return `\n📊 Progress: ${progressBar} ${percentage}% (${completedTopics}/${totalTopics} topics)`;
}

/**
 * 3. MAIN REMINDER ENGINE
 */
function sendTelegramReminder() {
  const config = getBotConfig_();
  // Ensure token and a valid chatId exist before proceeding
  if (!config.token || !config.chatId || config.chatId === "TELEGRAM_CHAT_ID") {
    Logger.log("Missing valid Telegram credentials. Skipping broadcast.");
    return;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Exams");
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  let messageBlocks = [];

  for (let i = 1; i < data.length; i++) {
    const [id, subject, voucherDeadlineRaw, examDateRaw, studyInput, bookingInput, status] = data[i];

    if (!subject || status === "Completed") continue;

    const voucherDeadline = parseSheetDate_(voucherDeadlineRaw);
    const examDate = parseSheetDate_(examDateRaw);

    const studyLink = formatLink_(studyInput, "Access Study Materials");
    const bookingLink = formatLink_(bookingInput, "Book Exam Here");

    if (examDate && today <= examDate) {
      const daysToExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

      // 1. Booking / Voucher Deadline Alert
      if (voucherDeadline && today <= voucherDeadline) {
        let bookingBlock = `🎟️ *${subject} - Booking / Voucher Alert*\n` +
                           `Secure your exam seat before the deadline!\n` +
                           `⏰ Deadline: ${Utilities.formatDate(voucherDeadline, Session.getScriptTimeZone(), "yyyy-MM-dd")}`;
        
        if (bookingLink) bookingBlock += `\n👉 ${bookingLink}`;
        messageBlocks.push(bookingBlock);
      }

      // 2. Study Reminder Alert with Visual Progress Bar
      const progressSummary = getProgressSummary_(subject);
      let studyBlock = `📚 *${subject} - Study Reminder*\n` +
                       `🔥 **${daysToExam} days** remaining until exam day.${progressSummary}`;
      
      if (studyLink) studyBlock += `\n👉 ${studyLink}`;

      messageBlocks.push(studyBlock);
    }
  }

  if (messageBlocks.length === 0) {
    Logger.log("No active exam windows found for today. Skipping broadcast.");
    return;
  }

  const sheetFooter = `⚙️ *Need to add, update, or remove an exam?*\n👉 [Edit Your Exam Schedule Sheet](${sheetUrl})`;
  const finalMessage = "🏁 *Your Certification Progress Update* 🏁\n\n" + 
                       messageBlocks.join("\n\n---\n\n") + 
                       "\n\n---\n\n" + 
                       sheetFooter;

  sendMessage_(config.token, config.chatId, finalMessage);
}

/**
 * 4. CUSTOM TRIGGER INSTALLER
 */
function setupCustomTriggers() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Config");

  if (!sheet) {
    ui.alert("Tab Missing", "The 'Config' tab was not found. Please ensure the bottom tab is named 'Config'.", ui.ButtonSet.OK);
    return;
  }

  const hourInput = parseInt(sheet.getRange("B2").getValue(), 10);
  const daysInput = sheet.getRange("B3").getValue().toString().trim();

  const hour = (!isNaN(hourInput) && hourInput >= 0 && hourInput <= 23) ? hourInput : 9;

  if (!daysInput) {
    ui.alert("Schedule Missing", "Please specify trigger days in Cell B3 (e.g., Tuesday, Saturday or Everyday).", ui.ButtonSet.OK);
    return;
  }

  const allTriggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < allTriggers.length; i++) {
    ScriptApp.deleteTrigger(allTriggers[i]);
  }

  const dayMap = {
    "SUNDAY": ScriptApp.WeekDay.SUNDAY,
    "MONDAY": ScriptApp.WeekDay.MONDAY,
    "TUESDAY": ScriptApp.WeekDay.TUESDAY,
    "WEDNESDAY": ScriptApp.WeekDay.WEDNESDAY,
    "THURSDAY": ScriptApp.WeekDay.THURSDAY,
    "FRIDAY": ScriptApp.WeekDay.FRIDAY,
    "SATURDAY": ScriptApp.WeekDay.SATURDAY
  };

  let daysList = [];
  if (daysInput.toUpperCase() === "EVERYDAY" || daysInput.toUpperCase() === "DAILY") {
    daysList = Object.keys(dayMap);
  } else {
    daysList = daysInput.split(",").map(d => d.trim().toUpperCase());
  }

  let installedCount = 0;

  daysList.forEach(dayStr => {
    if (dayMap[dayStr]) {
      ScriptApp.newTrigger("sendTelegramReminder")
        .timeBased()
        .onWeekDay(dayMap[dayStr])
        .atHour(hour)
        .create();
      installedCount++;
    }
  });

  if (installedCount > 0) {
    ui.alert(
      "Automated Schedule Active! 🚀",
      `Your reminders are fully configured in Google Cloud.\n\n• Days: ${daysInput}\n• Execution Time: ${hour}:00 (Sheet Timezone)\n\nYou can now manage exams directly from the 'Exams' tab on web or mobile!`,
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      "Invalid Days Entered",
      "Could not recognize the day names in Cell B5. Please write valid weekdays separated by commas (e.g., Monday, Wednesday, Friday).",
      ui.ButtonSet.OK
    );
  }
}

/**
 * 5. TELEGRAM API HELPER
 */
function sendMessage_(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
    disable_web_page_preview: true
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    return response.getResponseCode() === 200;
  } catch (e) {
    Logger.log("Delivery Error: " + e.toString());
    return false;
  }
}
