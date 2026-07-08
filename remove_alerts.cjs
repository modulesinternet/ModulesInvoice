const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove state variables
code = code.replace(/const \[showIncomingCallAlert, setShowIncomingCallAlert\].*?\n/g, '');
code = code.replace(/const \[androidIncomingCall, setAndroidIncomingCall\].*?\n/g, '');
code = code.replace(/const \[notifications, setNotifications\].*?\n/g, '');
code = code.replace(/const \[showNotifications, setShowNotifications\].*?\n/g, '');

// 2. Remove triggerLocalNotification usages entirely in triggerIncomingCall
// actually, let's just make triggerIncomingCall a no-op or just log
code = code.replace(/const triggerIncomingCall = \(pay: Partial<Payment>\) => \{[\s\S]*?\}\);[\s\S]*?\};/g, 'const triggerIncomingCall = (pay: Partial<Payment>) => { console.log("Call triggers removed.", pay); };');

// 3. Remove push notification UI alerts in setupPushNotifications
code = code.replace(/triggerLocalNotification\([\s\S]*?\);/g, '');
code = code.replace(/import \{.*?triggerLocalNotification.*?\}.*?;\n/g, (m) => m.replace('triggerLocalNotification,', ''));

// 4. Remove notification bell icon and list from Top Bar and Sidebar
// We can use a regex to strip out the whole notification drop down or activeTab === 'notifications'
const uiAlerts = /{showIncomingCallAlert && \([\s\S]*?Go to Accounts Ledger[\s\S]*?Dismiss Secure Alert[\s\S]*?<\/button>\s*<\/div>\s*<\/div>\s*\)}/g;
code = code.replace(uiAlerts, '');

// 5. Remove notifications module tab render
const notifModuleRegex = /{activeTab === 'notifications' && \([\s\S]*?<NotificationsModule[\s\S]*?deleteNotification.*?\}[\s\S]*?\/>\s*\)}/g;
code = code.replace(notifModuleRegex, '');

// 6. Fix any residual showNotifications usages
code = code.replace(/<button[^>]*?onClick=\{\(\) => setShowNotifications\(!showNotifications\)\}[^>]*?>[\s\S]*?<\/button>\s*(?:\{showNotifications && \([\s\S]*?<\/div>\s*\)\})?/g, '');
// For the remaining bell buttons that might have been wrapped or differently formatted:
// "View System Notifications"
code = code.replace(/<button[^>]*?title="View System Notifications"[^>]*?>[\s\S]*?<\/button>/g, '');
code = code.replace(/\{showNotifications && \([\s\S]*?View All Notifications[\s\S]*?<\/div>\s*\)\}/g, '');

// Remove the import of NotificationsModule
code = code.replace(/import NotificationsModule from '\.\/components\/NotificationsModule';\n/g, '');

fs.writeFileSync('src/App.tsx', code);
