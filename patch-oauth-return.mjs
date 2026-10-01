import fs from 'node:fs';let s=fs.readFileSync('assets/index-AccountDates20261001.js','utf8');
const old='window.history.replaceState({},"","/")';if(!s.includes(old))throw Error('Missing Zoho return URL');s=s.replace(old,'window.history.replaceState({},"","/ilya-communications-hub-app/")');
fs.writeFileSync('assets/index-OAuthReturn20261001.js',s);fs.writeFileSync('index.html',fs.readFileSync('index.html','utf8').replace('index-AccountDates20261001.js','index-OAuthReturn20261001.js'));
