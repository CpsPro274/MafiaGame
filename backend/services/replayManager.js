
const roomTimelines = new Map();

export function initTimeline(roomCode, initialCode, players) {
  const normalizedCode = roomCode.trim().toUpperCase();
  const startTime = Date.now();

  const initialEvent = {
    index: 0,
    timestampMs: 0,
    timeLabel: "00:00",
    author: "System",
    authorRole: "SYSTEM",
    action: "MATCH_START",
    details: "Match started. Buggy challenge loaded into collaborative workspace.",
    code: initialCode,
    activeLines: []
  };

  roomTimelines.set(normalizedCode, {
    roomCode: normalizedCode,
    startTime,
    players,
    events: [initialEvent]
  });

  console.log(`🎬 [Replay Initialized] Room: ${normalizedCode}`);
}

export function recordEvent(roomCode, { author, authorRole, action, details, code, activeLines = [] }) {
  const normalizedCode = roomCode.trim().toUpperCase();
  const timeline = roomTimelines.get(normalizedCode);

  if (!timeline) return;

  const elapsedMs = Date.now() - timeline.startTime;
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);
  const timeLabel = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const event = {
    index: timeline.events.length,
    timestampMs: elapsedMs,
    timeLabel,
    author: author || "Anonymous",
    authorRole: authorRole || "DEVELOPER",
    action,
    details: details || "Code modified",
    code: code || (timeline.events[timeline.events.length - 1]?.code || ""),
    activeLines
  };

  timeline.events.push(event);
}

export function getReplay(roomCode) {
  const normalizedCode = roomCode.trim().toUpperCase();
  const timeline = roomTimelines.get(normalizedCode);

  if (!timeline) {
    return generateDemoReplay(normalizedCode);
  }

  return timeline;
}

export function generateDemoReplay(roomCode = "DEMO-MAFIA") {
  return {
    roomCode,
    startTime: Date.now() - 360000,
    players: [
      { username: "Alice", role: "DEVELOPER" },
      { username: "Bob", role: "DEVELOPER" },
      { username: "Ghost", role: "MAFIA" }
    ],
    events: [
      {
        index: 0,
        timestampMs: 0,
        timeLabel: "00:00",
        author: "System",
        authorRole: "SYSTEM",
        action: "MATCH_START",
        details: "Match started. Initial buggy cart discount challenge loaded.",
        code:
`def calculate_total(items, discount_code):
    subtotal = 0
    # BUG 1: Off-by-one boundary access
    for i in range(len(items) + 1):
        subtotal += items[i]['price'] * items[i]['qty']
    
    # Apply standard discount
    if discount_code == "SAVE20":
        subtotal -= 20
    return subtotal`,
        activeLines: [3, 4]
      },
      {
        index: 1,
        timestampMs: 45000,
        timeLabel: "00:45",
        author: "Alice",
        authorRole: "DEVELOPER",
        action: "TEST_FAIL",
        details: "Alice ran unit tests: 1 PASSED | 2 FAILED (IndexError on items[i])",
        code:
`def calculate_total(items, discount_code):
    subtotal = 0
    # BUG 1: Off-by-one boundary access
    for i in range(len(items) + 1):
        subtotal += items[i]['price'] * items[i]['qty']
    
    if discount_code == "SAVE20":
        subtotal -= 20
    return subtotal`,
        activeLines: [4]
      },
      {
        index: 2,
        timestampMs: 92000,
        timeLabel: "01:32",
        author: "Alice",
        authorRole: "DEVELOPER",
        action: "CODE_EDIT",
        details: "Alice fixed loop range to 'range(len(items))'",
        code:
`def calculate_total(items, discount_code):
    subtotal = 0
    # FIXED: Clean bounds
    for i in range(len(items)):
        subtotal += items[i]['price'] * items[i]['qty']
    
    if discount_code == "SAVE20":
        subtotal -= 20
    return subtotal`,
        activeLines: [3, 4]
      },
      {
        index: 3,
        timestampMs: 140000,
        timeLabel: "02:20",
        author: "Alice",
        authorRole: "DEVELOPER",
        action: "TEST_PASS",
        details: "Alice ran tests: ALL 3 TESTS PASSED! Code stabilized.",
        code:
`def calculate_total(items, discount_code):
    subtotal = 0
    for i in range(len(items)):
        subtotal += items[i]['price'] * items[i]['qty']
    
    if discount_code == "SAVE20":
        subtotal -= 20
    return subtotal`,
        activeLines: [3, 4]
      },
      {
        index: 4,
        timestampMs: 195000,
        timeLabel: "03:15",
        author: "Ghost",
        authorRole: "MAFIA",
        action: "SABOTAGE",
        details: "🕵️ MAFIA SABOTAGE: Ghost silently added a 50% arbitrary tax surcharge!",
        code:
`def calculate_total(items, discount_code):
    subtotal = 0
    for i in range(len(items)):
        subtotal += items[i]['price'] * items[i]['qty']
    
    # 🕵️ Planted Regression
    subtotal = subtotal * 1.50 # Ghost sabotaged calculation
    
    if discount_code == "SAVE20":
        subtotal -= 20
    return subtotal`,
        activeLines: [7, 8]
      },
      {
        index: 5,
        timestampMs: 240000,
        timeLabel: "04:00",
        author: "Bob",
        authorRole: "DEVELOPER",
        action: "TEST_FAIL",
        details: "Bob ran submission tests: Regression detected! Expected 80, got 130.",
        code:
`def calculate_total(items, discount_code):
    subtotal = 0
    for i in range(len(items)):
        subtotal += items[i]['price'] * items[i]['qty']
    
    subtotal = subtotal * 1.50
    
    if discount_code == "SAVE20":
        subtotal -= 20
    return subtotal`,
        activeLines: [7]
      },
      {
        index: 6,
        timestampMs: 290000,
        timeLabel: "04:50",
        author: "Bob",
        authorRole: "DEVELOPER",
        action: "MEETING",
        details: "🚨 Bob called an EMERGENCY MEETING to interrogate Ghost!",
        code:
`def calculate_total(items, discount_code):
    subtotal = 0
    for i in range(len(items)):
        subtotal += items[i]['price'] * items[i]['qty']
    
    subtotal = subtotal * 1.50
    
    if discount_code == "SAVE20":
        subtotal -= 20
    return subtotal`,
        activeLines: [7]
      }
    ]
  };
}
