// Phase 4 load test — run with k6 (https://k6.io, free and open source):
//   k6 run scripts/load-test.js
//   k6 run -e BASE_URL=https://your-deployed-url.com scripts/load-test.js
//
// Honest note: k6 is a standalone Go binary, not installable via npm in
// this sandbox, so this script was written and reviewed but not executed
// here. A lighter, genuinely-run sanity check (50 concurrent requests
// against the local server) is documented in the Phase 4 completion
// report instead — this script is what you should actually run before a
// real launch, against your real deployed URL.
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 20 }, // ramp up to 20 virtual users
    { duration: "1m", target: 20 }, // hold
    { duration: "15s", target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"], // 95% of requests under 800ms
    http_req_failed: ["rate<0.01"], // less than 1% failures
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // The landing page and login page are what an unauthenticated load
  // spike (e.g. a traffic surge, or a naive scraper) would actually hit.
  const landing = http.get(`${BASE_URL}/`);
  check(landing, { "landing page is 200": (r) => r.status === 200 });

  const login = http.get(`${BASE_URL}/login`);
  check(login, { "login page is 200": (r) => r.status === 200 });

  const health = http.get(`${BASE_URL}/api/me`);
  check(health, { "unauthenticated /api/me correctly returns 401, not a 500": (r) => r.status === 401 });

  sleep(1);
}
