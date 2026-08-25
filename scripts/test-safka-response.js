'use strict';
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync(require('path').join(__dirname, '..', 'server.js'), 'utf8');
const start = source.indexOf('function supplierText');
const end = source.indexOf("\n\napp.post('/api/create-order'", start);
if (start < 0 || end < 0) throw new Error('supplier response helpers not found');
const code = source.slice(start, end) + '\nmodule.exports = { supplierResponseAccepted };';
const context = { module: { exports: {} } };
vm.runInNewContext(code, context, { filename: 'server.js#supplier-response-helpers' });
const accepted = context.module.exports.supplierResponseAccepted;
const http201 = { ok: true, status: 201 };
const http400 = { ok: false, status: 400 };
const cases = [
  {
    name: 'documented pending success',
    result: accepted(http201, { success: true, data: { _id: 'id-1', status: 'pending', serial_number: 'sk-1' } }),
    expected: true
  },
  {
    name: 'explicit supplier error',
    result: accepted(http400, { success: false, errors: [{ msg: 'اسم العميل مطلوب' }] }),
    expected: false
  },
  {
    name: '2xx nested failed status',
    result: accepted(http201, { success: true, data: { _id: 'id-2', status: 'failed', serial_number: 'sk-2' } }),
    expected: false
  },
  {
    name: '2xx malformed response without order id',
    result: accepted(http201, { success: true, data: { status: 'pending' } }),
    expected: false
  },
  {
    name: '2xx nested error array',
    result: accepted(http201, { success: true, data: { _id: 'id-3', status: 'pending', errors: [{ message: 'رفض المورد' }] } }),
    expected: false
  }
];
for (const test of cases) {
  if (test.result.accepted !== test.expected) throw new Error(test.name + ': expected accepted=' + test.expected + ', got ' + test.result.accepted);
  console.log(test.name + ': ' + (test.result.accepted ? 'accepted' : 'rejected'));
}
console.log('Safka response helper tests passed: ' + cases.length);
