import express from "express";
import { execFile } from "child_process";

const app = express();
app.use(express.json());

const PYTHON_CONTAINER_HARNESS = `
import sys, json
from typing import List, Dict, Tuple, Set, Optional, Any

def deep_equal(a, b, tol=1e-5):
    if a == b: return True
    if isinstance(a, (int, float)) and isinstance(b, (int, float)): return abs(a - b) <= tol
    if isinstance(a, dict) and isinstance(b, dict):
        if len(a) != len(b): return False
        return all(k in b and deep_equal(a[k], b[k], tol) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b): return False
        if len(a) == 2 and all(isinstance(x, int) for x in a) and all(isinstance(y, int) for y in b):
            if sorted(a) == sorted(b):
                return True
        return all(deep_equal(x, y, tol) for x, y in zip(a, b))
    return False

try:
    payload = json.loads(sys.stdin.read())
    user_code = payload.get("code", "")
    tests = payload.get("tests", [])
except Exception as e:
    print(json.dumps({"global_error": "Payload parse error: " + str(e)}))
    sys.exit(0)

scope = {
    "List": List,
    "Dict": Dict,
    "Tuple": Tuple,
    "Set": Set,
    "Optional": Optional,
    "Any": Any
}
results = []

try:
    exec(user_code, scope)
    fn = None
    candidate_names = [
        "twoSum", "two_sum",
        "lengthOfLongestSubstring", "length_of_longest_substring",
        "trap", "trapRainWater", "trap_rain_water",
        "calculate_cart_total", "calculateCartTotal",
        "validate_auth_token", "validateAuthToken",
        "process_ledger_transactions", "processLedgerTransactions"
    ]
    if "Solution" in scope and isinstance(scope["Solution"], type):
        try:
            sol_instance = scope["Solution"]()
            for name in candidate_names:
                if hasattr(sol_instance, name) and callable(getattr(sol_instance, name)):
                    fn = getattr(sol_instance, name)
                    break
            if not fn:
                for attr in dir(sol_instance):
                    if not attr.startswith("__") and callable(getattr(sol_instance, attr)):
                        fn = getattr(sol_instance, attr)
                        break
        except Exception:
            pass

    if not fn:
        for name in candidate_names:
            if name in scope and callable(scope[name]):
                fn = scope[name]
                break
    if not fn:
        for k, v in scope.items():
            if callable(v) and not k.startswith("__") and not isinstance(v, type):
                fn = v
                break
    if not fn:
        raise Exception("No callable target function found in submitted Python code.")

    for idx, tc in enumerate(tests):
        inp = tc.get("input", {})
        expected = tc.get("expected")
        try:
            if isinstance(inp, dict):
                try:
                    act = fn(**inp)
                except TypeError:
                    try:
                        act = fn(*inp.values())
                    except TypeError:
                        act = fn(inp)
            elif isinstance(inp, list):
                act = fn(*inp)
            else:
                act = fn(inp)
            passed = deep_equal(act, expected)
            results.append({
                "testCase": idx + 1,
                "name": tc.get("name", "Test Case " + str(idx + 1)),
                "passed": passed,
                "actual": act,
                "expected": expected,
                "input": inp,
                "error": None
            })
        except Exception as e:
            results.append({
                "testCase": idx + 1,
                "name": tc.get("name", "Test Case " + str(idx + 1)),
                "passed": False,
                "actual": None,
                "expected": expected,
                "input": inp,
                "error": str(e)
            })
except Exception as e:
    print(json.dumps({"global_error": str(e)}))
    sys.exit(0)

print(json.dumps({"results": results}))
`;

function parseAndFormatResults(rawStdout, rawStderr, testCases, stdout, stderr, resolve) {
  try {
    const parsed = JSON.parse(rawStdout.trim());
    if (parsed.global_error) {
      stderr += `Execution Exception: ${parsed.global_error}\n`;
      return resolve({
        allPassed: false,
        stdout: stdout + "Execution halted on syntax/runtime error.\n",
        stderr,
        results: testCases.map((tc, idx) => ({
          testCase: idx + 1,
          name: tc.name || `Test Case ${idx + 1}`,
          passed: false,
          actual: null,
          expected: tc.expected,
          input: tc.input,
          error: parsed.global_error
        }))
      });
    }

    const results = parsed.results || [];
    const allPassed = results.length > 0 && results.every((r) => r.passed);
    results.forEach((r) => {
      stdout += `Test ${r.testCase} [${r.name}]: ${r.passed ? "PASSED" : "FAILED"}\n`;
      if (r.error) stderr += `Test ${r.testCase} Exception: ${r.error}\n`;
    });
    stdout += allPassed ? "\nALL UNIT TESTS PASSED!" : "\nSOME TESTS FAILED.";
    resolve({ allPassed, stdout, stderr, results });
  } catch (parseErr) {
    stderr += `Output Parse Error: ${parseErr.message}\n${rawStdout}`;
    resolve({
      allPassed: false,
      stdout: stdout + "Failed to parse test outputs.\n",
      stderr,
      results: testCases.map((tc, idx) => ({
        testCase: idx + 1,
        name: tc.name || `Test Case ${idx + 1}`,
        passed: false,
        actual: null,
        expected: tc.expected,
        input: tc.input,
        error: parseErr.message
      }))
    });
  }
}

function runCode(code, testCases) {
  return new Promise((resolve) => {
    let stdout = "🐳 Executing in isolated container...\n";
    let stderr = "";

    const localProc = execFile("python3", ["-c", PYTHON_CONTAINER_HARNESS], { timeout: 5000, maxBuffer: 1024 * 1024 }, (localErr, localStdout, localStderr) => {
      if (localErr) {
        stderr += `Execution Error: ${localStderr || localErr.message}\n`;
        return resolve({
          allPassed: false,
          stdout: stdout + "Execution failed.\n",
          stderr,
          results: testCases.map((tc, idx) => ({
            testCase: idx + 1,
            name: tc.name || `Test Case ${idx + 1}`,
            passed: false,
            actual: null,
            expected: tc.expected,
            input: tc.input,
            error: localStderr || localErr.message
          }))
        });
      }
      parseAndFormatResults(localStdout, localStderr, testCases, stdout, stderr, resolve);
    });
    localProc.stdin.write(JSON.stringify({ code, tests: testCases }));
    localProc.stdin.end();
  });
}

app.post("/api/run-code", async (req, res) => {
  try {
    const { code, testCases } = req.body;
    const { allPassed, stdout, stderr, results } = await runCode(code, testCases || []);
    res.json({ allPassed, stdout, stderr, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Worker running on port ${PORT}`);
});
