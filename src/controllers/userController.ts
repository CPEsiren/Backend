import { Request, Response } from "express";
import { User } from "../models/User";
import mongoose from "mongoose";
import { createActivityLog } from "./LogUserController";

const getUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID format.",
      });
    }

    const user = await User.findById(id).select("-password -__v").lean().exec();

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "User retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("Error retrieving user: ", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password -__v").lean().exec();

    if (users.length === 0) {
      return res.status(404).json({
        status: "fail",
        message: "No users found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Users retrieved successfully",
      users,
    });
  } catch (error) {
    console.error("Error retrieving users: ", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const getRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID format.",
      });
    }

    const user = await User.findById(id).select("role").lean().exec();

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "User role retrieved successfully",
      role: user.role,
    });
  } catch (error) {
    console.error("Error retrieving user role: ", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const NOC = req.body.NOC;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID format.",
      });
    }

    if (!role) {
      return res.status(400).json({
        status: "fail",
        message: "Role is required to update a user.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true, select: "username role" },
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

     // Log for activity
         const username = req.body.userName || "system";
         const userdochangerole = req.body.userRole || "system";
         await createActivityLog(
           username,
           userdochangerole,
           `Updated role of: ${NOC}`
         );

    res.status(200).json({
      status: "success",
      message: `User [${updatedUser.username}] role updated successfully.`,
      data: {
        user: {
          id: updatedUser._id,
          username: updatedUser.username,
          role: updatedUser.role,
        },
      },
    });
  } catch (error) {
    console.error("Error updating user role: ", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID format.",
      });
    }

    const deletedUser = await User.findByIdAndDelete(id)
      .select("username")
      .lean();

    if (!deletedUser) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: `User [${deletedUser.username}] deleted successfully`,
      data: {
        deletedUserId: id,
        deletedUsername: deletedUser.username,
      },
    });
  } catch (error) {
    console.error("Error deleting user: ", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

export { getUser, getUsers, getRole, deleteUser };
