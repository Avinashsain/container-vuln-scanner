import "dotenv/config";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { importReportsFromDisk } from "../src/services/importReports.service";

const REPORTS_DIR = process.env.REPORTS_DIR ?? path.resolve(__dirname, "../../reports");

async function main() {
  console.log(`Found reports in ${REPORTS_DIR}`);
  const tally = await importReportsFromDisk(REPORTS_DIR);
  console.log(
    `Done. Imported: ${tally.imported}, already present: ${tally.duplicate}, skipped: ${tally.skipped}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
