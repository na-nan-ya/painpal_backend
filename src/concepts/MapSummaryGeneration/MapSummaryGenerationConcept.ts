import { Collection, Db } from "npm:mongodb";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import PDFDocument from "npm:pdfkit@0.15.0";

// Collection prefix to ensure isolation within the database
const PREFIX = "MapSummaryGeneration" + ".";

// Generic type parameters
type User = ID;
type Map = ID;
type Region = ID;

/**
 * @interface DateRange
 * Represents a date range with start and end dates.
 */
interface DateRange {
  start: Date;
  end: Date;
}

/**
 * @interface RegionSummary
 * Represents summary statistics for a region over a period.
 *
 * regions: a set of Regions with
 *   _id: Region
 *   name: String (region name/identifier)
 *   frequency: Number (how many times this region appeared)
 *   medianScore: Number (median score for this region)
 *   summary: String (generated summary text)
 *   period: DateRange (the period this summary covers)
 *   userId: User (the user this summary is for)
 */
interface RegionSummary {
  _id: Region;
  name: string;
  frequency: number;
  medianScore: number;
  summary: string;
  period: DateRange;
  userId: User;
}

/**
 * @concept MapSummaryGeneration
 * @purpose concise summary of all body map logs up until the present day.
 * @principle captures and organizes body map data over time,
 *            analyses region-based selection and scoring,
 *            generates concise summaries from metrics
 */
export default class MapSummaryGenerationConcept {
  // MongoDB collections for the concept's state
  regionSummaries: Collection<RegionSummary>;

  constructor(private readonly db: Db) {
    this.regionSummaries = this.db.collection(PREFIX + "regionSummaries");
  }

  /**
   * sumRegion(period: Range, mapSet: Maps, region: Region): (score: Number, frequency: Number)
   *
   * requires: the Region must exist.
   * effects: assimilates the Maps within the Range, counts the Region occurrences, and returns the associated Numbers
   *
   * Note: This queries maps from BodyMapGeneration and regions from PainLocationScoring.
   * The region parameter is the region name (string identifier), not the region ID.
   */
  async sumRegion(
    {
      period,
      mapSet,
      regionName,
    }: { period: DateRange; mapSet: Map[]; regionName: string },
  ): Promise<
    { score: number; frequency: number } | { error: string }
  > {
    try {
      // Validate period
      if (period.start > period.end) {
        return { error: "Period start date must be before end date." };
      }

      if (mapSet.length === 0) {
        return { score: 0, frequency: 0 };
      }

      // Get BodyMapGeneration maps collection
      const bodyMapCollection = this.db.collection("BodyMapGeneration.maps");
      const painRegionCollection = this.db.collection(
        "PainLocationScoring.regions",
      );

      // Filter maps that are within the date range and in the mapSet
      // Convert mapSet IDs to strings for MongoDB query
      const mapSetStrings = mapSet.map((id) => String(id));
      const mapsInPeriod = await bodyMapCollection
        .find({
          _id: { $in: mapSetStrings as any },
          creationDate: {
            $gte: period.start,
            $lte: period.end,
          },
        } as any)
        .toArray();

      if (mapsInPeriod.length === 0) {
        return { score: 0, frequency: 0 };
      }

      const mapIds = mapsInPeriod.map((m) => String(m._id) as Map);

      // Find all regions with matching name in the maps
      const regions = await painRegionCollection
        .find({
          mapId: { $in: mapIds },
          name: regionName,
        })
        .toArray();

      if (regions.length === 0) {
        return { score: 0, frequency: 0 };
      }

      // Calculate frequency (count of regions)
      const frequency = regions.length;

      // Calculate median score
      // Filter regions that have a score
      const scoredRegions = regions.filter((r) => r.score !== undefined);
      if (scoredRegions.length === 0) {
        return { score: 0, frequency };
      }

      // Extract scores and sort them
      const scores = scoredRegions.map((r) => r.score as number).sort((a, b) => a - b);
      const medianScore = this.calculateMedian(scores);

      return { score: medianScore, frequency };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error summing region ${regionName}:`, e);
        return { error: `Failed to sum region: ${e.message}` };
      } else {
        console.error(`Unknown error summing region ${regionName}:`, e);
        return { error: "Failed to sum region due to an unknown error" };
      }
    }
  }

  /**
   * summarise(period: Range, region: Region, score: Number, frequency: Number): (summary: String)
   *
   * requires: the Region must exist
   * effects: returns a String incorporating the given values of Range, Region, and the associated Numbers
   */
  async summarise(
    {
      period,
      regionName,
      score,
      frequency,
    }: {
      period: DateRange;
      regionName: string;
      score: number;
      frequency: number;
    },
  ): Promise<{ summary: string } | { error: string }> {
    try {
      if (regionName.trim() === "") {
        return { error: "Region name cannot be empty." };
      }

      // Format dates for summary
      const startDateStr = period.start.toLocaleDateString();
      const endDateStr = period.end.toLocaleDateString();

      // Generate summary string
      let summary: string;
      if (frequency === 0) {
        summary = `No occurrences of ${regionName} during ${startDateStr} to ${endDateStr}.`;
      } else if (score === 0) {
        summary = `${regionName} appeared ${frequency} time(s) during ${startDateStr} to ${endDateStr}, but no scores were recorded.`;
      } else {
        summary = `${regionName} appeared ${frequency} time(s) with a median score of ${score.toFixed(1)} during ${startDateStr} to ${endDateStr}.`;
      }

      return { summary };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error generating summary for ${regionName}:`, e);
        return { error: `Failed to generate summary: ${e.message}` };
      } else {
        console.error(`Unknown error generating summary for ${regionName}:`, e);
        return {
          error: "Failed to generate summary due to an unknown error",
        };
      }
    }
  }

  /**
   * Helper method to calculate median from a sorted array of numbers
   */
  private calculateMedian(sortedNumbers: number[]): number {
    if (sortedNumbers.length === 0) {
      return 0;
    }
    const mid = Math.floor(sortedNumbers.length / 2);
    if (sortedNumbers.length % 2 === 0) {
      return (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2;
    } else {
      return sortedNumbers[mid];
    }
  }

  // --- Convenience method to generate and store summary ---

  /**
   * generateAndStoreSummary(
   *   user: User,
   *   period: DateRange,
   *   mapSet: Map[],
   *   regionName: string
   * ): (summaryId: Region)
   *
   * Convenience method that combines sumRegion and summarise, then stores the result.
   */
  async generateAndStoreSummary(
    {
      user,
      period,
      mapSet,
      regionName,
    }: {
      user: User;
      period: DateRange;
      mapSet: Map[];
      regionName: string;
    },
  ): Promise<{ summaryId: Region } | { error: string }> {
    try {
      // Sum the region
      const sumResult = await this.sumRegion({ period, mapSet, regionName });
      if ("error" in sumResult) {
        return sumResult;
      }

      // Generate summary
      const summaryResult = await this.summarise({
        period,
        regionName,
        score: sumResult.score,
        frequency: sumResult.frequency,
      });
      if ("error" in summaryResult) {
        return summaryResult;
      }

      // Generate ID for the summary
      const summaryId = freshID() as Region;

      // Store the summary
      const regionSummary: RegionSummary = {
        _id: summaryId,
        name: regionName,
        frequency: sumResult.frequency,
        medianScore: sumResult.score,
        summary: summaryResult.summary,
        period,
        userId: user,
      };

      await this.regionSummaries.insertOne(regionSummary);

      return { summaryId };
    } catch (e) {
      if (e instanceof Error) {
        console.error(
          `Error generating and storing summary for ${regionName}:`,
          e,
        );
        return { error: `Failed to generate summary: ${e.message}` };
      } else {
        console.error(
          `Unknown error generating summary for ${regionName}:`,
          e,
        );
        return {
          error: "Failed to generate summary due to an unknown error",
        };
      }
    }
  }

  // --- Query methods (for testing/observability) ---

  /**
   * _getSummary(summaryId: Region): (summary: RegionSummary | null)
   *
   * effects: Returns the summary for a given summary ID, or null if not found.
   */
  async _getSummary(
    { summaryId }: { summaryId: Region },
  ): Promise<{ summary: RegionSummary | null } | { error: string }> {
    try {
      const summary = await this.regionSummaries.findOne({ _id: summaryId });
      return { summary };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error fetching summary ${summaryId}:`, e);
        return { error: `Failed to fetch summary: ${e.message}` };
      } else {
        console.error(`Unknown error fetching summary ${summaryId}:`, e);
        return { error: "Failed to fetch summary due to an unknown error" };
      }
    }
  }

  /**
   * _getUserSummaries(user: User): (summaries: RegionSummary[])
   *
   * effects: Returns all summaries for a given user.
   */
  async _getUserSummaries(
    { user }: { user: User },
  ): Promise<{ summaries: RegionSummary[] } | { error: string }> {
    try {
      const summaries = await this.regionSummaries
        .find({ userId: user })
        .toArray();
      return { summaries };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error fetching summaries for user ${user}:`, e);
        return { error: `Failed to fetch summaries: ${e.message}` };
      } else {
        console.error(`Unknown error fetching summaries for user ${user}:`, e);
        return {
          error: "Failed to fetch summaries due to an unknown error",
        };
      }
    }
  }

  /**
   * exportSummaryAsPDF(summaryId: Region): (pdfBuffer: Uint8Array)
   *
   * requires: the summary must exist
   * effects: generates a PDF document containing the summary text and returns it as a Uint8Array buffer
   */
  async exportSummaryAsPDF(
    { summaryId }: { summaryId: Region },
  ): Promise<{ pdfBuffer: Uint8Array } | { error: string }> {
    try {
      // Get the summary
      const summaryResult = await this._getSummary({ summaryId });
      if ("error" in summaryResult) {
        return summaryResult;
      }

      if (!summaryResult.summary) {
        return { error: `Summary ${summaryId} does not exist.` };
      }

      const summary = summaryResult.summary;

      // Create a new PDF document
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      // Collect PDF chunks in memory
      const chunks: Uint8Array[] = [];
      doc.on("data", (chunk: Uint8Array) => {
        chunks.push(chunk);
      });

      // Add content to the PDF
      doc.fontSize(20).text("Pain Location Summary Report", {
        align: "center",
      });

      doc.moveDown();
      doc.fontSize(12);

      // Add region name
      doc.fontSize(16).text(`Region: ${summary.name}`, {
        underline: true,
      });
      doc.moveDown();

      // Add period information
      const startDateStr = summary.period.start.toLocaleDateString();
      const endDateStr = summary.period.end.toLocaleDateString();
      doc.text(`Period: ${startDateStr} to ${endDateStr}`);
      doc.moveDown();

      // Add statistics
      doc.text(`Frequency: ${summary.frequency} occurrence(s)`);
      doc.text(`Median Score: ${summary.medianScore.toFixed(1)}`);
      doc.moveDown();

      // Add summary text
      doc.fontSize(14).text("Summary:", {
        underline: true,
      });
      doc.moveDown(0.5);
      doc.fontSize(12).text(summary.summary, {
        align: "justify",
      });

      // Finalize the PDF
      doc.end();

      // Wait for all chunks to be collected and PDF to finish
      await new Promise<void>((resolve, reject) => {
        doc.on("end", () => {
          resolve();
        });
        doc.on("error", reject);
      });

      // Combine all chunks into a single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const pdfBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        pdfBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      return { pdfBuffer };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error exporting summary ${summaryId} as PDF:`, e);
        return { error: `Failed to export PDF: ${e.message}` };
      } else {
        console.error(
          `Unknown error exporting summary ${summaryId} as PDF:`,
          e,
        );
        return { error: "Failed to export PDF due to an unknown error" };
      }
    }
  }

  /**
   * exportUserSummariesAsPDF(user: User): (pdfBuffer: Uint8Array)
   *
   * requires: the user must have at least one summary
   * effects: generates a PDF document containing all summaries for the user and returns it as a Uint8Array buffer
   */
  async exportUserSummariesAsPDF(
    { user }: { user: User },
  ): Promise<{ pdfBuffer: Uint8Array } | { error: string }> {
    try {
      // Get all summaries for the user
      const summariesResult = await this._getUserSummaries({ user });
      if ("error" in summariesResult) {
        return summariesResult;
      }

      if (summariesResult.summaries.length === 0) {
        return {
          error: `User ${user} does not have any summaries to export.`,
        };
      }

      const summaries = summariesResult.summaries;

      // Create a new PDF document
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      });

      // Collect PDF chunks in memory
      const chunks: Uint8Array[] = [];
      doc.on("data", (chunk: Uint8Array) => {
        chunks.push(chunk);
      });

      // Add title
      doc.fontSize(20).text("Pain Location Summary Report", {
        align: "center",
      });
      doc.moveDown();
      doc.fontSize(12).text(`All Regions Summary for User`, {
        align: "center",
      });
      doc.moveDown(2);

      // Add each summary
      for (let i = 0; i < summaries.length; i++) {
        const summary = summaries[i];

        // Add page break if not the first summary
        if (i > 0) {
          doc.addPage();
        }

        // Add region name
        doc.fontSize(16).text(`Region: ${summary.name}`, {
          underline: true,
        });
        doc.moveDown();

        // Add period information
        const startDateStr = summary.period.start.toLocaleDateString();
        const endDateStr = summary.period.end.toLocaleDateString();
        doc.fontSize(12).text(`Period: ${startDateStr} to ${endDateStr}`);
        doc.moveDown();

        // Add statistics
        doc.text(`Frequency: ${summary.frequency} occurrence(s)`);
        doc.text(`Median Score: ${summary.medianScore.toFixed(1)}`);
        doc.moveDown();

        // Add summary text
        doc.fontSize(14).text("Summary:", {
          underline: true,
        });
        doc.moveDown(0.5);
        doc.fontSize(12).text(summary.summary, {
          align: "justify",
        });

        // Add separator if not the last summary
        if (i < summaries.length - 1) {
          doc.moveDown();
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown();
        }
      }

      // Finalize the PDF
      doc.end();

      // Wait for all chunks to be collected and PDF to finish
      await new Promise<void>((resolve, reject) => {
        doc.on("end", () => {
          resolve();
        });
        doc.on("error", reject);
      });

      // Combine all chunks into a single buffer
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const pdfBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        pdfBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      return { pdfBuffer };
    } catch (e) {
      if (e instanceof Error) {
        console.error(`Error exporting summaries for user ${user} as PDF:`, e);
        return { error: `Failed to export PDF: ${e.message}` };
      } else {
        console.error(
          `Unknown error exporting summaries for user ${user} as PDF:`,
          e,
        );
        return { error: "Failed to export PDF due to an unknown error" };
      }
    }
  }
}
