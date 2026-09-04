
export const CHALLENGES = {
  EASY: {
    id: 1,
    difficulty: "EASY",
    xpReward: 500,
    title: "E-Commerce Checkout & Tiered Pricing Engine",
    language: "python",
    description: "Calculate customer cart totals with item subtotals, percentage discounts, promo coupon validation (SAVE20, HALFPRICE, FREESHIP), category tax exemptions, and shipping thresholds.",
    buggy_code:
`def calculate_cart_total(items, discount_pct=0, coupon_code=""):
    # BUG 1: Empty cart returns incorrect structure or crashes
    if not items:
        return {"subtotal": 0, "discount": 0, "tax": 0, "shipping": 0, "total": 0}
    
    # BUG 2: Loop index goes 1 too far (IndexError on boundary)
    subtotal = 0
    for i in range(len(items) + 1):
        subtotal += items[i]["price"] * items[i]["qty"]

    # Base discount
    discount = (subtotal * discount_pct) / 100.0
    c = (coupon_code or "").upper()
    if c == "SAVE20" and subtotal >= 80:
        discount += 20
    elif c == "HALFPRICE" and subtotal >= 150:
        discount += min(subtotal * 0.5, 60)
    discount = min(discount, subtotal)

    # BUG 3: Mistakenly applies tax to ALL items including tax-exempt categories
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
    }`,
    solution_code:
`def calculate_cart_total(items, discount_pct=0, coupon_code=""):
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
    }`,
    test_cases: [
      {
        name: "Test 1: Standard Order with Percentage Discount",
        input: {
          items: [
            { name: "Headphones", price: 60, qty: 1, category: "electronics", tax_exempt: false },
            { name: "Cables", price: 20, qty: 2, category: "electronics", tax_exempt: false }
          ],
          discount_pct: 10,
          coupon_code: ""
        },
        expected: { subtotal: 100, discount: 10, tax: 8, shipping: 10, total: 108 },
        is_public: true
      },
      {
        name: "Test 2: Empty Cart & Zero Quantities (Edge Case)",
        input: {
          items: [{ name: "Ghost", price: 50, qty: 0, category: "misc", tax_exempt: false }],
          discount_pct: 20,
          coupon_code: "SAVE20"
        },
        expected: { subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 },
        is_public: true
      },
      {
        name: "Test 3: Free Shipping Boundary at Exactly $100 Post-Discount",
        input: {
          items: [{ name: "Monitor", price: 125, qty: 1, category: "electronics", tax_exempt: false }],
          discount_pct: 20,
          coupon_code: ""
        },
        expected: { subtotal: 125, discount: 25, tax: 10, shipping: 0, total: 110 },
        is_public: true
      },
      {
        name: "Test 4: Category Tax Exemption (Groceries & Books Exempt)",
        input: {
          items: [
            { name: "Mouse", price: 50, qty: 1, category: "electronics", tax_exempt: false },
            { name: "Apples", price: 20, qty: 1, category: "groceries", tax_exempt: false },
            { name: "Textbook", price: 30, qty: 1, category: "books", tax_exempt: true }
          ],
          discount_pct: 0,
          coupon_code: ""
        },
        expected: { subtotal: 100, discount: 0, tax: 4, shipping: 0, total: 104 },
        is_public: false
      },
      {
        name: "Test 5: Coupon Minimum Order Requirement & Maximum Discount Cap",
        input: {
          items: [{ name: "Smartphone", price: 200, qty: 1, category: "electronics", tax_exempt: false }],
          discount_pct: 0,
          coupon_code: "HALFPRICE"
        },
        expected: { subtotal: 200, discount: 60, tax: 16, shipping: 0, total: 156 },
        is_public: false
      },
      {
        name: "Test 6: FREESHIP Promo on Under-$100 Order with Mixed Discounts",
        input: {
          items: [
            { name: "Backpack", price: 40, qty: 1, category: "apparel", tax_exempt: false },
            { name: "Snacks", price: 10, qty: 1, category: "groceries", tax_exempt: false }
          ],
          discount_pct: 10,
          coupon_code: "FREESHIP"
        },
        expected: { subtotal: 50, discount: 5, tax: 3.2, shipping: 0, total: 48.2 },
        is_public: false
      }
    ]
  },

  MEDIUM: {
    id: 2,
    difficulty: "MEDIUM",
    xpReward: 850,
    title: "Auth Token & RBAC Security Validator",
    language: "python",
    description: "Validate authentication tokens against algorithm integrity, signature length, expiration timestamps with clock-skew grace periods, user blacklists, and role-based access control with superuser overrides.",
    buggy_code:
`def validate_auth_token(token_payload, current_timestamp, options=None):
    if not token_payload or not isinstance(token_payload, dict):
        return {"valid": False, "error": "ERR_MALFORMED_TOKEN"}
    
    opts = options or {}
    header = token_payload.get("header") or {}
    payload = token_payload.get("payload") or {}
    sig = token_payload.get("sig")

    # BUG 1: Insecure algorithm check allows 'none' algorithm
    if header.get("alg") not in ["HS256", "RS256", "none"]:
        return {"valid": False, "error": "ERR_UNSUPPORTED_ALGORITHM"}

    # BUG 2: Inverted signature length boundary
    if not sig or not isinstance(sig, str) or len(sig) <= 8:
        return {"valid": False, "error": "ERR_INVALID_SIGNATURE"}

    # Revocation blacklist
    if payload.get("sub") in opts.get("revoked_users", []):
        return {"valid": False, "error": "ERR_USER_REVOKED"}

    # BUG 3: Ignores clock_skew_sec grace period on expiration
    exp = int(payload.get("exp", 0))
    if exp <= current_timestamp:
        return {"valid": False, "error": "ERR_TOKEN_EXPIRED"}

    iat = int(payload.get("iat", 0))
    if iat > current_timestamp + 60:
        return {"valid": False, "error": "ERR_TOKEN_FUTURE"}

    role = payload.get("role")
    req_role = opts.get("required_role")
    if req_role and role != req_role:
        return {"valid": False, "error": "ERR_ROLE_UNAUTHORIZED"}

    req_perm = opts.get("required_permission")
    if req_perm:
        perms = payload.get("permissions", [])
        if req_perm not in perms:
            return {"valid": False, "error": "ERR_INSUFFICIENT_PERMISSIONS"}

    return {"valid": True, "user_id": payload.get("sub"), "role": role}`,
    solution_code:
`def validate_auth_token(token_payload, current_timestamp, options=None):
    if not token_payload or not isinstance(token_payload, dict):
        return {"valid": False, "error": "ERR_MALFORMED_TOKEN"}
    
    opts = options or {}
    header = token_payload.get("header") or {}
    payload = token_payload.get("payload") or {}
    sig = token_payload.get("sig")

    if header.get("alg") not in ["HS256", "RS256"]:
        return {"valid": False, "error": "ERR_UNSUPPORTED_ALGORITHM"}

    if not sig or not isinstance(sig, str) or len(sig) < 16:
        return {"valid": False, "error": "ERR_INVALID_SIGNATURE"}

    if payload.get("sub") in opts.get("revoked_users", []):
        return {"valid": False, "error": "ERR_USER_REVOKED"}

    clock_skew = int(opts.get("clock_skew_sec", 0))
    exp = int(payload.get("exp", 0))
    if exp + clock_skew <= current_timestamp:
        return {"valid": False, "error": "ERR_TOKEN_EXPIRED"}

    iat = int(payload.get("iat", 0))
    if iat - clock_skew > current_timestamp:
        return {"valid": False, "error": "ERR_TOKEN_FUTURE"}

    role = payload.get("role")
    req_role = opts.get("required_role")
    if req_role and role != req_role and role != "ADMIN":
        return {"valid": False, "error": "ERR_ROLE_UNAUTHORIZED"}

    req_perm = opts.get("required_permission")
    if req_perm:
        perms = payload.get("permissions", [])
        if role != "ADMIN" and req_perm not in perms:
            return {"valid": False, "error": "ERR_INSUFFICIENT_PERMISSIONS"}

    return {"valid": True, "user_id": payload.get("sub"), "role": role}`,
    test_cases: [
      {
        name: "Test 1: Standard Authorized Developer Token",
        input: {
          token_payload: {
            header: { alg: "HS256", typ: "JWT" },
            payload: { sub: "usr_101", role: "DEV", permissions: ["code:write"], exp: 2000, iat: 900 },
            sig: "secure_sig_hash_abcdef123456"
          },
          current_timestamp: 1000,
          options: { required_role: "DEV", required_permission: "code:write" }
        },
        expected: { valid: true, user_id: "usr_101", role: "DEV" },
        is_public: true
      },
      {
        name: "Test 2: Clock-Skew Boundary Tolerance (Valid with Grace Period)",
        input: {
          token_payload: {
            header: { alg: "HS256", typ: "JWT" },
            payload: { sub: "usr_102", role: "DEV", permissions: ["code:read"], exp: 990, iat: 500 },
            sig: "valid_hash_len_16_chars_long"
          },
          current_timestamp: 1000,
          options: { clock_skew_sec: 30 }
        },
        expected: { valid: true, user_id: "usr_102", role: "DEV" },
        is_public: true
      },
      {
        name: "Test 3: Expired Beyond Clock-Skew Boundary",
        input: {
          token_payload: {
            header: { alg: "RS256", typ: "JWT" },
            payload: { sub: "usr_103", role: "DEV", permissions: [], exp: 900, iat: 400 },
            sig: "valid_sig_hash_rs256_long"
          },
          current_timestamp: 1000,
          options: { clock_skew_sec: 30 }
        },
        expected: { valid: false, error: "ERR_TOKEN_EXPIRED" },
        is_public: true
      },
      {
        name: "Test 4: Admin Superuser Permission Override",
        input: {
          token_payload: {
            header: { alg: "HS256", typ: "JWT" },
            payload: { sub: "usr_admin", role: "ADMIN", permissions: [], exp: 2500, iat: 800 },
            sig: "admin_super_secret_sig_string"
          },
          current_timestamp: 1000,
          options: { required_permission: "kernel:reboot" }
        },
        expected: { valid: true, user_id: "usr_admin", role: "ADMIN" },
        is_public: false
      },
      {
        name: "Test 5: Revoked User Blacklist Check",
        input: {
          token_payload: {
            header: { alg: "HS256", typ: "JWT" },
            payload: { sub: "usr_blacklisted", role: "DEV", permissions: ["all"], exp: 3000, iat: 800 },
            sig: "sig_length_valid_long"
          },
          current_timestamp: 1000,
          options: { revoked_users: ["usr_blacklisted"] }
        },
        expected: { valid: false, error: "ERR_USER_REVOKED" },
        is_public: false
      },
      {
        name: "Test 6: Insecure Algorithm 'none' Rejection",
        input: {
          token_payload: {
            header: { alg: "none", typ: "JWT" },
            payload: { sub: "usr_attacker", role: "ADMIN", permissions: ["*"], exp: 3000, iat: 800 },
            sig: "some_sig_that_should_fail"
          },
          current_timestamp: 1000,
          options: {}
        },
        expected: { valid: false, error: "ERR_UNSUPPORTED_ALGORITHM" },
        is_public: false
      }
    ]
  },

  HARD: {
    id: 3,
    difficulty: "HARD",
    xpReward: 1400,
    title: "Distributed Financial Transaction Ledger & Nonce Engine",
    language: "python",
    description: "Process atomic batches of ledger transactions with sequential replay-attack nonces, overdraft credit limits, transaction caps, minimum network fees, and treasury fee routing.",
    buggy_code:
`def process_ledger_transactions(accounts, transactions, config=None):
    cfg = config or {}
    min_fee = cfg.get("min_fee", 1)
    max_amount = cfg.get("max_amount", 1000)
    fee_col = cfg.get("fee_collector", "treasury")

    accs = {k: {"balance": float(v.get("balance", 0)), "nonce": int(v.get("nonce", 0)), "overdraft_limit": float(v.get("overdraft_limit", 0))} for k, v in (accounts or {}).items()}
    if fee_col not in accs:
        accs[fee_col] = {"balance": 0.0, "nonce": 0, "overdraft_limit": 0.0}

    proc_tx = []
    rej_tx = []
    total_fees = 0.0

    for tx in (transactions or []):
        tx_id = tx.get("tx_id")
        f = tx.get("from")
        t = tx.get("to")
        amt = tx.get("amount", 0)
        fee = tx.get("fee", 0)
        nonce = tx.get("nonce")

        # BUG 1: Omits max_amount boundary check
        if f not in accs or t not in accs or amt <= 0 or fee < min_fee:
            rej_tx.append(tx_id)
            continue

        # BUG 2: Nonce check allows duplicate or out-of-order nonces (>= instead of == + 1)
        if nonce < accs[f]["nonce"]:
            rej_tx.append(tx_id)
            continue

        total_cost = amt + fee
        # BUG 3: Forgets overdraft limit in available funds calculation
        avail = accs[f]["balance"]
        if avail < total_cost:
            rej_tx.append(tx_id)
            continue

        accs[f]["balance"] = round(accs[f]["balance"] - total_cost, 2)
        accs[t]["balance"] = round(accs[t]["balance"] + amt, 2)
        accs[fee_col]["balance"] = round(accs[fee_col]["balance"] + fee, 2)
        accs[f]["nonce"] = nonce
        total_fees = round(total_fees + fee, 2)
        proc_tx.append(tx_id)

    final_bal = {k: round(v["balance"], 2) for k, v in accs.items()}
    return {"balances": final_bal, "processed_tx": proc_tx, "rejected_tx": rej_tx, "total_fees": total_fees}`,
    solution_code:
`def process_ledger_transactions(accounts, transactions, config=None):
    cfg = config or {}
    min_fee = cfg.get("min_fee", 1)
    max_amount = cfg.get("max_amount", 1000)
    fee_col = cfg.get("fee_collector", "treasury")

    accs = {k: {"balance": float(v.get("balance", 0)), "nonce": int(v.get("nonce", 0)), "overdraft_limit": float(v.get("overdraft_limit", 0))} for k, v in (accounts or {}).items()}
    if fee_col not in accs:
        accs[fee_col] = {"balance": 0.0, "nonce": 0, "overdraft_limit": 0.0}

    proc_tx = []
    rej_tx = []
    total_fees = 0.0

    for tx in (transactions or []):
        tx_id = tx.get("tx_id")
        f = tx.get("from")
        t = tx.get("to")
        amt = tx.get("amount", 0)
        fee = tx.get("fee", 0)
        nonce = tx.get("nonce")

        if f not in accs or t not in accs or amt <= 0 or amt > max_amount or fee < min_fee:
            rej_tx.append(tx_id)
            continue

        if nonce != accs[f]["nonce"] + 1:
            rej_tx.append(tx_id)
            continue

        total_cost = amt + fee
        avail = accs[f]["balance"] + accs[f]["overdraft_limit"]
        if avail < total_cost:
            rej_tx.append(tx_id)
            continue

        accs[f]["balance"] = round(accs[f]["balance"] - total_cost, 2)
        accs[t]["balance"] = round(accs[t]["balance"] + amt, 2)
        accs[fee_col]["balance"] = round(accs[fee_col]["balance"] + fee, 2)
        accs[f]["nonce"] = nonce
        total_fees = round(total_fees + fee, 2)
        proc_tx.append(tx_id)

    final_bal = {k: round(v["balance"], 2) for k, v in accs.items()}
    return {"balances": final_bal, "processed_tx": proc_tx, "rejected_tx": rej_tx, "total_fees": total_fees}`,
    test_cases: [
      {
        name: "Test 1: Standard Multi-Account Transfer",
        input: {
          accounts: {
            alice: { balance: 100, nonce: 0, overdraft_limit: 0 },
            bob: { balance: 50, nonce: 0, overdraft_limit: 0 },
            treasury: { balance: 0, nonce: 0, overdraft_limit: 0 }
          },
          transactions: [
            { tx_id: "tx_1", from: "alice", to: "bob", amount: 40, fee: 2, nonce: 1 }
          ],
          config: { min_fee: 2, max_amount: 500, fee_collector: "treasury" }
        },
        expected: {
          balances: { alice: 58, bob: 90, treasury: 2 },
          processed_tx: ["tx_1"],
          rejected_tx: [],
          total_fees: 2
        },
        is_public: true
      },
      {
        name: "Test 2: Insufficient Balance Rejection (Atomicity Check)",
        input: {
          accounts: {
            david: { balance: 30, nonce: 2, overdraft_limit: 0 },
            bob: { balance: 50, nonce: 0, overdraft_limit: 0 },
            treasury: { balance: 10, nonce: 0, overdraft_limit: 0 }
          },
          transactions: [
            { tx_id: "tx_fail", from: "david", to: "bob", amount: 35, fee: 2, nonce: 3 }
          ],
          config: { min_fee: 2, max_amount: 500, fee_collector: "treasury" }
        },
        expected: {
          balances: { david: 30, bob: 50, treasury: 10 },
          processed_tx: [],
          rejected_tx: ["tx_fail"],
          total_fees: 0
        },
        is_public: true
      },
      {
        name: "Test 3: Overdraft Limit Allowance Boundary",
        input: {
          accounts: {
            eve: { balance: 20, nonce: 0, overdraft_limit: 50 },
            bob: { balance: 10, nonce: 0, overdraft_limit: 0 },
            treasury: { balance: 0, nonce: 0, overdraft_limit: 0 }
          },
          transactions: [
            { tx_id: "tx_overdraft", from: "eve", to: "bob", amount: 60, fee: 5, nonce: 1 }
          ],
          config: { min_fee: 2, max_amount: 500, fee_collector: "treasury" }
        },
        expected: {
          balances: { eve: -45, bob: 70, treasury: 5 },
          processed_tx: ["tx_overdraft"],
          rejected_tx: [],
          total_fees: 5
        },
        is_public: true
      },
      {
        name: "Test 4: Nonce Replay Attack Prevention",
        input: {
          accounts: {
            alice: { balance: 200, nonce: 5, overdraft_limit: 0 },
            bob: { balance: 0, nonce: 0, overdraft_limit: 0 },
            treasury: { balance: 0, nonce: 0, overdraft_limit: 0 }
          },
          transactions: [
            { tx_id: "tx_replay", from: "alice", to: "bob", amount: 10, fee: 2, nonce: 5 }
          ],
          config: { min_fee: 2, max_amount: 500, fee_collector: "treasury" }
        },
        expected: {
          balances: { alice: 200, bob: 0, treasury: 0 },
          processed_tx: [],
          rejected_tx: ["tx_replay"],
          total_fees: 0
        },
        is_public: false
      },
      {
        name: "Test 5: Minimum Fee & Max Amount Boundary Enforcement",
        input: {
          accounts: {
            alice: { balance: 500, nonce: 0, overdraft_limit: 0 },
            bob: { balance: 0, nonce: 0, overdraft_limit: 0 },
            treasury: { balance: 0, nonce: 0, overdraft_limit: 0 }
          },
          transactions: [
            { tx_id: "tx_low_fee", from: "alice", to: "bob", amount: 10, fee: 1, nonce: 1 },
            { tx_id: "tx_too_large", from: "alice", to: "bob", amount: 600, fee: 10, nonce: 1 }
          ],
          config: { min_fee: 5, max_amount: 500, fee_collector: "treasury" }
        },
        expected: {
          balances: { alice: 500, bob: 0, treasury: 0 },
          processed_tx: [],
          rejected_tx: ["tx_low_fee", "tx_too_large"],
          total_fees: 0
        },
        is_public: false
      },
      {
        name: "Test 6: Sequential Chain Execution with Treasury Fee Accumulation",
        input: {
          accounts: {
            alice: { balance: 100, nonce: 0, overdraft_limit: 0 },
            bob: { balance: 50, nonce: 0, overdraft_limit: 0 },
            treasury: { balance: 0, nonce: 0, overdraft_limit: 0 }
          },
          transactions: [
            { tx_id: "tx_seq_1", from: "alice", to: "bob", amount: 20, fee: 2, nonce: 1 },
            { tx_id: "tx_seq_2", from: "bob", to: "alice", amount: 10, fee: 2, nonce: 1 },
            { tx_id: "tx_seq_3", from: "alice", to: "bob", amount: 30, fee: 3, nonce: 2 }
          ],
          config: { min_fee: 2, max_amount: 500, fee_collector: "treasury" }
        },
        expected: {
          balances: { alice: 55, bob: 88, treasury: 7 },
          processed_tx: ["tx_seq_1", "tx_seq_2", "tx_seq_3"],
          rejected_tx: [],
          total_fees: 7
        },
        is_public: false
      }
    ]
  }
};

export function getChallengeByDifficulty(difficulty = "MEDIUM") {
  const diff = (difficulty || "MEDIUM").toUpperCase();
  return CHALLENGES[diff] || CHALLENGES.MEDIUM;
}
