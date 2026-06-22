import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SEED_COUNT = parseInt(__ENV.SEED_COUNT || '50');

const redirectLatency = new Trend('redirect_latency', true);
const createLatency = new Trend('create_latency', true);

export const options = {
  scenarios: {
    redirect_hot_path: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 500,
      stages: [
        { target: 1000, duration: '30s' },
        { target: 5000, duration: '1m' },
        { target: 5000, duration: '1m' },
        { target: 0,   duration: '15s' },
      ],
      exec: 'redirect',
    },
    create_writes: {
      executor: 'constant-arrival-rate',
      rate: 20,
      timeUnit: '1s',
      duration: '2m45s',
      preAllocatedVUs: 20,
      maxVUs: 100,
      exec: 'createUrl',
      startTime: '15s',
    },
  },
  thresholds: {
    'http_req_failed':            ['rate<0.01'],
    'redirect_latency':           ['p(95)<200'],
    'create_latency':             ['p(95)<500'],
  },
};

export function setup() {
  const username = `loadtest_${Date.now()}`;
  const password = 'loadtest-password-1';

  const reg = http.post(`${BASE_URL}/auth/register`, JSON.stringify({ username, password }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(reg, { 'register 2xx': (r) => r.status >= 200 && r.status < 300 });

  const me = http.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${reg.json('token')}` },
  });
  const userId = me.json('userId');

  const codes = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    const res = http.post(`${BASE_URL}/url`, JSON.stringify({
      url: `https://example.com/seed/${i}/${Math.random().toString(36).slice(2)}`,
      userId,
    }), { headers: { 'Content-Type': 'application/json' } });
    const shortUrl = res.json('shortUrl');
    if (shortUrl) codes.push(shortUrl.split('/').pop());
  }

  if (codes.length === 0) throw new Error('seed failed: no codes created');
  console.log(`seeded ${codes.length} short codes as userId=${userId}`);
  return { userId, codes };
}

export function redirect(data) {
  const code = data.codes[Math.floor(Math.random() * data.codes.length)];
  const res = http.get(`${BASE_URL}/${code}`, { redirects: 0 });
  redirectLatency.add(res.timings.duration);
  check(res, { 'redirect 302': (r) => r.status === 302 });
}

export function createUrl(data) {
  const res = http.post(`${BASE_URL}/url`, JSON.stringify({
    url: `https://example.com/${Math.random().toString(36).slice(2)}`,
    userId: data.userId,
  }), { headers: { 'Content-Type': 'application/json' } });
  createLatency.add(res.timings.duration);
  check(res, { 'create 2xx': (r) => r.status >= 200 && r.status < 300 });
}
