import { addLog } from "../middleware/log";
import { Request, Response } from "express";
import { User } from "../models/User";

const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      await addLog("WARNING", `No user found with ID: ${id}`, false);
      return res.status(404).json({ message: "User not found" });
    }

    await addLog(
      "INFO",
      `User [${user.username}] retrieved successfully`,
      false
    );
    res.status(200).json({
      message: "User retrieved successfully",
      user,
    });
  } catch (error) {
    await addLog("ERROR", `Error retrieving user: ${error}`, false);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();

    if (users.length === 0) {
      await addLog("WARNING", "No users found", false);
      return res.status(404).json({ message: "No users found" });
    }

    await addLog("INFO", "Users retrieved successfully", false);
    res.status(200).json({
      message: "Users retrieved successfully",
      users,
    });
  } catch (error) {
    await addLog("ERROR", `Error retrieving users: ${error}`, false);
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

export { getUser, getUsers, deleteUser };
