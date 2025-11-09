import { config } from "dotenv";
import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

config({
  path: ".env.local",
});

const runMigrate = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not defined");
  }

  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });

  console.log("⏳ Running migrations...");
  console.log("📁 Migrations folder: ./lib/db/migrations");

  const start = Date.now();

  try {
    // Run migrations in order
    const migrationFiles = [
      "0001_tables.sql",
      "0002_functions.sql",
      "0003_indexes.sql",
      "0004_triggers.sql",
      "0005_rls.sql",
      "0006_seed_data_app_settings.sql",
      "0006_seed_data_google.sql",
      "0006_seed_data_openai.sql",
      "0006_seed_data_anthropic.sql",
      "0007_seed_data_model_config.sql"
    ];

    for (const file of migrationFiles) {
      console.log(`📄 Running ${file}...`);
      const migrationPath = join(process.cwd(), "lib/db/migrations", file);
      const migrationSQL = readFileSync(migrationPath, "utf-8");

      try {
        // Execute the migration
        await connection.unsafe(migrationSQL);
        console.log(`✅ ${file} completed`);
      } catch (error: any) {
        console.error(`❌ Error in ${file}:`);
        console.error('Message:', error.message);
        if (error.code) console.error('Code:', error.code);
        if (error.position) console.error('Position:', error.position);
        if (error.detail) console.error('Detail:', error.detail);
        if (error.hint) console.error('Hint:', error.hint);
        throw error;
      }
    }

    const end = Date.now();
    console.log("✅ All migrations completed in", end - start, "ms");
    console.log("🔍 Run 'npm run db:verify' to verify the migration");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await connection.end();
  }
};

if (require.main === module) {
  runMigrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Migration failed");
      console.error(err);
      process.exit(1);
    });
}

export { runMigrate };
