// Asynchronous Controlled Mathematical Ingestion Pipeline
const fs = require('fs');
const path = require('path');
const { validateTemplate } = require('./validation');

/**
 * Runs the controlled ingestion pipeline.
 * Reads raw schemas from rawIngestionData.json, validates them, and inserts them into SQLite db.
 */
function runIngestionPipeline(db) {
  return new Promise((resolve, reject) => {
    // Read raw math structures
    const rawPath = path.join(__dirname, 'rawIngestionData.json');
    if (!fs.existsSync(rawPath)) {
      return reject(new Error("rawIngestionData.json not found."));
    }

    let rawData;
    try {
      rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    } catch (err) {
      return reject(new Error(`Failed to parse rawIngestionData.json: ${err.message}`));
    }

    console.log(`[Ingestion] Found ${rawData.length} raw mathematical structures to analyze.`);

    let ingestedCount = 0;
    let validatedCount = 0;
    let duplicateCount = 0;

    const processNext = (idx) => {
      if (idx >= rawData.length) {
        console.log(`[Ingestion] Pipeline completed. Validated: ${validatedCount}, Imported: ${ingestedCount}, Duplicates: ${duplicateCount}`);
        return resolve({ validatedCount, ingestedCount, duplicateCount });
      }

      const item = rawData[idx];
      
      // 1. Validation Layer Audit
      const audit = validateTemplate(item);
      if (!audit.isValid) {
        console.warn(`[Ingestion] Skipping invalid structure of type ${item.type}. Errors: ${audit.errors.join("; ")}`);
        return processNext(idx + 1);
      }

      validatedCount++;

      // 2. Uniqueness Audit (Deduplicate)
      db.get(
        "SELECT id FROM ingested_knowledge_templates WHERE type = ? AND question_pattern = ?",
        [item.type, item.question_pattern],
        (err, row) => {
          if (err) {
            console.error(`[Ingestion] Database error checking duplicate: ${err.message}`);
            return processNext(idx + 1);
          }

          if (row) {
            // Already exists, skip to prevent duplicate seed bloat
            duplicateCount++;
            return processNext(idx + 1);
          }

          // 3. Persist to DB
          const rulesStr = typeof item.solve_params_json === 'string'
            ? item.solve_params_json
            : JSON.stringify(item.solve_params_json);

          const now = Math.floor(Date.now() / 1000);

          db.run(
            `INSERT INTO ingested_knowledge_templates (category, level_range, type, question_pattern, solve_params_json, explanation_pattern, base_difficulty_elo, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [item.category, item.level_range, item.type, item.question_pattern, rulesStr, item.explanation_pattern, audit.estimatedElo, now],
            function(insertErr) {
              if (insertErr) {
                console.error(`[Ingestion] Failed to insert template: ${insertErr.message}`);
              } else {
                ingestedCount++;
                console.log(`[Ingestion] Successfully validated & imported knowledge template of type ${item.type} (ID: ${this.lastID}).`);
              }
              processNext(idx + 1);
            }
          );
        }
      );
    };

    // Trigger process loop asynchronously
    setImmediate(() => processNext(0));
  });
}

module.exports = {
  runIngestionPipeline
};
