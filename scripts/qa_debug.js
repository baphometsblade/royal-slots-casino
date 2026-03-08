const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 4176;

const MIME = {'.css':'text/css','.html':'text/html','.js':'application/javascript',
  '.png':'image/png','.webp':'image/webp','.json':'application/json',
  '.jpg':'image/jpeg','.svg':'image/svg+xml'};

const server = http.createServer((req, res) => {
  const cleanPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const requested = cleanPath === '/' ? '/index.html' : cleanPath;
  const absolute = path.resolve(ROOT_DIR, '.' + requested);
  try {
    const data = fs.readFileSync(absolute);
    const ext = path.extname(absolute).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.end(data);
  } catch(e) {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if(m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('http://127.0.0.1:' + PORT + '/index.html?noBonus=1', {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    localStorage.setItem('casinoUser', JSON.stringify({id:0,username:'QA',is_admin:false}));
    localStorage.setItem('casinoToken','local-qa-regression-token');
  });
  await page.goto('http://127.0.0.1:' + PORT + '/index.html?noBonus=1', {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2000);

  // Debug: what state are we in before openSlot?
  const pre = await page.evaluate(() => {
    var modal = document.getElementById('slotModal');
    var user = typeof currentUser !== 'undefined' ? currentUser : 'UNDEFINED';
    var game = typeof currentGame !== 'undefined' ? currentGame : 'UNDEFINED';
    var fn = typeof openSlot;
    var gameExists = typeof games !== 'undefined' && games && games.find(function(g){ return g.id === 'fire_joker'; });
    return {
      modalExists: !!modal,
      modalActive: modal ? modal.classList.contains('active') : false,
      currentUserType: typeof user === 'object' ? (user ? user.username : 'null') : typeof user,
      openSlotType: fn,
      fireJokerFound: !!gameExists,
      appSettingsLoaded: typeof appSettings !== 'undefined' ? JSON.stringify(appSettings).slice(0,100) : 'UNDEFINED'
    };
  });
  console.log('PRE-OPEN STATE:', JSON.stringify(pre, null, 2));

  // Call openSlot and check immediately after
  const post = await page.evaluate(() => {
    var modal = document.getElementById('slotModal');
    var err = null;
    try {
      openSlot('fire_joker');
    } catch(e) {
      err = e.message;
    }
    return {
      errorThrown: err,
      modalActiveImmediate: modal ? modal.classList.contains('active') : false,
      currentGameId: typeof currentGame !== 'undefined' && currentGame ? currentGame.id : 'null'
    };
  });
  console.log('POST-OPEN (immediate):', JSON.stringify(post, null, 2));

  // Wait 600ms (page transition delay) and check again
  await page.waitForTimeout(600);
  const afterTransition = await page.evaluate(() => {
    var modal = document.getElementById('slotModal');
    return {
      modalActive: modal ? modal.classList.contains('active') : false,
      pageTransitionActive: (function(){
        var pt = document.getElementById('pageTransition');
        return pt ? pt.classList.contains('active') : false;
      })()
    };
  });
  console.log('AFTER 600ms:', JSON.stringify(afterTransition, null, 2));

  await page.waitForTimeout(2000);
  const afterLong = await page.evaluate(() => {
    var modal = document.getElementById('slotModal');
    return { modalActive: modal ? modal.classList.contains('active') : false };
  });
  console.log('AFTER 2.6s total:', JSON.stringify(afterLong, null, 2));
  console.log('Console errors:', errors);

  await browser.close();
  server.close();
  process.exit(0);
});
