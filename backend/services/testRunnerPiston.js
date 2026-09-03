import { executeCode } from './codePistonRunner.js';

async function runAllTests() {
  console.log('--- Starting Piston Code Runner Tests ---\n');

  // Test Case 1: Valid code passing all assertions (Developer Fix Scenario)
  console.log('[Test 1] Running valid Python code (Expected: passed)...');
  const passPayload = {
    submission_id: 'test_pass_001',
    room_id: 'room_dev_42',
    language: 'python',
    files: [
      {
        name: 'test_cart.py',
        content: [
          'from cart import calculate_cart_total',
          '',
          'assert calculate_cart_total([]) == 0.0',
          'assert calculate_cart_total([{"price": 10.50, "qty": 2}]) == 21.00',
          'assert calculate_cart_total([{"price": 50.00, "qty": 2}], 10) == 90.00',
          'print("ALL 3 TESTS PASSED SUCCESSFULLY")'
        ].join('\n')
      },
      {
        name: 'cart.py',
        content: [
          'def calculate_cart_total(items, discount_pct=0):',
          '    if not items: return 0.0',
          '    subtotal = sum(item["price"] * item["qty"] for item in items)',
          '    return round(subtotal - (subtotal * (discount_pct / 100)), 2)'
        ].join('\n')
      }
    ],
    command: 'python test_cart.py',
    timeout_seconds: 5
  };

  const passResult = await executeCode(passPayload);
  console.log('\nStatus:', passResult.status);
  console.log('Exit Code:', passResult.exit_code);
  console.log('--------------------------------------------------\n');

  // Test Case 2: Sabotaged code failing tests (Mafia Regression Scenario)
  console.log('[Test 2] Running failing Python code (Expected: failed)...');
  const failPayload = {
    submission_id: 'test_fail_002',
    room_id: 'room_dev_42',
    language: 'python',
    files: [
      {
        name: 'test_cart.py',
        content: [
          'from cart import calculate_cart_total',
          'assert calculate_cart_total([{"price": 10.50, "qty": 2}]) == 21.00',
          'print("TEST PASSED")'
        ].join('\n')
      },
      {
        name: 'cart.py',
        // Sabotage: Incorrect calculation breaks the assertion
        content: [
          'def calculate_cart_total(items, discount_pct=0):',
          '    return 0.0'
        ].join('\n')
      }
    ],
    command: 'python test_cart.py',
    timeout_seconds: 5
  };

  const failResult = await executeCode(failPayload);
  console.log('\nStatus:', failResult.status);
  console.log('Exit Code:', failResult.exit_code);
  console.log('--------------------------------------------------\n');

  // Test Case 3: Infinite loop to verify timeout handling
  console.log('[Test 3] Running infinite loop (Expected: timeout)...');
  const timeoutPayload = {
    submission_id: 'test_timeout_003',
    room_id: 'room_dev_42',
    language: 'python',
    files: [
      {
        name: 'hang.py',
        content: 'import time\nwhile True:\n    time.sleep(0.5)\n'
      }
    ],
    command: 'python hang.py',
    timeout_seconds: 3
  };

  const timeoutResult = await executeCode(timeoutPayload);
  console.log('\nStatus:', timeoutResult.status);
  console.log('Stderr Notice:', timeoutResult.stderr);
  console.log('--------------------------------------------------\n');

  console.log('--- All Piston Runner Tests Completed ---');
}

runAllTests().catch((err) => {
  console.error('Unhandled execution error:', err);
});