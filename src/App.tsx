/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './services/api';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  Plus, 
  LogOut, 
  User as UserIcon, 
  Search, 
  ChevronRight,
  Award,
  CircleUser,
  LayoutDashboard,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform, useVelocity, useSpring, useMotionValueEvent } from 'motion/react';
import { cn, formatDate } from './lib/utils';

// --- Types ---
interface User {
  id: number;
  name: string;
  phone: string;
  instaId: string;
}

interface Marathon {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  prize: string;
  hostedBy: number;
  hostName?: string;
  winnerId?: number;
  participants?: User[];
}

// --- Auth Context ---
const AuthContext = createContext<{
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
} | null>(null);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---
const Navbar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-emerald-600 p-2 rounded-lg group-hover:bg-emerald-700 transition-colors">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-zinc-900">RunHost</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/marathons" className="text-zinc-600 hover:text-emerald-600 font-medium transition-colors">Explore</Link>
            <Link to="/leaderboard" className="text-zinc-600 hover:text-emerald-600 font-medium transition-colors">Leaderboard</Link>
            {user ? (
              <>
                <Link to="/create" className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Host Event
                </Link>
                <div className="h-6 w-px bg-zinc-200" />
                <Link to="/profile" className="flex items-center gap-2 text-zinc-700 hover:text-emerald-600 transition-colors">
                  <CircleUser className="w-6 h-6" />
                  <span className="font-medium">{user.name}</span>
                </Link>
                <button onClick={() => { logout(); navigate('/login'); }} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-zinc-600 hover:text-emerald-600 font-medium">Login</Link>
                <Link to="/signup" className="bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-zinc-800 transition-all">Sign Up</Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-zinc-600">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-zinc-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              <Link to="/marathons" className="block px-3 py-2 text-zinc-600 font-medium" onClick={() => setIsOpen(false)}>Explore</Link>
              <Link to="/leaderboard" className="block px-3 py-2 text-zinc-600 font-medium" onClick={() => setIsOpen(false)}>Leaderboard</Link>
              {user ? (
                <>
                  <Link to="/create" className="block px-3 py-2 text-emerald-600 font-bold" onClick={() => setIsOpen(false)}>Host Event</Link>
                  <Link to="/profile" className="block px-3 py-2 text-zinc-600 font-medium" onClick={() => setIsOpen(false)}>Profile</Link>
                  <button onClick={() => { logout(); navigate('/login'); setIsOpen(false); }} className="block w-full text-left px-3 py-2 text-red-500 font-medium">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block px-3 py-2 text-zinc-600 font-medium" onClick={() => setIsOpen(false)}>Login</Link>
                  <Link to="/signup" className="block px-3 py-2 text-zinc-900 font-bold" onClick={() => setIsOpen(false)}>Sign Up</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

// --- Pages ---
const RunnersShowcase = () => {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -400]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div className="relative h-[700px] overflow-hidden bg-zinc-950 my-24 rounded-[2.5rem] mx-4 sm:mx-8 shadow-2xl">
      <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/marathon-bg/1920/1080?blur=5')] bg-cover bg-center opacity-20" />
      
      <div className="relative h-full max-w-7xl mx-auto px-4 overflow-hidden">
        <div className="grid grid-cols-3 gap-4 sm:gap-8 items-start h-full">
          <motion.div style={{ y: y1 }} className="space-y-4 sm:space-y-8 pt-12">
             <img src="https://picsum.photos/seed/run1/400/600" alt="Runner" className="w-full rounded-2xl shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
             <img src="https://picsum.photos/seed/run2/400/500" alt="Runner" className="w-full rounded-2xl shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
             <img src="https://picsum.photos/seed/run7/400/550" alt="Runner" className="w-full rounded-2xl shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
          </motion.div>
          <motion.div style={{ y: y2 }} className="space-y-4 sm:space-y-8 pt-48">
             <img src="https://picsum.photos/seed/run3/400/550" alt="Runner" className="w-full rounded-2xl shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
             <img src="https://picsum.photos/seed/run4/400/650" alt="Runner" className="w-full rounded-2xl shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
             <img src="https://picsum.photos/seed/run8/400/500" alt="Runner" className="w-full rounded-2xl shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
          </motion.div>
          <motion.div style={{ y: y3 }} className="space-y-4 sm:space-y-8 pt-24">
             <img src="https://picsum.photos/seed/run5/400/500" alt="Runner" className="w-full rounded-2xl shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
             <img src="https://picsum.photos/seed/run6/400/600" alt="Runner" className="w-full rounded-2xl shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
             <img src="https://picsum.photos/seed/run9/400/550" alt="Runner" className="w-full rounded-2xl shadow-2xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
          </motion.div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center bg-zinc-900/80 backdrop-blur-xl p-8 md:p-16 rounded-[2rem] border border-white/10 max-w-2xl shadow-2xl"
          >
            <h2 className="text-4xl md:text-7xl font-black text-white mb-6 italic uppercase tracking-tighter leading-none">
              Feel the <span className="text-emerald-500">Momentum</span>
            </h2>
            <p className="text-zinc-400 text-lg md:text-xl font-medium leading-relaxed">
              Every step counts. Every breath matters. Join a global movement of athletes pushing their limits every single day.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isMe?: boolean;
}

interface Community {
  id: number;
  name: string;
  members: number;
  description: string;
  image: string;
  category: string;
  messages: Message[];
}

const ClubChat = ({ club, onClose }: { club: Community; onClose: () => void }) => {
  const [messages, setMessages] = useState(club.messages);
  const [input, setInput] = useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const newMessage: Message = {
      id: Date.now(),
      sender: "Me",
      text: input,
      time: "Just now",
      isMe: true
    };
    setMessages([...messages, newMessage]);
    setInput("");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm"
    >
      <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-6 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
              <img src={club.image} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold">{club.name}</h3>
              <p className="text-xs text-zinc-400">{club.members} members online</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-zinc-50">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex flex-col", msg.isMe ? "items-end" : "items-start")}>
              <div className={cn(
                "max-w-[80%] p-4 rounded-2xl text-sm shadow-sm",
                msg.isMe ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white text-zinc-900 border border-zinc-100 rounded-tl-none"
              )}>
                {!msg.isMe && <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 mb-1">{msg.sender}</p>}
                <p className="leading-relaxed">{msg.text}</p>
              </div>
              <span className="text-[10px] text-zinc-400 mt-1 px-1">{msg.time}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="p-4 bg-white border-t border-zinc-100 flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-zinc-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
          />
          <button type="submit" className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </motion.div>
  );
};

const CommunitySection = () => {
  const [joined, setJoined] = useState<number[]>([]);
  const [activeChat, setActiveChat] = useState<Community | null>(null);

  const communities: Community[] = [
    {
      id: 1,
      name: "Midnight Striders",
      members: 1240,
      description: "For those who find their pace under the city lights. Night runs every Tuesday.",
      image: "https://picsum.photos/seed/nightrun/400/300",
      category: "Night Running",
      messages: [
        { id: 1, sender: "Carlos", text: "Who's up for the 10k tonight?", time: "10:30 PM" },
        { id: 2, sender: "Sarah", text: "I'm in! Meeting at the usual spot?", time: "10:32 PM" },
        { id: 3, sender: "Mike", text: "Anyone seen my neon vest? I think I left it at the park.", time: "10:35 PM" },
        { id: 4, sender: "Carlos", text: "Yeah, I saw it near the bench. I'll bring it tonight.", time: "10:36 PM" },
        { id: 5, sender: "Elena", text: "Don't forget water, it's still humid out there!", time: "10:40 PM" }
      ]
    },
    {
      id: 2,
      name: "Mountain Goats",
      members: 850,
      description: "Trail running enthusiasts conquering the steepest peaks. Weekend excursions.",
      image: "https://picsum.photos/seed/trail/400/300",
      category: "Trail",
      messages: [
        { id: 1, sender: "Dave", text: "The peak was beautiful today! Check the photos.", time: "2:00 PM" },
        { id: 2, sender: "Lisa", text: "Wow! How was the descent? Slippery?", time: "2:05 PM" },
        { id: 3, sender: "Dave", text: "A bit, but the new shoes held up great.", time: "2:10 PM" },
        { id: 4, sender: "Marcus", text: "Anyone doing the ridge run on Sunday?", time: "3:00 PM" }
      ]
    },
    {
      id: 3,
      name: "Elite Sprinters",
      members: 420,
      description: "Focusing on speed, form, and explosive power. Track sessions daily.",
      image: "https://picsum.photos/seed/sprint/400/300",
      category: "Track",
      messages: [
        { id: 1, sender: "Coach", text: "Intervals at 5 PM. Don't be late.", time: "1:00 PM" },
        { id: 2, sender: "Kevin", text: "My hamstrings are still tight from yesterday.", time: "1:15 PM" },
        { id: 3, sender: "Coach", text: "Do the dynamic stretches I showed you. 20 mins extra.", time: "1:20 PM" },
        { id: 4, sender: "Kevin", text: "Got it. See you there.", time: "1:25 PM" }
      ]
    },
    {
      id: 4,
      name: "Morning Glory Club",
      members: 2100,
      description: "Start your day with a 5K and a coffee. Sunrise runs at the park.",
      image: "https://picsum.photos/seed/morning/400/300",
      category: "Social",
      messages: [
        { id: 1, sender: "Jenny", text: "Run at 5? The sunrise is going to be epic.", time: "Yesterday" },
        { id: 2, sender: "Tom", text: "I'm setting my alarm now. Coffee after?", time: "Yesterday" },
        { id: 3, sender: "Jenny", text: "Always! I found a new bakery near the finish line.", time: "Yesterday" },
        { id: 4, sender: "Alice", text: "I'm bringing my dog tomorrow, he needs the exercise too!", time: "8:00 PM" }
      ]
    },
    {
      id: 5,
      name: "Coastal Cruisers",
      members: 1560,
      description: "Breezy ocean-side runs for all levels. Perfect for recovery days.",
      image: "https://picsum.photos/seed/beach/400/300",
      category: "Scenic",
      messages: [
        { id: 1, sender: "Sam", text: "The tide is low, perfect for a beach run.", time: "4:00 PM" },
        { id: 2, sender: "Mia", text: "I'll be there in 15. Anyone else?", time: "4:05 PM" }
      ]
    },
    {
      id: 6,
      name: "Iron Lungs",
      members: 680,
      description: "High-altitude training for serious endurance athletes. Oxygen is optional.",
      image: "https://picsum.photos/seed/mountain/400/300",
      category: "Endurance",
      messages: [
        { id: 1, sender: "Viktor", text: "15 miles at 8000ft today. Feeling strong.", time: "6:00 PM" },
        { id: 2, sender: "Anna", text: "You're a beast, Viktor. I'm struggling at 5000ft lol.", time: "6:10 PM" }
      ]
    },
    {
      id: 7,
      name: "Urban Explorers",
      members: 940,
      description: "Discover hidden gems in the city through running. Every run is a new route.",
      image: "https://picsum.photos/seed/city/400/300",
      category: "Adventure",
      messages: [
        { id: 1, sender: "Leo", text: "Found a cool mural in the alley behind 5th st.", time: "11:00 AM" },
        { id: 2, sender: "Sophie", text: "Send the location! Let's route tomorrow's run there.", time: "11:15 AM" }
      ]
    },
    {
      id: 8,
      name: "The 5AM Crew",
      members: 3200,
      description: "The earliest birds in the city. Beat the traffic and the sun.",
      image: "https://picsum.photos/seed/early/400/300",
      category: "Early Bird",
      messages: [
        { id: 1, sender: "Boss", text: "Alarms set? No excuses.", time: "9:00 PM" },
        { id: 2, sender: "Chris", text: "Ready. Coffee is prepped.", time: "9:05 PM" },
        { id: 3, sender: "Boss", text: "That's what I like to hear. See you in the dark.", time: "9:10 PM" }
      ]
    }
  ];

  const toggleJoin = (id: number) => {
    setJoined(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <AnimatePresence>
        {activeChat && <ClubChat club={activeChat} onClose={() => setActiveChat(null)} />}
      </AnimatePresence>

      <div className="text-center mb-16">
        <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-4">Join Your Tribe</h2>
        <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
          Running is better together. Connect with local clubs and specialized groups to elevate your training.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {communities.map((club) => (
          <motion.div
            key={club.id}
            whileHover={{ y: -8 }}
            className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="relative h-48 overflow-hidden">
              <img src={club.image} alt={club.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-zinc-900 text-xs font-bold rounded-full shadow-sm">
                  {club.category}
                </span>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-xl text-zinc-900">{club.name}</h3>
                <div className="flex items-center gap-1 text-zinc-400 text-sm">
                  <Users className="w-4 h-4" />
                  <span>{club.members + (joined.includes(club.id) ? 1 : 0)}</span>
                </div>
              </div>
              <p className="text-zinc-500 text-sm mb-6 flex-1">{club.description}</p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => toggleJoin(club.id)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all",
                    joined.includes(club.id)
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  )}
                >
                  {joined.includes(club.id) ? "Joined" : "Join Club"}
                </button>
                {joined.includes(club.id) && (
                  <button
                    onClick={() => setActiveChat(club)}
                    className="p-3 bg-zinc-100 text-zinc-900 rounded-xl hover:bg-zinc-200 transition-all"
                    title="Open Chat"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const LandingPage = () => {
  return (
    <>
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wide text-emerald-600 uppercase bg-emerald-50 rounded-full">
                The Ultimate Runner's Network
              </span>
              <h1 className="text-5xl md:text-7xl font-extrabold text-zinc-900 tracking-tight mb-8">
                Connect. Compete. <br />
                <span className="text-emerald-600">Conquer the Miles.</span>
              </h1>
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-zinc-600 mb-10 leading-relaxed">
                The all-in-one platform to host, discover, and participate in marathons. 
                Track your progress, win prizes, and join a community of elite athletes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/marathons" className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                  Find a Race
                </Link>
                <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-white text-zinc-900 border-2 border-zinc-200 rounded-xl font-bold text-lg hover:bg-zinc-50 transition-all">
                  Join the Community
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Decorative Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl" />
        </div>
      </div>
      <RunnersShowcase />
      <CommunitySection />
    </>
  );
};

const SignupPage = () => {
  const [formData, setFormData] = useState({ name: '', phone: '', instaId: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/signup', formData);
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-zinc-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-zinc-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-zinc-900">Create Account</h2>
          <p className="text-zinc-500 mt-2">Join the RunHost community</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Full Name</label>
            <input 
              type="text" required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="John Doe"
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Phone Number</label>
            <input 
              type="tel" required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="+1 234 567 890"
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Instagram ID</label>
            <input 
              type="text" required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="@username"
              onChange={e => setFormData({...formData, instaId: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Password</label>
            <input 
              type="password" required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
            Sign Up
          </button>
        </form>

        <p className="text-center mt-6 text-zinc-500">
          Already have an account? <Link to="/login" className="text-emerald-600 font-bold hover:underline">Login</Link>
        </p>
      </motion.div>
    </div>
  );
};

const LoginPage = () => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', formData);
      login(data.token, data.user);
      navigate('/marathons');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-zinc-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-zinc-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-zinc-900">Welcome Back</h2>
          <p className="text-zinc-500 mt-2">Login to your athlete profile</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Phone or Instagram ID</label>
            <input 
              type="text" required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Phone or @username"
              onChange={e => setFormData({...formData, identifier: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-700 mb-1">Password</label>
            <input 
              type="password" required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
            Login
          </button>
        </form>

        <p className="text-center mt-6 text-zinc-500">
          Don't have an account? <Link to="/signup" className="text-emerald-600 font-bold hover:underline">Sign Up</Link>
        </p>
      </motion.div>
    </div>
  );
};

const MarathonList = () => {
  const [marathons, setMarathons] = useState<Marathon[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/marathons').then(res => {
      setMarathons(res.data);
      setLoading(false);
    });
  }, []);

  const filtered = marathons.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase()) || 
    m.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-extrabold text-zinc-900 tracking-tight">Upcoming Marathons</h2>
          <p className="text-zinc-500 mt-2">Discover and join events happening near you</p>
        </div>
        <div className="relative group max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search by title or location..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-zinc-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((marathon) => (
            <motion.div
              key={marathon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    {marathon.prize}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">{marathon.title}</h3>
                <p className="text-zinc-500 text-sm line-clamp-2 mb-4">{marathon.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-600 text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{marathon.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(marathon.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600 text-sm">
                    <UserIcon className="w-4 h-4" />
                    <span>Hosted by <span className="font-semibold text-zinc-900">{marathon.hostName}</span></span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-zinc-50 border-t border-zinc-100">
                <Link 
                  to={`/marathons/${marathon.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-zinc-200 text-zinc-900 rounded-lg font-bold hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-all"
                >
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const MarathonDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [marathon, setMarathon] = useState<Marathon | null>(null);
  const { user } = useAuth();
  const [joined, setJoined] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/marathons/${id}`).then(res => {
      setMarathon(res.data);
      if (user && res.data.participants?.some((p: User) => p.id === user.id)) {
        setJoined(true);
      }
    });
  }, [id, user]);

  const handleJoin = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post(`/marathons/${id}/join`);
      setJoined(true);
      // Refresh participants
      const res = await api.get(`/marathons/${id}`);
      setMarathon(res.data);
    } catch (err) {
      alert('Failed to join');
    }
  };

  const handleDeclareWinner = async (winnerId: number) => {
    try {
      await api.post(`/marathons/${id}/winner`, { winnerId });
      const res = await api.get(`/marathons/${id}`);
      setMarathon(res.data);
    } catch (err) {
      alert('Failed to declare winner');
    }
  };

  if (!marathon) return <div className="p-12 text-center">Loading...</div>;

  const isHost = user?.id === marathon.hostedBy;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden">
        <div className="p-8 md:p-12 bg-zinc-900 text-white">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="px-4 py-1 bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest rounded-full">
              Marathon Event
            </span>
            <span className="flex items-center gap-2 text-zinc-400 text-sm">
              <Calendar className="w-4 h-4" />
              {formatDate(marathon.date)}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">{marathon.title}</h1>
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                <MapPin className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Location</p>
                <p className="font-bold">{marathon.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                <Award className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Grand Prize</p>
                <p className="font-bold">{marathon.prize}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-zinc-900 mb-4">About the Event</h2>
              <p className="text-zinc-600 leading-relaxed text-lg whitespace-pre-wrap">{marathon.description}</p>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-zinc-900">Participants</h2>
                <span className="px-3 py-1 bg-zinc-100 text-zinc-600 text-sm font-bold rounded-full">
                  {marathon.participants?.length || 0} Joined
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {marathon.participants?.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-zinc-400 border border-zinc-200">
                        {p.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">{p.name}</p>
                        <p className="text-xs text-zinc-500">{p.instaId}</p>
                      </div>
                    </div>
                    {isHost && !marathon.winnerId && (
                      <button 
                        onClick={() => handleDeclareWinner(p.id)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        Mark Winner
                      </button>
                    )}
                    {marathon.winnerId === p.id && (
                      <div className="flex items-center gap-1 text-yellow-600 font-bold text-xs uppercase tracking-wider">
                        <Trophy className="w-3 h-3" /> Winner
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100">
              <h3 className="font-bold text-zinc-900 mb-4">Registration</h3>
              {marathon.winnerId ? (
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 text-center">
                  <p className="font-bold">Event Completed</p>
                  <p className="text-sm mt-1">Winner has been declared!</p>
                </div>
              ) : joined ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-center">
                  <p className="font-bold">You're In!</p>
                  <p className="text-sm mt-1">See you at the starting line.</p>
                </div>
              ) : (
                <button 
                  onClick={handleJoin}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  Join Marathon
                </button>
              )}
            </div>

            <div className="p-6 border border-zinc-200 rounded-2xl">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-4">Hosted By</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center font-bold text-zinc-400">
                  {marathon.hostName?.[0]}
                </div>
                <div>
                  <p className="font-bold text-zinc-900">{marathon.hostName}</p>
                  <p className="text-sm text-zinc-500">Event Organizer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateMarathon = () => {
  const [formData, setFormData] = useState({ title: '', description: '', date: '', location: '', prize: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/marathons', formData);
      navigate(`/marathons/${data.id}`);
    } catch (err) {
      alert('Failed to create marathon');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-zinc-100"
      >
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-zinc-900">Host a Marathon</h2>
          <p className="text-zinc-500 mt-2">Fill in the details to create your event</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Event Title</label>
              <input 
                type="text" required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. City Summer Run 2026"
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Date</label>
              <input 
                type="date" required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Location</label>
              <input 
                type="text" required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="City, Stadium, or Park"
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Prize Pool</label>
              <input 
                type="text" required
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g. $5000 + Trophy"
                onChange={e => setFormData({...formData, prize: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-zinc-700 mb-2">Description</label>
              <textarea 
                required rows={4}
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                placeholder="Tell participants about the route, rules, and schedule..."
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg">
            Create Event
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ProfilePage = () => {
  const [profile, setProfile] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/users/profile').then(res => setProfile(res.data));
  }, []);

  if (!profile) return <div className="p-12 text-center">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Profile Info */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm sticky top-24">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-lg">
                <UserIcon className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900">{profile.name}</h2>
              <p className="text-emerald-600 font-medium">{profile.instaId}</p>
            </div>
            <div className="space-y-4 pt-6 border-t border-zinc-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Phone</span>
                <span className="font-bold text-zinc-900">{profile.phone}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Wins</span>
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold">{profile.won.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="lg:col-span-3 space-y-8">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <LayoutDashboard className="w-6 h-6 text-zinc-400" />
              <h3 className="text-2xl font-bold text-zinc-900">My Hosted Events</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.hosted.map((m: any) => (
                <Link key={m.id} to={`/marathons/${m.id}`} className="p-6 bg-white rounded-2xl border border-zinc-100 hover:border-emerald-500 transition-all shadow-sm">
                  <h4 className="font-bold text-zinc-900 mb-1">{m.title}</h4>
                  <p className="text-sm text-zinc-500">{m.location} • {formatDate(m.date)}</p>
                </Link>
              ))}
              {profile.hosted.length === 0 && <p className="text-zinc-400 col-span-2 py-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">No events hosted yet.</p>}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-6 h-6 text-zinc-400" />
              <h3 className="text-2xl font-bold text-zinc-900">Participated Marathons</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.participated.map((m: any) => (
                <Link key={m.id} to={`/marathons/${m.id}`} className="p-6 bg-white rounded-2xl border border-zinc-100 hover:border-emerald-500 transition-all shadow-sm">
                  <h4 className="font-bold text-zinc-900 mb-1">{m.title}</h4>
                  <p className="text-sm text-zinc-500">{m.location} • {formatDate(m.date)}</p>
                </Link>
              ))}
              {profile.participated.length === 0 && <p className="text-zinc-400 col-span-2 py-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">No events joined yet.</p>}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h3 className="text-2xl font-bold text-zinc-900">Victories</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.won.map((m: any) => (
                <div key={m.id} className="p-6 bg-yellow-50 rounded-2xl border border-yellow-100 shadow-sm">
                  <h4 className="font-bold text-yellow-900 mb-1">{m.title}</h4>
                  <p className="text-sm text-yellow-700">{m.location} • {formatDate(m.date)}</p>
                </div>
              ))}
              {profile.won.length === 0 && <p className="text-zinc-400 col-span-2 py-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">No wins yet. Keep running!</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// --- Scroll Background Effects ---
const ScrollRunnerBackground = () => {
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const [isResting, setIsResting] = useState(true);
  const [sweatDrops, setSweatDrops] = useState<{ id: number; x: number; y: number }[]>([]);

  useMotionValueEvent(scrollVelocity, "change", (latest) => {
    if (latest > 10) {
      setIsResting(false);
      // Add sweat drop
      if (Math.random() > 0.85) {
        setSweatDrops(prev => [...prev.slice(-15), { id: Date.now(), x: Math.random() * 100, y: -10 }]);
      }
    } else if (latest < -10) {
      setIsResting(true);
      // "Clean" sweat drops when moving up
      setSweatDrops([]);
    } else {
      // Stopped
      const timer = setTimeout(() => {
        if (Math.abs(scrollVelocity.get()) < 5) {
          setIsResting(true);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  });

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {/* Runner Animation */}
      <div className="absolute bottom-12 right-12 md:bottom-24 md:right-24">
        <AnimatePresence mode="wait">
          {!isResting ? (
            <motion.div
              key="running"
              initial={{ opacity: 0, x: 100 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                rotate: [0, -5, 5, 0],
                y: [0, -15, 0]
              }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ 
                rotate: { repeat: Infinity, duration: 0.3 },
                y: { repeat: Infinity, duration: 0.2, ease: "easeInOut" },
                opacity: { duration: 0.2 }
              }}
              className="text-emerald-500 flex flex-col items-center"
            >
              <div className="relative">
                <Users className="w-24 h-24 md:w-40 md:h-40 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="absolute -bottom-2 left-0 w-full h-2 bg-emerald-500/20 blur-md rounded-full"
                />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.3em] mt-2 bg-emerald-500 text-white px-2 py-0.5 rounded">Running</span>
            </motion.div>
          ) : (
            <motion.div
              key="resting"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.4, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-zinc-400 flex flex-col items-center"
            >
              <div className="relative">
                <CircleUser className="w-24 h-24 md:w-40 md:h-40" />
                <div className="absolute -top-4 -right-4 flex gap-1">
                  {[1, 2, 3].map(i => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0, 1, 0], y: [0, -20], x: [0, 10] }}
                      transition={{ repeat: Infinity, duration: 2, delay: i * 0.4 }}
                      className="text-xl font-bold"
                    >
                      Z
                    </motion.span>
                  ))}
                </div>
              </div>
              <span className="text-xs font-black uppercase tracking-[0.3em] mt-2 text-zinc-400">Resting</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sweat Drops */}
      <AnimatePresence>
        {sweatDrops.map((drop) => (
          <motion.div
            key={drop.id}
            initial={{ y: -20, opacity: 0, scaleY: 0.5 }}
            animate={{ y: 1200, opacity: 0.6, scaleY: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "circIn" }}
            className="absolute w-1.5 h-6 bg-blue-400/60 rounded-full blur-[1px]"
            style={{ left: `${drop.x}%` }}
          />
        ))}
      </AnimatePresence>

      {/* Background Text */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
        <motion.h1 
          animate={{ scale: isResting ? 1 : 1.1 }}
          className="text-[35vw] font-black uppercase tracking-tighter rotate-[-5deg] transition-transform duration-700"
        >
          {isResting ? "REST" : "RUN"}
        </motion.h1>
      </div>
    </div>
  );
};

const Leaderboard = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    api.get('/leaderboard').then(res => {
      const realData = res.data;
      // Add fake participants to reach 11 if needed
      const fakeParticipants = [
        { id: -1, name: "Alex Rivera", instaId: "@arivera_runs", wins: 15 },
        { id: -2, name: "Sarah Chen", instaId: "@sarah_sprints", wins: 12 },
        { id: -3, name: "Marcus Thorne", instaId: "@mthorne_elite", wins: 10 },
        { id: -4, name: "Elena Gomez", instaId: "@elena_marathon", wins: 9 },
        { id: -5, name: "David Kim", instaId: "@dk_runner", wins: 8 },
        { id: -6, name: "Jessica Wu", instaId: "@jess_runs_fast", wins: 7 },
        { id: -7, name: "Ryan Miller", instaId: "@ryan_miles", wins: 6 },
        { id: -8, name: "Chloe Smith", instaId: "@chloe_active", wins: 5 },
        { id: -9, name: "Tom Baker", instaId: "@tom_trails", wins: 4 },
        { id: -10, name: "Lisa Wong", instaId: "@lisa_wong_run", wins: 3 },
        { id: -11, name: "Kevin Hart", instaId: "@kevin_marathon", wins: 2 },
      ];
      
      // Merge and sort
      const combined = [...realData, ...fakeParticipants]
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 11);
        
      setData(combined);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-zinc-900 tracking-tight">Global Leaderboard</h2>
        <p className="text-zinc-500 mt-2">The fastest and most consistent athletes in the network</p>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Rank</th>
              <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Athlete</th>
              <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Instagram</th>
              <th className="px-8 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Wins</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {data.map((user, index) => (
              <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                <td className="px-8 py-6">
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                    index === 0 ? "bg-yellow-100 text-yellow-700" : 
                    index === 1 ? "bg-zinc-200 text-zinc-700" :
                    index === 2 ? "bg-orange-100 text-orange-700" : "text-zinc-400"
                  )}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-8 py-6 font-bold text-zinc-900">{user.name}</td>
                <td className="px-8 py-6 text-emerald-600 font-medium">{user.instaId}</td>
                <td className="px-8 py-6 text-right">
                  <span className="px-3 py-1 bg-zinc-100 text-zinc-900 font-black rounded-lg">
                    {user.wins}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import { useParams } from 'react-router-dom';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white font-sans text-zinc-900 selection:bg-emerald-100 selection:text-emerald-900">
          <ScrollRunnerBackground />
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/marathons" element={<MarathonList />} />
              <Route path="/marathons/:id" element={<MarathonDetails />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/create" element={<ProtectedRoute><CreateMarathon /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            </Routes>
          </main>
          <footer className="bg-zinc-50 border-t border-zinc-100 py-12 mt-24">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-emerald-600" />
                <span className="text-xl font-bold text-zinc-900">RunHost</span>
              </div>
              <p className="text-zinc-500 text-sm">© 2026 RunHost. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
