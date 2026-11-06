import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  type CarbSessionIntensity,
  calculateTrainingPaces,
  calculateCarbFueling,
  formatDuration,
  projectAllRaceDistances
} from "../src/app/utils/calculators";

function parseNumber(value: string, label: string): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
  return parsed;
}

function parseDistanceInput(value: string, label: string): number {
  const normalized = value.trim().toLowerCase();

  const aliases: Record<string, number> = {
    "5k": 5,
    "10k": 10,
    "half": 21.0975,
    "half marathon": 21.0975,
    "hm": 21.0975,
    "marathon": 42.195,
    "marathin": 42.195,
    "full": 42.195,
    "full marathon": 42.195
  };

  if (normalized in aliases) {
    return aliases[normalized];
  }

  return parseNumber(normalized, label);
}

function parseSeconds(value: string): number {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= 60) {
    throw new Error("Seconds must be a number between 0 and 59.");
  }
  return parsed;
}

function parseSessionIntensity(value: string): CarbSessionIntensity {
  const normalized = value.trim().toLowerCase();
  if (normalized === "easy") {
    return "easy";
  }
  if (normalized === "steady" || normalized === "moderate") {
    return "steady";
  }
  if (normalized === "tempo") {
    return "tempo";
  }
  if (normalized === "threshold") {
    return "tempo";
  }
  if (normalized === "hard" || normalized === "interval" || normalized === "intervals") {
    return "hard";
  }
  if (normalized === "race") {
    return "race";
  }

  throw new Error("Session intensity must be one of: easy, steady, tempo, hard, race.");
}

async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  try {
    console.log("Running Calculator Test");
    console.log("Enter your own metrics below.");

    const knownDistanceKm = parseDistanceInput(
      await rl.question("Known race distance (km or name, e.g. 5, 10k, half, marathon): "),
      "Known race distance"
    );

    const knownMinutes = parseNumber(
      await rl.question("Known race time minutes (whole or decimal), e.g. 21: "),
      "Known race time minutes"
    );

    const knownSeconds = parseSeconds(
      await rl.question("Known race time seconds (0-59), e.g. 40: ")
    );

    const targetDistanceKm = parseDistanceInput(
      await rl.question("Target race distance (km or name, e.g. 10, half marathon, marathin): "),
      "Target race distance"
    );

    const weightKg = parseNumber(
      await rl.question("Body weight (kg), e.g. 70: "),
      "Body weight"
    );

    const effortMinutes = parseNumber(
      await rl.question("Effort duration for fueling (minutes), e.g. 120: "),
      "Effort duration"
    );

    const weeklyVolumeKm = parseNumber(
      await rl.question("Weekly running volume (km), e.g. 45: "),
      "Weekly running volume"
    );

    const sessionIntensity = parseSessionIntensity(
      await rl.question("Session intensity (easy, steady, tempo, hard, race): ")
    );

    const knownTimeSeconds = knownMinutes * 60 + knownSeconds;

    const allPredictions = projectAllRaceDistances(knownTimeSeconds, knownDistanceKm, {
      weeklyVolumeKm
    });
    const selectedDistancePrediction = targetDistanceKm === 5
      ? allPredictions.fiveK
      : targetDistanceKm === 10
      ? allPredictions.tenK
      : targetDistanceKm > 40
      ? allPredictions.marathon
      : allPredictions.halfMarathon;

    const training = calculateTrainingPaces(knownTimeSeconds, knownDistanceKm);
    const carb = calculateCarbFueling(weightKg, effortMinutes, { sessionIntensity });

    console.log("\nRace Prediction");
    console.log(`Target distance: ${targetDistanceKm} km`);
    console.log(`Predicted range: ${selectedDistancePrediction.displayTimeRange}`);
    console.log(`Low: ${formatDuration(selectedDistancePrediction.lowSeconds)} | Mid: ${formatDuration(selectedDistancePrediction.midSeconds)} | High: ${formatDuration(selectedDistancePrediction.highSeconds)}`);
    console.log("By formula:");
    for (const result of selectedDistancePrediction.formulas) {
      console.log(`- ${result.formula}: ${formatDuration(result.predictedSeconds)}`);
    }

    console.log("\nAll Distances");
    console.log(`5k: ${allPredictions.fiveK.displayTimeRange} (${formatDuration(allPredictions.fiveK.midSeconds)})`);
    console.log(`10k: ${allPredictions.tenK.displayTimeRange} (${formatDuration(allPredictions.tenK.midSeconds)})`);
    console.log(`Half: ${allPredictions.halfMarathon.displayTimeRange} (${formatDuration(allPredictions.halfMarathon.midSeconds)})`);
    console.log(`Marathon: ${allPredictions.marathon.displayTimeRange} (${formatDuration(allPredictions.marathon.midSeconds)})`);

    console.log("\nSuggested Training Paces");
    for (const zone of training.zones) {
      console.log(`- ${zone.name}: ${zone.labelPerKm} | ${zone.labelPerMile}`);
    }

    console.log("\nFueling Recommendation");
    console.log(carb.highCarbMessage);
    console.log(`Session intensity: ${carb.sessionIntensity}`);
    if (!carb.shouldFuelDuringSession) {
      console.log(carb.isFuelingOptional ? "In-session carbs: optional" : "In-session carbs: not needed for this workout");
    } else {
      console.log(`Range: ${carb.carbsPerHourLow}-${carb.carbsPerHourHigh} g/hour`);
      console.log(`Session total range: ${carb.totalCarbsLowGrams} g / ${carb.totalCarbsHighGrams} g`);
    }
    console.log(carb.gutTrainingAdvice);
    console.log(carb.planSummary);
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
