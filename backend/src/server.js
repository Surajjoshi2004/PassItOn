import app from "./app.js";
import { createServer } from "node:http";
import connectDB from "./config/db.js";
import { PORT } from "./config/env.js";
import { initializeSocket } from "./realtime/socket.js";

const httpServer = createServer(app);
initializeSocket(httpServer);

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
