// Symbolic & Numeric Utilities for the Adaptive Math Engine

function factorial(n) {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

function isPrime(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

function getPrimeFactors(n) {
  const factors = {};
  let temp = n;
  // Divide by 2
  while (temp % 2 === 0) {
    factors[2] = (factors[2] || 0) + 1;
    temp /= 2;
  }
  // Divide by odd numbers
  for (let i = 3; i * i <= temp; i += 2) {
    while (temp % i === 0) {
      factors[i] = (factors[i] || 0) + 1;
      temp /= i;
    }
  }
  if (temp > 1) {
    factors[temp] = (factors[temp] || 0) + 1;
  }
  return factors;
}

function getDivisors(n) {
  const divisors = [];
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      divisors.push(i);
      if (i * i !== n) {
        divisors.push(n / i);
      }
    }
  }
  return divisors.sort((a, b) => a - b);
}

// Generates a proper integer Pythagorean Triple: a^2 + b^2 = c^2
function generatePythagoreanTriple(diffFactor) {
  // Primitive triples database
  const primitives = [
    { u: 2, v: 1, a: 3, b: 4, c: 5 },
    { u: 3, v: 2, a: 5, b: 12, c: 13 },
    { u: 4, v: 1, a: 8, b: 15, c: 17 },
    { u: 4, v: 3, a: 7, b: 24, c: 25 },
    { u: 5, v: 2, a: 21, b: 20, c: 29 },
    { u: 5, v: 4, a: 9, b: 40, c: 41 }
  ];
  // Select primitive triple
  const index = Math.floor(Math.random() * primitives.length);
  const triple = primitives[index];
  
  // Scale triple based on Elo difficulty factor
  const minScale = Math.max(1, Math.floor(diffFactor));
  const maxScale = Math.max(minScale, Math.floor(diffFactor * 2.5));
  const scale = minScale + Math.floor(Math.random() * (maxScale - minScale + 1));
  
  // Randomly swap a and b to vary orientation
  const swap = Math.random() < 0.5;
  return {
    a: (swap ? triple.b : triple.a) * scale,
    b: (swap ? triple.a : triple.b) * scale,
    c: triple.c * scale,
    scale
  };
}

// Generates a Quadratic Equation: ax^2 + bx + c = 0 with integer roots
function generateQuadraticEquation(diffFactor) {
  // Roots x1, x2
  const minRoot = -5 - Math.floor(diffFactor * 3);
  const maxRoot = 5 + Math.floor(diffFactor * 3);
  
  let x1 = minRoot + Math.floor(Math.random() * (maxRoot - minRoot + 1));
  let x2 = minRoot + Math.floor(Math.random() * (maxRoot - minRoot + 1));
  
  // Prevent 0 roots if possible for simplicity
  if (x1 === 0) x1 = 3;
  if (x2 === 0) x2 = -2;
  
  // coefficient a
  const a = Math.random() < 0.3 && diffFactor > 1.2 ? 2 : 1;
  
  // (ax - ax1)(x - x2) = ax^2 - a(x1 + x2)x + ax1x2 = 0
  const b = -a * (x1 + x2);
  const c = a * x1 * x2;
  
  return {
    a,
    b,
    c,
    x1,
    x2,
    larger: Math.max(x1, x2),
    smaller: Math.min(x1, x2)
  };
}

// Generates a 2x2 Matrix with determinant/trace constraints
function generateMatrix2x2(diffFactor) {
  const minVal = -3 - Math.floor(diffFactor * 2);
  const maxVal = 3 + Math.floor(diffFactor * 2);
  
  const randVal = () => {
    let v = minVal + Math.floor(Math.random() * (maxVal - minVal + 1));
    if (v === 0) v = 2; // avoid excessive zeroes
    return v;
  };
  
  const a = randVal();
  const b = randVal();
  const c = randVal();
  const d = randVal();
  
  return {
    a, b, c, d,
    trace: a + d,
    determinant: a * d - b * c
  };
}

// Subfactorial (Derangements) calculation
function derangement(n) {
  if (n === 0) return 1;
  if (n === 1) return 0;
  return (n - 1) * (derangement(n - 1) + derangement(n - 2));
}

module.exports = {
  factorial,
  gcd,
  lcm,
  isPrime,
  getPrimeFactors,
  getDivisors,
  generatePythagoreanTriple,
  generateQuadraticEquation,
  generateMatrix2x2,
  derangement
};
