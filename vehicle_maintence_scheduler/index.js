import "dotenv/config";
import express from "express";
import axios from "axios";
import { Log } from "../logging_middleware/index.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

function getBearerToken(req) {
  const authHeader = req.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

async function fetchData(url, label, token) {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    await Log("backend", "error", "middleware", `Failed to fetch ${label}`);
    throw error;
  }
}

function getBestVehicles(vehicles, budget) {
  const count = vehicles.length;
  const dp = Array.from({ length: count + 1 }, () => Array(budget + 1).fill(0));

  for (let index = 1; index <= count; index += 1) {
    const vehicle = vehicles[index - 1];

    for (let hours = 0; hours <= budget; hours += 1) {
      dp[index][hours] = dp[index - 1][hours];

      if (vehicle.Duration <= hours) {
        const value = dp[index - 1][hours - vehicle.Duration] + vehicle.Impact;
        if (value > dp[index][hours]) {
          dp[index][hours] = value;
        }
      }
    }
  }

  const selectedVehicles = [];
  let remainingHours = budget;

  for (let index = count; index >= 1; index -= 1) {
    if (dp[index][remainingHours] !== dp[index - 1][remainingHours]) {
      const vehicle = vehicles[index - 1];
      selectedVehicles.push(vehicle);
      remainingHours -= vehicle.Duration;
    }
  }

  selectedVehicles.reverse();

  return {
    selectedVehicles,
    totalDuration: selectedVehicles.reduce((sum, vehicle) => sum + vehicle.Duration, 0),
    totalImpact: selectedVehicles.reduce((sum, vehicle) => sum + vehicle.Impact, 0),
  };
}

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

async function handleOptimize(req, res) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      await Log("backend", "error", "middleware", "Missing JWT token");
      return res.status(401).json({ error: "Authorization bearer token is required" });
    }

    const depotData = await fetchData(
      "http://4.224.186.213/evaluation-service/depots",
      "depots",
      token
    );
    const vehicleData = await fetchData(
      "http://4.224.186.213/evaluation-service/vehicles",
      "vehicles",
      token
    );

    const depots = depotData?.depots || [];
    const vehicles = vehicleData?.vehicles || [];
    const depotId = req.body?.depotId;

    const depot = depotId
      ? depots.find((item) => item.ID === Number(depotId))
      : depots[0];

    if (!depot) {
      await Log("backend", "error", "middleware", "Depot not found");
      return res.status(404).json({ error: "Depot not found" });
    }

    const result = getBestVehicles(vehicles, depot.MechanicHours);

    return res.json({
      depotId: depot.ID,
      mechanicHours: depot.MechanicHours,
      totalDuration: result.totalDuration,
      totalImpact: result.totalImpact,
      selectedVehicles: result.selectedVehicles,
    });
  } catch (error) {
    await Log("backend", "error", "middleware", `Optimize API failed: ${error.message}`);
    return res.status(500).json({ error: "Failed to optimize vehicles" });
  }
}

app.post("/optimize", handleOptimize);
app.post("/optimise", handleOptimize);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});