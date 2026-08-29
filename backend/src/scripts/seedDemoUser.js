import User from "../models/User.js";

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || "demo@lpu.in";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || "DemoPass123!";

export const seedDemoUser = async () => {
  const email = DEMO_EMAIL.toLowerCase();
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    console.log(`Demo user is ready: ${email}`);
    return;
  }

  await User.create({
    name: "Demo Student",
    email,
    password: DEMO_PASSWORD,
    college: "Lovely Professional University",
    graduationYear: 2027,
    isEmailVerified: true,
  });

  console.log(`Demo user created: ${email}`);
};
