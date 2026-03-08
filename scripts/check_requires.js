'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync('server/index.js', 'utf8');
// Find all require('./routes/...') and require('./services/...')
const routeReqs = [];
const lines = src.split('\n');
for (const line of lines) {
    const m = line.match(/require\(['"]\.\/routes\/([^'"]+)['"]\)/);
    if (m) routeReqs.push('server/routes/' + m[1] + (m[1].endsWith('.js') ? '' : '.js'));
    const m2 = line.match(/require\(['"]\.\/services\/([^'"]+)['"]\)/);
    if (m2) routeReqs.push('server/services/' + m2[1] + (m2[1].endsWith('.js') ? '' : '.js'));
}

const missing = [];
const found = [];
for (const p of routeReqs) {
    if (fs.existsSync(p)) {
        found.push(p);
    } else {
        missing.push(p);
    }
}

console.log('Found:', found.length, 'route/service files');
if (missing.length > 0) {
    console.log('\nMISSING FILES:');
    missing.forEach(f => console.log('  ' + f));
} else {
    console.log('All route/service files exist');
}

// Also try to syntax-check each file by parsing
console.log('\nSyntax checking all route files...');
let errors = 0;
for (const p of found) {
    try {
        const code = fs.readFileSync(p, 'utf8');
        new vm.Script(code, { filename: p });
    } catch (e) {
        console.log('SYNTAX ERROR in', p + ':', e.message.split('\n')[0]);
        errors++;
    }
}
if (errors === 0) console.log('All route/service files pass syntax check');
else console.log(errors + ' file(s) have syntax errors');
