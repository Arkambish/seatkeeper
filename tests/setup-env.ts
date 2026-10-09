import "dotenv/config";

// Point every Prisma client in the test process at the disposable test DB.
const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) throw new Error("DATABASE_URL_TEST must be set to run the tests (see .env.example).");
// The suite truncates tables: refuse to run against the application database.
if (testUrl === process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL_TEST must differ from DATABASE_URL. The tests wipe their database.");
}
process.env.DATABASE_URL = testUrl;
