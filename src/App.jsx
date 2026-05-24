import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Calendar as CalendarIcon, DollarSign, Settings, 
  Menu, X, Plus, Edit2, Trash2, CheckCircle, XCircle, 
  AlertCircle, Clock, FileText, Printer, LogOut, Moon, Sun, Search,
  Lock, Mail, User, Phone, Check, ArrowLeft, Upload, Image as ImageIcon,
  CheckSquare, Activity
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  setDoc,
  getDocs
} from 'firebase/firestore';

// Aapke Firebase real credentials yahan shamil kar diye gaye hain!
const firebaseConfig = {
  apiKey: "AIzaSyDEZvMAuLv-yI9UPGBHyWdjHaSrtcdIlws",
  authDomain: "school-portal-fc749.firebaseapp.com",
  projectId: "school-portal-fc749",
  storageBucket: "school-portal-fc749.firebasestorage.app",
  messagingSenderId: "641402900709",
  appId: "1:641402900709:web:7ef99869ac79be19f1040c",
  measurementId: "G-99YQBEY85K"
};

let db = null;
let isFirebaseConnected = false;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseConnected = true;
    console.log("Firebase connected successfully!");
  } else {
    console.log("Firebase config not set. Using secure Local Storage fallback.");
  }
} catch (error) {
  console.warn("Firebase connection failed, falling back to Local Storage mode:", error);
}

// --- MOCK INITIAL SEED DATA ---
const initialTeachers = [
  { id: '1', name: 'Ahmad Khan', phone: '03001234567', email: 'ahmad@school.edu.pk', subject: 'Mathematics', jam: '9th Grade', monthlySalary: 45000, joiningDate: '2023-01-15', status: 'Active', profilePhoto: null },
  { id: '2', name: 'Sara Ali', phone: '03339876543', email: 'sara@school.edu.pk', subject: 'Physics', jam: '10th Grade', monthlySalary: 48000, joiningDate: '2022-08-01', status: 'Active', profilePhoto: null },
  { id: '3', name: 'Usman Tariq', phone: '03451122334', email: 'usman@school.edu.pk', subject: 'English', jam: '8th Grade', monthlySalary: 40000, joiningDate: '2024-02-10', status: 'Active', profilePhoto: null }
];

const initialAdmins = [
  { email: 'admin@school.com', password: 'admin123', name: 'School Admin' }
];

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Yeh wrapper functions automatic stream control karti hain (Firebase ya Local Storage)
const dbSync = {
  subscribeToCollection: (collectionName, fallbackData, callback) => {
    if (isFirebaseConnected && db) {
      const q = query(collection(db, collectionName));
      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(list);
      }, (err) => {
        console.error(`Error reading ${collectionName} from Firebase:`, err);
        callback(fallbackData);
      });
    } else {
      // Local Storage Mode
      const localData = localStorage.getItem(`tms_${collectionName}`);
      if (localData) {
        callback(JSON.parse(localData));
      } else {
        localStorage.setItem(`tms_${collectionName}`, JSON.stringify(fallbackData));
        callback(fallbackData);
      }
      return () => {};
    }
  },

  addItem: async (collectionName, item) => {
    if (isFirebaseConnected && db) {
      const docRef = await addDoc(collection(db, collectionName), item);
      return docRef.id;
    } else {
      const localData = JSON.parse(localStorage.getItem(`tms_${collectionName}`) || '[]');
      const newItem = { id: Date.now().toString(), ...item };
      const updated = [...localData, newItem];
      localStorage.setItem(`tms_${collectionName}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('local_db_update'));
      return newItem.id;
    }
  },

  updateItem: async (collectionName, itemId, updatedFields) => {
    if (isFirebaseConnected && db) {
      await updateDoc(doc(db, collectionName, itemId), updatedFields);
    } else {
      const localData = JSON.parse(localStorage.getItem(`tms_${collectionName}`) || '[]');
      const updated = localData.map(item => item.id === itemId ? { ...item, ...updatedFields } : item);
      localStorage.setItem(`tms_${collectionName}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('local_db_update'));
    }
  },

  deleteItem: async (collectionName, itemId) => {
    if (isFirebaseConnected && db) {
      await deleteDoc(doc(db, collectionName, itemId));
    } else {
      const localData = JSON.parse(localStorage.getItem(`tms_${collectionName}`) || '[]');
      const updated = localData.filter(item => item.id !== itemId);
      localStorage.setItem(`tms_${collectionName}`, JSON.stringify(updated));
      window.dispatchEvent(new Event('local_db_update'));
    }
  }
};

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useLocalStorage('tms_auth', false);
  const [currentUser, setCurrentUser] = useLocalStorage('tms_user', null);
  const [theme, setTheme] = useLocalStorage('tms_theme', 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {!isAuthenticated ? (
        <AuthContainer 
          onLogin={(user) => {
            setIsAuthenticated(true);
            setCurrentUser(user);
          }} 
          theme={theme} 
          toggleTheme={toggleTheme} 
        />
      ) : (
        <MainDashboard 
          onLogout={() => {
            setIsAuthenticated(false);
            setCurrentUser(null);
          }} 
          currentUser={currentUser}
          theme={theme} 
          toggleTheme={toggleTheme} 
        />
      )}
    </div>
  );
}

function NotificationToast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl shadow-xl border animate-bounce ${
      type === 'success' 
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-300'
        : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-300'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="font-medium text-sm">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full"><X size={14}/></button>
    </div>
  );
}

function AuthContainer({ onLogin, theme, toggleTheme }) {
  const [authView, setAuthView] = useState('signin'); 
  const [admins, setAdmins] = useLocalStorage('tms_admins', initialAdmins);
  const [rememberMeCreds, setRememberMeCreds] = useLocalStorage('tms_remember_me', null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200 px-4 relative">
      <div className="absolute top-4 right-4">
        <button onClick={toggleTheme} className="p-2.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-all hover:scale-105">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 transition-all">
        {authView === 'signin' && (
          <SignInForm 
            onLogin={onLogin} 
            setAuthView={setAuthView} 
            admins={admins} 
            rememberMeCreds={rememberMeCreds}
            setRememberMeCreds={setRememberMeCreds}
          />
        )}
        {authView === 'signup' && (
          <SignUpForm 
            setAuthView={setAuthView} 
            admins={admins} 
            setAdmins={setAdmins} 
          />
        )}
        {authView === 'forgot' && (
          <ForgotPasswordForm 
            setAuthView={setAuthView} 
            admins={admins} 
            setAdmins={setAdmins}
          />
        )}
      </div>
    </div>
  );
}

function SignInForm({ onLogin, setAuthView, admins, rememberMeCreds, setRememberMeCreds }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rememberMeCreds) {
      setEmail(rememberMeCreds.email);
      setPassword(rememberMeCreds.password);
      setRememberMe(true);
    }
  }, [rememberMeCreds]);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    const matchedAdmin = admins.find(admin => admin.email.toLowerCase() === email.toLowerCase() && admin.password === password);
    if (matchedAdmin) {
      if (rememberMe) {
        setRememberMeCreds({ email, password });
      } else {
        setRememberMeCreds(null);
      }
      onLogin(matchedAdmin);
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 mb-4 text-blue-600 dark:text-blue-400">
          <Users className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">EduManage Portal Access</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl text-sm border border-rose-200 dark:border-rose-800/50 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="email" 
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@school.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="password" 
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="text-gray-600 dark:text-gray-400">Remember Me</span>
          </label>
          <button 
            type="button" 
            onClick={() => setAuthView('forgot')}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Forgot Password?
          </button>
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25">
          Sign In
        </button>
      </form>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{' '}
          <button onClick={() => setAuthView('signup')} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}

function SignUpForm({ setAuthView, admins, setAdmins }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignUp = (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const emailExists = admins.some(admin => admin.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      setError('An account with this email already exists.');
      return;
    }

    const newAdmin = { name, email: email.toLowerCase(), password };
    setAdmins([...admins, newAdmin]);
    setSuccess(true);
    setTimeout(() => {
      setAuthView('signin');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">Register as a school administrator</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl text-sm border border-rose-200 dark:border-rose-800/50 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm border border-emerald-200 dark:border-emerald-800/50 flex items-center space-x-2">
          <Check size={16} />
          <span>Account created successfully! Redirecting to Sign In...</span>
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Professor Ali"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="email" 
              required
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ali@school.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Confirm</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/10">
          Register Administrator
        </button>
      </form>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 text-center">
        <button onClick={() => setAuthView('signin')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm flex items-center justify-center space-x-1 mx-auto font-medium">
          <ArrowLeft size={16} /> <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
}

function ForgotPasswordForm({ setAuthView, admins, setAdmins }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); 
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const simulatedOTP = "123456"; 

  const handleSendOTP = (e) => {
    e.preventDefault();
    setError('');
    const matchedAdmin = admins.find(admin => admin.email.toLowerCase() === email.toLowerCase());
    if (!matchedAdmin) {
      setError('This email is not registered with any admin account.');
      return;
    }
    setInfoMessage(`A security simulation reset OTP has been triggered. Please use simulated OTP: ${simulatedOTP}`);
    setStep(2);
  };

  const handleVerifyOTP = (e) => {
    e.preventDefault();
    setError('');
    if (otp !== simulatedOTP) {
      setError('Incorrect OTP. Try entering 123456');
      return;
    }
    setInfoMessage('');
    setStep(3);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    const updatedAdmins = admins.map(admin => {
      if (admin.email.toLowerCase() === email.toLowerCase()) {
        return { ...admin, password: newPassword };
      }
      return admin;
    });

    setAdmins(updatedAdmins);
    setInfoMessage('Password updated successfully! Redirecting...');
    setTimeout(() => {
      setAuthView('signin');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recover Password</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1.5 text-sm">Step {step} of 3</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl text-sm border border-rose-200 dark:border-rose-800/50 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm border border-blue-200 dark:border-blue-800/50">
          {infoMessage}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Register Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@school.com"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all">
            Send Recovery Code
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Enter 6-Digit OTP</label>
            <input 
              type="text" 
              required
              maxLength="6"
              className="w-full text-center tracking-widest text-xl font-bold py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all">
            Verify Code
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">New Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">Confirm New Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all">
            Update Password
          </button>
        </form>
      )}

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 text-center">
        <button onClick={() => setAuthView('signin')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm flex items-center justify-center space-x-1 mx-auto font-medium">
          <ArrowLeft size={16} /> <span>Back to Sign In</span>
        </button>
      </div>
    </div>
  );
}

function MainDashboard({ onLogout, currentUser, theme, toggleTheme }) {
  const [teachers, setTeachers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [localUpdateTrigger, setLocalUpdateTrigger] = useState(0);

  // Synchronizing Cloud/Local Data Stream on mount and updates
  useEffect(() => {
    const unsubTeachers = dbSync.subscribeToCollection('teachers', initialTeachers, (data) => {
      setTeachers(data);
    });
    const unsubAttendance = dbSync.subscribeToCollection('attendance', [], (data) => {
      setAttendance(data);
    });

    const handleLocalUpdate = () => {
      setLocalUpdateTrigger(prev => prev + 1);
    };

    window.addEventListener('local_db_update', handleLocalUpdate);

    return () => {
      unsubTeachers();
      unsubAttendance();
      window.removeEventListener('local_db_update', handleLocalUpdate);
    };
  }, [localUpdateTrigger]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: CalendarIcon },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'salary', label: 'Salary & Payroll', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 print:hidden">
        <div className="p-6 flex items-center space-x-3 border-b border-gray-100 dark:border-gray-700">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold block leading-none">EduManage</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">School Admin Portal</span>
          </div>
        </div>
        
        {/* Connection Status indicator */}
        <div className="px-4 pt-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            isFirebaseConnected 
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
          }`}>
            <Activity size={14} className={isFirebaseConnected ? 'animate-pulse' : ''} />
            <span>{isFirebaseConnected ? 'Cloud Sync Online' : 'Device Storage Mode'}</span>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 mx-4 my-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Signed In As</p>
          <p className="font-bold text-sm text-gray-800 dark:text-gray-200 mt-0.5 truncate">{currentUser?.name || "School Administrator"}</p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-semibold' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/60'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button onClick={toggleTheme} className="w-full flex items-center space-x-3 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg">
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-50 print:hidden">
        <span className="text-xl font-bold">EduManage</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40 print:hidden shadow-lg">
          <nav className="p-4 space-y-2">
            <div className="px-4 py-2 border-b dark:border-gray-700 mb-2">
              <span className="text-xs text-gray-400">User Profile</span>
              <p className="font-bold text-gray-850 dark:text-white">{currentUser?.name || "School Administrator"}</p>
            </div>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg ${
                  activeTab === item.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
            <button onClick={onLogout} className="w-full flex items-center space-x-3 px-4 py-3 text-red-600">
              <LogOut size={20} />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 md:mt-0 print:m-0 print:p-0">
        <div className="max-w-6xl mx-auto print:max-w-none">
          {activeTab === 'dashboard' && <DashboardView teachers={teachers} attendance={attendance} />}
          {activeTab === 'teachers' && <TeachersView teachers={teachers} />}
          {activeTab === 'attendance' && <AttendanceView teachers={teachers} attendance={attendance} />}
          {activeTab === 'salary' && <SalaryView teachers={teachers} attendance={attendance} />}
        </div>
      </main>
    </div>
  );
}

function DashboardView({ teachers, attendance }) {
  const today = getTodayString();
  const activeTeachers = teachers.filter(t => t.status === 'Active');
  
  const todaysAttendance = attendance.filter(a => a.date === today);
  const presentCount = todaysAttendance.filter(a => a.status === 'Present').length;
  const absentCount = todaysAttendance.filter(a => a.status === 'Absent' || a.status === 'Leave').length;
  const unmarkedCount = activeTeachers.length - todaysAttendance.length;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const notifications = useMemo(() => {
    const alerts = [];
    activeTeachers.forEach(teacher => {
      const leavesThisMonth = attendance.filter(a => 
        a.teacherId === teacher.id && 
        a.date.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`) &&
        (a.status === 'Leave' || a.status === 'Absent' || a.status === 'Half Day')
      );
      
      let leaveScore = 0;
      leavesThisMonth.forEach(l => {
        if (l.status === 'Half Day') leaveScore += 0.5;
        else leaveScore += 1;
      });

      if (leaveScore > 2) {
        alerts.push(`${teacher.name} has exceeded paid leaves (${leaveScore} taken). Salary deductions will apply.`);
      }
    });
    return alerts;
  }, [attendance, activeTeachers, currentMonth, currentYear]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Teachers" value={activeTeachers.length} icon={Users} color="bg-blue-500" />
        <StatCard title="Present Today" value={presentCount} icon={CheckCircle} color="bg-emerald-500" />
        <StatCard title="Absent/Leave" value={absentCount} icon={XCircle} color="bg-rose-500" />
        <StatCard title="Pending Marking" value={unmarkedCount} icon={Clock} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center space-x-4">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full dark:bg-indigo-900/50 dark:text-indigo-400">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-medium">Biometric Sync</h3>
                  <p className="text-xs text-gray-500">Auto synchronized</p>
                </div>
             </div>
             <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center space-x-4">
                <div className="p-3 bg-teal-100 text-teal-600 rounded-full dark:bg-teal-900/50 dark:text-teal-400">
                  <CheckSquare size={24} />
                </div>
                <div>
                  <h3 className="font-medium">Direct Attendance</h3>
                  <p className="text-xs text-gray-500">Bulk register active</p>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center"><AlertCircle className="w-5 h-5 mr-2 text-amber-500"/> System Alerts</h2>
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((note, idx) => (
                <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm rounded-lg border border-amber-200 dark:border-amber-800/50">
                  {note}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No active alerts at this time.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center space-x-4">
      <div className={`${color} text-white p-3 rounded-lg`}>
        <Icon size={24} />
      </div>
      <div>
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function FormPhotoUpload({ profilePhoto, setProfilePhoto, error, setError }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Accept only PNG, JPG, JPEG, or WEBP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Maximum image size allowed is 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-2 pb-2">
      <div className="relative group w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 overflow-hidden shadow transition-all duration-300">
        {profilePhoto ? (
          <img src={profilePhoto} alt="Preview" className="w-full h-full object-cover transition-transform duration-300 transform group-hover:scale-105" />
        ) : (
          <div className="text-center text-gray-400">
            <ImageIcon className="mx-auto mb-1" size={24} />
            <span className="text-[10px] block">No Photo</span>
          </div>
        )}
        <div 
          onClick={() => fileInputRef.current.click()}
          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer duration-200"
        >
          <Upload className="text-white w-5 h-5" />
        </div>
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/png, image/jpeg, image/jpg, image/webp" 
        onChange={handleFileChange} 
      />
      {profilePhoto ? (
        <button 
          type="button" 
          onClick={() => setProfilePhoto(null)} 
          className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
        >
          Remove Photo
        </button>
      ) : (
        <span className="text-xs text-gray-400">Profile Picture (Max 2MB)</span>
      )}
      {error && <span className="text-xs text-rose-500 font-medium text-center">{error}</span>}
    </div>
  );
}

function TeachersView({ teachers }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imgError, setImgError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', subject: '', jam: '', monthlySalary: '', joiningDate: '', status: 'Active', profilePhoto: null
  });

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (teacher = null) => {
    setImgError('');
    if (teacher) {
      setFormData(teacher);
      setEditingId(teacher.id);
    } else {
      setFormData({ name: '', phone: '', email: '', subject: '', jam: '', monthlySalary: '', joiningDate: '', status: 'Active', profilePhoto: null });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await dbSync.updateItem('teachers', editingId, formData);
        setToast({ message: 'Teacher updated successfully!', type: 'success' });
      } else {
        await dbSync.addItem('teachers', formData);
        setToast({ message: 'Teacher added successfully!', type: 'success' });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error storing details in database: ", error);
      setToast({ message: 'Operation failed. Try again.', type: 'error' });
    }
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      try {
        await dbSync.deleteItem('teachers', showDeleteConfirm);
        setToast({ message: 'Teacher removed successfully.', type: 'success' });
      } catch (error) {
        setToast({ message: 'Error deleting teacher.', type: 'error' });
      }
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Manage Staff</h1>
        <div className="flex w-full sm:w-auto space-x-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search teachers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={() => openModal()} className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
            <Plus size={18} /> <span>Add Teacher</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 font-semibold text-sm">Profile</th>
                <th className="px-6 py-4 font-semibold text-sm">Name</th>
                <th className="px-6 py-4 font-semibold text-sm">Subject</th>
                <th className="px-6 py-4 font-semibold text-sm">Jam (Class)</th>
                <th className="px-6 py-4 font-semibold text-sm">Contact</th>
                <th className="px-6 py-4 font-semibold text-sm">Salary (PKR)</th>
                <th className="px-6 py-4 font-semibold text-sm">Status</th>
                <th className="px-6 py-4 font-semibold text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTeachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    {teacher.profilePhoto ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shadow-sm">
                        <img src={teacher.profilePhoto} className="w-full h-full object-cover" alt="Profile" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold shadow-sm">
                        {teacher.name.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{teacher.name}</div>
                    <div className="text-xs text-gray-500">Joined: {teacher.joiningDate}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {teacher.subject}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">{teacher.jam || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>{teacher.phone}</div>
                    <div className="text-xs">{teacher.email}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">Rs. {Number(teacher.monthlySalary).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      teacher.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {teacher.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openModal(teacher)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(teacher.id)} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">No teachers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this teacher? This action is permanent.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Teacher' : 'Add New Teacher'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <FormPhotoUpload 
                profilePhoto={formData.profilePhoto} 
                setProfilePhoto={(img) => setFormData({...formData, profilePhoto: img})} 
                error={imgError}
                setError={setImgError}
              />

              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input required type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input required type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <input required type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.subject || ''} onChange={e => setFormData({...formData, subject: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Jam (Class)</label>
                  <input placeholder="e.g. 9th Grade" type="text" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.jam || ''} onChange={e => setFormData({...formData, jam: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Monthly Salary (PKR)</label>
                  <input required type="number" min="0" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.monthlySalary || ''} onChange={e => setFormData({...formData, monthlySalary: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Joining Date</label>
                  <input required type="date" className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.joiningDate || ''} onChange={e => setFormData({...formData, joiningDate: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500" value={formData.status || 'Active'} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-4 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Teacher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceView({ teachers, attendance }) {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [toast, setToast] = useState(null);
  const activeTeachers = teachers.filter(t => t.status === 'Active');

  const handleStatusChange = async (teacherId, status) => {
    const record = attendance.find(a => a.teacherId === teacherId && a.date === selectedDate);
    try {
      if (record) {
        await dbSync.updateItem('attendance', record.id, { status });
      } else {
        await dbSync.addItem('attendance', { teacherId, date: selectedDate, status });
      }
      setToast({ message: 'Attendance status updated.', type: 'success' });
    } catch (err) {
      console.error("Attendance writing failed: ", err);
      setToast({ message: 'Error marking attendance.', type: 'error' });
    }
  };

  const getStatus = (teacherId) => {
    const record = attendance.find(a => a.teacherId === teacherId && a.date === selectedDate);
    return record ? record.status : '';
  };

  const markAll = async (status) => {
    try {
      for (const teacher of activeTeachers) {
        const record = attendance.find(a => a.teacherId === teacher.id && a.date === selectedDate);
        if (record) {
          await dbSync.updateItem('attendance', record.id, { status });
        } else {
          await dbSync.addItem('attendance', { teacherId: teacher.id, date: selectedDate, status });
        }
      }
      setToast({ message: `Successfully marked all as ${status}!`, type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ message: 'Error updating multiple registers.', type: 'error' });
    }
  };

  const statuses = [
    { value: 'Present', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50' },
    { value: 'Absent', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50' },
    { value: 'Late', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50' },
    { value: 'Half Day', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50' },
    { value: 'Leave', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold">Daily Attendance</h1>
          <p className="text-sm text-gray-500">Select date and mark staff status</p>
        </div>
        <div className="flex items-center space-x-4">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <h2 className="font-semibold">Staff List ({activeTeachers.length})</h2>
          <div className="space-x-2 text-sm">
            <span className="text-gray-500 hidden sm:inline-block">Quick Mark All:</span>
            <button onClick={() => markAll('Present')} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-md hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 transition-colors">Present</button>
            <button onClick={() => markAll('Absent')} className="px-3 py-1 bg-rose-100 text-rose-800 rounded-md hover:bg-rose-200 dark:bg-rose-900/50 dark:text-rose-300 transition-colors">Absent</button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {activeTeachers.map(teacher => {
            const currentStatus = getStatus(teacher.id);
            return (
              <div key={teacher.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors gap-4">
                <div className="flex items-center space-x-3">
                  {teacher.profilePhoto ? (
                    <img src={teacher.profilePhoto} className="w-10 h-10 rounded-full object-cover shadow border border-gray-100" alt="Attendance Avatar" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold shadow-sm">
                      {teacher.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{teacher.name}</div>
                    <div className="text-xs text-gray-500">{teacher.subject} {teacher.jam ? `(${teacher.jam})` : ''}</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {statuses.map(s => (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(teacher.id, s.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        currentStatus === s.value 
                          ? `${s.color} ring-2 ring-offset-1 ring-opacity-50 ring-blue-500 dark:ring-offset-gray-800` 
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                      }`}
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {activeTeachers.length === 0 && (
            <div className="p-8 text-center text-gray-500">No active teachers found. Add teachers first.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SalaryView({ teachers, attendance }) {
  const currentYear = new Date().getFullYear(); 

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [slipData, setSlipData] = useState(null); 

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const calculatePayroll = () => {
    const activeTeachers = teachers.filter(t => t.status === 'Active');
    const daysInMonth = new Date(year, month, 0).getDate();
    
    return activeTeachers.map(teacher => {
      const recordsThisMonth = attendance.filter(a => 
        a.teacherId === teacher.id && 
        a.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)
      );

      let leaveScore = 0; 
      let presentDays = 0;

      recordsThisMonth.forEach(record => {
        if (record.status === 'Leave' || record.status === 'Absent') leaveScore += 1;
        else if (record.status === 'Half Day') leaveScore += 0.5;
        else if (record.status === 'Present' || record.status === 'Late') presentDays += 1; 
      });

      const paidLeavesAllowed = 2;
      const paidLeavesUsed = Math.min(leaveScore, paidLeavesAllowed);
      const extraUnpaidLeaves = Math.max(leaveScore - paidLeavesAllowed, 0);

      const perDaySalary = teacher.monthlySalary / daysInMonth;
      const deductionAmount = extraUnpaidLeaves * perDaySalary;
      const finalSalary = teacher.monthlySalary - deductionAmount;

      return {
        ...teacher,
        daysInMonth,
        presentDays,
        totalLeavesTaken: leaveScore,
        paidLeavesUsed,
        extraUnpaidLeaves,
        perDaySalary,
        deductionAmount,
        finalSalary
      };
    });
  };

  const payrollData = calculatePayroll();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Payroll & Salary</h1>
          <p className="text-sm text-gray-500">Auto-calculation based on leave policy (2 paid leaves/month)</p>
        </div>
        <div className="flex space-x-3 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
          <select 
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium dark:text-white"
          >
            {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-transparent border-none focus:ring-0 text-sm font-medium dark:text-white border-l border-gray-300 dark:border-gray-600 pl-3"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-4 font-semibold">Teacher</th>
                <th className="px-4 py-4 font-semibold text-right">Base Salary</th>
                <th className="px-4 py-4 font-semibold text-center bg-gray-50/10">Leaves Taken</th>
                <th className="px-4 py-4 font-semibold text-center text-emerald-600">Paid Lvs Used</th>
                <th className="px-4 py-4 font-semibold text-center text-rose-600">Unpaid Lvs</th>
                <th className="px-4 py-4 font-semibold text-right text-rose-600">Deduction</th>
                <th className="px-4 py-4 font-semibold text-right text-blue-600 font-bold">Net Payable</th>
                <th className="px-4 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {payrollData.map((data, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-4 font-medium flex items-center gap-2">
                    {data.profilePhoto ? (
                      <img src={data.profilePhoto} className="w-8 h-8 rounded-full object-cover shadow border" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-600 shadow-sm">{data.name.charAt(0)}</div>
                    )}
                    <span>{data.name}</span>
                  </td>
                  <td className="px-4 py-4 text-right">Rs. {Number(data.monthlySalary).toLocaleString()}</td>
                  <td className="px-4 py-4 text-center font-medium bg-gray-50/50 dark:bg-gray-800/50">{data.totalLeavesTaken}</td>
                  <td className="px-4 py-4 text-center text-emerald-600">{data.paidLeavesUsed}</td>
                  <td className="px-4 py-4 text-center text-rose-600 font-medium">{data.extraUnpaidLeaves > 0 ? data.extraUnpaidLeaves : '-'}</td>
                  <td className="px-4 py-4 text-right text-rose-600">{data.deductionAmount > 0 ? `-Rs. ${Math.round(data.deductionAmount).toLocaleString()}` : '-'}</td>
                  <td className="px-4 py-4 text-right font-bold text-blue-600 dark:text-blue-400 text-lg">Rs. {Math.round(data.finalSalary).toLocaleString()}</td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => setSlipData(data)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded text-sm transition-colors"
                    >
                      <FileText size={14} /> <span>Slip</span>
                    </button>
                  </td>
                </tr>
              ))}
              {payrollData.length === 0 && (
                <tr><td colSpan="8" className="p-8 text-center text-gray-500">No active teachers to generate payroll for.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {slipData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white print:block print:relative print:z-auto">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:w-full print:max-w-none print:dark:bg-white print:text-black">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 print:hidden">
              <h2 className="font-bold text-lg">Salary Slip Preview</h2>
              <div className="flex space-x-3">
                <button onClick={() => window.print()} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  <Printer size={18} /> <span>Print PDF</span>
                </button>
                <button onClick={() => setSlipData(null)} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-8 print:p-10 text-gray-900 print:text-black">
              <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
                <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900 print:text-black dark:text-white">EduManage Institute</h1>
                <p className="text-gray-500 dark:text-gray-400 print:text-gray-600 mt-1">123 Education Lane, City Center</p>
                <h2 className="text-xl font-semibold mt-4 text-blue-600 dark:text-blue-400 print:text-black bg-blue-50 dark:bg-blue-900/20 print:bg-gray-100 inline-block px-6 py-2 rounded-full font-bold">
                  Salary Slip - {months[month-1]} {year}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 dark:bg-gray-700/30 print:bg-transparent p-4 rounded-lg border border-gray-200 dark:border-gray-600 print:border-none items-center">
                <div className="flex items-center gap-4 col-span-2 sm:col-span-1">
                  {slipData.profilePhoto ? (
                    <img src={slipData.profilePhoto} className="w-20 h-20 rounded-full object-cover shadow border-2 border-blue-500" alt="Teacher Slip" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center font-bold text-3xl text-blue-600 shadow-sm">
                      {slipData.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 mb-0.5">Employee Name</p>
                    <p className="font-bold text-lg dark:text-white print:text-black">{slipData.name}</p>
                    {slipData.jam && <p className="text-xs text-gray-400 font-medium">Class: {slipData.jam}</p>}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 mb-1">Designation/Subject</p>
                  <p className="font-semibold dark:text-white print:text-black">{slipData.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 mb-1">Employee ID</p>
                  <p className="font-semibold dark:text-white print:text-black">EMP-{slipData.id.slice(-4)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 mb-1">Joining Date</p>
                  <p className="font-semibold dark:text-white print:text-black">{slipData.joiningDate}</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-bold border-b border-gray-200 dark:border-gray-700 print:border-gray-300 pb-2 mb-4 dark:text-white print:text-black">Attendance Summary</h3>
                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 print:bg-gray-50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-600">Total Days</p>
                    <p className="font-bold text-xl dark:text-white print:text-black">{slipData.daysInMonth}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-600">Leaves Taken</p>
                    <p className="font-bold text-xl dark:text-white print:text-black">{slipData.totalLeavesTaken}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-emerald-600 print:text-black">Paid Leaves</p>
                    <p className="font-bold text-xl text-emerald-600 print:text-black">{slipData.paidLeavesUsed} <span className="text-xs font-normal">(of 2)</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-rose-600 print:text-black">Unpaid Leaves</p>
                    <p className="font-bold text-xl text-rose-600 print:text-black">{slipData.extraUnpaidLeaves}</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                 <h3 className="font-bold border-b border-gray-200 dark:border-gray-700 print:border-gray-300 pb-2 mb-4 dark:text-white print:text-black">Earnings & Deductions</h3>
                 <table className="w-full text-left">
                   <tbody>
                     <tr className="border-b border-gray-100 dark:border-gray-700 print:border-gray-200">
                       <td className="py-3 dark:text-white print:text-black">Basic Salary</td>
                       <td className="py-3 text-right font-medium dark:text-white print:text-black">PKR {Number(slipData.monthlySalary).toLocaleString()}</td>
                     </tr>
                     {slipData.extraUnpaidLeaves > 0 && (
                       <tr className="border-b border-gray-100 dark:border-gray-700 print:border-gray-200 text-rose-600 print:text-black">
                         <td className="py-3">
                           Leave Deductions <br/>
                           <span className="text-xs text-gray-500 print:text-gray-600">({slipData.extraUnpaidLeaves} days @ PKR {Math.round(slipData.perDaySalary).toLocaleString()}/day)</span>
                         </td>
                         <td className="py-3 text-right font-medium">- PKR {Math.round(slipData.deductionAmount).toLocaleString()}</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
              </div>

              <div className="bg-gray-900 text-white print:bg-gray-100 print:text-black p-4 rounded-lg flex justify-between items-center mb-12">
                <span className="font-bold text-lg">Net Payable Amount</span>
                <span className="font-bold text-2xl">PKR {Math.round(slipData.finalSalary).toLocaleString()}</span>
              </div>

              <div className="flex justify-between mt-16 pt-8 border-t border-gray-200 print:border-gray-300">
                <div className="text-center w-40">
                  <div className="border-b border-gray-400 print:border-gray-600 mb-2 h-8"></div>
                  <p className="text-sm font-medium dark:text-gray-300 print:text-gray-600">Employee Signature</p>
                </div>
                <div className="text-center w-40">
                  <div className="border-b border-gray-400 print:border-gray-600 mb-2 h-8"></div>
                  <p className="text-sm font-medium dark:text-gray-300 print:text-gray-600">Director/Admin</p>
                </div>
              </div>

              <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t">
                Generated automatically by EduManage Payroll System on {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}