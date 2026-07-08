const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regexSend = /\/\/ Active multicast FCM notification delivery engine[\s\S]*?async function sendFcmNotification.*?\{[\s\S]*?\n\}\n\n\/\/ Centralized/g;

const replacementSend = `// Active multicast FCM notification delivery engine
async function sendFcmNotification(title: string, body: string, extraData: Record<string, string> = {}) {
  console.log(\`[FCM BROADCAST] Broadcast request initiated: "\${title}"\`);
  
  if (db_fcm_tokens.length === 0) {
    console.log("[FCM BROADCAST] Active recipient registration dictionary is empty. Skipping notification delivery.");
    return;
  }

  // ONLY send to Android platforms
  const tokens = Array.from(new Set(
    db_fcm_tokens
      .filter(t => t.platform === 'android')
      .map(t => t.deviceToken)
  )).filter(Boolean);

  if (tokens.length === 0) {
    console.log("[FCM BROADCAST] No valid Android FCM registration keys extracted. Skipping.");
    return;
  }

  if (!isFcmSupported) {
    console.log(\`[FCM SIMULATED DELIVERY] Simulated Android multicast delivery to \${tokens.length} device(s) complete.\`);
    return;
  }

  console.log(\`[FCM BROADCAST] dispatching message packet to \${tokens.length} active Android recipient tokens.\`);

  const messagePayload = {
    notification: {
      title,
      body,
    },
    android: {
      priority: 'high' as const,
      notification: {
        sound: 'default',
        channelId: 'high_priority_notifications',
        visibility: 'public' as const,
        notificationPriority: 'PRIORITY_MAX' as const,
        defaultSound: true,
        defaultVibrateTimings: true,
        defaultLightSettings: true,
      }
    },
    tokens,
    data: extraData,
  };

  try {
    const response = await admin.messaging().sendMulticast(messagePayload);
    console.log(\`[FCM SUCCESS] Delivery complete. Success: \${response.successCount}, Failures: \${response.failureCount}\`);
    
    // Clean up expired tokens
    if (response.failureCount > 0) {
      const failedTokens = response.responses
        .map((resp, idx) => !resp.success ? tokens[idx] : null)
        .filter(Boolean) as string[];
      
      for (const expiredToken of failedTokens) {
        const index = db_fcm_tokens.findIndex(t => t.deviceToken === expiredToken);
        if (index !== -1) {
          const expiredTokenId = db_fcm_tokens[index].id;
          db_fcm_tokens.splice(index, 1);
          await syncStateToFirestore('fcmTokens', expiredTokenId).catch(() => null);
        }
      }
    }
  } catch (error: any) {
    console.error("[FCM FATAL] Multicast engine failure:", error.message);
  }
}

// Centralized`;

code = code.replace(regexSend, replacementSend);

const regexTrigger = /\/\/ Centralized enterprise business action notification broadcaster[\s\S]*?async function triggerBusinessNotification.*?\{[\s\S]*?\n\}\n\n\/\/ \d+\./g;

const replacementTrigger = `// Centralized enterprise business action notification broadcaster (delivers real-time Firestore synchronization next to high-priority push packets)
async function triggerBusinessNotification(
  req: Request,
  title: string,
  message: string,
  type: "info" | "warning" | "success",
  moduleName: string,
  extraData: Record<string, string> = {}
) {
  // ONLY send notifications for Invoice, Payment, and Cashbook
  if (!['invoices', 'payments', 'cashbook'].includes(moduleName)) {
    return;
  }

  const performerName = (req.headers['x-user-name'] as string) || 'Karan Sharma';
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });

  // Extract Action
  let actionStr = "Update";
  if (title.toLowerCase().includes('created')) actionStr = 'Create';
  if (title.toLowerCase().includes('deleted')) actionStr = 'Delete';

  // Extract Record Number
  let recordNumber = 'N/A';
  if (moduleName === 'invoices') {
    const match = message.match(/Invoice\\s+#([^\\s]+)/i) || title.match(/#([^\\s]+)/);
    if (match) recordNumber = match[1];
  } else if (moduleName === 'payments') {
    if (extraData.paymentId) {
       recordNumber = extraData.paymentId.substring(0, 8).toUpperCase();
    } else {
       recordNumber = 'PAY-' + Date.now().toString().slice(-6);
    }
  } else if (moduleName === 'cashbook') {
    const match = message.match(/\\(([^)]+)\\)/);
    if (match) {
      recordNumber = match[1].substring(0, 20); // snippet of description as ref
    } else {
      recordNumber = 'CB-' + Date.now().toString().slice(-6);
    }
  }

  const formattedModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const fullMessage = \`Module: \${formattedModuleName}\\nRecord: \${recordNumber}\\nAction: \${actionStr}\\nUser: \${performerName}\\nDate: \${now}\`;

  // Multicast high priority FCM broadcast to all registered Android endpoints
  await sendFcmNotification(title, fullMessage, {
    ...extraData,
    route: \`/\${moduleName}\`,
    tab: moduleName,
  }).catch(err => {
    console.warn("[FCM BROADCAST ERROR] FCM payload transmission bypass:", err.message);
  });
}

// 2.`;

code = code.replace(regexTrigger, replacementTrigger.replace('// 2.', '// 2.')); 

// Need to verify the match replaced
fs.writeFileSync('server.ts', code);
