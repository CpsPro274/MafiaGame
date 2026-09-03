-- ============================================================================
-- CODE MAFIA: Initial Seed Data
-- ============================================================================

-- 1. Sample Admin / Test User
INSERT INTO users (id, username, email, password_hash, rating, is_guest, is_verified)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'admin_dev', 'admin@codemafia.dev', '$2b$12$eXampLeBcryptHashedPasswordPlaceholder...', 1500, FALSE, TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'code_detective', 'detective@codemafia.dev', '$2b$12$eXampLeBcryptHashedPasswordPlaceholder...', 1200, FALSE, TRUE)
ON CONFLICT (username) DO NOTHING;

-- 2. Challenge 1: E-Commerce Shopping Cart Discount Calculator (JavaScript)
INSERT INTO challenges (
    id,
    title,
    description,
    language,
    difficulty,
    initial_flawed_code,
    solution_code,
    bug_manifesto,
    time_limit_seconds
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Buggy Cart Discount Engine',
    'Calculate the total price of a cart applying coupon discounts and tax. The current code has subtle calculation bugs: floating point rounding error, off-by-one coupon threshold, and incorrect tax application order.',
    'javascript',
    'MEDIUM',
$CODE$
function calculateTotal(items, discountCode, taxRate) {
    // BUG 1: Initialized with undefined if empty
    let subtotal = 0;
    for (let i = 0; i <= items.length; i++) { // BUG 2: Off-by-one loops into undefined item
        if (items[i]) {
            subtotal += items[i].price * items[i].quantity;
        }
    }

    let discount = 0;
    if (discountCode === "SAVE20" && subtotal > 100) { // BUG 3: Should be >= 100
        discount = subtotal * 0.20;
    }

    // BUG 4: Tax incorrectly applied before discount
    let total = (subtotal + (subtotal * taxRate)) - discount;

    return Number(total.toFixed(2));
}

module.exports = { calculateTotal };
$CODE$,
$CODE$
function calculateTotal(items, discountCode, taxRate) {
    if (!items || items.length === 0) return 0;

    let subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    let discount = 0;
    if (discountCode === "SAVE20" && subtotal >= 100) {
        discount = subtotal * 0.20;
    }

    let discountedSubtotal = subtotal - discount;
    let total = discountedSubtotal + (discountedSubtotal * taxRate);

    return Math.round(total * 100) / 100;
}

module.exports = { calculateTotal };
$CODE$,
'{
    "bugs": [
        {"id": 1, "description": "Off-by-one loop index causing undefined access"},
        {"id": 2, "description": "Strict greater than (> 100) instead of (>= 100) for discount eligibility"},
        {"id": 3, "description": "Tax calculated on gross subtotal instead of discounted total"}
    ]
}'::jsonb,
    600
) ON CONFLICT (id) DO NOTHING;

-- Test cases for Challenge 1
INSERT INTO test_cases (id, challenge_id, input, expected_output, is_hidden, description) VALUES
(
    't0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    '{"items": [{"price": 50, "quantity": 2}], "discountCode": "SAVE20", "taxRate": 0.1}',
    '88',
    FALSE,
    'Standard $100 cart with SAVE20 discount and 10% tax'
),
(
    't0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    '{"items": [{"price": 15, "quantity": 2}], "discountCode": null, "taxRate": 0.05}',
    '31.5',
    FALSE,
    'No discount applied, basic sales tax'
),
(
    't0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000001',
    '{"items": [], "discountCode": "SAVE20", "taxRate": 0.1}',
    '0',
    TRUE,
    'Hidden Edge Case: Empty cart handling'
) ON CONFLICT (id) DO NOTHING;
