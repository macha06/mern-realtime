import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isDeleting: false,
  usersWithNewMessages: [],

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
      set({
        usersWithNewMessages: get().usersWithNewMessages.filter(
          (id) => id !== userId
        ),
      });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const {selectedUser, messages} = get()
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({messages:[...messages,res.data]})
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  deleteMessage: async (messageId) => {
    const { messages } = get();
    try {
      // Tambahkan indikator loading agar UX lebih baik
      set({ isDeleting: true });
  
      // Panggil API hanya dengan messageId jika selectedUserId tidak diperlukan
      await axiosInstance.delete(`/messages/delete/${messageId}`);
  
      // Update state secara aman
      set({
        messages: messages.filter((message) => message._id !== messageId),
        isDeleting: false,
      });
  
      toast.success("Pesan berhasil dihapus");
    } catch (error) {
      set({ isDeleting: false }); // Pastikan loader mati saat error
      if (error.response && error.response.data) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Terjadi kesalahan. Silakan coba lagi.");
      }
    }
  },
  

  subsribeToMessages: () => {
    const {selectedUser} = get();
    if(!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, messages, usersWithNewMessages } = get();

      // Update state messages jika pesan dari user yang dipilih
      if (selectedUser?._id === newMessage.senderId) {
        set({ messages: [...messages, newMessage] });
      } else {
        // Tambahkan ID pengguna ke usersWithNewMessages jika belum ada
        if (!usersWithNewMessages.includes(newMessage.senderId)) {
          set({
            usersWithNewMessages: [...usersWithNewMessages, newMessage.senderId],
          });
        }
      }
    });

    socket.on("deleteMessage", (deletedMessage) => {
      // Update the state by removing the deleted message
      set({
        messages: get().messages.filter((message) => message._id !== deletedMessage._id),
      });
    });
  },

  unsubsribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("deleteMessage");
  },

  setSelectedUser: (selectedUser) => {
    // Reset notifikasi merah untuk user yang dipilih
    set({
      selectedUser,
      usersWithNewMessages: get().usersWithNewMessages.filter(
        (id) => id !== selectedUser._id
      ),
    });
  },
}));