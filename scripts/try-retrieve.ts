import { loadEnvConfig } from "@next/env";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  const [{ retrieveGuideChunks }, { clientPromise }] = await Promise.all([
    import("@/lib/rag/retrieve"),
    import("@/lib/mongodb"),
  ]);
  const client = await clientPromise;

  try {
    const chunks = await retrieveGuideChunks(
      {
        cities: ["Istanbul"],
        startDate: new Date("2026-10-20T00:00:00.000Z"),
        endDate: new Date("2026-10-25T00:00:00.000Z"),
        interests: ["street food", "old mosques"],
        budget: "mid",
      },
      5,
    );

    console.info('Top 5 guide chunks for "street food and old mosques in Istanbul":');
    for (const [index, chunk] of chunks.entries()) {
      console.info(
        `\n${index + 1}. ${chunk.destination.name} — ${chunk.topic} (${chunk.id})`,
      );
      console.info(`   Score: ${chunk.score.toFixed(4)}`);
      console.info(`   ${chunk.text}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("Guide retrieval failed:", error);
  process.exitCode = 1;
});
