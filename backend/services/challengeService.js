export const CHALLENGES = {
  EASY: {
    id: 1,
    difficulty: "EASY",
    xpReward: 500,
    title: "LeetCode 1: Two Sum",
    language: "python",
    description:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    buggy_code:
`def twoSum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        seen[num] = i
        if diff in seen and seen[diff] != i:
            return [seen[diff], i]
    return []`,
    solution_code:
`def twoSum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`,
    test_cases: [
      {
        name: "Example 1: Basic positive target (nums = [2,7,11,15], target = 9)",
        input: { nums: [2, 7, 11, 15], target: 9 },
        expected: [0, 1],
        is_public: true,
        hidden: false
      },
      {
        name: "Example 2: Target from non-adjacent indices (nums = [3,2,4], target = 6)",
        input: { nums: [3, 2, 4], target: 6 },
        expected: [1, 2],
        is_public: true,
        hidden: false
      },
      {
        name: "Example 3: Duplicate identical elements (nums = [3,3], target = 6)",
        input: { nums: [3, 3], target: 6 },
        expected: [0, 1],
        is_public: true,
        hidden: false
      },
      {
        name: "Edge Case 4: Negative numbers with negative target (nums = [-1,-2,-3,-4,-5], target = -8)",
        input: { nums: [-1, -2, -3, -4, -5], target: -8 },
        expected: [2, 4],
        is_public: false,
        hidden: true
      },
      {
        name: "Edge Case 5: Target of zero with zeroes (nums = [0,4,3,0], target = 0)",
        input: { nums: [0, 4, 3, 0], target: 0 },
        expected: [0, 3],
        is_public: false,
        hidden: true
      },
      {
        name: "Edge Case 6: Negative and positive combination across wide range (nums = [-10,7,19,15,25], target = 15)",
        input: { nums: [-10, 7, 19, 15, 25], target: 15 },
        expected: [0, 4],
        is_public: false,
        hidden: true
      }
    ]
  },

  MEDIUM: {
    id: 2,
    difficulty: "MEDIUM",
    xpReward: 850,
    title: "LeetCode 3: Longest Substring Without Repeating Characters",
    language: "python",
    description:
      "Given a string `s`, find the length of the longest substring without repeating characters.",
    buggy_code:
`def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    left = 0
    max_len = 0
    for right in range(len(s)):
        char = s[right]
        if char in char_map:
            left = char_map[char] + 1
        char_map[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len`,
    solution_code:
`def lengthOfLongestSubstring(s: str) -> int:
    char_map = {}
    left = 0
    max_len = 0
    for right, char in enumerate(s):
        if char in char_map and char_map[char] >= left:
            left = char_map[char] + 1
        char_map[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len`,
    test_cases: [
      {
        name: 'Example 1: Standard string with multiple repetitions (s = "abcabcbb")',
        input: { s: "abcabcbb" },
        expected: 3,
        is_public: true,
        hidden: false
      },
      {
        name: 'Example 2: All identical repeating characters (s = "bbbbb")',
        input: { s: "bbbbb" },
        expected: 1,
        is_public: true,
        hidden: false
      },
      {
        name: 'Example 3: Substring with repetition inside sequence (s = "pwwkew")',
        input: { s: "pwwkew" },
        expected: 3,
        is_public: true,
        hidden: false
      },
      {
        name: 'Edge Case 4: Empty string (s = "")',
        input: { s: "" },
        expected: 0,
        is_public: false,
        hidden: true
      },
      {
        name: 'Edge Case 5: Single whitespace character (s = " ")',
        input: { s: " " },
        expected: 1,
        is_public: false,
        hidden: true
      },
      {
        name: 'Edge Case 6: Window reset trap (s = "abba")',
        input: { s: "abba" },
        expected: 2,
        is_public: false,
        hidden: true
      }
    ]
  },

  HARD: {
    id: 3,
    difficulty: "HARD",
    xpReward: 1400,
    title: "LeetCode 42: Trapping Rain Water",
    language: "python",
    description:
      "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.",
    buggy_code:
`def trap(height: list[int]) -> int:
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
    return water`,
    solution_code:
`def trap(height: list[int]) -> int:
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
    return water`,
    test_cases: [
      {
        name: "Example 1: Standard elevation map with multi-peak valleys",
        input: { height: [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1] },
        expected: 6,
        is_public: true,
        hidden: false
      },
      {
        name: "Example 2: Plateau with central basin",
        input: { height: [4, 2, 0, 3, 2, 5] },
        expected: 9,
        is_public: true,
        hidden: false
      },
      {
        name: "Edge Case 3: Empty elevation array",
        input: { height: [] },
        expected: 0,
        is_public: true,
        hidden: false
      },
      {
        name: "Edge Case 4: Insufficient bars to trap water",
        input: { height: [3, 2] },
        expected: 0,
        is_public: false,
        hidden: true
      },
      {
        name: "Edge Case 5: Strictly decreasing staircase",
        input: { height: [5, 4, 3, 2, 1] },
        expected: 0,
        is_public: false,
        hidden: true
      },
      {
        name: "Edge Case 6: Deep canyon with symmetric peaks",
        input: { height: [5, 2, 1, 2, 1, 5] },
        expected: 14,
        is_public: false,
        hidden: true
      }
    ]
  }
};

export function getChallengeByDifficulty(difficulty = "MEDIUM") {
  const diff = (difficulty || "MEDIUM").toUpperCase();
  return CHALLENGES[diff] || CHALLENGES.MEDIUM;
}
