import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# 1. Remove setNotifications usages completely
code = re.sub(r'setNotifications\(.*?\);\n?', '', code)

# 2. Remove androidIncomingCall UI and usages completely
code = re.sub(r'\{androidIncomingCall && \([\s\S]*?<\/div>\s*\)\}', '', code)
code = re.sub(r'androidIncomingCall={.*?}', '', code)
code = re.sub(r'setAndroidIncomingCall\(.*?\)', '', code)

# 3. Remove NotificationsModule rendering
code = re.sub(r'\{activeTab === \'notifications\' && \([\s\S]*?<NotificationsModule[\s\S]*?\/>\s*\)\}', '', code)

# 4. Remove setShowIncomingCallAlert completely
code = re.sub(r'setShowIncomingCallAlert\(.*?\);?\n?', '', code)

# 5. Make sure no lingering {showIncomingCallAlert && ...}
code = re.sub(r'\{showIncomingCallAlert && \([\s\S]*?<\/div>\s*\)\}', '', code)

# 6. Make sure no lingering androidIncomingCall usages
code = re.sub(r'androidIncomingCall', 'null', code)

with open('src/App.tsx', 'w') as f:
    f.write(code)
