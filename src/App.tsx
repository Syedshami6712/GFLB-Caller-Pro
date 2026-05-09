/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import { useState, useEffect } from 'react';
import {
  Phone, Users, LayoutDashboard, Settings, Search,
  PhoneCall, PhoneOff, MicOff, MessageSquare, Mail,
  FileText, Copy, CheckCircle2, GraduationCap,
  ChevronLeft, X, Plus, Trash2, Edit3, UserPlus, FastForward, Power, Download, FolderPlus, Cloud, LogOut, Bell, Save,
  Grid3x3, Delete, History, Database, Shield, Upload, FileSpreadsheet
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { studentsData, type Student, type PhoneNumber } from './data';
import gflbLogo from './assets/GFLB LOGO.png';
import defaultAvatar from './assets/default_avatar.png';
import './App.css';

type CallLog = {
  id: string;
  studentName: string;
  phoneNumber: string;
  duration: number;
  timestamp: Date;
  status: 'completed' | 'missed';
};

type Drive = {
  id: string;
  name: string;
  description: string;
  contactIds: string[];
  status: 'active' | 'completed' | 'draft';
};

const initialDrives: Drive[] = [
  { id: 'd1', name: 'B.Tech Lateral Entry 2026', description: 'Targeting polytechnic students from northern regions.', contactIds: ['s1', 's2'], status: 'active' },
  { id: 'd2', name: 'MBA Working Professionals', description: 'Executive MBA follow-ups.', contactIds: ['s3'], status: 'completed' },
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('ksk_auth') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('ksk_students');
    let parsed = saved ? JSON.parse(saved) : studentsData;
    parsed = parsed.map((s: Student) => ({
      ...s,
      avatar: !s.avatar || s.avatar.includes('ui-avatars.com') ? defaultAvatar : s.avatar
    }));
    return parsed;
  });
  const [activeStudent, setActiveStudent] = useState<Student>(() => {
    const saved = localStorage.getItem('ksk_students');
    let parsed = saved ? JSON.parse(saved) : studentsData;
    parsed = parsed.map((s: Student) => ({
      ...s,
      avatar: !s.avatar || s.avatar.includes('ui-avatars.com') ? defaultAvatar : s.avatar
    }));
    return parsed.length > 0 ? parsed[0] : studentsData[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [driveSearchTerm, setDriveSearchTerm] = useState('');
  const [driveContactSearchTerm, setDriveContactSearchTerm] = useState('');

  // Navigation State
  const [currentTab, setCurrentTab] = useState<'contacts' | 'drives' | 'logs' | 'settings'>('contacts');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Call State
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumber | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>(() => {
    const saved = localStorage.getItem('ksk_callLogs');
    return saved ? JSON.parse(saved, (key, value) => key === 'timestamp' ? new Date(value) : value) : [];
  });

  // Drives State
  const [drives, setDrives] = useState<Drive[]>(() => {
    const saved = localStorage.getItem('ksk_drives');
    return saved ? JSON.parse(saved) : initialDrives;
  });
  const [viewingDrive, setViewingDrive] = useState<Drive | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState<Drive | null>(null);
  const [isNewDrive, setIsNewDrive] = useState(false);
  const [bulkPhoneNumbers, setBulkPhoneNumbers] = useState('');

  // Settings State
  const [appSettings, setAppSettings] = useState(() => {
    const saved = localStorage.getItem('ksk_settings');
    return saved ? JSON.parse(saved) : {
      autoDialDelay: 3,
      callerId: 'University Admissions',
      theme: 'system',
      smsTemplate: 'Hi [Name], this is from [CallerId].'
    };
  });
  const [settingsTab, setSettingsTab] = useState<'automation' | 'profile' | 'display' | 'database' | 'security'>('automation');

  // Dial Pad State
  const [isDialPadOpen, setIsDialPadOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [dialPadTab, setDialPadTab] = useState<'keypad' | 'history'>('keypad');
  const [dialPadSearch, setDialPadSearch] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, student: Student, driveId: string } | null>(null);

  useEffect(() => { localStorage.setItem('ksk_students', JSON.stringify(students)); }, [students]);
  useEffect(() => { localStorage.setItem('ksk_drives', JSON.stringify(drives)); }, [drives]);
  useEffect(() => { localStorage.setItem('ksk_callLogs', JSON.stringify(callLogs)); }, [callLogs]);
  useEffect(() => { localStorage.setItem('ksk_settings', JSON.stringify(appSettings)); }, [appSettings]);

  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme', 'system-theme');
    if (appSettings.theme === 'light') document.body.classList.add('light-theme');
    else if (appSettings.theme === 'dark') document.body.classList.add('dark-theme');
    else document.body.classList.add('system-theme');
  }, [appSettings.theme]);


  // Auto Dialer / Multi Call
  const [autoDialEnabled, setAutoDialEnabled] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Mobile View State
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'detail'>('list');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isNewContact, setIsNewContact] = useState(false);

  // CSV Import Preview State
  const [csvPreview, setCsvPreview] = useState<{ headers: string[], rows: string[][], fileName: string } | null>(null);
  const [csvMapping, setCsvMapping] = useState({ name: 0, phone: 1, course: 2 });
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeStudent && activeStudent.phoneNumbers.length > 0) {
      setSelectedPhone(activeStudent.phoneNumbers[0]);
    } else {
      setSelectedPhone(null);
    }
  }, [activeStudent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDialPadOpen) return;

      if (e.key >= '0' && e.key <= '9') {
        setDialNumber(prev => prev.length < 15 ? prev + e.key : prev);
      } else if (e.key === '*' || e.key === '#' || e.key === '+') {
        setDialNumber(prev => prev.length < 15 ? prev + e.key : prev);
      } else if (e.key === 'Backspace') {
        setDialNumber(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter' && dialNumber) {
        const clean = dialNumber.replace(/[^\d+]/g, '');
        window.open(`tel:${clean}`, '_self');
        showToast(`Dialing ${dialNumber}…`, 'info');
        setIsDialPadOpen(false);
        setDialNumber('');
      } else if (e.key === 'Escape') {
        setIsDialPadOpen(false);
        setDialNumber('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDialPadOpen, dialNumber]);

  // Timer logic for active call
  useEffect(() => {
    let interval: number;
    if (isCalling) {
      interval = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFormattedMessage = (student: Student) => {
    let msg = appSettings.smsTemplate || 'Hi [Name], this is from [CallerId].';
    msg = msg.replace(/\[Name\]/g, student.name.split(' ')[0]);
    msg = msg.replace(/\[Course\]/g, student.course);
    msg = msg.replace(/\[CallerId\]/g, appSettings.callerId);
    return encodeURIComponent(msg);
  };

  const handleCallToggle = () => {
    if (!activeStudent || activeStudent.phoneNumbers.length === 0 || !selectedPhone) {
      showToast('No phone number available to call', 'error');
      return;
    }

    if (!isCalling) {
      setIsCalling(true);
      showToast(`Dialing ${selectedPhone.number}...`, 'info');
      const dialNumber = selectedPhone.number.replace(/[^\d+]/g, '');
      window.open(`tel:${dialNumber}`, '_self');
    } else {
      setIsCalling(false);
      showToast(`Call ended. Duration: ${formatTime(callDuration)}`, 'success');

      const newLog: CallLog = {
        id: `log_${Date.now()}`,
        studentName: activeStudent.name,
        phoneNumber: selectedPhone.number,
        duration: callDuration,
        timestamp: new Date(),
        status: callDuration > 0 ? 'completed' : 'missed',
      };
      setCallLogs(prev => [newLog, ...prev]);

      if (activeStudent.status === 'new') {
        updateStudentInList({ ...activeStudent, status: 'contacted', lastContact: 'Just now' });
      }

      if (autoDialEnabled) {
        let currentList: Student[] = [];
        if (currentTab === 'drives' && viewingDrive) {
          currentList = students
            .filter(s => viewingDrive.contactIds.includes(s.id))
            .filter(s => s.name.toLowerCase().includes(driveContactSearchTerm.toLowerCase()) || s.course.toLowerCase().includes(driveContactSearchTerm.toLowerCase()));
        } else {
          const term = searchTerm.toLowerCase();
          const cleanTerm = searchTerm.replace(/[^\d+]/g, '');
          currentList = students
            .filter(s => s.name.toLowerCase().includes(term) || s.course.toLowerCase().includes(term) || (cleanTerm.length > 0 && s.phoneNumbers.some(p => p.number.replace(/[^\d+]/g, '').includes(cleanTerm))))
            .sort((a, b) => a.name.localeCompare(b.name));
        }

        const currentIndex = currentList.findIndex(s => s.id === activeStudent.id);
        if (currentIndex !== -1 && currentIndex < currentList.length - 1) {
          const nextStudent = currentList[currentIndex + 1];
          showToast(`Auto-dialing next contact in ${appSettings.autoDialDelay}s...`, 'info');
          setTimeout(() => {
            setActiveStudent(nextStudent);
            setTimeout(() => {
              if (nextStudent.phoneNumbers.length > 0) {
                setIsCalling(true);
                showToast(`Dialing ${nextStudent.phoneNumbers[0].number}...`, 'info');
                const dialNumberNext = nextStudent.phoneNumbers[0].number.replace(/[^\d+]/g, '');
                window.open(`tel:${dialNumberNext}`, '_self');
              } else {
                showToast(`Skipped ${nextStudent.name} (No number)`, 'error');
              }
            }, 500);
          }, appSettings.autoDialDelay * 1000);
        } else {
          showToast('End of list reached. Auto-dialer stopped.', 'info');
          setAutoDialEnabled(false);
        }
      }
    }
  };

  const updateStudentInList = (updatedStudent: Student) => {
    const updatedStudents = students.map(s =>
      s.id === updatedStudent.id ? updatedStudent : s
    );
    setStudents(updatedStudents);
    if (activeStudent?.id === updatedStudent.id || !activeStudent) {
      setActiveStudent(updatedStudent);
    }
  };

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStudentSelect = (student: Student) => {
    if (isCalling) return;
    setActiveStudent(student);
    if (isMobile) {
      setMobileViewMode('detail');
    }
  };

  const skipToNext = () => {
    if (isCalling) return;
    const currentIndex = students.findIndex(s => s.id === activeStudent.id);
    if (currentIndex < students.length - 1) {
      setActiveStudent(students[currentIndex + 1]);
    } else {
      showToast('You are at the end of the list.', 'info');
    }
  }

  const navigateTo = (tab: 'contacts' | 'drives' | 'logs' | 'settings') => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
  }

  // --- Google Contacts Import ---
  const importGoogleContacts = () => {
    showToast('Connecting to Google...', 'info');
    setTimeout(() => {
      const mockGoogleContacts: Student[] = [
        {
          id: `g_${Date.now()}_1`,
          name: 'Anita Desai',
          course: 'B.Tech IT',
          year: '2026',
          phoneNumbers: [{ id: `p_g1`, type: 'Mobile', number: '+91 98765 11111' }],
          email: 'anita.desai@gmail.com',
          status: 'new',
          notes: 'Imported from Google Contacts',
          avatar: defaultAvatar
        },
        {
          id: `g_${Date.now()}_2`,
          name: 'Vikram Singh',
          course: 'MBA Marketing',
          year: '2027',
          phoneNumbers: [{ id: `p_g2`, type: 'Mobile', number: '+91 98765 22222' }],
          email: 'vikram.s@gmail.com',
          status: 'new',
          notes: 'Imported from Google Contacts',
          avatar: defaultAvatar
        }
      ];
      setStudents(prev => [...mockGoogleContacts, ...prev]);
      showToast('Successfully synced 2 contacts from Google!', 'success');
    }, 1500);
  };

  // --- Phone Contacts Import ---
  const importPhoneContacts = async () => {
    if (!('contacts' in navigator)) {
      showToast('Contact Picker API is not supported on this device/browser. Use Chrome on Android.', 'error');
      return;
    }
    try {
      const props = ['name', 'tel', 'email'];
      const opts = { multiple: true };
      // @ts-expect-error - Web Contacts API types are often missing in standard TS config
      const contacts = await navigator.contacts.select(props, opts);

      if (!contacts || contacts.length === 0) {
        showToast('No contacts selected.', 'info');
        return;
      }

      const importedStudents: Student[] = contacts.map((c: any, index: number) => {
        const phoneArr: PhoneNumber[] = (c.tel || []).map((t: string, i: number) => ({
          id: `p_${Date.now()}_${i}`,
          type: 'Mobile',
          number: t
        }));

        return {
          id: `imp_${Date.now()}_${index}`,
          name: c.name?.[0] || 'Unknown Contact',
          course: 'Imported Lead',
          year: 'N/A',
          phoneNumbers: phoneArr.length > 0 ? phoneArr : [{ id: `p_${Date.now()}`, type: 'Mobile', number: '' }],
          email: c.email?.[0] || '',
          status: 'new',
          notes: 'Imported from phone contacts.',
          avatar: defaultAvatar
        };
      });

      setStudents([...importedStudents, ...students]);
      showToast(`Successfully imported ${importedStudents.length} contacts!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to import contacts or cancelled.', 'error');
    }
  };

  // --- Add/Edit Contact Logic ---
  const openEditModal = () => {
    if (activeStudent) openEditContactModal(activeStudent);
  };

  const openEditContactModal = (student: Student) => {
    setEditingStudent(JSON.parse(JSON.stringify(student)));
    setIsNewContact(false);
    setIsEditModalOpen(true);
  };

  const openAddContactModal = () => {
    const blankStudent: Student = {
      id: `s_${Date.now()}`,
      name: '',
      course: '',
      year: 'First Year',
      phoneNumbers: [{ id: `p${Date.now()}`, type: 'Mobile', number: '+91 ' }],
      email: '',
      status: 'new',
      notes: '',
      avatar: defaultAvatar,
    };
    setEditingStudent(blankStudent);
    setIsNewContact(true);
    setIsEditModalOpen(true);
  };

  const saveProfile = () => {
    if (editingStudent) {
      if (!editingStudent.name.trim()) {
        showToast('Name is required!', 'error');
        return;
      }
      if (isNewContact) {
        setStudents([editingStudent, ...students]);
        setActiveStudent(editingStudent);
        showToast('New contact added successfully!');
        if (isMobile) setMobileViewMode('detail');
      } else {
        updateStudentInList(editingStudent);
        showToast('Contact updated successfully!');
      }
      setIsEditModalOpen(false);
    }
  };

  const handlePhoneChange = (id: string, field: 'type' | 'number', value: string) => {
    if (!editingStudent) return;
    const updatedPhones = editingStudent.phoneNumbers.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    );
    setEditingStudent({ ...editingStudent, phoneNumbers: updatedPhones });
  };

  const addPhoneNumber = () => {
    if (!editingStudent) return;
    setEditingStudent({
      ...editingStudent,
      phoneNumbers: [...editingStudent.phoneNumbers, { id: `p${Date.now()}`, type: 'Mobile', number: '+91 ' }]
    });
  };

  const removePhoneNumber = (id: string) => {
    if (!editingStudent) return;
    setEditingStudent({
      ...editingStudent,
      phoneNumbers: editingStudent.phoneNumbers.filter(p => p.id !== id)
    });
  };

  // --- Drives CRUD Logic ---
  const openAddDriveModal = () => {
    setEditingDrive({ id: `d_${Date.now()}`, name: '', description: '', contactIds: [], status: 'active' });
    setIsNewDrive(true);
    setBulkPhoneNumbers('');
    setIsDriveModalOpen(true);
  };

  const openEditDriveModal = (drive: Drive) => {
    setEditingDrive({ ...drive });
    setIsNewDrive(false);
    setBulkPhoneNumbers('');
    setIsDriveModalOpen(true);
  };

  const saveDrive = () => {
    if (editingDrive) {
      if (!editingDrive.name.trim()) {
        showToast('Drive name is required!', 'error');
        return;
      }

      let newContactIds: string[] = [];
      let newStudents: Student[] = [];

      if (bulkPhoneNumbers.trim()) {
        const phones = bulkPhoneNumbers.split(/[\n,]+/).map(p => p.trim()).filter(p => p.length > 0);
        phones.forEach((phone, index) => {
          const newStudentId = `s_${Date.now()}_${index}`;
          const newStudent: Student = {
            id: newStudentId,
            name: `Unknown Contact ${phone.slice(-4)}`,
            course: editingDrive.name,
            year: 'N/A',
            phoneNumbers: [{ id: `p_${Date.now()}_${index}`, type: 'Mobile', number: phone.replace(/\D/g, '') }],
            email: '',
            status: 'new',
            notes: `Bulk added from drive: ${editingDrive.name}`,
            avatar: defaultAvatar,
          };
          newStudents.push(newStudent);
          newContactIds.push(newStudentId);
        });
      }

      const updatedDrive = {
        ...editingDrive,
        contactIds: [...editingDrive.contactIds, ...newContactIds]
      };

      if (newStudents.length > 0) {
        setStudents(prev => [...newStudents, ...prev]);
      }

      if (isNewDrive) {
        setDrives([...drives, updatedDrive]);
        showToast('Admission drive created successfully!');
      } else {
        setDrives(drives.map(d => d.id === updatedDrive.id ? updatedDrive : d));
        // Also update viewingDrive if it's currently open
        if (viewingDrive?.id === updatedDrive.id) {
          setViewingDrive(updatedDrive);
        }
        showToast('Admission drive updated!');
      }
      setBulkPhoneNumbers('');
      setIsDriveModalOpen(false);
    }
  };

  const deleteStudent = (id: string) => {
    const updatedStudents = students.filter(s => s.id !== id);
    setStudents(updatedStudents);
    if (activeStudent?.id === id) {
      setActiveStudent(updatedStudents[0] || null);
    }
    setDrives(drives.map(d => ({
      ...d,
      contactIds: d.contactIds.filter(cId => cId !== id)
    })));
    showToast('Contact deleted successfully.', 'success');
  };

  const deleteDrive = (id: string) => {
    setDrives(drives.filter(d => d.id !== id));
    if (viewingDrive?.id === id) setViewingDrive(null);
    showToast('Drive deleted successfully.', 'success');
  };

  const filteredStudents = students.filter(s => {
    const term = searchTerm.toLowerCase();
    const cleanTerm = searchTerm.replace(/[^\d+]/g, '');

    return s.name.toLowerCase().includes(term) ||
      s.course.toLowerCase().includes(term) ||
      (cleanTerm.length > 0 && s.phoneNumbers.some(p => p.number.replace(/[^\d+]/g, '').includes(cleanTerm)));
  }).sort((a, b) => a.name.localeCompare(b.name));

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail && loginPassword) {
      setIsAuthenticated(true);
      localStorage.setItem('ksk_auth', 'true');
      showToast('Logged in successfully', 'success');
    } else {
      showToast('Please enter email and password', 'error');
    }
  };

  const handleGoogleLogin = () => {
    showToast('Redirecting to Google...', 'info');
    setTimeout(() => {
      setIsAuthenticated(true);
      localStorage.setItem('ksk_auth', 'true');
      showToast('Logged in via Google', 'success');
    }, 1000);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="login-header">
            <img src={gflbLogo} alt="GFLB Studio" style={{ height: isMobile ? '120px' : '80px', objectFit: 'contain', margin: '0 auto 1.5rem auto', display: 'block' }} />
            <p>Sign in to your agent dashboard</p>
          </div>

          <button className="google-btn" onClick={handleGoogleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>

          <div className="divider">or</div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="agent@university.edu"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block mt-2">Sign In</button>
          </form>
        </motion.div>

        {/* ── HI-TECH Notification System ── */}
        <div className={`hud-notif-container ${isMobile ? 'mobile' : 'desktop'}`}>
          <AnimatePresence>
            {toast && (
              <motion.div
                className={`hud-notif hud-notif-${toast.type}`}
                initial={{ opacity: 0, y: -60, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.95 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              >
                <div className="hud-notif-icon">
                  {toast.type === 'error' && <X size={14} />}
                  {toast.type === 'success' && <CheckCircle2 size={14} />}
                  {toast.type === 'info' && <Bell size={14} />}
                </div>
                <div className="hud-notif-body">
                  <span className="hud-notif-label">
                    {toast.type === 'error' ? 'SYS_ERROR' : toast.type === 'success' ? 'SYS_OK' : 'SYS_INFO'}
                  </span>
                  <span className="hud-notif-msg">{toast.message}</span>
                </div>
                <div className="hud-notif-bar" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    );
  }

  return (
    <div className="app-layout">
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar - Desktop Only */}
      {!isMobile && (
        <aside className="sidebar">
          <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', justifyContent: 'center' }}>
            <img src={gflbLogo} alt="GFLB Studio" style={{ height: '60px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>GFLB CALLER PRO</span>
          </div>
          <nav className="flex flex-col gap-2">
            <button className={`nav-item w-full text-left bg-transparent border-none ${currentTab === 'contacts' ? 'active' : ''}`} onClick={() => navigateTo('contacts')}>
              <Users size={20} />
              Contacts Queue
            </button>
            <button className={`nav-item w-full text-left bg-transparent border-none ${currentTab === 'drives' ? 'active' : ''}`} onClick={() => navigateTo('drives')}>
              <LayoutDashboard size={20} />
              Admissions Drives
            </button>
            <button className={`nav-item w-full text-left bg-transparent border-none ${currentTab === 'logs' ? 'active' : ''}`} onClick={() => navigateTo('logs')}>
              <Phone size={20} />
              Call Logs
            </button>
            <div style={{ flexGrow: 1 }}></div>
            <button className={`nav-item w-full text-left bg-transparent border-none ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => navigateTo('settings')}>
              <Settings size={20} />
              Settings
            </button>
          </nav>
        </aside>
      )}

      {/* Bottom Nav - Mobile Only */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-item ${currentTab === 'contacts' ? 'active' : ''}`} onClick={() => navigateTo('contacts')}>
            <Users size={24} />
            <span>Contacts</span>
          </button>
          <button className={`mobile-nav-item ${currentTab === 'drives' ? 'active' : ''}`} onClick={() => navigateTo('drives')}>
            <LayoutDashboard size={24} />
            <span>Campaigns</span>
          </button>
          <button className={`mobile-nav-item ${currentTab === 'logs' ? 'active' : ''}`} onClick={() => navigateTo('logs')}>
            <Phone size={24} />
            <span>Logs</span>
          </button>
          <button className={`mobile-nav-item ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => navigateTo('settings')}>
            <Settings size={24} />
            <span>Settings</span>
          </button>
        </nav>
      )}

      {/* Main Content */}
      <main className="main-content">
        <header className="header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 0.75rem' : '0 2rem', height: '60px' }}>
          <div className="flex items-center" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: isMobile ? '6px' : '1rem', whiteSpace: 'nowrap', overflow: 'hidden', flex: 1 }}>
            {isMobile && (
              <img src={gflbLogo} alt="GFLB" style={{ height: '42px', width: 'auto', flexShrink: 0, display: 'block', marginRight: '8px' }} />
            )}
            <h1 style={{
              fontSize: isMobile ? '0.8rem' : '1.25rem',
              margin: 0,
              fontWeight: 900,
              letterSpacing: isMobile ? '-0.01em' : '0.05em',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              display: 'inline-block',
              color: 'var(--text-primary)'
            }}>
              {currentTab === 'contacts' && 'GFLB CALLER PRO'}
              {currentTab === 'drives' && 'ADMISSIONS CAMPAIGNS'}
              {currentTab === 'logs' && 'CALL LOGS'}
              {currentTab === 'settings' && 'SYSTEM SETTINGS'}
            </h1>
          </div>
          <div className="flex items-center gap-3" style={{ flexShrink: 0, whiteSpace: 'nowrap', flexWrap: 'nowrap' }}>
            {/* Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 mobile-hidden" style={{ background: 'var(--bg-tertiary)', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent-success)', boxShadow: '0 0 8px var(--accent-success)' }}></div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>System Online</span>
            </div>

            {!isMobile && (
              <div className="flex items-center gap-2" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', marginLeft: '0.5rem', flexWrap: 'nowrap' }}>
                <button
                  className={`btn ${autoDialEnabled ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`}
                  onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                  title="Automatically dial the next student when a call ends"
                  style={{ borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, padding: '0.4rem 1rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  <Power size={14} /> {autoDialEnabled ? 'AUTO-DIAL ON' : 'AUTO-DIAL OFF'}
                </button>

                <button
                  className="btn-icon"
                  onClick={() => setIsDialPadOpen(true)}
                  title="Open Dial Pad"
                  style={{ borderRadius: '50%', width: '36px', height: '36px', flexShrink: 0 }}
                >
                  <Grid3x3 size={16} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', marginLeft: '0.5rem', flexWrap: 'nowrap' }}>
              {!isMobile && (
                <button className="btn-icon" onClick={() => { setIsAuthenticated(false); localStorage.removeItem('ksk_auth'); showToast('Logged out successfully', 'info'); }} title="Log Out" style={{ color: 'var(--accent-danger)', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.1)', width: '36px', height: '36px', flexShrink: 0 }}>
                  <LogOut size={16} style={{ transform: 'translateX(1px)' }} />
                </button>
              )}
            </div>
          </div>
        </header>

        {currentTab === 'contacts' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="workspace">
            {/* List Panel */}
            <section className={`list-panel ${isMobile && mobileViewMode === 'detail' ? 'mobile-hidden' : ''}`}>
              <div className="list-header">
                <div className="flex justify-between items-center mb-4">
                  <h2 style={{ margin: 0 }}>Contacts</h2>
                  <div className="flex gap-2">
                    <button className="btn-icon" onClick={importGoogleContacts} title="Sync Google Contacts" style={{ color: '#4285F4' }}>
                      <Cloud size={20} />
                    </button>
                    <button className="btn-icon" onClick={importPhoneContacts} title="Import Phone Contacts" style={{ color: 'var(--accent-primary)' }}>
                      <Download size={20} />
                    </button>
                    <button className="btn-icon" onClick={openAddContactModal} title="Add New Contact" style={{ color: 'var(--accent-primary)' }}>
                      <UserPlus size={20} />
                    </button>
                  </div>
                </div>
                <div className="search-box right-side">
                  <input
                    type="text"
                    placeholder="Search name, course, number..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="search-btn">
                    <Search size={18} />
                  </div>
                </div>
              </div>
              <div className="student-list">
                {filteredStudents.map((student, index) => (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "0px 0px -20px 0px" }}
                    transition={{ delay: (index % 10) * 0.03 }}
                    key={student.id}
                    className={`student-card ${activeStudent?.id === student.id ? 'active' : ''}`}
                    onClick={() => handleStudentSelect(student)}
                    style={{ opacity: isCalling && activeStudent?.id !== student.id ? 0.5 : 1, cursor: isCalling ? 'not-allowed' : 'pointer' }}
                  >
                    <img src={student.avatar} alt={student.name} className="student-avatar" />
                    <div className="student-info">
                      <h4>{student.name}</h4>
                      <p>{student.course}</p>
                      <div style={{ marginTop: '4px' }}>
                        <span className={`badge badge-${student.status}`}>
                          {student.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {filteredStudents.length === 0 && (
                  <div className="p-4 text-center text-muted">No contacts found.</div>
                )}
              </div>
            </section>

            {/* Center Action Panel — HI-TECH HUD */}
            {activeStudent && (
              <section className={`action-panel ${isMobile && mobileViewMode === 'list' ? 'mobile-hidden' : ''}`}>

                {/* ── HUD HEADER ── */}
                <div className="hud-contact-header">
                  {isMobile && (
                    <button className="hud-back-btn" onClick={() => setMobileViewMode('list')}>
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <div className="hud-avatar-wrap">
                    <div className="hud-avatar-ring" />
                    <img src={activeStudent.avatar} alt={activeStudent.name} className="hud-avatar" />
                    <div className="hud-avatar-scan" />
                  </div>
                  <div className="hud-identity">
                    <div className="hud-sys-label">CONTACT_PROFILE</div>
                    <h2 className="hud-name">{activeStudent.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`badge badge-${activeStudent.status}`}>{activeStudent.status.replace('_', ' ').toUpperCase()}</span>
                      <span className="hud-course">{activeStudent.course}</span>
                    </div>
                  </div>
                  <div className="hud-ctrl-row">
                    <button className="hud-ctrl-btn" onClick={skipToNext} title="Skip"><FastForward size={14} /><span>Skip</span></button>
                    <button className="hud-ctrl-btn" onClick={openEditModal}><Edit3 size={14} /><span>Edit</span></button>
                    <button className="hud-ctrl-btn danger" onClick={() => deleteStudent(activeStudent.id)}><Trash2 size={14} /><span>Delete</span></button>
                  </div>
                </div>

                {/* ── DATA GRID ── */}
                <div className="hud-data-grid">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="hud-data-card">
                    <div className="hud-card-corner tl" /><div className="hud-card-corner br" />
                    <div className="hud-card-label"><GraduationCap size={12} /> ACADEMIC</div>
                    <div className="hud-card-row"><span>Course</span><span className="hud-card-val">{activeStudent.course}</span></div>
                    <div className="hud-card-row"><span>Batch</span><span className="hud-card-val">{activeStudent.year}</span></div>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="hud-data-card">
                    <div className="hud-card-corner tl" /><div className="hud-card-corner br" />
                    <div className="hud-card-label"><Mail size={12} /> COMM</div>
                    <div className="hud-card-row"><span>Email</span><span className="hud-card-val truncate max-w-[120px]">{activeStudent.email || '—'}</span></div>
                    <div className="hud-card-row"><span>Status</span><span className="hud-card-val" style={{ color: 'var(--accent-success)' }}>● ONLINE</span></div>
                  </motion.div>
                </div>

                {/* ── CHANNEL SELECTOR ── */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="hud-channels-section">
                  <div className="hud-section-label">COMM_CHANNELS</div>
                  <div className="hud-channels-list">
                    {activeStudent.phoneNumbers.map((phone) => (
                      <motion.div
                        key={phone.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedPhone(phone)}
                        className={`hud-channel-row ${selectedPhone?.id === phone.id ? 'active' : ''}`}
                      >
                        <div className="hud-channel-icon">
                          {phone.type === 'WhatsApp' ? <MessageSquare size={16} /> : <Phone size={16} />}
                        </div>
                        <div className="hud-channel-info">
                          <span className="hud-channel-type">{phone.type.toUpperCase()}</span>
                          <span className="hud-channel-num">{phone.number}</span>
                        </div>
                        {selectedPhone?.id === phone.id && <div className="hud-channel-active-dot" />}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* ── CENTRAL HUB (DIAL + OUTREACH) ── */}
                <div className="hud-central-hub-container" style={{ flex: 1, display: 'flex', gap: '2rem', padding: '2rem' }}>

                  {/* Left: Main Dialer (Centered in its space) */}
                  <div className="hud-dial-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>

                    {/* Dial Zone */}
                    <div className="hud-dial-zone mb-8" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <AnimatePresence mode="wait">
                        {isCalling ? (
                          <motion.div key="calling" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="hud-calling-state">
                            <div className="hud-calling-ring" />
                            <div className="hud-timer">{formatTime(callDuration)}</div>
                            <div className="hud-dial-sys-label">CALL IN PROGRESS</div>
                            <div className="flex gap-4 mt-4">
                              <button className="hud-end-ctrl mute" onClick={() => showToast('Mute toggle', 'info')}><MicOff size={20} /></button>
                              <button className="hud-end-ctrl end" onClick={handleCallToggle}><PhoneOff size={22} /></button>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div key="idle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="hud-idle-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <motion.button
                              whileHover={{ scale: 1.06 }}
                              whileTap={{ scale: 0.94 }}
                              className="hud-dial-btn"
                              onClick={handleCallToggle}
                              style={{ width: 120, height: 120 }}
                            >
                              <div className="hud-dial-pulse" />
                              <PhoneCall size={42} />
                            </motion.button>
                            <div className="hud-dial-label" style={{ marginTop: '1.5rem', fontSize: '0.85rem', letterSpacing: '0.15em', fontWeight: 800, color: 'var(--accent-primary)' }}>INITIATE_SECURE_CALL</div>
                            <p className="text-xs text-muted mt-2">Ready to connect with {activeStudent.name}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Outreach Grid - CENTERED */}
                    <div className="hud-outreach-center-grid" style={{ width: '100%', maxWidth: '420px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="hud-outreach-btn-center"
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                          padding: '1.25rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                          borderRadius: '16px', cursor: 'pointer'
                        }}
                        onClick={() => {
                          const num = selectedPhone?.number || activeStudent.phoneNumbers[0]?.number;
                          if (num) window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${getFormattedMessage(activeStudent)}`, '_blank');
                          else showToast('No contact number available', 'error');
                        }}
                      >
                        <div style={{ background: 'rgba(37, 211, 102, 0.1)', padding: '12px', borderRadius: '12px' }}>
                          <MessageSquare size={22} style={{ color: '#25D366' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>WHATSAPP</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="hud-outreach-btn-center"
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                          padding: '1.25rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                          borderRadius: '16px', cursor: 'pointer'
                        }}
                        onClick={() => {
                          if (activeStudent.email) window.open(`mailto:${activeStudent.email}?subject=Admission Inquiry - ${appSettings.callerId}`, '_self');
                          else showToast('No email address available', 'error');
                        }}
                      >
                        <div style={{ background: 'rgba(66, 133, 244, 0.1)', padding: '12px', borderRadius: '12px' }}>
                          <Mail size={22} style={{ color: '#4285F4' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>EMAIL</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="hud-outreach-btn-center"
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                          padding: '1.25rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                          borderRadius: '16px', cursor: 'pointer'
                        }}
                        onClick={() => showToast('Digital Brochure Dispatched!', 'success')}
                      >
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '12px' }}>
                          <FileText size={22} style={{ color: '#F59E0B' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em' }}>BROCHURE</span>
                      </motion.button>
                    </div>
                  </div>

                  {/* Right: Quick Context / Tools (Filling the right space) */}
                  {!isMobile && (
                    <div className="hud-quick-tools" style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem' }}>
                      <div className="hud-tool-card" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem' }}>
                        <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--accent-primary)', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.1em' }}>
                          <History size={14} /> SESSION_ACTIVITY
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted">Total Calls</span>
                            <span className="font-bold">{callLogs.length}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted">Success Rate</span>
                            <span className="font-bold text-success">85%</span>
                          </div>
                        </div>
                      </div>

                      <div className="hud-tool-card" style={{ flex: 1, background: 'rgba(213, 162, 22, 0.02)', border: '1px dashed var(--border-color)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ opacity: 0.3, marginBottom: '1rem' }}><Settings size={40} /></div>
                        <div className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Utility Zone</div>
                        <p className="text-[10px] text-muted leading-relaxed">System monitoring and live recruitment metrics will be synchronized here.</p>
                      </div>

                      <button
                        className="btn btn-secondary w-full"
                        style={{ padding: '0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700 }}
                        onClick={() => showToast('AI Assistant Initializing...', 'info')}
                      >
                        LAUNCH_AI_COPILOT
                      </button>
                    </div>
                  )}
                </div>

              </section>
            )}

          </motion.div>
        )}

        {/* Admissions Drives Tab */}
        {currentTab === 'drives' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="tab-content">
            {viewingDrive ? (
              <div>
                <div className="campaign-header-stable" style={{
                  marginBottom: isMobile ? '0.5rem' : '1rem',
                  padding: isMobile ? '0.5rem 0.75rem' : '0 0.5rem'
                }}>
                  <div className="flex items-center" style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: isMobile ? '0.5rem' : '1rem',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.75rem',
                    alignItems: 'center',
                    flexWrap: isMobile ? 'wrap' : 'nowrap'
                  }}>
                    <div className="flex items-center gap-2" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                      <motion.button
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(213, 162, 22, 0.15)' }}
                        whileTap={{ scale: 0.95 }}
                        className="btn-icon"
                        onClick={() => setViewingDrive(null)}
                        style={{
                          background: 'rgba(213, 162, 22, 0.05)',
                          border: '1px solid rgba(213, 162, 22, 0.2)',
                          borderRadius: '8px',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <ChevronLeft size={18} style={{ color: 'var(--accent-primary)' }} />
                      </motion.button>

                      <h2 className={isMobile ? 'text-sm font-bold m-0' : 'text-lg font-extrabold m-0'} style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                        {viewingDrive.name}
                      </h2>
                    </div>

                    <div className="flex gap-1.5 items-center flex-shrink-0" style={{ order: isMobile ? 2 : 3, marginLeft: 'auto' }}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`btn ${autoDialEnabled ? 'btn-primary' : 'btn-secondary'} px-3 h-[32px] text-[9px] font-black flex items-center gap-1`}
                        onClick={() => {
                          if (!autoDialEnabled) {
                            const driveStudents = students
                              .filter(s => viewingDrive.contactIds.includes(s.id))
                              .filter(s => s.name.toLowerCase().includes(driveContactSearchTerm.toLowerCase()) || s.course.toLowerCase().includes(driveContactSearchTerm.toLowerCase()));
                            if (driveStudents.length > 0) {
                              setActiveStudent(driveStudents[0]);
                              setAutoDialEnabled(true);
                              setTimeout(() => {
                                if (driveStudents[0].phoneNumbers.length > 0) {
                                  setIsCalling(true);
                                  showToast(`Dialing ${driveStudents[0].phoneNumbers[0].number}...`, 'info');
                                  const dialNum = driveStudents[0].phoneNumbers[0].number.replace(/[^\d+]/g, '');
                                  window.open(`tel:${dialNum}`, '_self');
                                } else {
                                  showToast(`Skipped ${driveStudents[0].name} (No number)`, 'error');
                                }
                              }, 500);
                            } else {
                              showToast('No contacts to dial', 'error');
                            }
                          } else {
                            setAutoDialEnabled(false);
                            showToast('Auto-dialer stopped', 'info');
                          }
                        }}
                      >
                        <Power size={11} /> <span>{isMobile ? 'AUTO' : 'AUTO_DIAL'}</span>
                      </motion.button>

                      <button className="btn btn-secondary h-[32px] w-[32px] p-0 flex items-center justify-center border-accent" style={{ borderColor: 'var(--border-color)' }} onClick={() => openEditDriveModal(viewingDrive)} title="Edit">
                        <Edit3 size={12} />
                      </button>

                      <button className="btn btn-primary h-[32px] px-2.5 text-[9px] font-black flex items-center gap-1" onClick={() => openAddContactModal()}>
                        <Plus size={12} /> {isMobile ? 'ADD' : 'ADD_CONTACT'}
                      </button>
                    </div>

                    <div style={{ flex: isMobile ? '1 1 100%' : 1, minWidth: isMobile ? '100%' : '150px', maxWidth: isMobile ? 'none' : '300px', order: isMobile ? 3 : 2, marginTop: isMobile ? '0.5rem' : 0 }}>
                      <div className="search-box right-side" style={{ margin: 0, width: '100%' }}>
                        <input
                          type="text"
                          placeholder={`Search in ${viewingDrive.name}...`}
                          className="search-input"
                          style={{ height: '32px', fontSize: '0.7rem', padding: '0 2rem 0 0.75rem' }}
                          value={driveContactSearchTerm}
                          onChange={(e) => setDriveContactSearchTerm(e.target.value)}
                        />
                        <div className="search-btn" style={{ height: '32px', width: '32px', padding: 0 }}>
                          <Search size={12} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="workspace" style={{ padding: 0, display: 'flex', overflow: 'hidden', height: isMobile ? 'calc(100vh - 130px)' : 'calc(100vh - 200px)' }}>
                  <section className={`list-panel ${isMobile && mobileViewMode === 'detail' ? 'mobile-hidden' : ''}`} style={{ width: isMobile ? '100%' : '350px', borderRight: isMobile ? 'none' : '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="student-list" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                      {students.filter(s => viewingDrive.contactIds.includes(s.id)).filter(s => s.name.toLowerCase().includes(driveContactSearchTerm.toLowerCase()) || s.course.toLowerCase().includes(driveContactSearchTerm.toLowerCase())).map((student, index) => (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          key={student.id}
                          className={`student-card ${activeStudent?.id === student.id ? 'active' : ''}`}
                          onClick={() => handleStudentSelect(student)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.pageX, y: e.pageY, student, driveId: viewingDrive.id });
                          }}
                        >
                          <img src={student.avatar} alt={student.name} className="student-avatar" />
                          <div className="student-info">
                            <h4>{student.name}</h4>
                            <p>{student.course}</p>
                            <div style={{ marginTop: '4px' }}>
                              <span className={`badge badge-${student.status}`}>
                                {student.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>

                  {activeStudent && (
                    <section className={`action-panel ${isMobile && mobileViewMode === 'list' ? 'mobile-hidden' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: 'var(--bg-primary)' }}>

                      {/* ── HI-TECH HUD HEADER (from Contacts) ── */}
                      <div className="hud-contact-header" style={{
                        flexShrink: 0,
                        padding: '2rem 1.5rem',
                        borderBottom: '1px solid var(--border-color)',
                        background: 'linear-gradient(180deg, rgba(213, 162, 22, 0.05) 0%, transparent 100%)',
                        position: 'relative'
                      }}>
                        {isMobile && (
                          <button className="hud-back-btn" onClick={() => setMobileViewMode('list')} style={{ position: 'absolute', top: '1.25rem', left: '1rem', background: 'var(--bg-tertiary)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronLeft size={18} />
                          </button>
                        )}
                        <div className="hud-avatar-wrap" style={{ border: '2px solid var(--accent-primary)', padding: '4px', background: 'transparent' }}>
                          <img src={activeStudent.avatar} alt={activeStudent.name} className="hud-avatar" style={{ borderRadius: '14px' }} />
                        </div>
                        <div className="hud-identity">
                          <div className="hud-sys-label" style={{ color: 'var(--accent-primary)', fontSize: '0.65rem', fontWeight: 900 }}>IDENTITY_ESTABLISHED</div>
                          <h2 className="hud-name" style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{activeStudent.name}</h2>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`badge badge-${activeStudent.status}`} style={{ padding: '4px 10px', fontSize: '0.65rem' }}>{activeStudent.status.replace('_', ' ').toUpperCase()}</span>
                            <span className="hud-course" style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.6 }}>{activeStudent.course}</span>
                          </div>
                        </div>
                        {!isMobile && (
                          <div className="hud-ctrl-row">
                            <button className="hud-ctrl-btn" onClick={() => openEditContactModal(activeStudent)}><Edit3 size={14} /><span>Edit</span></button>
                          </div>
                        )}
                      </div>


                      {/* ── CHANNEL SELECTOR (COMM_CHANNELS) ── */}
                      <div className="hud-channels-section" style={{ padding: '0 1rem' }}>
                        <div className="hud-section-label">COMM_CHANNELS</div>
                        <div className="hud-channels-list">
                          {activeStudent.phoneNumbers.map((phone) => (
                            <div key={phone.id} className="hud-channel-row active" style={{ marginBottom: '0.5rem' }}>
                              <div className="hud-channel-icon"><Phone size={16} /></div>
                              <div className="hud-channel-info">
                                <span className="hud-channel-type">{phone.type.toUpperCase()}</span>
                                <span className="hud-channel-num">{phone.number}</span>
                              </div>
                              <div className="hud-channel-active-dot" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ── CENTRAL HUB (DIAL + OUTREACH) ── */}
                      <div className="hud-central-hub" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1.5rem' }}>

                        {/* Premium Dial Zone */}
                        <div className="hud-dial-zone mb-10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                          <div style={{ position: 'relative' }}>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="hud-dial-btn"
                              onClick={handleCallToggle}
                              style={{
                                width: 120, height: 120,
                                background: isCalling ? 'var(--accent-danger)' : 'linear-gradient(135deg, var(--accent-primary), #8c6909)',
                                boxShadow: isCalling ? '0 0 30px rgba(239, 68, 68, 0.4)' : '0 0 30px rgba(213, 162, 22, 0.3)',
                                border: 'none',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff',
                                zIndex: 2
                              }}
                            >
                              <PhoneCall size={42} />
                            </motion.button>
                            {!isCalling && (
                              <motion.div
                                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                style={{
                                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                  borderRadius: '50%', border: '2px solid var(--accent-primary)',
                                  zIndex: 1
                                }}
                              />
                            )}
                          </div>
                          <div className="hud-dial-label" style={{ marginTop: '1.5rem', fontSize: '0.75rem', letterSpacing: '0.15em', fontWeight: 900, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                            {isCalling ? 'SYSTEM_CALL_ACTIVE' : 'INITIATE_ENCRYPTED_CALL'}
                          </div>
                          <p className="text-xs text-muted mt-2 font-medium" style={{ opacity: 0.5 }}>
                            {isCalling ? `Dialing ${activeStudent.phoneNumbers[0]?.number}...` : `Line Ready for ${activeStudent.name}`}
                          </p>
                        </div>

                        {/* Outreach Grid - NOW CENTERED */}
                        <div className="hud-outreach-center-grid" style={{ width: '100%', maxWidth: '400px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="hud-outreach-btn-center"
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                              padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                              borderRadius: '16px', cursor: 'pointer'
                            }}
                            onClick={() => {
                              const num = selectedPhone?.number || activeStudent.phoneNumbers[0]?.number;
                              if (num) window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${getFormattedMessage(activeStudent)}`, '_blank');
                              else showToast('No contact number available', 'error');
                            }}
                          >
                            <div style={{ background: 'rgba(37, 211, 102, 0.1)', padding: '10px', borderRadius: '12px' }}>
                              <MessageSquare size={20} style={{ color: '#25D366' }} />
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>WHATSAPP</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="hud-outreach-btn-center"
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                              padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                              borderRadius: '16px', cursor: 'pointer'
                            }}
                            onClick={() => {
                              if (activeStudent.email) window.open(`mailto:${activeStudent.email}?subject=Admission Inquiry - ${appSettings.callerId}`, '_self');
                              else showToast('No email address available', 'error');
                            }}
                          >
                            <div style={{ background: 'rgba(66, 133, 244, 0.1)', padding: '10px', borderRadius: '12px' }}>
                              <Mail size={20} style={{ color: '#4285F4' }} />
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>EMAIL</span>
                          </motion.button>

                          <motion.button
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="hud-outreach-btn-center"
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
                              padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                              borderRadius: '16px', cursor: 'pointer'
                            }}
                            onClick={() => showToast('Digital Brochure Dispatched!', 'success')}
                          >
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '12px' }}>
                              <FileText size={20} style={{ color: '#F59E0B' }} />
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.05em' }}>BROCHURE</span>
                          </motion.button>
                        </div>
                      </div>

                      {/* ── SESSION INTEL (NOTES) ── */}
                      <div className="notes-container-premium p-4" style={{ flexShrink: 0, borderTop: '1px solid var(--border-color)', background: 'rgba(213, 162, 22, 0.02)' }}>
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-2">
                            <div style={{ width: '4px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px' }}></div>
                            <h3 className="m-0 text-xs font-bold uppercase tracking-widest text-primary">Session Intel</h3>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn-save-premium"
                            onClick={() => { updateStudentInList(activeStudent); showToast('Intel Synchronized!', 'success'); }}
                          >
                            <Save size={14} /> <span>SAVE REMARKS</span>
                          </motion.button>
                        </div>

                        <div className="relative group">
                          <textarea
                            className="premium-notes-area"
                            placeholder="Type student feedback..."
                            style={{
                              width: '100%',
                              height: '100px',
                              padding: '1rem',
                              borderRadius: '12px',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)',
                              fontSize: '0.875rem',
                              lineHeight: '1.6',
                              resize: 'none',
                              transition: 'all 0.3s ease',
                              outline: 'none'
                            }}
                            value={activeStudent.notes}
                            onChange={(e) => updateStudentInList({ ...activeStudent, notes: e.target.value })}
                          />
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className={isMobile ? 'mobile-header-section' : ''}>
                  {isMobile ? (
                    <>
                      <h2 className="mobile-page-title">Active Campaigns</h2>
                      <span className="mobile-page-subtitle">Manage your student outreach programs and admission drives.</span>
                      <div className="mobile-search-wrapper">
                        <div className="search-box" style={{ margin: 0 }}>
                          <input
                            type="text"
                            placeholder="Search campaigns..."
                            className="search-input"
                            value={driveSearchTerm}
                            onChange={(e) => setDriveSearchTerm(e.target.value)}
                          />
                          <div className="search-btn">
                            <Search size={18} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold m-0">Active Campaigns</h2>
                      <div className="flex gap-4">
                        <div className="search-box right-side" style={{ margin: 0 }}>
                          <input
                            type="text"
                            placeholder="Search campaigns..."
                            className="search-input"
                            value={driveSearchTerm}
                            onChange={(e) => setDriveSearchTerm(e.target.value)}
                          />
                          <div className="search-btn">
                            <Search size={18} />
                          </div>
                        </div>
                        <button className="btn btn-primary" onClick={openAddDriveModal}>
                          <FolderPlus size={18} /> New Drive
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {drives.length === 0 ? (
                  <div className="text-center text-muted p-10 bg-secondary rounded-lg">No admission drives found. Create one!</div>
                ) : (
                  <div className="card-grid">
                    {drives.filter(d => d.name.toLowerCase().includes(driveSearchTerm.toLowerCase()) || d.description.toLowerCase().includes(driveSearchTerm.toLowerCase())).map(drive => (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={drive.id}
                        className="drive-card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setViewingDrive(drive)}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="m-0">{drive.name}</h3>
                          <div className="flex gap-2">
                            <button className="btn-icon p-1" style={{ color: 'var(--accent-primary)' }} onClick={(e) => { e.stopPropagation(); openEditDriveModal(drive); }} title="Edit Campaign">
                              <Edit3 size={16} />
                            </button>
                            <button className="btn-icon p-1" style={{ color: 'var(--accent-danger)' }} onClick={(e) => { e.stopPropagation(); deleteDrive(drive.id); }} title="Delete Campaign">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-secondary m-0">{drive.description}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`badge ${drive.status === 'active' ? 'badge-new' : drive.status === 'completed' ? 'badge-contacted' : ''}`}>
                            {drive.contactIds.length} Contacts
                          </span>
                          <span className="text-xs uppercase font-semibold text-muted">{drive.status}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Call Logs Tab */}
        {currentTab === 'logs' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="tab-content">
            <h2 className={isMobile ? "mobile-page-title" : "text-xl font-semibold mb-4"}>Recent Call Logs</h2>
            {isMobile && <span className="mobile-page-subtitle">Track your recent outreach performance and durations.</span>}

            {callLogs.length === 0 ? (
              <p className="text-muted p-4 bg-secondary rounded-lg text-center">No calls made in this session yet.</p>
            ) : isMobile ? (
              /* MOBILE OPTIMIZED LOGS */
              <div className="flex flex-col gap-3">
                {callLogs.map(log => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={log.id}
                    className="drive-card"
                    style={{ padding: '0.6rem 0.75rem' }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <motion.button
                          whileHover={{ scale: 1.1, backgroundColor: 'rgba(213, 162, 22, 0.15)' }}
                          whileTap={{ scale: 0.9 }}
                          className="btn-icon"
                          onClick={() => {
                            showToast(`Re-dialing ${log.studentName}...`, 'info');
                            window.open(`tel:${log.phoneNumber.replace(/\D/g, '')}`, '_self');
                          }}
                          style={{ borderRadius: '50%', background: 'rgba(213, 162, 22, 0.08)', color: 'var(--accent-primary)', border: '1px solid rgba(213, 162, 22, 0.2)', width: '30px', height: '30px' }}
                        >
                          <Phone size={14} />
                        </motion.button>
                        <div>
                          <h4 className="m-0 text-xs font-black text-primary" style={{ letterSpacing: '0.01em' }}>{log.studentName}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-muted uppercase tracking-wider">{log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="text-[9px] font-mono text-secondary opacity-60">· {log.phoneNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end">
                          <span className={`badge ${log.status === 'completed' ? 'badge-contacted' : 'badge-rejected'}`} style={{ fontSize: '0.55rem', padding: '2px 6px', borderRadius: '4px' }}>
                            {log.status.toUpperCase()}
                          </span>
                          <span className="text-[9px] text-muted font-medium mt-0.5">{log.duration > 0 ? formatTime(log.duration) : 'Missed'}</span>
                        </div>
                        <button
                          className="btn-icon"
                          style={{ color: 'var(--accent-danger)', background: 'transparent', border: 'none', width: '24px', height: '24px' }}
                          onClick={() => setCallLogs(callLogs.filter(l => l.id !== log.id))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* DESKTOP TABLE VIEW */
              <div style={{ overflowX: 'auto' }}>
                <table className="log-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Student Name</th>
                      <th>Phone Number</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callLogs.map(log => (
                      <tr key={log.id}>
                        <td>{log.timestamp.toLocaleTimeString()}</td>
                        <td className="font-medium text-primary">{log.studentName}</td>
                        <td className="font-mono text-xs">{log.phoneNumber}</td>
                        <td className="font-bold">{log.duration > 0 ? formatTime(log.duration) : '-'}</td>
                        <td>
                          <span className={`badge ${log.status === 'completed' ? 'badge-contacted' : 'badge-rejected'}`}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="flex gap-2">
                          <button
                            className="btn-icon p-1"
                            style={{ color: 'var(--accent-primary)' }}
                            onClick={() => {
                              showToast(`Initiating redial: ${log.studentName}`, 'info');
                              window.open(`tel:${log.phoneNumber.replace(/\D/g, '')}`, '_self');
                            }}
                            title="Redial"
                          >
                            <Phone size={16} />
                          </button>
                          <button className="btn-icon p-1" style={{ color: 'var(--accent-danger)' }} onClick={() => setCallLogs(callLogs.filter(l => l.id !== log.id))} title="Delete Log">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* Settings Tab */}
        {currentTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="tab-content" style={{ padding: isMobile ? '1rem' : '2rem', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <h2 style={{ fontSize: isMobile ? '1.75rem' : '2rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--text-primary)' }}>Settings</h2>

              {isMobile ? (
                <div className="mobile-settings-list">
                  {/* Automation */}
                  <div>
                    <h3 className="settings-section-title">Automations</h3>
                    <p className="settings-section-desc">Configure automatic actions and workflow delays.</p>

                    <div className="settings-card">
                      <div className="settings-row">
                        <div>
                          <div className="settings-label">Auto-Dial Delay</div>
                          <div className="settings-hint">Wait time before initiating the next call.</div>
                        </div>
                        <select
                          className="settings-input"
                          value={appSettings.autoDialDelay}
                          onChange={(e) => {
                            setAppSettings({ ...appSettings, autoDialDelay: parseInt(e.target.value) });
                            showToast('Settings saved!');
                          }}
                        >
                          <option value={1}>1 Second</option>
                          <option value={3}>3 Seconds</option>
                          <option value={5}>5 Seconds</option>
                          <option value={10}>10 Seconds</option>
                        </select>
                      </div>

                      <div className="settings-row">
                        <div>
                          <div className="settings-label">Master Switch</div>
                          <div className="settings-hint">Enable or disable auto-dialing globally.</div>
                        </div>
                        <div
                          className={`settings-toggle ${autoDialEnabled ? 'on' : 'off'}`}
                          onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                        >
                          <div className="settings-toggle-knob" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile */}
                  <div>
                    <h3 className="settings-section-title">Profile</h3>
                    <p className="settings-section-desc">Manage your contact details and communication templates.</p>

                    <div className="settings-card">
                      <div className="settings-row col">
                        <div>
                          <div className="settings-label">Caller ID</div>
                          <div className="settings-hint">The name displayed on outbound messages.</div>
                        </div>
                        <input
                          type="text"
                          className="settings-input"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                          placeholder="E.g. Admissions Office"
                          value={appSettings.callerId}
                          onChange={(e) => setAppSettings({ ...appSettings, callerId: e.target.value })}
                          onBlur={() => showToast('Settings saved!')}
                        />
                      </div>

                      <div className="settings-row col">
                        <div>
                          <div className="settings-label">Response Template</div>
                          <div className="settings-hint">Default message used for WhatsApp and SMS.</div>
                        </div>
                        <textarea
                          className="settings-input settings-textarea"
                          style={{ marginTop: '0.5rem' }}
                          placeholder="Enter template..."
                          value={appSettings.smsTemplate}
                          onChange={(e) => setAppSettings({ ...appSettings, smsTemplate: e.target.value })}
                          onBlur={() => showToast('Settings saved!')}
                        />
                        <div className="settings-hint">
                          Tags: [Name], [Course], [CallerId]
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Display — Theme picker (mobile) */}
                  <div>
                    <h3 className="settings-section-title">Display</h3>
                    <p className="settings-section-desc">Choose how the app looks on your device.</p>

                    <div className="settings-card">
                      <div className="settings-row col">
                        <div>
                          <div className="settings-label">Interface Theme</div>
                          <div className="settings-hint">Select Light, Dark, or match your OS setting.</div>
                        </div>

                        {/* Mobile theme cards — stacked for thumb comfort */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '1rem' }}>

                          {/* LIGHT */}
                          <div
                            id="mobile-theme-light"
                            role="radio"
                            aria-checked={appSettings.theme === 'light'}
                            className={`theme-card ${appSettings.theme === 'light' ? 'selected' : ''}`}
                            style={{ display: 'flex', flexDirection: 'row', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}
                            onClick={() => { setAppSettings({ ...appSettings, theme: 'light' }); showToast('Light theme applied!', 'success'); }}
                          >
                            {/* Horizontal preview strip */}
                            <div style={{ width: '90px', height: '64px', flexShrink: 0, display: 'flex', background: '#dde1ea', borderRadius: 'calc(var(--radius-md) - 2px) 0 0 calc(var(--radius-md) - 2px)', overflow: 'hidden' }}>
                              <div style={{ width: '30%', background: 'linear-gradient(180deg,#e8eaef,#dfe2e9)', borderRight: '1px solid rgba(150,160,180,0.2)' }} />
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px', gap: '4px' }}>
                                <div style={{ height: '5px', borderRadius: '3px', width: '55%', background: 'linear-gradient(90deg,#b0b8cc,#d8dce8,#a8b0c4)' }} />
                                <div style={{ height: '4px', borderRadius: '3px', width: '80%', background: 'rgba(120,130,155,0.2)' }} />
                                <div style={{ height: '4px', borderRadius: '3px', width: '65%', background: 'rgba(120,130,155,0.15)' }} />
                              </div>
                            </div>
                            <div className="theme-card-label" style={{ flex: 1, padding: '0.75rem 1rem' }}>
                              <div className="theme-card-text">
                                <div className="theme-card-name">☀️ Light</div>
                                <div className="theme-card-desc">Silver &amp; bright</div>
                              </div>
                              <div className="theme-check"><div className="theme-check-dot" /></div>
                            </div>
                          </div>

                          {/* DARK */}
                          <div
                            id="mobile-theme-dark"
                            role="radio"
                            aria-checked={appSettings.theme === 'dark'}
                            className={`theme-card ${appSettings.theme === 'dark' ? 'selected' : ''}`}
                            style={{ display: 'flex', flexDirection: 'row', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}
                            onClick={() => { setAppSettings({ ...appSettings, theme: 'dark' }); showToast('Dark theme applied!', 'success'); }}
                          >
                            <div style={{ width: '90px', height: '64px', flexShrink: 0, display: 'flex', background: '#252525', borderRadius: 'calc(var(--radius-md) - 2px) 0 0 calc(var(--radius-md) - 2px)', overflow: 'hidden' }}>
                              <div style={{ width: '30%', background: '#1a1a1a', borderRight: '1px solid rgba(255,255,255,0.05)' }} />
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px', gap: '4px' }}>
                                <div style={{ height: '5px', borderRadius: '3px', width: '55%', background: '#d5a216' }} />
                                <div style={{ height: '4px', borderRadius: '3px', width: '80%', background: 'rgba(255,255,255,0.1)' }} />
                                <div style={{ height: '4px', borderRadius: '3px', width: '65%', background: 'rgba(255,255,255,0.07)' }} />
                              </div>
                            </div>
                            <div className="theme-card-label" style={{ flex: 1, padding: '0.75rem 1rem' }}>
                              <div className="theme-card-text">
                                <div className="theme-card-name">🌑 Dark</div>
                                <div className="theme-card-desc">Easy on the eyes</div>
                              </div>
                              <div className="theme-check"><div className="theme-check-dot" /></div>
                            </div>
                          </div>

                          {/* AUTO */}
                          <div
                            id="mobile-theme-system"
                            role="radio"
                            aria-checked={appSettings.theme === 'system'}
                            className={`theme-card ${appSettings.theme === 'system' ? 'selected' : ''}`}
                            style={{ display: 'flex', flexDirection: 'row', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}
                            onClick={() => { setAppSettings({ ...appSettings, theme: 'system' }); showToast('Following system preference!', 'info'); }}
                          >
                            <div style={{ width: '90px', height: '64px', flexShrink: 0, display: 'flex', borderRadius: 'calc(var(--radius-md) - 2px) 0 0 calc(var(--radius-md) - 2px)', overflow: 'hidden' }}>
                              <div style={{ width: '50%', background: '#f0f2f7', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px', gap: '3px' }}>
                                <div style={{ height: '4px', borderRadius: '3px', width: '60%', background: 'linear-gradient(90deg,#b0b8cc,#d8dce8)' }} />
                                <div style={{ height: '3px', borderRadius: '3px', width: '80%', background: 'rgba(120,130,155,0.2)' }} />
                                <div style={{ height: '3px', borderRadius: '3px', width: '70%', background: 'rgba(120,130,155,0.15)' }} />
                              </div>
                              <div style={{ width: '50%', background: '#1a1a1a', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px', gap: '3px' }}>
                                <div style={{ height: '4px', borderRadius: '3px', width: '60%', background: '#d5a216' }} />
                                <div style={{ height: '3px', borderRadius: '3px', width: '80%', background: 'rgba(255,255,255,0.1)' }} />
                                <div style={{ height: '3px', borderRadius: '3px', width: '70%', background: 'rgba(255,255,255,0.07)' }} />
                              </div>
                            </div>
                            <div className="theme-card-label" style={{ flex: 1, padding: '0.75rem 1rem' }}>
                              <div className="theme-card-text">
                                <div className="theme-card-name">🔄 Auto</div>
                                <div className="theme-card-desc">Follows OS setting</div>
                              </div>
                              <div className="theme-check"><div className="theme-check-dot" /></div>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security */}
                  <div>
                    <h3 className="settings-section-title">Security</h3>
                    <p className="settings-section-desc">Manage your active session and security preferences.</p>

                    <div className="settings-card">
                      <div className="settings-row col">
                        <div>
                          <div className="settings-label">Active Session</div>
                          <div className="settings-hint">Currently logged in as {loginEmail || 'Agent'}.</div>
                        </div>
                        <button
                          className="btn-signout"
                          style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to sign out?')) {
                              setIsAuthenticated(false);
                              localStorage.removeItem('ksk_auth');
                              showToast('Logged out successfully', 'info');
                            }
                          }}
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="settings-wrapper">
                  {/* Left Sidebar */}
                  <div className="settings-sidebar">
                    <button className={`settings-nav-btn ${settingsTab === 'automation' ? 'active' : ''}`} onClick={() => setSettingsTab('automation')}>Automations</button>
                    <button className={`settings-nav-btn ${settingsTab === 'profile' ? 'active' : ''}`} onClick={() => setSettingsTab('profile')}>Profile</button>
                    <button className={`settings-nav-btn ${settingsTab === 'display' ? 'active' : ''}`} onClick={() => setSettingsTab('display')}>Display</button>
                    <button className={`settings-nav-btn ${settingsTab === 'database' ? 'active' : ''}`} onClick={() => setSettingsTab('database')}>
                      <Database size={18} /> Database & Sync
                    </button>
                    <div style={{ flex: 1 }}></div>
                    <button className={`settings-nav-btn danger ${settingsTab === 'security' ? 'active' : ''}`} onClick={() => setSettingsTab('security')}>
                      <Shield size={18} /> Security
                    </button>
                  </div>

                  {/* Right Content */}
                  <div className="settings-content-area">
                    {settingsTab === 'automation' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ height: '100%' }}>
                        <h3 className="settings-section-title">Automations</h3>
                        <p className="settings-section-desc">Configure automatic actions and workflow delays.</p>

                        <div className="settings-card">
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Auto-Dial Delay</div>
                              <div className="settings-hint">Wait time before initiating the next call.</div>
                            </div>
                            <select
                              className="settings-input"
                              value={appSettings.autoDialDelay}
                              onChange={(e) => {
                                setAppSettings({ ...appSettings, autoDialDelay: parseInt(e.target.value) });
                                showToast('Settings saved!');
                              }}
                            >
                              <option value={1}>1 Second</option>
                              <option value={3}>3 Seconds</option>
                              <option value={5}>5 Seconds</option>
                              <option value={10}>10 Seconds</option>
                            </select>
                          </div>

                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Master Switch</div>
                              <div className="settings-hint">Enable or disable auto-dialing globally.</div>
                            </div>
                            <div
                              className={`settings-toggle ${autoDialEnabled ? 'on' : 'off'}`}
                              onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                            >
                              <div className="settings-toggle-knob" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {settingsTab === 'profile' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ height: '100%' }}>
                        <h3 className="settings-section-title">Profile</h3>
                        <p className="settings-section-desc">Manage your contact details and communication templates.</p>

                        <div className="settings-card">
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Caller ID</div>
                              <div className="settings-hint">The name displayed on outbound messages.</div>
                            </div>
                            <input
                              type="text"
                              className="settings-input"
                              placeholder="E.g. Admissions Office"
                              value={appSettings.callerId}
                              onChange={(e) => setAppSettings({ ...appSettings, callerId: e.target.value })}
                              onBlur={() => showToast('Settings saved!')}
                            />
                          </div>

                          <div className="settings-row col">
                            <div>
                              <div className="settings-label">Response Template</div>
                              <div className="settings-hint">Default message used for WhatsApp and SMS outreach.</div>
                            </div>
                            <textarea
                              className="settings-input settings-textarea"
                              style={{ marginTop: '0.75rem' }}
                              placeholder="Enter template..."
                              value={appSettings.smsTemplate}
                              onChange={(e) => setAppSettings({ ...appSettings, smsTemplate: e.target.value })}
                              onBlur={() => showToast('Settings saved!')}
                            />
                            <div className="settings-hint">
                              Available Tags: [Name], [Course], [CallerId]
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {settingsTab === 'display' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ height: '100%' }}>
                        <h3 className="settings-section-title">Display</h3>
                        <p className="settings-section-desc">Choose the visual theme for your workspace.</p>

                        <div className="settings-card">
                          <div className="settings-row col">
                            <div>
                              <div className="settings-label">Interface Theme</div>
                              <div className="settings-hint">Select Light, Dark, or let the system decide automatically.</div>
                            </div>

                            <div className="theme-picker-grid" style={{ width: '100%', marginTop: '1rem' }}>

                              {/* LIGHT CARD */}
                              <div
                                id="theme-light"
                                className={`theme-card ${appSettings.theme === 'light' ? 'selected' : ''}`}
                                onClick={() => { setAppSettings({ ...appSettings, theme: 'light' }); showToast('Light theme applied!', 'success'); }}
                                role="radio"
                                aria-checked={appSettings.theme === 'light'}
                              >
                                <div className="theme-card-preview theme-preview-light">
                                  <div className="preview-sidebar" />
                                  <div className="preview-main">
                                    <div className="preview-bar gold" />
                                    <div className="preview-bar" />
                                    <div className="preview-bar short" />
                                    <div className="preview-bar" />
                                  </div>
                                </div>
                                <div className="theme-card-label">
                                  <div className="theme-card-text">
                                    <div className="theme-card-name">Light</div>
                                    <div className="theme-card-desc">Clean &amp; bright</div>
                                  </div>
                                  <div className="theme-check"><div className="theme-check-dot" /></div>
                                </div>
                              </div>

                              {/* DARK CARD */}
                              <div
                                id="theme-dark"
                                className={`theme-card ${appSettings.theme === 'dark' ? 'selected' : ''}`}
                                onClick={() => { setAppSettings({ ...appSettings, theme: 'dark' }); showToast('Dark theme applied!', 'success'); }}
                                role="radio"
                                aria-checked={appSettings.theme === 'dark'}
                              >
                                <div className="theme-card-preview theme-preview-dark">
                                  <div className="preview-sidebar" />
                                  <div className="preview-main">
                                    <div className="preview-bar gold" />
                                    <div className="preview-bar" />
                                    <div className="preview-bar short" />
                                    <div className="preview-bar" />
                                  </div>
                                </div>
                                <div className="theme-card-label">
                                  <div className="theme-card-text">
                                    <div className="theme-card-name">Dark</div>
                                    <div className="theme-card-desc">Easy on the eyes</div>
                                  </div>
                                  <div className="theme-check"><div className="theme-check-dot" /></div>
                                </div>
                              </div>

                              {/* SYSTEM CARD */}
                              <div
                                id="theme-system"
                                className={`theme-card ${appSettings.theme === 'system' ? 'selected' : ''}`}
                                onClick={() => { setAppSettings({ ...appSettings, theme: 'system' }); showToast('Following system preference!', 'info'); }}
                                role="radio"
                                aria-checked={appSettings.theme === 'system'}
                              >
                                <div className="theme-card-preview theme-preview-system">
                                  <div className="preview-system-left">
                                    <div className="preview-bar-light gold" />
                                    <div className="preview-bar-light" />
                                    <div className="preview-bar-light" />
                                  </div>
                                  <div className="preview-system-right">
                                    <div className="preview-bar-dark gold" />
                                    <div className="preview-bar-dark" />
                                    <div className="preview-bar-dark" />
                                  </div>
                                </div>
                                <div className="theme-card-label">
                                  <div className="theme-card-text">
                                    <div className="theme-card-name">Auto</div>
                                    <div className="theme-card-desc">Follows OS setting</div>
                                  </div>
                                  <div className="theme-check"><div className="theme-check-dot" /></div>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {settingsTab === 'security' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ height: '100%' }}>
                        <h3 className="settings-section-title">Security</h3>
                        <p className="settings-section-desc">Manage your active session and security preferences.</p>

                        <div className="settings-card">
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Active Session</div>
                              <div className="settings-hint">Currently logged in as {loginEmail || 'Agent'}.</div>
                            </div>
                            <button
                              className="btn-signout"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to sign out?')) {
                                  setIsAuthenticated(false);
                                  localStorage.removeItem('ksk_auth');
                                  showToast('Logged out successfully', 'info');
                                }
                              }}
                            >
                              <LogOut size={18} /> Sign Out
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {settingsTab === 'database' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} style={{ height: '100%' }}>
                        <h3 className="settings-section-title">Database & Sync</h3>
                        <p className="settings-section-desc">Manage your local records and cloud synchronization.</p>

                        {/* EXPORT JSON */}
                        <div className="settings-card" style={{ marginBottom: '1rem' }}>
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">JSON Backup</div>
                              <div className="settings-hint">Export full workspace state (students, drives, logs).</div>
                            </div>
                            <button className="btn btn-secondary" onClick={() => {
                              const data = { students, drives, callLogs, settings: appSettings, exportDate: new Date().toISOString() };
                              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `GFLB_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
                              link.click();
                              showToast('Backup exported!', 'success');
                            }}>
                              <Download size={18} /> Export
                            </button>
                          </div>
                        </div>

                        {/* IMPORT CSV / EXCEL */}
                        <div className="settings-card" style={{ marginBottom: '1rem' }}>
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Excel / CSV Import</div>
                              <div className="settings-hint">Upload any contact list and map your columns.</div>
                            </div>
                            <div className="flex gap-2">
                              <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }} onClick={() => {
                                const csvContent = "Name,Phone,Course\nRahul Sharma,9876543210,B.Tech CS\nPriya Patel,9123456789,MBA";
                                const blob = new Blob([csvContent], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = "GFLB_Import_Template.csv";
                                link.click();
                              }}>Template</button>
                              <label className="btn btn-secondary" style={{ cursor: 'pointer', borderColor: 'var(--accent-primary)' }}>
                                <FileSpreadsheet size={18} /> Upload CSV
                                <input 
                                  type="file" 
                                  accept=".csv" 
                                  style={{ display: 'none' }} 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const text = event.target?.result as string;
                                      const lines = text.split('\n').filter(l => l.trim());
                                      if (lines.length < 2) { showToast('CSV is empty!', 'error'); return; }
                                      const headers = lines[0].split(',').map(h => h.trim());
                                      const rows = lines.slice(1).map(l => l.split(',').map(s => s.trim()));
                                      setCsvPreview({ headers, rows, fileName: file.name });
                                      setIsCsvModalOpen(true);
                                    };
                                    reader.readAsText(file);
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* RESTORE JSON */}
                        <div className="settings-card" style={{ marginBottom: '1rem' }}>
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Restore State</div>
                              <div className="settings-hint">Import data from a .json backup file.</div>
                            </div>
                            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                              <Upload size={18} /> Restore JSON
                              <input 
                                type="file" 
                                accept=".json" 
                                style={{ display: 'none' }} 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    try {
                                      const data = JSON.parse(event.target?.result as string);
                                      if (data.students) setStudents(data.students);
                                      if (data.drives) setDrives(data.drives);
                                      if (data.callLogs) setCallLogs(data.callLogs);
                                      showToast('System restored!', 'success');
                                    } catch (err) {
                                      showToast('Invalid backup file.', 'error');
                                    }
                                  };
                                  reader.readAsText(file);
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {/* CLOUD */}
                        <div className="settings-card" style={{ border: '1px solid rgba(var(--accent-rgb), 0.2)', background: 'rgba(var(--accent-rgb), 0.03)' }}>
                          <div className="settings-row">
                            <div>
                              <div className="settings-label">Cloud Sync</div>
                              <div className="settings-hint">Connect to Firebase to share data across devices.</div>
                            </div>
                            <button className="btn btn-primary" style={{ opacity: 0.6, cursor: 'not-allowed' }} title="Cloud feature coming soon">
                              <Cloud size={18} /> Connect Cloud
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </main>

      {/* Floating Action Button - Contextual Mobile Actions */}
      {isMobile && !viewingDrive && (
        <motion.button
          key={currentTab === 'drives' ? 'new-drive' : 'dial-pad'}
          className="mobile-fab"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (currentTab === 'drives') {
              openAddDriveModal();
            } else {
              setIsDialPadOpen(true);
            }
          }}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          style={{
            background: currentTab === 'drives'
              ? 'linear-gradient(135deg, var(--accent-success), #059669)'
              : 'linear-gradient(135deg, #8c6909, #d5a216)',
            boxShadow: currentTab === 'drives'
              ? '0 0 24px rgba(16, 185, 129, 0.45)'
              : '0 0 24px rgba(213, 162, 22, 0.45)'
          }}
        >
          {currentTab === 'drives' ? <Plus size={28} /> : <Grid3x3 size={24} />}
        </motion.button>
      )}

      {/* Edit/Add Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingStudent && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-content"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="modal-header">
                <h2>{isNewContact ? 'Add New Contact' : `Edit Contact - ${editingStudent.name}`}</h2>
                <button className="btn-icon" onClick={() => setIsEditModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Avatar URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="https://..."
                      value={editingStudent.avatar}
                      onChange={(e) => setEditingStudent({ ...editingStudent, avatar: e.target.value })}
                    />
                    <button className="btn btn-secondary" onClick={() => setEditingStudent({ ...editingStudent, avatar: defaultAvatar })}>
                      Default
                    </button>
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Full Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="E.g. Santhosh Kumar"
                    value={editingStudent.name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="input-group flex-1">
                    <label className="input-label">Course / Degree</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="E.g. B.Tech Computer Science"
                      value={editingStudent.course}
                      onChange={(e) => setEditingStudent({ ...editingStudent, course: e.target.value })}
                    />
                  </div>
                  <div className="input-group flex-1">
                    <label className="input-label">Batch / Year</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="E.g. First Year"
                      value={editingStudent.year}
                      onChange={(e) => setEditingStudent({ ...editingStudent, year: e.target.value })}
                    />
                  </div>
                </div>

                {/* Phone Numbers CRUD */}
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="input-label" style={{ margin: 0 }}>Phone Numbers</label>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={addPhoneNumber}>
                      <Plus size={14} /> Add Number
                    </button>
                  </div>

                  {editingStudent.phoneNumbers.map((phone) => {
                    const prefixMatch = phone.number.match(/^\+\d+\s*/);
                    const currentPrefix = prefixMatch ? prefixMatch[0].trim() : '+91';
                    const numberWithoutPrefix = prefixMatch ? phone.number.slice(prefixMatch[0].length).trim() : phone.number.trim();

                    return (
                      <div key={phone.id} className="phone-item">
                        <select
                          value={phone.type}
                          onChange={(e) => handlePhoneChange(phone.id, 'type', e.target.value)}
                        >
                          <option value="Mobile">Mobile</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Home">Home</option>
                          <option value="Work">Work</option>
                          <option value="Other">Other</option>
                        </select>
                        <select
                          value={currentPrefix}
                          onChange={(e) => {
                            const newPrefix = e.target.value;
                            handlePhoneChange(phone.id, 'number', `${newPrefix} ${numberWithoutPrefix}`);
                          }}
                        >
                          <option value="+91">+91</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+61">+61</option>
                          <option value="+971">+971</option>
                        </select>
                        <input
                          type="text"
                          value={numberWithoutPrefix}
                          placeholder="98765 43210"
                          onChange={(e) => {
                            handlePhoneChange(phone.id, 'number', `${currentPrefix} ${e.target.value}`);
                          }}
                        />
                        <button className="btn-icon" style={{ color: 'var(--accent-danger)' }} onClick={() => removePhoneNumber(phone.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  })}
                  {editingStudent.phoneNumbers.length === 0 && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No phone numbers. Add one to make calls.</p>
                  )}
                </div>

                <div className="input-group">
                  <label className="input-label">Email ID</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="[EMAIL_ADDRESS]"
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <div className="flex gap-2 w-full md:w-auto">
                  <button className="btn btn-secondary flex-1 md:flex-none" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary flex-1 md:flex-none" onClick={saveProfile}>{isNewContact ? 'Add Contact' : 'Save Changes'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
           PREMIUM DIAL PAD MODAL
      ════════════════════════════════════════════ */}
      <AnimatePresence>
        {isDialPadOpen && (
          <motion.div
            className={`dialpad-overlay ${isMobile ? 'mobile' : 'desktop'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) { setIsDialPadOpen(false); setDialNumber(''); } }}
          >
            <motion.div
              className={`dialpad-container ${isMobile ? 'mobile-sheet' : 'desktop-dock'}`}
              initial={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
              animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
              exit={isMobile ? { y: '100%' } : { x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              {isMobile && <div className="sheet-handle" />}

              {/* PC NAVIGATION TABS */}
              {!isMobile && (
                <div className="dialpad-tabs">
                  <button
                    className={`dialpad-tab ${dialPadTab === 'keypad' ? 'active' : ''}`}
                    onClick={() => setDialPadTab('keypad')}
                  >
                    <Grid3x3 size={16} /> Keypad
                  </button>
                  <button
                    className={`dialpad-tab ${dialPadTab === 'history' ? 'active' : ''}`}
                    onClick={() => setDialPadTab('history')}
                  >
                    <Phone size={16} /> History
                  </button>
                  <div style={{ flex: 1 }}></div>
                  <button className="btn-icon transparent" onClick={() => setIsDialPadOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* MOBILE HEADER */}
              {isMobile && (
                <div className="dialpad-header">
                  <span className="text-xl font-bold">Phone Dialer</span>
                  <button className="btn-icon" onClick={() => setIsDialPadOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
              )}

              <div className="dialpad-content">
                {(!isMobile && dialPadTab === 'history') ? (
                  <div className="dialpad-history">
                    <div className="px-4 py-2">
                      <input
                        type="text"
                        placeholder="Search logs..."
                        className="search-input sm"
                        value={dialPadSearch}
                        onChange={(e) => setDialPadSearch(e.target.value)}
                      />
                    </div>
                    <div className="history-list">
                      {callLogs
                        .filter(log => log.studentName.toLowerCase().includes(dialPadSearch.toLowerCase()) || log.phoneNumber.includes(dialPadSearch))
                        .slice(0, 20)
                        .map(log => (
                          <div key={log.id} className="history-item" onClick={() => setDialNumber(log.phoneNumber)}>
                            <div className="history-info">
                              <span className="history-name">{log.studentName}</span>
                              <span className="history-meta">{log.phoneNumber} • {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <Phone size={14} className="history-icon" />
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="dialpad-display-section">
                      <div className="dialpad-display-main">
                        <div className="dialpad-number-wrap">
                          <span className="dialpad-number-text">
                            {dialNumber || <span className="placeholder">Enter Number</span>}
                          </span>
                        </div>
                        {dialNumber && (
                          <button className="dialpad-clear-btn" onClick={() => setDialNumber(prev => prev.slice(0, -1))}>
                            <Delete size={20} />
                          </button>
                        )}
                      </div>

                      {/* Active Contact Indicator */}
                      {dialNumber && students.find(s => s.phoneNumbers.some(p => p.number.replace(/\D/g, '').includes(dialNumber.replace(/\D/g, '')))) && (
                        <div className="dialpad-contact-match">
                          <CheckCircle2 size={12} />
                          <span>Matched: {students.find(s => s.phoneNumbers.some(p => p.number.replace(/\D/g, '').includes(dialNumber.replace(/\D/g, ''))))?.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="dialpad-keys-section">
                      <div className="dialpad-keys-grid">
                        {[
                          { d: '1', s: '' }, { d: '2', s: 'ABC' }, { d: '3', s: 'DEF' },
                          { d: '4', s: 'GHI' }, { d: '5', s: 'JKL' }, { d: '6', s: 'MNO' },
                          { d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' }, { d: '9', s: 'WXYZ' },
                          { d: '*', s: '' }, { d: '0', s: '+' }, { d: '#', s: '' },
                        ].map(({ d, s }) => (
                          <motion.button
                            key={d}
                            whileTap={{ scale: 0.9, backgroundColor: 'var(--accent-primary)', color: '#fff' }}
                            className="dialpad-btn"
                            onClick={() => setDialNumber(prev => prev.length < 15 ? prev + d : prev)}
                          >
                            <span className="digit">{d}</span>
                            <span className="sub">{s}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="dialpad-footer-actions">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        className="dialpad-main-call-btn"
                        disabled={!dialNumber}
                        onClick={() => {
                          const clean = dialNumber.replace(/[^\d+]/g, '');
                          window.open(`tel:${clean}`, '_self');
                          showToast(`Dialing ${dialNumber}...`, 'info');
                          setIsDialPadOpen(false);
                          setDialNumber('');
                        }}
                      >
                        <PhoneCall size={24} />
                        <span>Call</span>
                      </motion.button>

                      {!isMobile && (
                        <button className="btn-icon secondary" title="Paste" onClick={async () => {
                          const text = await navigator.clipboard.readText();
                          if (text) setDialNumber(text.replace(/[^\d+*#]/g, '').slice(0, 15));
                        }}>
                          <Copy size={18} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drive Modal */}
      <AnimatePresence>
        {isDriveModalOpen && editingDrive && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-content"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="modal-header">
                <h2>{isNewDrive ? 'Create Admission Drive' : 'Edit Drive'}</h2>
                <button className="btn-icon" onClick={() => setIsDriveModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Campaign Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="E.g. Engineering Target 2026"
                    value={editingDrive.name}
                    onChange={(e) => setEditingDrive({ ...editingDrive, name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px' }}
                    placeholder="Campaign details..."
                    value={editingDrive.description}
                    onChange={(e) => setEditingDrive({ ...editingDrive, description: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Bulk Add Phone Numbers</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px' }}
                    placeholder="E.g. 9876543210, 8765432109 (comma or newline separated)"
                    value={bulkPhoneNumbers}
                    onChange={(e) => setBulkPhoneNumbers(e.target.value)}
                  />
                  <span className="text-xs text-muted mt-1">Contacts will be automatically created and assigned.</span>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="input-group flex-1">
                    <label className="input-label">Status</label>
                    <select
                      className="input-field"
                      value={editingDrive.status}
                      onChange={(e) => setEditingDrive({ ...editingDrive, status: e.target.value as any })}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {!isNewDrive && (
                  <button className={`btn btn-secondary ${isMobile ? '' : 'mr-auto'}`} style={{ color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }} onClick={() => deleteDrive(editingDrive.id)}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <div className="flex gap-2 w-full md:w-auto">
                  <button className="btn btn-secondary flex-1 md:flex-none" onClick={() => setIsDriveModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary flex-1 md:flex-none" onClick={saveDrive}>{isNewDrive ? 'Create Drive' : 'Save Changes'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HI-TECH Notification System (Main App) ── */}
      <div className={`hud-notif-container ${isMobile ? 'mobile' : 'desktop'}`}>
        <AnimatePresence>
          {toast && (
            <motion.div
              className={`hud-notif hud-notif-${toast.type}`}
              initial={{ opacity: 0, y: -60, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <div className="hud-notif-icon">
                {toast.type === 'error' && <X size={14} />}
                {toast.type === 'success' && <CheckCircle2 size={14} />}
                {toast.type === 'info' && <Bell size={14} />}
              </div>
              <div className="hud-notif-body">
                <span className="hud-notif-label">
                  {toast.type === 'error' ? 'SYS_ERROR' : toast.type === 'success' ? 'SYS_OK' : 'SYS_INFO'}
                </span>
                <span className="hud-notif-msg">{toast.message}</span>
              </div>
              <div className="hud-notif-bar" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
            ></div>
            <motion.div
              initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
              exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
              className={isMobile ? 'mobile-bottom-sheet' : ''}
              style={isMobile ? {} : {
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 9999,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                padding: '0.5rem',
                minWidth: '150px'
              }}
            >
              {isMobile && <div className="sheet-handle" />}
              <div className={isMobile ? 'flex flex-col gap-3' : ''}>
                <button
                  className="w-full text-left p-4 hover:bg-tertiary rounded-xl flex items-center gap-4 transition-all active:scale-95"
                  style={{
                    backgroundColor: isMobile ? 'rgba(213, 162, 22, 0.08)' : 'transparent',
                    border: isMobile ? '1px solid rgba(213, 162, 22, 0.15)' : 'none',
                    color: 'var(--text-primary)',
                    width: '100%',
                    cursor: 'pointer',
                    fontSize: isMobile ? '1.15rem' : '0.9rem',
                    fontWeight: 600
                  }}
                  onClick={() => {
                    openEditContactModal(contextMenu.student);
                    setContextMenu(null);
                  }}
                >
                  <Edit3 size={isMobile ? 24 : 16} style={{ color: 'var(--accent-primary)' }} />
                  <div className="flex flex-col">
                    <span>Edit Contact</span>
                    {isMobile && <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 400 }}>Modify details or phone numbers</span>}
                  </div>
                </button>
                <button
                  className="w-full text-left p-4 hover:bg-tertiary rounded-xl flex items-center gap-4 transition-all active:scale-95"
                  style={{
                    backgroundColor: isMobile ? 'rgba(255, 45, 85, 0.05)' : 'transparent',
                    border: isMobile ? '1px solid rgba(255, 45, 85, 0.1)' : 'none',
                    color: 'var(--accent-danger)',
                    width: '100%',
                    cursor: 'pointer',
                    fontSize: isMobile ? '1.15rem' : '0.9rem',
                    fontWeight: 600
                  }}
                  onClick={() => {
                    const drive = drives.find(d => d.id === contextMenu.driveId);
                    if (drive) {
                      const updatedDrive = { ...drive, contactIds: drive.contactIds.filter(id => id !== contextMenu.student.id) };
                      setDrives(drives.map(d => d.id === updatedDrive.id ? updatedDrive : d));
                      if (viewingDrive?.id === updatedDrive.id) {
                        setViewingDrive(updatedDrive);
                      }
                      showToast('Contact removed from campaign', 'info');
                    }
                    setContextMenu(null);
                  }}
                >
                  <Trash2 size={isMobile ? 24 : 16} />
                  <div className="flex flex-col">
                    <span>Remove from Campaign</span>
                    {isMobile && <span style={{ fontSize: '0.75rem', opacity: 0.6, fontWeight: 400 }}>Delete this lead from {viewingDrive?.name}</span>}
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
        {isCsvModalOpen && csvPreview && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="modal-content" style={{ maxWidth: '600px' }} initial={{ y: 50 }} animate={{ y: 0 }}>
              <div className="modal-header">
                <h2>Map CSV Columns</h2>
                <button className="btn-icon" onClick={() => setIsCsvModalOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                  File: <strong>{csvPreview.fileName}</strong><br/>
                  Select which CSV columns correspond to our contact fields.
                </p>
                
                <div className="flex flex-col gap-4">
                  {[
                    { label: 'Contact Name', key: 'name' },
                    { label: 'Phone Number', key: 'phone' },
                    { label: 'Course / Campaign', key: 'course' }
                  ].map(field => (
                    <div key={field.key} className="flex justify-between items-center p-3" style={{ background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 600 }}>{field.label}</span>
                      <select 
                        value={csvMapping[field.key as keyof typeof csvMapping]} 
                        onChange={(e) => setCsvMapping({...csvMapping, [field.key]: parseInt(e.target.value)})}
                        style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      >
                        {csvPreview.headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i+1}`}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(var(--accent-rgb), 0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <strong>Preview (Row 1):</strong><br/>
                  Name: {csvPreview.rows[0][csvMapping.name] || 'N/A'} | 
                  Phone: {csvPreview.rows[0][csvMapping.phone] || 'N/A'}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setIsCsvModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => {
                  const newStudents: Student[] = csvPreview.rows.map((row, i) => ({
                    id: `csv_${Date.now()}_${i}`,
                    name: row[csvMapping.name] || 'Unnamed Lead',
                    phoneNumbers: [{ id: `p_${Date.now()}_${i}`, type: 'Mobile', number: (row[csvMapping.phone] || '').replace(/\D/g, '') }],
                    course: row[csvMapping.course] || 'Imported List',
                    year: 'N/A',
                    email: '',
                    status: 'new' as Student['status'],
                    notes: `Imported from ${csvPreview.fileName}`,
                    avatar: defaultAvatar
                  })).filter(s => s.phoneNumbers[0].number);

                  setStudents(prev => [...newStudents, ...prev]);
                  setIsCsvModalOpen(false);
                  showToast(`Successfully imported ${newStudents.length} contacts!`, 'success');
                }}>Complete Import</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
