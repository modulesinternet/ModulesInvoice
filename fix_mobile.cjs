const fs = require('fs');
let code = fs.readFileSync('src/services/mobile.ts', 'utf8');

// Remove triggerLocalNotification usages
code = code.replace(/triggerLocalNotification\([\s\S]*?\);/g, '');
code = code.replace(/export const triggerLocalNotification[\s\S]*?\}\s*catch[\s\S]*?\}\s*\};/g, 'export const triggerLocalNotification = async () => {};');

fs.writeFileSync('src/services/mobile.ts', code);
