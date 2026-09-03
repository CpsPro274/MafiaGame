-- ============================================================================
-- SAMPLE SEED DATA (seed.sql)
-- Run after auth_schema.sql and game_schema.sql
-- ============================================================================

-- 1. Sample Users (Login data)
INSERT INTO users (username, email, password)
VALUES 
    ('alex_dev', 'alex@gmail.com', 'password123'),
    ('sam_mafia', 'sam@gmail.com', 'password123')
ON CONFLICT (username) DO NOTHING;

-- 2. Sample Challenge (Shopping Cart Buggy Code)
INSERT INTO challenges (title, description, language, buggy_code, solution_code, test_cases)
VALUES (
    'Fix Shopping Cart Total',
    'Find and fix the 2 bugs in calculating discount and subtotal.',
    'javascript',
$BUGGY$
function calculateTotal(items, discountPercent) {
    let subtotal = 0;
    // Bug 1: Loop goes one element out of bounds (<= instead of <)
    for (let i = 0; i <= items.length; i++) {
        if (items[i]) {
            subtotal += items[i].price * items[i].quantity;
        }
    }
    // Bug 2: Subtracting raw percentage instead of percentage of subtotal
    let total = subtotal - discountPercent; 
    return total;
}
module.exports = { calculateTotal };
$BUGGY$,
$SOL$
function calculateTotal(items, discountPercent) {
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
        subtotal += items[i].price * items[i].quantity;
    }
    let discount = subtotal * (discountPercent / 100);
    return subtotal - discount;
}
module.exports = { calculateTotal };
$SOL$,
'[
    {"input": "calculateTotal([{\"price\": 50, \"quantity\": 2}], 10)", "expected": "90", "hidden": false},
    {"input": "calculateTotal([{\"price\": 20, \"quantity\": 1}], 0)", "expected": "20", "hidden": false},
    {"input": "calculateTotal([], 10)", "expected": "0", "hidden": true}
]'::jsonb
);
