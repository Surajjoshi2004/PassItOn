import { Router } from "express";
import {
  authenticate,
  requireVerifiedEmail,
} from "../middleware/auth.middleware.js";
import {
  createReservationHandler,
  listReservationsHandler,
  acceptReservationHandler,
  rejectReservationHandler,
  cancelReservationHandler,
} from "../controllers/reservation.controller.js";

const router = Router();

router.use(authenticate, requireVerifiedEmail);

router.post("/", createReservationHandler);
router.get("/", listReservationsHandler);
router.patch("/:id/accept", acceptReservationHandler);
router.patch("/:id/reject", rejectReservationHandler);
router.delete("/:id", cancelReservationHandler);

export default router;
