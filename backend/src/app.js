import express from "express";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import reservationRoutes from "./routes/reservation.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import reportRoutes from "./routes/report.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";

const app = express();

// Listing photos are stored as small data URLs for this local deployment.
app.use(express.json({ limit: "8mb" }));

app.get("/", (req, res) => {
  res.json({ message: "PassItOn API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/conversations", conversationRoutes);

export default app;
