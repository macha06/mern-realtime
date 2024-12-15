import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://ffcc-103-151-34-25.ngrok-free.app/api",
  withCredentials: true,
});