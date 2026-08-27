import User from "../models/User.js";

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  college: user.college,
  hostel: user.hostel,
  graduationYear: user.graduationYear,
  profileImage: user.profileImage,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

const ALLOWED_FIELDS = [
  "name",
  "college",
  "hostel",
  "graduationYear",
  "profileImage",
];

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: serializeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateMe = async (req, res) => {
  try {
    const updates = req.body;

    const invalidKeys = Object.keys(updates).filter(
      (key) => !ALLOWED_FIELDS.includes(key)
    );

    if (invalidKeys.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${invalidKeys.join(", ")}`,
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    Object.assign(user, updates);

    try {
      await user.save();
    } catch (validationError) {
      const messages = Object.values(validationError.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: messages,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: serializeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
