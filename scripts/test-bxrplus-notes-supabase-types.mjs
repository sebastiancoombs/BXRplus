#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedPath = resolve(root, "scripts/expected-bxrplus-notes-supabase-shape.json");
const outPath = resolve(root, "src/types/supabase.generated.ts");
const expected = JSON.parse(readFileSync(expectedPath, "utf8"));

function generateTypes() {
  const mode = process.argv.includes("--linked") ? "--linked" : "--local";
  try {
    return execFileSync("supabase", ["gen", "types", "typescript", mode], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120000,
    });
  } catch (error) {
    const stderr = error?.stderr?.toString?.() ?? "";
    const stdout = error?.stdout?.toString?.() ?? "";
    const mode = process.argv.includes("--linked") ? "--linked" : "--local";
    const hint = mode === "--linked" ? "Confirm Supabase is linked and the remote project is reachable." : "Start the local Supabase stack and apply migrations first.";
    throw new Error(`Could not generate Supabase types with \`supabase gen types typescript ${mode}\`. ${hint}\n${stderr || stdout}`);
  }
}

function extractRowTypes(generated, tableName) {
  const tableIndex = generated.indexOf(`${tableName}: {`);
  if (tableIndex === -1) return null;
  const rowIndex = generated.indexOf("Row: {", tableIndex);
  const insertIndex = generated.indexOf("Insert: {", rowIndex);
  if (rowIndex === -1 || insertIndex === -1) return null;
  const rowBlock = generated.slice(rowIndex, insertIndex);
  const columns = {};
  for (const line of rowBlock.split("\n")) {
    const match = line.match(/^\s+([A-Za-z0-9_]+):\s+(.+)$/);
    if (match) columns[match[1]] = match[2].trim();
  }
  return columns;
}

const generated = generateTypes();
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, generated);

const missing = [];
const mismatched = [];
for (const [schemaName, schema] of Object.entries(expected)) {
  if (!generated.includes(`${schemaName}: {`)) missing.push(`${schemaName}`);
  for (const [tableName, columns] of Object.entries(schema.Tables ?? {})) {
    const actualColumns = extractRowTypes(generated, tableName);
    if (!actualColumns) {
      missing.push(`${schemaName}.Tables.${tableName}`);
      continue;
    }
    for (const [column, expectedType] of Object.entries(columns)) {
      const actualType = actualColumns[column];
      if (!actualType) missing.push(`${schemaName}.Tables.${tableName}.${column}`);
      else if (actualType !== expectedType) mismatched.push(`${schemaName}.Tables.${tableName}.${column}: expected ${expectedType}, got ${actualType}`);
    }
  }
}

if (missing.length || mismatched.length) {
  if (missing.length) {
    console.error("Generated Supabase types are missing BXR+ expected schema fields:");
    for (const item of missing) console.error(`- ${item}`);
  }
  if (mismatched.length) {
    console.error("Generated Supabase types have mismatched BXR+ field types:");
    for (const item of mismatched) console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(`Supabase generated types match BXR+ expected field names and row data types. Wrote ${outPath}`);
