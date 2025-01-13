import React, { useState, useEffect, useRef } from "react";
import { Send, Paperclip, X, PlusCircle } from "lucide-react";

const CodeAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [sessions, setSessions] = useState(["Session 1"]);
  const [currentSession, setCurrentSession] = useState("Session 1");

  useEffect(() => {
    setSessions(["Session 1"]);
    setCurrentSession("Session 1");
  }, []);

  useEffect(() => {
    sessionStorage.setItem(currentSession, JSON.stringify(messages));
  }, [messages, currentSession]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const removeFile = (fileName) => {
    setFiles(files.filter((file) => file.name !== fileName));
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() && files.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          type: "error",
          content: "Please provide instructions or upload a file.",
        },
      ]);
      return;
    }

    setIsLoading(true);
    const serverIP = import.meta.env.VITE_SERVER_IP;

    const fileContents = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        content: await readFileContent(file),
      }))
    );

    // Combine instructions and file content into a single message
    const combinedInstructions = `${input}\n\n${fileContents
      .map((file) => `--- File: ${file.name} ---\n${file.content}`)
      .join("\n\n")}`;

    const userMessage = {
      type: "user",
      content: combinedInstructions,
      files: files.map((f) => f.name),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch(`http://${serverIP}:3000/generate-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: currentSession,
          instructions: combinedInstructions,
          files: fileContents,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Server responded with status: ${response.status}. ${errorData}`
        );
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { type: "assistant", content: data.code },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { type: "error", content: `Error: ${error.message}.` },
      ]);
    }

    setIsLoading(false);
    setInput("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteSession = (sessionToDelete) => {
    const updatedSessions = sessions.filter(
      (session) => session !== sessionToDelete
    );
    setSessions(updatedSessions);
    sessionStorage.removeItem(sessionToDelete);
    if (currentSession === sessionToDelete) {
      setCurrentSession(updatedSessions[0] || "Session 1");
      setMessages([]);
    }
  };

  const createNewSession = () => {
    const newSession = `Session ${sessions.length + 1}`;
    setSessions([...sessions, newSession]);
    setCurrentSession(newSession);
    setMessages([]);
  };

  return (
    <div className="flex h-screen max-w-6xl mx-auto p-6">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-900 text-white p-6 rounded-lg shadow-lg mr-6">
        <h2 className="text-lg font-bold mb-6">Sessions</h2>
        <ul className="space-y-3">
          {sessions.map((session, index) => (
            <li
              key={index}
              className={`cursor-pointer p-3 rounded-lg flex justify-between items-center transition duration-300 ease-in-out ${
                currentSession === session ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
              onClick={() => {
                setCurrentSession(session);
                setMessages(JSON.parse(sessionStorage.getItem(session)) || []);
              }}
            >
              <span>{session}</span>
              <X
                className="w-5 h-5 cursor-pointer hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session);
                }}
              />
            </li>
          ))}
        </ul>
        <button
          onClick={createNewSession}
          className="mt-6 flex items-center gap-2 text-blue-400 hover:text-blue-300"
        >
          <PlusCircle className="w-5 h-5" /> New Session
        </button>
      </div>

      {/* Main Chat Section */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-xl">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.type === "user"
                    ? "bg-blue-500 text-white"
                    : message.type === "error"
                    ? "bg-red-100 text-red-500"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {message.content}
                </pre>
                {message.files && message.files.length > 0 && (
                  <div className="mt-2 text-sm opacity-75">
                    Attached files: {message.files.join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          {/* File Preview */}
          {files.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium mb-2">Attached Files:</div>
              <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm border"
                  >
                    <span>{file.name}</span>
                    <button
                      onClick={() => removeFile(file.name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your coding question..."
              className="flex-1 p-4 border border-gray-300 rounded-lg resize-none bg-gray-50 focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="flex flex-col gap-2">
              <label className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                />
                <Paperclip className="w-5 h-5" />
              </label>
              <button
                type="submit"
                disabled={isLoading}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CodeAssistant;
