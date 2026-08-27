import mongoose from "mongoose";
import {
  createReport,
  listReportsByReporter,
} from "../services/report.service.js";

const isValidObjectId = (id) => mongoose.isValidObjectId(id);

const errorStatusMap = {
  TARGET_NOT_FOUND: { code: 404, message: "The reported item was not found" },
  CANNOT_REPORT_SELF: { code: 400, message: "You cannot report yourself" },
};

const respondError = (res, error) => {
  const mapped = errorStatusMap[error];
  if (mapped) {
    return res.status(mapped.code).json({
      success: false,
      message: mapped.message,
    });
  }
  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export const createReportHandler = async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (targetType !== "listing" && targetType !== "user") {
      return res.status(400).json({
        success: false,
        message: "targetType must be either 'listing' or 'user'",
      });
    }

    if (!targetId || !isValidObjectId(targetId)) {
      return res.status(400).json({
        success: false,
        message: "A valid targetId is required",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "A reason is required",
      });
    }

    const { report, error } = await createReport({
      reporterId: req.user.id,
      targetType,
      targetId,
      reason: reason.trim(),
      description,
    });

    if (error) {
      return respondError(res, error);
    }

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      data: report,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listMyReportsHandler = async (req, res) => {
  try {
    const reports = await listReportsByReporter(req.user.id);

    return res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
