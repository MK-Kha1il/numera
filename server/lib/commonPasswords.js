// Offline blocklist of the most common / breached-style passwords. Membership is
// case-insensitive so "Password123" is caught by "password123". This is a curated core of
// the perennial top lists (SecLists / HIBP top entries); it deliberately favors the
// passwords attackers actually try first. Expand freely — it's a plain Set, O(1) lookup.
//
// Intentionally offline: no network dependency, no privacy leak of user passwords. For a
// breach-corpus check beyond this list, the HIBP k-anonymity range API can be layered on
// later (see docs/SecurityAudit-Auth.md).
const COMMON = new Set(
  [
    '123456', '123456789', '12345678', '1234567', '1234567890', '12345', '123123', '111111',
    '000000', '654321', '666666', '121212', '112233', '789456', '987654321', '159753',
    'password', 'password1', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'pass1234',
    'qwerty', 'qwerty123', 'qwertyuiop', 'qwerty1', '1q2w3e4r', '1q2w3e4r5t', 'q1w2e3r4',
    'asdfghjkl', 'zxcvbnm', 'qazwsx', 'qazwsxedc', 'abc123', 'abcd1234', 'a1b2c3d4',
    'iloveyou', 'admin', 'admin123', 'administrator', 'root', 'toor', 'letmein', 'welcome',
    'welcome1', 'welcome123', 'monkey', 'dragon', 'sunshine', 'princess', 'football',
    'baseball', 'superman', 'batman', 'master', 'shadow', 'michael', 'jennifer', 'jordan',
    'harley', 'ranger', 'trustno1', 'whatever', 'starwars', 'computer', 'login', 'guest',
    'changeme', 'secret', 'access', 'flower', 'hottie', 'loveme', 'zaq12wsx', 'samsung',
    'google', 'facebook', 'hello123', 'freedom', 'ninja', 'azerty', 'soccer', 'killer',
    'pokemon', 'cheese', 'summer', 'winter', 'autumn', 'spring2024', 'qwe123', 'asd123',
    '123qwe', '123abc', 'aa123456', 'abc12345', 'test123', 'test1234', 'temp1234', 'demo1234',
    'pa$$w0rd', 'passw0rd1', 'p@ssw0rd1', 'qwerty12345', 'iloveyou1', 'letmein123',
    'numera', 'numera123', 'mathmath', 'math1234', 'mathematics',
  ].map((p) => p.toLowerCase())
);

function isCommonPassword(password) {
  if (typeof password !== 'string') return false;
  return COMMON.has(password.toLowerCase());
}

module.exports = { isCommonPassword, COMMON_PASSWORD_COUNT: COMMON.size };
