import { executeCode } from './codeRunner.js';

async function runAllTests() {
  console.log('--- Starting Code Runner Tests ---\n');
  console.log('[Test 1] Running valid Python code (Expected: passed)...');
  const passPayload = {
    submission_id: 'test_pass_001',
    room_id: 'room_dev_42',
    language: 'python',
    files: [
      {
        name: 'cart.py',
        content: [
          'def calculate_cart_total(items, discount_pct=0):',
          '    if not items:',
          '        return 0.0',
          '    if not (0 <= discount_pct <= 100):',
          '        raise ValueError("Invalid discount")',
          '    subtotal = sum(item["price"] * item["qty"] for item in items)',
          '    discount = subtotal * (discount_pct / 100)',
          '    return round(subtotal - discount, 2)'
        ].join('\n')
      },
      {
        name: 'test_cart.py',
        content: [
          'import pytest',
          'from cart import calculate_cart_total',
          '',
          'def test_empty_cart():',
          '    assert calculate_cart_total([]) == 0.0',
          '',
          'def test_regular_total_no_discount():',
          '    items = [{"price": 10.50, "qty": 2}, {"price": 5.00, "qty": 1}]',
          '    assert calculate_cart_total(items) == 26.00',
          '',
          'def test_discount_applied():',
          '    items = [{"price": 50.00, "qty": 2}]',
          '    assert calculate_cart_total(items, discount_pct=10) == 90.00',
          '',
          'def test_invalid_discount_raises_error():',
          '    items = [{"price": 10.00, "qty": 1}]',
          '    with pytest.raises(ValueError):',
          '        calculate_cart_total(items, discount_pct=150)'
        ].join('\n')
      }
    ],
    command: 'pytest test_cart.py',
    timeout_seconds: 5
  };

  const passResult = await executeCode(passPayload);
  console.log('Status:', passResult.status);
  console.log('Exit Code:', passResult.exit_code);
  console.log('Output Snippet:', passResult.stdout.trim().split('\n').pop());
  console.log('--------------------------------------------------\n');

  // Test Case 2: Sabotaged or buggy code that fails the test suite
  console.log('[Test 2] Running failing Python code (Expected: failed)...');
  const failPayload = {
    submission_id: 'test_fail_002',
    room_id: 'room_dev_42',
    language: 'python',
    files: [
      {
        name: 'cart.py',
        // Intentional regression: ignores discount and gives incorrect total
        content: [
          'def calculate_cart_total(items, discount_pct=0):',
          '    return sum(item["price"] for item in items)'
        ].join('\n')
      },
      {
        name: 'test_cart.py',
        content: [
          'from cart import calculate_cart_total',
          '',
          'def test_regular_total():',
          '    items = [{"price": 10.50, "qty": 2}]',
          '    assert calculate_cart_total(items) == 21.00'
        ].join('\n')
      }
    ],
    command: 'pytest test_cart.py',
    timeout_seconds: 5
  };

  const failResult = await executeCode(failPayload);
  console.log('Status:', failResult.status);
  console.log('Exit Code:', failResult.exit_code);
  console.log('Error/Failure Output Captured:', failResult.stdout.includes('FAILED'));
  console.log('--------------------------------------------------\n');

  // Test Case 3: Infinite loop to test sandbox timeout enforcement
  console.log('[Test 3] Running infinite loop code (Expected: timeout)...');
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
  console.log('Status:', timeoutResult.status);
  console.log('Stderr Notice:', timeoutResult.stderr);
  console.log('Execution Time (ms):', timeoutResult.execution_time_ms);
  console.log('--------------------------------------------------\n');

  console.log('--- All Runner Tests Completed ---');
}

runAllTests().catch((err) => {
  console.error('Test suite encountered an unhandled error:', err);
});