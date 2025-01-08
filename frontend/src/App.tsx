import React, { useState, useEffect, useRef } from "react";
import { Send, PaperclipIcon, Trash2, X } from "lucide-react";

const CodeAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const sessionId =
      localStorage.getItem("chatSessionId") ||
      Math.random().toString(36).substring(7);
    localStorage.setItem("chatSessionId", sessionId);

    const savedMessages = sessionStorage.getItem("chatMessages");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const removeFile = (fileName) => {
    setFiles(files.filter((file) => file.name !== fileName));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return;

    setIsLoading(true);
    const sessionId = localStorage.getItem("chatSessionId");

    const userMessage = {
      type: "user",
      content: input,
      files: files.map((f) => f.name),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const fileContents = await Promise.all(
        files.map(async (file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({
                name: file.name,
                content: e.target.result,
              });
            };
            reader.readAsText(file);
          });
        })
      );

      const response = await fetch("/generate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          instructions: input,
          files: fileContents,
        }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content: data.code,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: "Failed to generate response. Please try again.",
        },
      ]);
    }

    setIsLoading(false);
    setInput("");
    setFiles([]);
    fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 flex-grow flex flex-col relative">
        {/* Chat messages */}
        <div className="flex-grow overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg ${
                  message.type === "user"
                    ? "bg-blue-500 text-white"
                    : message.type === "error"
                    ? "bg-red-100 text-red-500"
                    : "bg-gray-100 text-gray-800"
                } shadow-sm`}
              >
                <div className="p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {message.content}
                  </pre>
                  {message.files?.length > 0 && (
                    <div className="mt-2 border-t border-opacity-20 pt-2">
                      <p className="text-sm opacity-80">Attached files:</p>
                      {message.files.map((file) => (
                        <p key={file} className="text-xs opacity-70">
                          {file}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* File upload preview */}
        {files.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                Attached Files
              </p>
              <button
                onClick={() => setFiles([])}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between bg-white p-2 rounded text-sm"
                >
                  <span className="text-gray-600 truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input form */}
        <div className="relative">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your coding question..."
                className="w-full p-4 pr-24 border rounded-lg resize-none bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm hover:shadow-md transition-all"
                >
                  <PaperclipIcon className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && files.length === 0)}
                  className="p-2 bg-blue-500 text-white rounded-full shadow-sm hover:shadow-md hover:bg-blue-600 disabled:bg-gray-300 disabled:shadow-none transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CodeAssistant;
