import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";
import { Tuition } from "../models/Tuition.js";

const seedDatabase = async (): Promise<void> => {
  try {
    await connectDB();

    const defaultPassword = await bcrypt.hash("MentorLagbe@123", 10);

    // 1. Seed Admin User
    let admin = await User.findOne({ email: "admin@mentorlagbe.com" });
    if (!admin) {
      admin = await User.create({
        name: "MentorLagbe Admin",
        email: "admin@mentorlagbe.com",
        password: defaultPassword,
        phone: "+8801700000001",
        role: "admin",
        plan: "pro",
        isVerifiedTutor: false,
        bio: "Platform administrator for MentorLagbe.",
      });
    }

    // 2. Seed Pro Tutor
    let proTutor = await User.findOne({ email: "tanvir.tutor@mentorlagbe.com" });
    if (!proTutor) {
      proTutor = await User.create({
        name: "Prof. Tanvir Ahmed",
        email: "tanvir.tutor@mentorlagbe.com",
        password: defaultPassword,
        phone: "+8801711000002",
        role: "tutor",
        plan: "pro",
        isVerifiedTutor: true,
        bio: "Senior mathematics & physics mentor with 8+ years of teaching experience.",
      });
    }

    // 3. Seed Free Tutor
    let freeTutor = await User.findOne({ email: "sadia.tutor@mentorlagbe.com" });
    if (!freeTutor) {
      freeTutor = await User.create({
        name: "Sadia Sultana",
        email: "sadia.tutor@mentorlagbe.com",
        password: defaultPassword,
        phone: "+8801811000003",
        role: "tutor",
        plan: "free",
        isVerifiedTutor: false,
        bio: "IELTS & English communication instructor.",
      });
    }

    // 4. Seed Student
    const existingStudent = await User.findOne({
      email: "ariful.student@mentorlagbe.com",
    });
    if (!existingStudent) {
      await User.create({
        name: "Ariful Islam",
        email: "ariful.student@mentorlagbe.com",
        password: defaultPassword,
        phone: "+8801911000004",
        role: "student",
        plan: "free",
        isVerifiedTutor: false,
        bio: "HSC science student looking for structured mentorship.",
      });
    }

    // 5. Seed Sample Approved Tuitions
    const existingCount = await Tuition.countDocuments();
    if (existingCount === 0) {
      await Tuition.insertMany([
        {
          title: "HSC Higher Math & Physics 1-on-1 Mentorship",
          tutorId: proTutor._id,
          tutorName: proTutor.name,
          tutorVerified: true,
          subject: "Higher Mathematics",
          classLevel: "HSC (Class 11-12)",
          mode: "Online",
          location: "Zoom / Google Meet",
          monthlyFee: 35,
          daysPerWeek: 3,
          bannerImage:
            "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800",
          description:
            "Comprehensive calculus, vectors, and mechanics mentorship with weekly problem-solving sessions.",
          status: "Approved",
        },
        {
          title: "IELTS Academic Band 8+ Intensive Batch",
          tutorId: freeTutor._id,
          tutorName: freeTutor.name,
          tutorVerified: false,
          subject: "IELTS & English",
          classLevel: "University / Admission",
          mode: "Offline",
          location: "Dhanmondi, Dhaka",
          monthlyFee: 40,
          daysPerWeek: 3,
          bannerImage:
            "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800",
          description:
            "Focused listening, reading, writing task 1 & 2 feedback, and speaking mock tests.",
          status: "Approved",
        },
      ]);
    }

    console.log("Database seeded successfully!");
    console.log(
      "Demo credentials password for all seeded users: MentorLagbe@123"
    );
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
};

seedDatabase();