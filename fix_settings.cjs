const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsModule.tsx', 'utf8');

// replace triggerLocalNotification call
code = code.replace(/await triggerLocalNotification\([\s\S]*?\);/g, '');
code = code.replace(/import { triggerLocalNotification[\s\S]*?\} from '\.\.\/services\/mobile';/g, (m) => m.replace('triggerLocalNotification,', ''));

fs.writeFileSync('src/components/SettingsModule.tsx', code);
