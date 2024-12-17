import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from '../lib/cloudinary.js';
import { getReceiverSocketId } from "../lib/socket.js";
import { io } from "../lib/socket.js";
import mongoose from "mongoose";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;

    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        {senderId: myId, receiverId: userToChatId},
        {senderId: userToChatId, receiverId: myId}
      ]
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required" });
    }
    if (!senderId) {
      return res.status(401).json({ message: "Unauthorized: senderId not found" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if(receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(200).json(newMessage);
  } catch (error) {
    console.log("Send Message Route Called");

    console.log("Error in sendMessage: ", error.message);
    res.status(500).json({ message: "Internal server error" });
    
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { id: userId } = req.user;

    // Validate messageId format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID format" });
    }

    // Find the message first
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Validate user ownership
    if (message.senderId.toString() !== userId && message.receiverId.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to delete this message" });
    }

    // Delete the message
    const deletedMessage = await Message.findByIdAndDelete(messageId);

    // Notify the receiver if they're connected
    const receiverSocketId = getReceiverSocketId(message.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("deleteMessage", deletedMessage);
    }

    res.status(200).json({ message: "Message deleted successfully", deletedMessage });
  } catch (error) {
    console.error("Error in deleteMessage: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};