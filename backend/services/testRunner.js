import { executeCode } from './codeRunner.js';

async function runAllTests() {
  console.log('--- Starting Code Runner Tests ---\n');

  // Test Case 1: Valid fixed code that passes all unit tests
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

  // 2. Call the codeRunner module
  const runResult = await executeChallengeCode({
    roomId,
    userId,
    userCode: currentEditorCode,
    testCases: test_cases,
    language
  });

  // 3. Log action to game_logs matching your schema
  await db.query(
    `INSERT INTO game_logs (room_id, user_id, action_type, details) 
     VALUES ($1, $2, $3, $4)`,
    [
      runResult.gameLogEntry.room_id,
      runResult.gameLogEntry.user_id,
      runResult.gameLogEntry.action_type,
      runResult.gameLogEntry.details
    ]
  );

  // 4. Return results to your socket/HTTP layer to broadcast to players
  return runResult;
}