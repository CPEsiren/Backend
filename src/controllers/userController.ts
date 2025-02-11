import { Request, Response } from "express";
import { User } from "../models/User";
import mongoose from "mongoose";

const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User retrieved successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({
      message: "Users retrieved successfully",
      users,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

const getRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res
        .status(404)
        .json({ status: "warning", message: "User not found" });
    }

    res.status(200).json({
      status: "success",
      message: "User role retrieved successfully",
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user_id = req.params.id;

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({
        status: "fail",
        message: "Valid user ID is required to update a user.",
      });
    }

    const { email, role } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      user_id,
      {
        role,
      },
      { new: true, session }
    );

    if (!updatedUser) {
      throw new Error(`No user found with ID: ${user_id}`);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: `User [${updatedUser.username}] updated successfully.`,
      data: updatedUser,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error instanceof Error && error.message.startsWith("No user found")) {
      return res.status(404).json({
        status: "fail",
        message: error.message,
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to update user.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: `User [${user.username}] deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export { getUser, getUsers, getRole, deleteUser };
