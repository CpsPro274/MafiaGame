
export const CHALLENGES = {
  EASY: {
    id: 1,
    difficulty: "EASY",
    xpReward: 500,
    title: "Shopping Cart Discount Engine",
    language: "python",
    description: "Fix loop boundary bugs to accurately calculate item subtotals and apply coupon discounts.",
    buggy_code:
`def calculate_cart_total(items, discount_pct):
    subtotal = 0
    # BUG 1: Loop index goes 1 too far (IndexError)
    for i in range(len(items) + 1):
        subtotal += items[i]["price"] * items[i]["qty"]
    
    # Calculate discount & final total
    total = subtotal - (subtotal * discount_pct / 100)
    return total`,
    solution_code:
`def calculate_cart_total(items, discount_pct):
    subtotal = 0
    for item in items:
        subtotal += item["price"] * item["qty"]
    total = subtotal - (subtotal * discount_pct / 100)
    return round(total, 2)`,
    test_cases: [
      { input: { items: [{ price: 50, qty: 2 }], discount_pct: 10 }, expected: 90, is_public: true },
      { input: { items: [], discount_pct: 15 }, expected: 0, is_public: true },
      { input: { items: [{ price: 100, qty: 1 }, { price: 25, qty: 4 }], discount_pct: 20 }, expected: 160, is_public: false }
    ]
  },

  MEDIUM: {
    id: 2,
    difficulty: "MEDIUM",
    xpReward: 850,
    title: "Auth Token & Expiry Validator",
    language: "python",
    description: "Validate digital token signatures and verify timestamps without allowing expired credentials.",
    buggy_code:
`def validate_auth_token(token_payload, current_timestamp):
    # BUG 1: Inverted expiry logic (allows expired tokens, rejects valid tokens)
    if token_payload["exp"] < current_timestamp:
        return {"valid": True, "user_id": token_payload["sub"]}
    
    # BUG 2: Missing signature null check
    if not token_payload.get("sig") or len(token_payload["sig"]) < 8:
        return {"valid": True, "error": "Invalid signature"}
        
    return {"valid": False, "error": "Token expired"}`,
    solution_code:
`def validate_auth_token(token_payload, current_timestamp):
    if token_payload.get("exp", 0) <= current_timestamp:
        return {"valid": False, "error": "Token expired"}
    if not token_payload.get("sig") or len(token_payload["sig"]) < 8:
        return {"valid": False, "error": "Invalid signature"}
    return {"valid": True, "user_id": token_payload["sub"]}`,
    test_cases: [
      { input: { token_payload: { sub: 101, exp: 2000, sig: "valid_signature_hash" }, current_timestamp: 1000 }, expected: { valid: true, user_id: 101 }, is_public: true },
      { input: { token_payload: { sub: 102, exp: 500, sig: "valid_signature_hash" }, current_timestamp: 1000 }, expected: { valid: false, error: "Token expired" }, is_public: true },
      { input: { token_payload: { sub: 103, exp: 2500, sig: "short" }, current_timestamp: 1000 }, expected: { valid: false, error: "Invalid signature" }, is_public: false }
    ]
  },

  HARD: {
    id: 3,
    difficulty: "HARD",
    xpReward: 1400,
    title: "LRU Cache Memory Eviction Engine",
    language: "python",
    description: "Implement a Least-Recently-Used (LRU) cache with O(1) get/put operations and proper capacity eviction.",
    buggy_code:
`class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        self.order = []

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        # BUG 1: Fails to update recent access order
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache[key] = value
            return
        
        # BUG 2: Evicts index 0 instead of maintaining correct LRU queue
        if len(self.cache) >= self.capacity:
            oldest_key = self.order.pop() # Bug: pops recent instead of oldest!
            del self.cache[oldest_key]
            
        self.cache[key] = value
        self.order.append(key)`,
    solution_code:
`class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        self.order = []

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.order.remove(key)
        self.order.append(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.order.remove(key)
        elif len(self.cache) >= self.capacity:
            oldest = self.order.pop(0)
            del self.cache[oldest]
        self.cache[key] = value
        self.order.append(key)`,
    test_cases: [
      { input: { operations: ["put(1,1)", "put(2,2)", "get(1)", "put(3,3)", "get(2)"] }, expected: -1, is_public: true },
      { input: { operations: ["put(1,10)", "get(1)"] }, expected: 10, is_public: true },
      { input: { operations: ["put(1,1)", "put(2,2)", "put(3,3)", "get(1)", "put(4,4)", "get(2)"] }, expected: -1, is_public: false }
    ]
  }
};

export function getChallengeByDifficulty(difficulty = "MEDIUM") {
  const diff = (difficulty || "MEDIUM").toUpperCase();
  return CHALLENGES[diff] || CHALLENGES.MEDIUM;
}
