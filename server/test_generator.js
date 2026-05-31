const { generateProblem } = require('./mathGenerator');

try {
  console.log("Testing Arithmetic Level 1 with low ELO (500):");
  console.log(generateProblem('arithmetic', 1, 0, 500));

  console.log("\nTesting Arithmetic Level 1 with high ELO (1500):");
  console.log(generateProblem('arithmetic', 1, 0, 1500));

  console.log("\nTesting Algebra Level 15 with ELO (1000):");
  console.log(generateProblem('algebra', 15, 2, 1000));

  console.log("\nTesting Calculus Level 36 with ELO (1200):");
  console.log(generateProblem('calculus', 36, 1, 1200));

  console.log("\nTesting Combinatorics Level 24 with ELO (1100):");
  console.log(generateProblem('combinatorics', 24, 3, 1100));

  console.log("\nTesting Number Theory Level 50 with ELO (1400):");
  console.log(generateProblem('Number Theory', 50, 0, 1400));

  console.log("\nTesting Number Theory Level 60 with ELO (1600):");
  console.log(generateProblem('Number Theory', 60, 1, 1600));

  console.log("\nAll generator functions ran successfully!");
} catch (e) {
  console.error("Test failed with error:", e);
  process.exit(1);
}
