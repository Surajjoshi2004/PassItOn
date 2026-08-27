import Listing from "../models/Listing.js";
import User from "../models/User.js";
import Report from "../models/Report.js";

export const createReport = async ({ reporterId, targetType, targetId, reason, description }) => {
  const targetExists =
    targetType === "listing"
      ? await Listing.exists({ _id: targetId })
      : await User.exists({ _id: targetId });

  if (!targetExists) {
    return { report: null, error: "TARGET_NOT_FOUND" };
  }

  if (targetType === "user" && targetId.toString() === reporterId) {
    return { report: null, error: "CANNOT_REPORT_SELF" };
  }

  const report = await Report.create({
    reporter: reporterId,
    targetType,
    target: targetId,
    reason,
    description: description || "",
    status: "open",
  });

  return { report, error: null };
};

export const listReportsByReporter = (reporterId) => {
  return Report.find({ reporter: reporterId })
    .populate("reporter", "name college")
    .sort({ createdAt: -1 });
};
