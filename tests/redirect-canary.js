import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TARGET_URL = __ENV.TARGET_URL || 'https://example.com/canary';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
    http_req_failed: ['rate==0'],
    'http_req_duration{name:register}': ['p(95)<2000'],
    'http_req_duration{name:create}':   ['p(95)<2000'],
    'http_req_duration{name:redirect}': ['p(95)<500'],
  },
};

function jsonHeaders() {
  return { 'Content-Type': 'application/json' };
}

export default function () {
  const ts = Date.now().toString(36);
  const username = `canary_${ts}`.slice(0, 20);
  const password = `canary-${ts}-pwd`;

  const reg = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({ username, password }),
    { headers: jsonHeaders(), tags: { name: 'register' } },
  );
  if (
    !check(reg, {
      'register 2xx': (r) => r.status >= 200 && r.status < 300,
      'register has token': (r) => typeof r.json('token') === 'string',
    })
  ) {
    fail(`register failed: ${reg.status} ${reg.body}`);
  }
  const token = reg.json('token');

  const me = http.get(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    tags: { name: 'me' },
  });
  if (
    !check(me, {
      'me 200': (r) => r.status === 200,
      'me no password leak': (r) => r.json('password') == null,
    })
  ) {
    fail(`me failed: ${me.status} ${me.body}`);
  }
  const userId = me.json('userId');

  const create = http.post(
    `${BASE_URL}/url`,
    JSON.stringify({ url: TARGET_URL, userId }),
    { headers: jsonHeaders(), tags: { name: 'create' } },
  );
  if (
    !check(create, {
      'create 2xx': (r) => r.status >= 200 && r.status < 300,
      'create has shortUrl': (r) => typeof r.json('shortUrl') === 'string',
    })
  ) {
    fail(`create failed: ${create.status} ${create.body}`);
  }
  const shortUrl = create.json('shortUrl');
  const code = shortUrl.split('/').pop();

  const redirect = http.get(`${BASE_URL}/${code}`, {
    redirects: 0,
    tags: { name: 'redirect' },
  });
  if (
    !check(redirect, {
      'redirect 302': (r) => r.status === 302,
      'redirect Location matches': (r) => r.headers['Location'] === TARGET_URL,
    })
  ) {
    fail(
      `redirect failed: status=${redirect.status} location=${redirect.headers['Location']}`,
    );
  }
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    stdout: '\n=== canary OK ===\n',
  };
}
