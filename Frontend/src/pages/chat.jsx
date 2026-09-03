import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedLogo from '../components/AnimatedLogo'; 
import { Home, Settings, User } from 'lucide-react';
import styles from './styles/Chat.module.css';
import {
    Sidebar,
    SidebarBody,
    SidebarLink,
    useSidebar
} from "../components/Sidebar";

function SidebarHeader(){
    const { open } = useSidebar();
    return (
      <div className={styles.header}>
        <span className={styles.logo}><AnimatedLogo/></span>
        {open && (
          <span>
            Campus Mitra
          </span>
        )}
      </div>
    );
  }

const initialMessage={
  sender: "bot",
  text: "Hello! I'm your AI counselor. How can I assist you today?"
}

export default function ChatBot(){
  const [chats, setChats] = useState(()=>{
    const savedChats = localStorage.getItem("chatHistory");
    return savedChats ? JSON.parse(savedChats) : [{
      id: 1,
      title: "New Chat",
      messages: [initialMessage]
    }];
  });
  const [activeChatId, setActiveChatId] = useState(1);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const navigate=useNavigate();

  useEffect(()=>{
    localStorage.setItem("chatHistory", JSON.stringify(chats));
  }, [chats]);
  
  const links = [
    {
      label: "Home",
      href: "/home",
      icon: <Home size={20} />,
    },
    {
      label: "Settings",
      href: "/settings",
      icon: <Settings size={20} />,
    },
  ];

  async function handleSendMessage(){
    if(!input.trim()) return;
    const newMessage = {
      sender: "user",
      text: input.trim()
    };
    setChats(prevChats=>{
      return prevChats.map(chat=>
        chat.id === activeChatId
        ? {...chat, messages: [...chat.messages, newMessage]}
        : chat
      )
    });

    const query = input.trim();
    setInput("");
    setIsSending(true);

    try{
      const response = await fetch("http://localhost:5000/api/chat",{
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          query 
        })
      });
      const data = await response.json();
      setChats(prevChats=>{
        return prevChats.map(chat=>
          chat.id === activeChatId
          ? {...chat, messages: [...chat.messages, {sender: "bot", text: data.response}]}
          : chat
        )
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
}

const activeChat = chats.find(chat => chat.id === activeChatId);
const messages = activeChat?.messages || [];

  return(
    <div className={styles.container}>
      <Sidebar>
        <SidebarBody>
            <div className={styles.sidebarContent}>
                <SidebarHeader/>
                <div className={styles.links}>
                    {links.map((link)=>(
                        <SidebarLink 
                        key={link.href} 
                        link={link}
                        />
                    ))}
                </div>
                <div className={styles.bottomLinks}>
                    <SidebarLink 
                      link={{
                        label: "Profile",
                        href: "/profile",
                        icon: <User size={20}/>,
                      }}/>
                </div>
            </div>
        </SidebarBody>
      </Sidebar>

      <main className={styles.main}>
        <div className={styles.chatContent}>
            <h1 className={styles.title}>
              Welcome to <span className={styles.gradient}>AI Counselor</span>
            </h1>
            <p className={styles.description}> 
              All your Queries answered seamlessly. 
            </p>

          <div>
            {messages.map((message, index)=>(
              <div key={index}>
                {message.text}
              </div>
            ))}
          </div>

          <div className={styles.chatContainer}>
            <input 
              type="text"
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              placeholder="Type your message..."
              className={styles.input}
            />
            <button 
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLarge}`}
              onClick={handleSendMessage}
              disabled={isSending}>
                {isSending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}