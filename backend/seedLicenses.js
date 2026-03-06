// seedLicenses.js
// Run once to populate the License collection with valid doctor UIDs:
//   node backend/seedLicenses.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env from the backend folder regardless of where the script is run from
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const licenseSchema = new mongoose.Schema({
  licenseNumber: { type: String, required: true, unique: true },
  isUsed: { type: Boolean, default: false },
});
const License = mongoose.model("License", licenseSchema, "License");

// ── Add / change UIDs here as needed ──────────────────────────
const LICENSES = [
  "HS-DOC-0001",
  "HS-DOC-0002",
  "HS-DOC-0003",
  "HS-DOC-0004",
  "HS-DOC-0005",
  "HS-DOC-0006",
  "HS-DOC-0007",
  "HS-DOC-0008",
  "HS-DOC-0009",
  "HS-DOC-0010",
];
// ──────────────────────────────────────────────────────────────

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });
    console.log("✅ Connected to MongoDB");

    let added = 0, skipped = 0;
    for (const uid of LICENSES) {
      const upper = uid.trim().toUpperCase();
      const exists = await License.findOne({ licenseNumber: upper });
      if (exists) {
        console.log(`  ⚠  Already exists (skipped): ${upper}`);
        skipped++;
      } else {
        await License.create({ licenseNumber: upper, isUsed: false });
        console.log(`  ✅ Added: ${upper}`);
        added++;
      }
    }

    console.log(`\nDone — ${added} added, ${skipped} skipped.`);
    console.log("\nValid UIDs doctors can use to register:");
    LICENSES.forEach(l => console.log("  •", l.toUpperCase()));
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
