# Atlas Vector Search index

TripCraft embeds each destination guide passage in the `guideChunks` array. The index uses the documented `nestedRoot` option to index `guideChunks.embedding` while preserving each embedded guide chunk as an independent vector-search result.

The index JSON is a template because Atlas requires `numDimensions` to be a JSON number, while this project reads that value from `EMBEDDING_DIMENSIONS`. After copying `.env.example` to `.env.local` and setting the embedding variables, render a copy of the definition with:

```sh
node --env-file=.env.local -e 'const fs = require("node:fs"); const dimensions = process.env.EMBEDDING_DIMENSIONS; if (!/^[1-9]\d*$/.test(dimensions ?? "")) throw new Error("Set EMBEDDING_DIMENSIONS to a positive integer in .env.local"); const template = fs.readFileSync("docs/atlas-vector-index.json", "utf8"); process.stdout.write(template.replace("\"${EMBEDDING_DIMENSIONS}\"", dimensions));'
```

The output is the JSON to paste into Atlas. The configured `EMBEDDING_MODEL` must produce vectors with the configured dimension.

Seeding without `OPENAI_API_KEY` stores guide text without embeddings, so vector search will return no guide chunks until embeddings are generated. After adding a key, rerun `npm run seed` to upsert the same destinations with embeddings.

## Create the index in Atlas

1. Open the Atlas project and select the cluster that contains the `tripcraft` database.
2. Open **Data Services → Database**, select the `tripcraft` database, and open the **Search** tab.
3. Choose **Create Search Index**, select **JSON Editor**, and choose **Vector Search** as the index type.
4. Select the `destinations` collection and paste the rendered JSON definition.
5. Create the index named `destination-guide-chunks` and wait for its status to become **Active**.

MongoDB documents vector fields inside arrays of embedded documents with `nestedRoot`; the vector path here is `guideChunks.embedding` and the nested root is `guideChunks`. Since `country` and `tags` are top-level fields alongside that nested root, queries use `parentFilter` for either field. See the [MongoDB Vector Search index definition documentation](https://www.mongodb.com/docs/vector-search/indexes/vector-search-type/) and [filter field guidance](https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage/#filter-results-by-metadata).
