import {
  assert,
  assertEquals,
  assertExists,
} from "jsr:@std/assert";
import { Db, MongoClient } from "npm:mongodb";
import { testDb } from "@utils/database.ts";
import MapSummaryGenerationConcept from "./MapSummaryGenerationConcept.ts";
import BodyMapGenerationConcept from "../BodyMapGeneration/BodyMapGenerationConcept.ts";
import PainLocationScoringConcept from "../PainLocationScoring/PainLocationScoringConcept.ts";
import { ID } from "@utils/types.ts";

Deno.test("MapSummaryGeneration", async (test) => {
  let client: MongoClient | null = null;
  let db: Db;

  await test.step("Principle: MapSummaryGeneration Lifecycle", async () => {
    try {
      [db, client] = await testDb();
      const summaryConcept = new MapSummaryGenerationConcept(db);
      const bodyMapConcept = new BodyMapGenerationConcept(db);
      const painLocationConcept = new PainLocationScoringConcept(db);

      const testUser = "testuser1_principle" as ID;
      const regionName = "left shoulder";

      // Setup: Create maps and regions
      // Generate first map
      const map1Result = await bodyMapConcept.generateMap({ user: testUser });
      assert("mapId" in map1Result);
      const map1Id = map1Result.mapId;

      // Register map in PainLocationScoring
      const bodyMapCollection = db.collection("PainLocationScoring.bodyMaps");
      await bodyMapCollection.insertOne({
        _id: map1Id as any,
        userId: testUser as any,
      } as any);

      // Add region to first map
      const region1Result = await painLocationConcept.addRegion({
        user: testUser,
        map: map1Id,
        regionName,
      });
      assert("region" in region1Result);
      const region1Id = region1Result.region;

      // Score the region
      const scoreResult1 = await painLocationConcept.scoreRegion({
        user: testUser,
        region: region1Id,
        score: 7,
      });
      assert(!("error" in scoreResult1));

      // Generate second map (on a different day)
      const map2Result = await bodyMapConcept.generateMap({ user: testUser });
      assert("mapId" in map2Result);
      const map2Id = map2Result.mapId;

      // Register second map in PainLocationScoring
      await bodyMapCollection.insertOne({
        _id: map2Id as any,
        userId: testUser as any,
      } as any);

      // Add same region to second map
      const region2Result = await painLocationConcept.addRegion({
        user: testUser,
        map: map2Id,
        regionName,
      });
      assert("region" in region2Result);
      const region2Id = region2Result.region;

      // Score the second region
      const scoreResult2 = await painLocationConcept.scoreRegion({
        user: testUser,
        region: region2Id,
        score: 5,
      });
      assert(!("error" in scoreResult2));

      // Get the creation dates for the maps to create a date range
      const map1 = await bodyMapConcept._getCurrentMap({ user: testUser });
      assert("map" in map1);
      // Actually, we need to get both maps
      const map1Doc = await db
        .collection("BodyMapGeneration.maps")
        .findOne({ _id: map1Id });
      const map2Doc = await db
        .collection("BodyMapGeneration.maps")
        .findOne({ _id: map2Id });
      assertExists(map1Doc);
      assertExists(map2Doc);

      const startDate = map1Doc.creationDate < map2Doc.creationDate
        ? map1Doc.creationDate
        : map2Doc.creationDate;
      const endDate = new Date();
      endDate.setTime(endDate.getTime() + 86400000); // Add 1 day to ensure it covers both maps

      const period = { start: startDate, end: endDate };
      const mapSet = [map1Id, map2Id] as ID[];

      // Action: sumRegion
      console.log("Principle: Summing region across maps");
      const sumResult = await summaryConcept.sumRegion({
        period,
        mapSet,
        regionName,
      });
      assertExists(sumResult);
      assert(
        !("error" in sumResult),
        `Error summing region: ${JSON.stringify(sumResult)}`,
      );
      assertEquals(
        sumResult.frequency,
        2,
        "Region should appear twice (once per map)",
      );
      assertEquals(
        sumResult.score,
        6,
        "Median score of [5, 7] should be 6",
      );

      // Action: summarise
      console.log("Principle: Generating summary");
      const summaryResult = await summaryConcept.summarise({
        period,
        regionName,
        score: sumResult.score,
        frequency: sumResult.frequency,
      });
      assertExists(summaryResult);
      assert(
        !("error" in summaryResult),
        `Error generating summary: ${JSON.stringify(summaryResult)}`,
      );
      assertExists(summaryResult.summary);
      assert(
        summaryResult.summary.includes(regionName),
        "Summary should include region name",
      );
      assert(
        summaryResult.summary.includes("2"),
        "Summary should include frequency",
      );
      assert(
        summaryResult.summary.includes("6"),
        "Summary should include median score",
      );

      // Action: generateAndStoreSummary
      console.log("Principle: Generating and storing summary");
      const storeResult = await summaryConcept.generateAndStoreSummary({
        user: testUser,
        period,
        mapSet,
        regionName,
      });
      assertExists(storeResult);
      assert(
        !("error" in storeResult),
        `Error storing summary: ${JSON.stringify(storeResult)}`,
      );
      assertExists(storeResult.summaryId);

      // Verify stored summary
      const storedSummary = await summaryConcept._getSummary({
        summaryId: storeResult.summaryId,
      });
      assertExists(storedSummary);
      assert("summary" in storedSummary);
      assertExists(storedSummary.summary);
      assertEquals(
        storedSummary.summary.name,
        regionName,
        "Stored summary should have correct region name",
      );
      assertEquals(
        storedSummary.summary.frequency,
        2,
        "Stored summary should have correct frequency",
      );
      assertEquals(
        storedSummary.summary.medianScore,
        6,
        "Stored summary should have correct median score",
      );
      assertEquals(
        storedSummary.summary.userId,
        testUser,
        "Stored summary should be associated with correct user",
      );

      // Query user summaries
      const userSummaries = await summaryConcept._getUserSummaries({
        user: testUser,
      });
      assertExists(userSummaries);
      assert("summaries" in userSummaries);
      assertEquals(
        userSummaries.summaries.length,
        1,
        "User should have one stored summary",
      );
    } finally {
      await client?.close();
    }
  });

  await test.step(
    "Action: sumRegion returns zero frequency and score when no regions exist",
    async () => {
      try {
        [db, client] = await testDb();
        const summaryConcept = new MapSummaryGenerationConcept(db);
        const bodyMapConcept = new BodyMapGenerationConcept(db);

        const testUser = "testuser_empty_action" as ID;

        // Create a map
        const mapResult = await bodyMapConcept.generateMap({ user: testUser });
        assert("mapId" in mapResult);
        const mapId = mapResult.mapId;

        const mapDoc = await db
          .collection("BodyMapGeneration.maps")
          .findOne({ _id: mapId });
        assertExists(mapDoc);

        const period = {
          start: mapDoc.creationDate,
          end: new Date(),
        };
        const mapSet = [mapId] as ID[];

        // Sum region that doesn't exist
        const sumResult = await summaryConcept.sumRegion({
          period,
          mapSet,
          regionName: "nonexistent region",
        });
        assertExists(sumResult);
        assert(!("error" in sumResult));
        assertEquals(
          sumResult.frequency,
          0,
          "Frequency should be 0 for non-existent region",
        );
        assertEquals(
          sumResult.score,
          0,
          "Score should be 0 for non-existent region",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: sumRegion handles empty map set",
    async () => {
      try {
        [db, client] = await testDb();
        const summaryConcept = new MapSummaryGenerationConcept(db);

        const period = {
          start: new Date(2024, 0, 1),
          end: new Date(2024, 0, 31),
        };
        const mapSet: ID[] = [];

        const sumResult = await summaryConcept.sumRegion({
          period,
          mapSet,
          regionName: "any region",
        });
        assertExists(sumResult);
        assert(!("error" in sumResult));
        assertEquals(sumResult.frequency, 0, "Frequency should be 0");
        assertEquals(sumResult.score, 0, "Score should be 0");
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: sumRegion calculates median correctly for odd number of scores",
    async () => {
      try {
        [db, client] = await testDb();
        const summaryConcept = new MapSummaryGenerationConcept(db);
        const bodyMapConcept = new BodyMapGenerationConcept(db);
        const painLocationConcept = new PainLocationScoringConcept(db);

        const testUser = "testuser_median_action" as ID;
        const regionName = "lower back";

        // Create 3 maps with scored regions
        const mapIds: ID[] = [];
        const bodyMapCollection = db.collection("PainLocationScoring.bodyMaps");
        const scores = [3, 7, 5]; // Median should be 5

        for (let i = 0; i < 3; i++) {
          const mapResult = await bodyMapConcept.generateMap({
            user: testUser,
          });
          assert("mapId" in mapResult);
          const mapId = mapResult.mapId;
          mapIds.push(mapId);

          await bodyMapCollection.insertOne({
            _id: mapId as any,
            userId: testUser as any,
          } as any);

          const regionResult = await painLocationConcept.addRegion({
            user: testUser,
            map: mapId,
            regionName,
          });
          assert("region" in regionResult);

          await painLocationConcept.scoreRegion({
            user: testUser,
            region: regionResult.region,
            score: scores[i],
          });
        }

        const map1Doc = await db
          .collection("BodyMapGeneration.maps")
          .findOne({ _id: mapIds[0] });
        assertExists(map1Doc);

        const period = {
          start: map1Doc.creationDate,
          end: new Date(),
        };

        const sumResult = await summaryConcept.sumRegion({
          period,
          mapSet: mapIds,
          regionName,
        });
        assertExists(sumResult);
        assert(!("error" in sumResult));
        assertEquals(sumResult.frequency, 3, "Should have 3 occurrences");
        assertEquals(sumResult.score, 5, "Median of [3,5,7] should be 5");
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: sumRegion handles regions without scores",
    async () => {
      try {
        [db, client] = await testDb();
        const summaryConcept = new MapSummaryGenerationConcept(db);
        const bodyMapConcept = new BodyMapGenerationConcept(db);
        const painLocationConcept = new PainLocationScoringConcept(db);

        const testUser = "testuser_noscore_action" as ID;
        const regionName = "right knee";

        // Create a map and add a region without scoring it
        const mapResult = await bodyMapConcept.generateMap({ user: testUser });
        assert("mapId" in mapResult);
        const mapId = mapResult.mapId;

        const bodyMapCollection = db.collection("PainLocationScoring.bodyMaps");
        await bodyMapCollection.insertOne({
          _id: mapId as any,
          userId: testUser as any,
        } as any);

        const regionResult = await painLocationConcept.addRegion({
          user: testUser,
          map: mapId,
          regionName,
        });
        assert("region" in regionResult);
        // Don't score the region

        const mapDoc = await db
          .collection("BodyMapGeneration.maps")
          .findOne({ _id: mapId });
        assertExists(mapDoc);

        const period = {
          start: mapDoc.creationDate,
          end: new Date(),
        };

        const sumResult = await summaryConcept.sumRegion({
          period,
          mapSet: [mapId] as ID[],
          regionName,
        });
        assertExists(sumResult);
        assert(!("error" in sumResult));
        assertEquals(
          sumResult.frequency,
          1,
          "Region should be counted even without score",
        );
        assertEquals(
          sumResult.score,
          0,
          "Score should be 0 when no scores exist",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: summarise generates appropriate summary for different scenarios",
    async () => {
      try {
        [db, client] = await testDb();
        const summaryConcept = new MapSummaryGenerationConcept(db);

        const period = {
          start: new Date(2024, 0, 1),
          end: new Date(2024, 0, 31),
        };
        const regionName = "test region";

        // Test summary with zero frequency
        const summary1 = await summaryConcept.summarise({
          period,
          regionName,
          score: 0,
          frequency: 0,
        });
        assertExists(summary1);
        assert(!("error" in summary1));
        assert(
          summary1.summary.includes("No occurrences"),
          "Summary should indicate no occurrences",
        );

        // Test summary with frequency but no score
        const summary2 = await summaryConcept.summarise({
          period,
          regionName,
          score: 0,
          frequency: 3,
        });
        assertExists(summary2);
        assert(!("error" in summary2));
        assert(
          summary2.summary.includes("3"),
          "Summary should include frequency",
        );
        assert(
          summary2.summary.includes("no scores were recorded"),
          "Summary should indicate no scores",
        );

        // Test summary with frequency and score
        const summary3 = await summaryConcept.summarise({
          period,
          regionName,
          score: 7.5,
          frequency: 5,
        });
        assertExists(summary3);
        assert(!("error" in summary3));
        assert(
          summary3.summary.includes("5"),
          "Summary should include frequency",
        );
        assert(
          summary3.summary.includes("7.5"),
          "Summary should include median score",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: sumRegion fails with invalid date range",
    async () => {
      try {
        [db, client] = await testDb();
        const summaryConcept = new MapSummaryGenerationConcept(db);

        const period = {
          start: new Date(2024, 0, 31),
          end: new Date(2024, 0, 1), // End before start
        };
        const mapSet: ID[] = [];

        const sumResult = await summaryConcept.sumRegion({
          period,
          mapSet,
          regionName: "any region",
        });
        assert(
          "error" in sumResult,
          "Expected error for invalid date range",
        );
        assert(
          sumResult.error.includes("start date must be before end date"),
          "Error message should indicate invalid date range",
        );
      } finally {
        await client?.close();
      }
    },
  );

  await test.step(
    "Action: summarise fails with empty region name",
    async () => {
      try {
        [db, client] = await testDb();
        const summaryConcept = new MapSummaryGenerationConcept(db);

        const period = {
          start: new Date(2024, 0, 1),
          end: new Date(2024, 0, 31),
        };

        const summaryResult = await summaryConcept.summarise({
          period,
          regionName: "",
          score: 5,
          frequency: 2,
        });
        assert(
          "error" in summaryResult,
          "Expected error for empty region name",
        );
        assert(
          summaryResult.error.includes("cannot be empty"),
          "Error message should indicate region name cannot be empty",
        );
      } finally {
        await client?.close();
      }
    },
  );
});
