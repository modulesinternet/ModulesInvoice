const fs = require('fs');
const https = require('https');
const path = require('path');

const targetPath = path.join(__dirname, '../android/gradle/wrapper/gradle-wrapper.jar');
console.log('Downloading pristine gradle-wrapper.jar to:', targetPath);

const file = fs.createWriteStream(targetPath);
https.get("https://raw.githubusercontent.com/gradle/gradle/v8.14.3/gradle/wrapper/gradle-wrapper.jar", function(response) {
  if (response.statusCode !== 200) {
    console.error('Failed to download from v8.14.3 URL. Trying fallback v8.12.0...');
    https.get("https://raw.githubusercontent.com/gradle/gradle/v8.12.0/gradle/wrapper/gradle-wrapper.jar", function(fallbackResponse) {
      fallbackResponse.pipe(file);
      file.on('finish', function() {
        file.close();
        console.log('Successfully wrote pristine gradle-wrapper.jar (fallback).');
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      console.log('Successfully wrote pristine gradle-wrapper.jar.');
    });
  }
}).on('error', function(err) {
  console.error('Error downloading gradle wrapper:', err);
});
