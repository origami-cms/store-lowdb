const test = require('origami-test-store');

test(
    require('../build/store'),
    {
        type: "lowdb",
        database: "./test-db.json"
    },
    'yarn db:drop',
    // 'yarn db:drop'
);

