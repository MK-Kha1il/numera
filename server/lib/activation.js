// Activation metric definition (ultra review #23): a new account is "activated" once it solves
// ACTIVATION_THRESHOLD problems within ACTIVATION_WINDOW_DAYS of signup. Shared by the marker in
// routes/math.js (/complete) and the admin rollup in routes/analytics.js so the definition can't
// drift between where it's measured and where it's reported.
module.exports = {
  ACTIVATION_THRESHOLD: 10,
  ACTIVATION_WINDOW_DAYS: 3,
};
