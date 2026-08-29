import app from "./app.js";
import { createServer } from "node:http";
import connectDB from "./config/db.js";
import { PORT } from "./config/env.js";
import { initializeSocket } from "./realtime/socket.js";
import { seedDemoUser } from "./scripts/seedDemoUser.js";

const httpServer = createServer(app);
initializeSocket(httpServer);

connectDB().then(async () => {
  // Local demo data is deliberately opt-in via SEED_DEMO_USER.
  if (process.env.SEED_DEMO_USER === "true") {
    await seedDemoUser();
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
