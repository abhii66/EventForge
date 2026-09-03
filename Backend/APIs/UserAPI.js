import exp from "express";
import jwt from "jsonwebtoken";
import { UserModel } from "../models/UserModel.js";

export const userApp = exp.Router();

//User Registration
userApp.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await UserModel.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already exists" });

    const user = new UserModel({ name, email, password });
    await user.save();
    res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//User Login
userApp.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: "Logged In",
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Login Failed",
      error: err.message,
    });
  }
});
