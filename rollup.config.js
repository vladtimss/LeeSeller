// Загружаем TypeScript конфиг через ts-node
require('ts-node').register({
    project: 'tsconfig.json',
    transpileOnly: true,
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = require('./rollup.config.ts');
