#!/usr/bin/env node
'use strict';

const firestore = require('../firestore');

(async () => {
  try {
    const result = await firestore.purgeAuthCollections();
    console.log(JSON.stringify({ ok: true, deleted: result }, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
})();
