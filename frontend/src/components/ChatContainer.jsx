import { useChatStore } from "../store/useChatStore"
import { useEffect, useRef, useState } from "react";
import MessageInput from "./MessageInput";
import ChatHeader from "./chatHeader";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages, 
    getMessages, 
    isMessagesLoading, 
    selectedUser,
    subsribeToMessages,
    unsubsribeFromMessages,
    deleteMessage
  } = useChatStore();

  const {authUser} = useAuthStore();
  const messageEndRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);

  useEffect(() => {
    getMessages(selectedUser._id)

    subsribeToMessages();

    return () => unsubsribeFromMessages();
  },[selectedUser._id, getMessages, subsribeToMessages, unsubsribeFromMessages]);

  useEffect(() => {
    if(messageEndRef.current && messages){
      messageEndRef.current.scrollIntoView({behavior: "smooth"});
    }
  },[messages]);

  if(isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <MessageSkeleton />
      <MessageInput />
      </div>
    )
  }

  const openDeleteConfirmation = (messageId) => {
    setSelectedMessageId(messageId);
    setIsModalOpen(true);
  };

  const handleDeleteMessage = async () => {
    await deleteMessage(selectedMessageId);
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                src={
                  message.senderId === authUser._id 
                    ? authUser.profilePic || "/avatar.png" 
                    : selectedUser.profilePic || "/avatar.png"}
                alt="profile pic" 
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
              {/* Tombol Hapus Pesan */}
              {message.senderId === authUser._id && (
                <button
                onClick={() => openDeleteConfirmation(message._id)}
                className="text-red-500 text-xs hover:underline ml-2"
              >
                Hapus
              </button>
              )}
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />

      {/* Modal Konfirmasi Hapus */}
      {isModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Konfirmasi Hapus</h3>
            <p className="py-4">
              Apakah Anda yakin ingin menghapus pesan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-error"
                onClick={handleDeleteMessage}
              >
                Hapus
              </button>
              <button
                className="btn"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChatContainer