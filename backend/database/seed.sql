
INSERT INTO users (username, email, password)
VALUES 
    ('alex_dev', 'alex@gmail.com', 'password123'),
    ('sam_mafia', 'sam@gmail.com', 'password123')
ON CONFLICT (username) DO NOTHING;

INSERT INTO challenges (title, description, language, buggy_code, solution_code, test_cases)
VALUES (
    'E-Commerce Checkout & Tiered Pricing Engine',
    'Calculate customer cart totals with item subtotals, percentage discounts, promo coupon validation (SAVE20, HALFPRICE, FREESHIP), category tax exemptions, and shipping thresholds.',
    'python',
$BUGGY$
def calculate_cart_total(items, discount_pct=0, coupon_code=""):
    if not items:
        return {"subtotal": 0, "discount": 0, "tax": 0, "shipping": 0, "total": 0}
    subtotal = 0
    for i in range(len(items) + 1):
        subtotal += items[i]["price"] * items[i]["qty"]
    discount = (subtotal * discount_pct) / 100.0
    c = (coupon_code or "").upper()
    if c == "SAVE20" and subtotal >= 80:
        discount += 20
    elif c == "HALFPRICE" and subtotal >= 150:
        discount += min(subtotal * 0.5, 60)
    discount = min(discount, subtotal)
    taxable = subtotal
    tax = round(taxable * 0.08, 2)
    post_discount = subtotal - discount
    shipping = 0 if (post_discount >= 100 or c == "FREESHIP") else 10
    total = round(post_discount + tax + shipping, 2)
    return {
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "tax": round(tax, 2),
        "shipping": round(shipping, 2),
        "total": round(total, 2)
    }
$BUGGY$,
$SOL$
def calculate_cart_total(items, discount_pct=0, coupon_code=""):
    if not items:
        return {"subtotal": 0, "discount": 0, "tax": 0, "shipping": 0, "total": 0}
    subtotal = sum(it["price"] * it["qty"] for it in items if it.get("qty", 0) > 0)
    if subtotal == 0:
        return {"subtotal": 0, "discount": 0, "tax": 0, "shipping": 0, "total": 0}
    discount = (subtotal * discount_pct) / 100.0
    c = (coupon_code or "").upper()
    if c == "SAVE20" and subtotal >= 80:
        discount += 20
    elif c == "HALFPRICE" and subtotal >= 150:
        discount += min(subtotal * 0.5, 60)
    discount = min(discount, subtotal)
    taxable = sum(it["price"] * it["qty"] for it in items if it.get("qty", 0) > 0 and not it.get("tax_exempt", False) and it.get("category") not in ("groceries", "books"))
    tax = round(taxable * 0.08, 2)
    post_discount = subtotal - discount
    shipping = 0 if (post_discount >= 100 or c == "FREESHIP") else 10
    total = round(post_discount + tax + shipping, 2)
    return {
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "tax": round(tax, 2),
        "shipping": round(shipping, 2),
        "total": round(total, 2)
    }
$SOL$,
'[
    {"name": "Standard Order with Percentage Discount", "input": {"items": [{"name": "Headphones", "price": 60, "qty": 1, "category": "electronics", "tax_exempt": false}, {"name": "Cables", "price": 20, "qty": 2, "category": "electronics", "tax_exempt": false}], "discount_pct": 10, "coupon_code": ""}, "expected": {"subtotal": 100, "discount": 10, "tax": 8, "shipping": 10, "total": 108}, "is_public": true},
    {"name": "Empty Cart & Zero Quantities", "input": {"items": [{"name": "Ghost", "price": 50, "qty": 0, "category": "misc", "tax_exempt": false}], "discount_pct": 20, "coupon_code": "SAVE20"}, "expected": {"subtotal": 0, "discount": 0, "tax": 0, "shipping": 0, "total": 0}, "is_public": true},
    {"name": "Free Shipping Boundary at $100", "input": {"items": [{"name": "Monitor", "price": 125, "qty": 1, "category": "electronics", "tax_exempt": false}], "discount_pct": 20, "coupon_code": ""}, "expected": {"subtotal": 125, "discount": 25, "tax": 10, "shipping": 0, "total": 110}, "is_public": true},
    {"name": "Category Tax Exemption", "input": {"items": [{"name": "Mouse", "price": 50, "qty": 1, "category": "electronics", "tax_exempt": false}, {"name": "Apples", "price": 20, "qty": 1, "category": "groceries", "tax_exempt": false}, {"name": "Textbook", "price": 30, "qty": 1, "category": "books", "tax_exempt": true}], "discount_pct": 0, "coupon_code": ""}, "expected": {"subtotal": 100, "discount": 0, "tax": 4, "shipping": 0, "total": 104}, "is_public": false},
    {"name": "Coupon Min Order & Max Cap", "input": {"items": [{"name": "Smartphone", "price": 200, "qty": 1, "category": "electronics", "tax_exempt": false}], "discount_pct": 0, "coupon_code": "HALFPRICE"}, "expected": {"subtotal": 200, "discount": 60, "tax": 16, "shipping": 0, "total": 156}, "is_public": false},
    {"name": "FREESHIP Promo Mixed Basket", "input": {"items": [{"name": "Backpack", "price": 40, "qty": 1, "category": "apparel", "tax_exempt": false}, {"name": "Snacks", "price": 10, "qty": 1, "category": "groceries", "tax_exempt": false}], "discount_pct": 10, "coupon_code": "FREESHIP"}, "expected": {"subtotal": 50, "discount": 5, "tax": 3.2, "shipping": 0, "total": 48.2}, "is_public": false}
]'::jsonb
);
