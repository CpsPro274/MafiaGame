INSERT INTO users (username, email, password)
VALUES 
    ('alex_dev', 'alex@gmail.com', 'password123'),
    ('sam_mafia', 'sam@gmail.com', 'password123')
ON CONFLICT (username) DO NOTHING;

INSERT INTO challenges (id, title, description, language, buggy_code, solution_code, test_cases)
VALUES 
(
    1,
    'LeetCode 1: Two Sum',
    'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
    'python',
$BUGGY1$
def twoSum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        seen[num] = i
        if diff in seen and seen[diff] != i:
            return [seen[diff], i]
    return []
$BUGGY1$,
$SOL1$
def twoSum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []
$SOL1$,
'[
    {"name": "Example 1: Basic positive target", "input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1], "is_public": true, "hidden": false},
    {"name": "Example 2: Target from non-adjacent indices", "input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2], "is_public": true, "hidden": false},
    {"name": "Example 3: Duplicate identical elements", "input": {"nums": [3, 3], "target": 6}, "expected": [0, 1], "is_public": true, "hidden": false},
    {"name": "Edge Case 4: Negative numbers with negative target", "input": {"nums": [-1, -2, -3, -4, -5], "target": -8}, "expected": [2, 4], "is_public": false, "hidden": true},
    {"name": "Edge Case 5: Target of zero with zeroes", "input": {"nums": [0, 4, 3, 0], "target": 0}, "expected": [0, 3], "is_public": false, "hidden": true},
    {"name": "Edge Case 6: Negative and positive combination", "input": {"nums": [-10, 7, 19, 15, 25], "target": 15}, "expected": [0, 4], "is_public": false, "hidden": true}
]'::jsonb
),
(
    2,
    'LeetCode 3: Longest Substring Without Repeating Characters',
    'Given a string s, find the length of the longest substring without repeating characters.',
    'python',
$BUGGY2$
def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    left = 0
    max_len = 0
    for right in range(len(s)):
        char = s[right]
        if char in char_map:
            left = char_map[char] + 1
        char_map[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len
$BUGGY2$,
$SOL2$
def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    left = 0
    max_len = 0
    for right, char in enumerate(s):
        if char in char_map and char_map[char] >= left:
            left = char_map[char] + 1
        char_map[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len
$SOL2$,
'[
    {"name": "Example 1: Standard string repetitions", "input": {"s": "abcabcbb"}, "expected": 3, "is_public": true, "hidden": false},
    {"name": "Example 2: All identical repeating characters", "input": {"s": "bbbbb"}, "expected": 1, "is_public": true, "hidden": false},
    {"name": "Example 3: Substring with repetition inside", "input": {"s": "pwwkew"}, "expected": 3, "is_public": true, "hidden": false},
    {"name": "Edge Case 4: Empty string", "input": {"s": ""}, "expected": 0, "is_public": false, "hidden": true},
    {"name": "Edge Case 5: Single whitespace character", "input": {"s": " "}, "expected": 1, "is_public": false, "hidden": true},
    {"name": "Edge Case 6: Window reset trap", "input": {"s": "abba"}, "expected": 2, "is_public": false, "hidden": true}
]'::jsonb
),
(
    3,
    'LeetCode 42: Trapping Rain Water',
    'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    'python',
$BUGGY3$
def trap(height: list[int]) -> int:
    if not height or len(height) < 3:
        return 0
    left, right = 0, len(height) - 1
    left_max, right_max = height[left], height[right]
    water = 0
    while left < right:
        if left_max <= right_max:
            left += 1
            water += max(0, left_max - height[left])
            left_max = max(left_max, height[left])
        else:
            right -= 1
            water += right_max - height[right]
            right_max = max(right_max, height[right])
    return water
$BUGGY3$,
$SOL3$
def trap(height: list[int]) -> int:
    if not height:
        return 0
    left, right = 0, len(height) - 1
    left_max, right_max = height[left], height[right]
    water = 0
    while left < right:
        if left_max < right_max:
            left += 1
            left_max = max(left_max, height[left])
            water += left_max - height[left]
        else:
            right -= 1
            right_max = max(right_max, height[right])
            water += right_max - height[right]
    return water
$SOL3$,
'[
    {"name": "Example 1: Standard elevation map", "input": {"height": [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]}, "expected": 6, "is_public": true, "hidden": false},
    {"name": "Example 2: Plateau with central basin", "input": {"height": [4, 2, 0, 3, 2, 5]}, "expected": 9, "is_public": true, "hidden": false},
    {"name": "Edge Case 3: Empty elevation array", "input": {"height": []}, "expected": 0, "is_public": true, "hidden": false},
    {"name": "Edge Case 4: Insufficient bars to trap water", "input": {"height": [3, 2]}, "expected": 0, "is_public": false, "hidden": true},
    {"name": "Edge Case 5: Strictly decreasing staircase", "input": {"height": [5, 4, 3, 2, 1]}, "expected": 0, "is_public": false, "hidden": true},
    {"name": "Edge Case 6: Deep canyon with symmetric peaks", "input": {"height": [5, 2, 1, 2, 1, 5]}, "expected": 14, "is_public": false, "hidden": true}
]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET 
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    language = EXCLUDED.language,
    buggy_code = EXCLUDED.buggy_code,
    solution_code = EXCLUDED.solution_code,
    test_cases = EXCLUDED.test_cases;
