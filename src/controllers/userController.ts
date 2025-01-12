import { addLog } from "../services/logService";
import { Request, Response } from "express";
import { User } from "../models/User";
import bcrypt from "bcrypt";

const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");
    if (!user) {
      await addLog("WARNING", `No user found with ID: ${id}`, false);
      return res.status(404).json({ message: "User not found" });
    }

    await addLog("INFO", "User retrieved successfully", false);
    res.status(200).json(user);
  } catch (error) {
    await addLog("ERROR", `Error retrieving user: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUsers = async (req: Request, res: Response) => {
  try {
    const { role, isActive } = req.query;

    const query: any = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === "true";

    const users = await User.find(query)
      .select("-password")
      .sort({ username: 1 });

    await addLog("INFO", "Users retrieved successfully", false);
    res.status(200).json({
      users,
    });
  } catch (error) {
    await addLog("ERROR", `Error retrieving users: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      await addLog("WARNING", "Missing required fields", false);
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      await addLog("WARNING", "Username or email already exists", false);
      return res
        .status(409)
        .json({ message: "Username or email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || "viewer",
      isActive: true,
    });

    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    await addLog(
      "INFO",
      `User [${userResponse.username}]created successfully`,
      true
    );
    res.status(201).json({
      message: `User [${userResponse.username}]created successfully`,
      user: userResponse,
    });
  } catch (error) {
    await addLog("ERROR", `Error creating user: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, email, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      await addLog("WARNING", `No user found with ID: ${id}`, false);
      return res.status(404).json({ message: "User not found" });
    }

    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    await addLog(
      "INFO",
      `User [${userResponse.username}] updated successfully`,
      true
    );
    res.status(200).json({
      message: `User [${userResponse.username}] updated successfully`,
      user: userResponse,
    });
  } catch (error) {
    await addLog("ERROR", `Error updating user: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      await addLog("WARNING", `No user found with ID: ${id}`, false);
      return res.status(404).json({ message: "User not found" });
    }

    await addLog("INFO", `User [${user.username}] deleted successfully`, true);
    res
      .status(200)
      .json({ message: `User [${user.username}] deleted successfully` });
  } catch (error) {
    await addLog("ERROR", `Error deleting user: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getUser, getUsers, createUser, updateUser, deleteUser };
