/* eslint-disable react-hooks/set-state-in-effect, react-hooks/purity, @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import {
  Phone, Users, LayoutDashboard, Settings, Search,
  PhoneCall, PhoneOff, MessageSquare, Mail,
  FileText, Copy, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronDown, X, Plus, Trash, Trash2, Edit, Edit3, SkipForward, Power, Download, FolderPlus, Cloud, LogOut, Bell, Save,
  Grid3x3, Delete, Database, Upload, BarChart3, Check, UserPlus,
  LayoutGrid, Layers, Activity, Zap, MoreHorizontal, PhoneIncoming, Clock,
} from 'lucide-react';
// import './Landing.css';

import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import * as XLSX from 'xlsx';
import { db } from './firebase';
import {
  collection, doc, setDoc, onSnapshot, query,
  orderBy, deleteDoc
} from 'firebase/firestore';
import { studentsData, type Student, type PhoneNumber } from './data';
import gflbLogo from './assets/GFLB LOGO.png';
// Dynamic default avatar generator
const getAvatar = (name: string, existingAvatar?: string) => {
  if (existingAvatar && !existingAvatar.includes('default_avatar.png') && existingAvatar.startsWith('http')) {
    return existingAvatar;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff`;
};

// Clean phone number for comparison
const cleanPhone = (num: string) => (num || '').replace(/[^\d+]/g, '');
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

type AppSettings = {
  autoDialDelay: number;
  callerId: string;
  theme: 'light' | 'dark' | 'system' | 'gold' | 'silver';
  smsTemplate: string;
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
      avatar: getAvatar(s.name, s.avatar)
    }));
    return parsed;
  });
  const [activeStudent, setActiveStudent] = useState<Student>(() => {
    const saved = localStorage.getItem('ksk_students');
    let parsed = saved ? JSON.parse(saved) : studentsData;
    parsed = parsed.map((s: Student) => ({
      ...s,
      avatar: getAvatar(s.name, s.avatar)
    }));
    return parsed.length > 0 ? parsed[0] : studentsData[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [driveSearchTerm, setDriveSearchTerm] = useState('');
  const [driveContactSearchTerm, setDriveContactSearchTerm] = useState('');

  // Navigation State
  const [currentTab, setCurrentTab] = useState<'contacts' | 'drives' | 'logs' | 'analytics' | 'settings'>('contacts');
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
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ksk_settings');
    return saved ? JSON.parse(saved) : {
      autoDialDelay: 3,
      callerId: 'University Admissions',
      theme: 'system',
      smsTemplate: 'Hi [Name], this is from [CallerId].'
    };
  });


  // Dial Pad State
  const [isDialPadOpen, setIsDialPadOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [dialPadTab, setDialPadTab] = useState<'keypad' | 'history'>('keypad');
  const [dialPadSearch, setDialPadSearch] = useState('');
  const [isCloudEnabled, setIsCloudEnabled] = useState(() => {
    return localStorage.getItem('ksk_cloud_enabled') === 'true';
  });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, student: Student, driveId: string } | null>(null);

  useEffect(() => {
    if (!isCloudEnabled) {
      localStorage.setItem('ksk_students', JSON.stringify(students));
    }
  }, [students, isCloudEnabled]);

  useEffect(() => {
    if (!isCloudEnabled) {
      localStorage.setItem('ksk_drives', JSON.stringify(drives));
    }
  }, [drives, isCloudEnabled]);

  useEffect(() => {
    if (!isCloudEnabled) {
      localStorage.setItem('ksk_callLogs', JSON.stringify(callLogs));
    }
  }, [callLogs, isCloudEnabled]);

  useEffect(() => { localStorage.setItem('ksk_settings', JSON.stringify(appSettings)); }, [appSettings]);

  // Firebase Real-time Sync
  useEffect(() => {
    if (!isCloudEnabled) return;

    const unsubStudents = onSnapshot(collection(db, "students"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as Student));
      if (data.length > 0) setStudents(data);
    });

    const unsubDrives = onSnapshot(collection(db, "drives"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data() } as Drive));
      if (data.length > 0) setDrives(data);
    });

    const unsubLogs = onSnapshot(query(collection(db, "callLogs"), orderBy("timestamp", "desc")), (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return { ...d, timestamp: d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp) } as CallLog;
      });
      setCallLogs(data);
    });

    return () => {
      unsubStudents();
      unsubDrives();
      unsubLogs();
    };
  }, [isCloudEnabled]);

  useEffect(() => {
    document.body.classList.remove('theme-neon-dark', 'theme-solar-gold', 'theme-lunar-silv', 'theme-auto-sync');
    if (appSettings.theme === 'dark') document.body.classList.add('theme-neon-dark');
    else if (appSettings.theme === 'gold') document.body.classList.add('theme-solar-gold');
    else if (appSettings.theme === 'silver') document.body.classList.add('theme-lunar-silv');
    else document.body.classList.add('theme-auto-sync');
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
  const [csvPreview, setCsvPreview] = useState<{
    sheets: { name: string, headers: string[], rows: any[][] }[],
    fileName: string
  } | null>(null);
  const [csvMapping, setCsvMapping] = useState({
    name: 0,
    phone: 1,
    course: 2,
    gender: 3,
    dob: 4,
    guardianPhone: 5
  });
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedDriveForImport, setSelectedDriveForImport] = useState<string>('');
  const [overrideCourseWithDrive, setOverrideCourseWithDrive] = useState<boolean>(true);

  // Campaign Filters
  const [isDriveFilterOpen, setIsDriveFilterOpen] = useState(false);
  const [driveFilterGender, setDriveFilterGender] = useState('');
  const [driveFilterCourse, setDriveFilterCourse] = useState('');
  const [driveFilterBatch, setDriveFilterBatch] = useState('');
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [selectedContactsForDrive, setSelectedContactsForDrive] = useState<string[]>([]);
  const [addContactSearchTerm, setAddContactSearchTerm] = useState('');

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
    if (!isMobile || currentTab !== 'contacts' || mobileViewMode !== 'detail') return;

    window.history.pushState({ kskMobileView: 'contact-detail' }, '');

    const handlePopState = () => {
      setMobileViewMode('list');
    };

    window.addEventListener('popstate', handlePopState, { once: true });
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile, currentTab, mobileViewMode, activeStudent?.id]);

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

  const handleCallToggle = async () => {
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

      if (isCloudEnabled) {
        try {
          await setDoc(doc(db, "callLogs", newLog.id), newLog);
        } catch (err) {
          console.error('Cloud log error:', err);
        }
      }

      setCallLogs(prev => [newLog, ...prev]);

      if (activeStudent.status === 'new') {
        updateStudentInList({ ...activeStudent, status: 'contacted', lastContact: 'Just now' });
      }

      if (autoDialEnabled) {
        let currentList: Student[];
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

  const updateStudentInList = async (updatedStudent: Student) => {
    if (isCloudEnabled) {
      try {
        await setDoc(doc(db, "students", updatedStudent.id), updatedStudent);
      } catch (err) {
        console.error('Cloud update error:', err);
      }
    }
    const updatedStudents = students.map(s =>
      s.id === updatedStudent.id ? updatedStudent : s
    );
    setStudents(updatedStudents);
    if (activeStudent?.id === updatedStudent.id || !activeStudent) {
      setActiveStudent(updatedStudent);
    }
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

  const navigateTo = (tab: 'contacts' | 'drives' | 'logs' | 'analytics' | 'settings') => {
    setCurrentTab(tab);
    if (tab === 'drives') {
      setViewingDrive(null);
    }
    if (isMobile && tab === 'contacts') {
      setMobileViewMode('list');
    }
    setIsMobileMenuOpen(false);
  }

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetsData: any[] = [];

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (json.length > 0) {
          const headers = json[0].map((h: any) => String(h || '').trim());
          const rows = json.slice(1).filter(r => r.length > 0);
          sheetsData.push({ name: sheetName, headers, rows });
        }
      });

      if (sheetsData.length === 0) {
        showToast('File is empty!', 'error');
        return;
      }
      setCsvPreview({ sheets: sheetsData, fileName: file.name });
      setIsCsvModalOpen(true);
    };
    reader.readAsBinaryString(file);
  };

  // --- Add/Edit Contact Logic ---


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
      avatar: getAvatar('New Contact'),
    };
    setEditingStudent(blankStudent);
    setIsNewContact(true);
    setIsEditModalOpen(true);
  };

  const saveProfile = async () => {
    if (editingStudent) {
      if (!editingStudent.name.trim()) {
        showToast('Name is required!', 'error');
        return;
      }

      // Duplicate check
      for (const phone of editingStudent.phoneNumbers) {
        const cleaned = cleanPhone(phone.number);
        if (!cleaned) continue;

        const exists = students.find(s =>
          s.id !== editingStudent.id &&
          s.phoneNumbers.some(p => cleanPhone(p.number) === cleaned)
        );

        if (exists) {
          showToast(`Number ${phone.number} already exists with ${exists.name}`, 'error');
          return;
        }
      }

      if (isCloudEnabled) {
        try {
          await setDoc(doc(db, "students", editingStudent.id), editingStudent);
          showToast(isNewContact ? 'Contact added to cloud!' : 'Cloud updated!');
        } catch (err) {
          console.error('Cloud save error:', err);
          showToast('Failed to save to cloud', 'error');
        }
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

  const saveDrive = async () => {
    if (editingDrive) {
      if (!editingDrive.name.trim()) {
        showToast('Drive name is required!', 'error');
        return;
      }

      const newContactIds: string[] = [];
      const newStudents: Student[] = [];

      if (bulkPhoneNumbers.trim()) {
        const phones = bulkPhoneNumbers.split(/[\n,]+/).map(p => p.trim()).filter(p => p.length > 0);
        let skippedCount = 0;

        phones.forEach((phone, index) => {
          const cleaned = cleanPhone(phone);
          const alreadyExists = students.some(s => s.phoneNumbers.some(p => cleanPhone(p.number) === cleaned));

          if (alreadyExists) {
            skippedCount++;
            return;
          }

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
            avatar: getAvatar(`Unknown Contact ${phone.slice(-4)}`),
          };
          newStudents.push(newStudent);
          newContactIds.push(newStudentId);
        });

        if (skippedCount > 0) {
          showToast(`${skippedCount} numbers skipped (already exist)`, 'info');
        }
      }

      const updatedDrive = {
        ...editingDrive,
        contactIds: [...editingDrive.contactIds, ...newContactIds]
      };

      if (isCloudEnabled) {
        try {
          // Save the drive
          await setDoc(doc(db, "drives", updatedDrive.id), updatedDrive);
          // Save any new bulk contacts
          for (const s of newStudents) {
            await setDoc(doc(db, "students", s.id), s);
          }
          showToast('Cloud campaign updated!');
        } catch (err) {
          console.error('Cloud drive save error:', err);
        }
      }

      if (newStudents.length > 0) {
        setStudents(prev => [...newStudents, ...prev]);
      }

      if (isNewDrive) {
        setDrives([...drives, updatedDrive]);
        showToast('Admission drive created successfully!');
      } else {
        setDrives(drives.map(d => d.id === updatedDrive.id ? updatedDrive : d));
        if (viewingDrive?.id === updatedDrive.id) {
          setViewingDrive(updatedDrive);
        }
        showToast('Admission drive updated!');
      }
      setBulkPhoneNumbers('');
      setIsDriveModalOpen(false);
    }
  };

  const deleteStudent = async (id: string) => {
    if (isCloudEnabled) {
      try {
        await deleteDoc(doc(db, "students", id));
      } catch (err) {
        console.error('Cloud delete error:', err);
      }
    }
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

  const deleteDrive = async (id: string) => {
    if (isCloudEnabled) {
      try {
        await deleteDoc(doc(db, "drives", id));
      } catch (err) {
        console.error('Cloud delete error:', err);
      }
    }
    setDrives(drives.filter(d => d.id !== id));
    if (viewingDrive?.id === id) setViewingDrive(null);
    showToast('Drive deleted successfully.', 'success');
  };

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

  const handleGoogleSuccess = (credentialResponse: any) => {
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      setIsAuthenticated(true);
      localStorage.setItem('ksk_auth', 'true');
      localStorage.setItem('ksk_user', JSON.stringify({
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture
      }));
      setLoginEmail(decoded.email);
      showToast(`Welcome, ${decoded.name}!`, 'success');
    } catch (err) {
      console.error('Google decode error:', err);
      showToast('Authentication failed', 'error');
    }
  };

  // Analytics Computation
  const stats = {
    total: students.length,
    new: students.filter(s => s.status === 'new').length,
    contacted: students.filter(s => s.status === 'contacted').length,
    enrolled: students.filter(s => s.status === 'enrolled').length,
    interested: students.filter(s => s.status !== 'not_interested' && s.status !== 'new').length,
    conversionRate: students.length > 0 ? Math.round((students.filter(s => s.status === 'enrolled').length / students.length) * 100) : 0,
    totalCallTime: callLogs.reduce((acc, log) => acc + log.duration, 0),
    avgCallTime: callLogs.length > 0 ? Math.round(callLogs.reduce((acc, log) => acc + log.duration, 0) / callLogs.length) : 0
  };



  if (!isAuthenticated) {
    return (
      <div className={`login-container ${appSettings.theme === 'gold' ? 'gold-theme' : appSettings.theme === 'silver' ? 'silver-theme' : ''}`}>
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="login-header">
            {isMobile ? (
              <div className="mobile-logo-box" style={{ width: '120px', height: '120px', margin: '0 auto 1.5rem auto' }}>
                <div className="logo-glow-sweep" />
                <img src={gflbLogo} alt="GFLB Studio" style={{ width: '80px', height: 'auto' }} />
              </div>
            ) : (
              <img src={gflbLogo} alt="GFLB Studio" className="animated-logo" style={{ height: '80px', objectFit: 'contain', margin: '0 auto 1.5rem auto', display: 'block' }} />
            )}
            <p>Sign in to your agent dashboard</p>
          </div>

          <div className="google-login-wrap" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => showToast('Login Failed', 'error')}
              useOneTap
              theme="filled_blue"
              shape="pill"
              text="signin_with"
              width="100%"
            />
          </div>

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

  const term = searchTerm.toLowerCase();
  const cleanTerm = searchTerm.replace(/[^\d+]/g, '');
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(term) ||
    s.course.toLowerCase().includes(term) ||
    (cleanTerm.length > 0 && s.phoneNumbers.some(p => p.number.replace(/[^\d+]/g, '').includes(cleanTerm)))
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={`app-layout ${appSettings.theme === 'gold' ? 'gold-theme' : appSettings.theme === 'silver' ? 'silver-theme' : ''}`}>
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar - Luxury Command Center */}
      {!isMobile && (
        <aside className="sidebar">
          <div className="logo">
            <img src={gflbLogo} alt="GFLB" className="animated-logo" />
          </div>
          <nav className="flex flex-col gap-2">
            <button className={`nav-item ${currentTab === 'contacts' ? 'active' : ''}`} onClick={() => navigateTo('contacts')}>
              <LayoutGrid size={24} strokeWidth={1.5} />
              <span>Contacts Queue</span>
            </button>
            <button className={`nav-item ${currentTab === 'drives' ? 'active' : ''}`} onClick={() => navigateTo('drives')}>
              <Layers size={24} strokeWidth={1.5} />
              <span>DRIVES</span>
            </button>
            <button className={`nav-item ${currentTab === 'logs' ? 'active' : ''}`} onClick={() => navigateTo('logs')}>
              <MessageSquare size={24} strokeWidth={1.5} />
              <span>COMM_LOGS</span>
            </button>
            <button className={`nav-item ${currentTab === 'analytics' ? 'active' : ''}`} onClick={() => navigateTo('analytics')}>
              <BarChart3 size={24} strokeWidth={1.5} />
              <span>ANALYTICS</span>
            </button>
            <div style={{ flexGrow: 1 }}></div>
            <button className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => navigateTo('settings')}>
              <Settings size={24} strokeWidth={1.5} />
              <span>Settings</span>
            </button>
          </nav>
        </aside>
      )}

      {/* Bottom Nav - Mobile Only */}
      {isMobile && (
        <nav className="mobile-bottom-nav">
          <button className={`mobile-nav-item ${currentTab === 'contacts' ? 'active' : ''}`} onClick={() => navigateTo('contacts')}>
            <div className="mobile-nav-icon-wrap">
              <Users size={24} strokeWidth={currentTab === 'contacts' ? 2.5 : 1.5} />
            </div>
            <span>Contacts</span>
          </button>
          <button className={`mobile-nav-item ${currentTab === 'drives' ? 'active' : ''}`} onClick={() => navigateTo('drives')}>
            <div className="mobile-nav-icon-wrap">
              <LayoutDashboard size={24} strokeWidth={currentTab === 'drives' ? 2.5 : 1.5} />
            </div>
            <span>Campaigns</span>
          </button>
          <button className={`mobile-nav-item ${currentTab === 'logs' ? 'active' : ''}`} onClick={() => navigateTo('logs')}>
            <div className="mobile-nav-icon-wrap">
              <Phone size={24} strokeWidth={currentTab === 'logs' ? 2.5 : 1.5} />
            </div>
            <span>Logs</span>
          </button>
          <button className={`mobile-nav-item ${currentTab === 'analytics' ? 'active' : ''}`} onClick={() => navigateTo('analytics')}>
            <div className="mobile-nav-icon-wrap">
              <BarChart3 size={24} strokeWidth={currentTab === 'analytics' ? 2.5 : 1.5} />
            </div>
            <span>Stats</span>
          </button>
          <button className={`mobile-nav-item ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => navigateTo('settings')}>
            <div className="mobile-nav-icon-wrap">
              <Settings size={24} strokeWidth={currentTab === 'settings' ? 2.5 : 1.5} />
            </div>
            <span>Settings</span>
          </button>
        </nav>
      )}

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="brand-lockup">
            {isMobile && (
              <div className="mobile-logo-box">
                <div className="logo-glow-sweep" />
                <img src={gflbLogo} alt="GFLB" />
              </div>
            )}
            <h1 style={{ fontFamily: 'var(--font-heading)' }}>GFLB CALLER PRO</h1>
          </div>
          <div className="header-actions">
            {!isMobile && (
              <button
                type="button"
                className={`auto-dialer-toggle ${autoDialEnabled ? 'active' : ''}`}
                onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                aria-pressed={autoDialEnabled}
              >
                <span className="auto-dialer-dot" />
                <span className="auto-dialer-copy">
                  <span>AUTO DIALER</span>
                  <strong>{autoDialEnabled ? 'ON' : 'OFF'}</strong>
                </span>
                <ChevronDown size={14} />
              </button>
            )}
            <div className="header-icon-cluster">
              <button className="hud-icon-btn" aria-label="Open dial pad" onClick={() => setIsDialPadOpen(true)}><Grid3x3 size={20} /></button>
              {!isMobile && (
                <button className="hud-icon-btn danger" aria-label="Sign out" onClick={() => { setIsAuthenticated(false); localStorage.removeItem('ksk_auth'); }}><Power size={20} /></button>
              )}
            </div>
          </div>
        </header>

        {currentTab === 'contacts' && (
          <div className="workspace">
            {/* Left Column: Contacts */}
            <section className={`panel list-panel ${isMobile && mobileViewMode === 'detail' ? 'mobile-hidden' : ''}`}>
              <div className="p-6 h-full flex flex-col">
                <div className="contacts-panel-header mb-6">
                  <div>
                    <h2>Contacts</h2>
                    <p>{filteredStudents.length} active leads in rotation</p>
                  </div>
                </div>
                <div className="search-box mb-6">
                  <input type="text" className="search-input" placeholder="Search name, course, number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  <button className="search-btn"><Search size={18} /></button>
                </div>
                <div className="student-list flex-1 overflow-y-auto pr-1">
                  {filteredStudents.map(student => (
                    <div
                      key={student.id}
                      className={`student-card-hud ${activeStudent?.id === student.id ? 'active' : ''}`}
                      onClick={() => handleStudentSelect(student)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem',
                        borderRadius: '12px',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                        transition: '0.3s',
                        background: activeStudent?.id === student.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                        border: activeStudent?.id === student.id ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent'
                      }}
                    >
                      <div className="avatar-hud-wrap" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid', borderColor: activeStudent?.id === student.id ? 'var(--neon-gold)' : 'rgba(255,255,255,0.1)', padding: '2px' }}>
                        <div className="w-full h-full rounded-full flex items-center justify-center bg-zinc-900 font-bold text-xs" style={{ fontFamily: 'var(--font-heading)', color: 'var(--neon-gold)' }}>
                          {student.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: activeStudent?.id === student.id ? 'var(--neon-gold)' : '#fff' }}>{student.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>{student.course}</p>
                      </div>
                      <span className={`badge-hud badge-${student.status}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>{student.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                {!isMobile && (
                  <button className="btn-neon-outline w-full mt-4" style={{ borderStyle: 'solid' }} onClick={openAddContactModal}>+ ADD NEW CONTACT</button>
                )}
              </div>
            </section>

            {/* Middle Column: Profile & Dialer */}
            <section className={`profile-panel ${isMobile && mobileViewMode === 'list' ? 'mobile-hidden' : ''}`}>
              <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                {activeStudent && (
                  <div className="p-8">
                    {isMobile && (
                      <button type="button" className="mobile-back-to-list" onClick={() => setMobileViewMode('list')}>
                        <ChevronLeft size={18} />
                        Contacts List
                      </button>
                    )}
                    {/* Header Card */}
                    <div className="flex items-center gap-8 mb-12">
                      <div className="hud-avatar-outer-glow" style={{ width: '120px', height: '120px', borderRadius: '50%', padding: '4px', background: 'radial-gradient(circle, var(--neon-gold), transparent)' }}>
                        <div className="hud-avatar-inner-wrap" style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#000', padding: '4px' }}>
                          <div className="w-full h-full flex items-center justify-center bg-black text-3xl font-black" style={{ fontFamily: 'var(--font-heading)', color: 'var(--neon-gold)' }}>
                            {activeStudent.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="hud-tag-label" style={{ fontSize: '0.6rem', color: 'var(--neon-gold)', fontWeight: 800 }}>CONTACT_PROFILE</div>
                        <h2 className="hud-value-lg" style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{activeStudent.name}</h2>
                        <div className="flex items-center gap-3">
                          <span className="badge-hud badge-new">NEW</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>{activeStudent.course}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-neon-outline" onClick={skipToNext}><SkipForward size={14} /> SKIP</button>
                        <button className="btn-neon-outline" onClick={() => openEditContactModal(activeStudent)}><Edit size={14} /> EDIT</button>
                        <button className="btn-neon-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => deleteStudent(activeStudent.id)}><Trash size={14} /> DELETE</button>
                      </div>
                    </div>

                    {/* Channels */}
                    <div className="hud-label mb-4">COMM_CHANNELS</div>
                    <div className="hud-card mb-12" style={{ borderColor: 'var(--neon-gold)' }}>
                      <div className="flex items-center gap-6">
                        <div className="w-10 h-10 rounded bg-gold-glow-soft flex items-center justify-center text-gold" style={{ color: 'var(--neon-gold)' }}><Phone size={20} /></div>
                        <div className="flex-1">
                          <div className="text-[0.6rem] text-muted font-bold">MOBILE</div>
                          <div className="text-xl font-mono tracking-widest text-white">{activeStudent.phoneNumbers[0]?.number}</div>
                        </div>
                        <div className="flex gap-2"><MoreHorizontal size={20} className="text-muted" /></div>
                      </div>
                    </div>

                    {/* Central Dialer */}
                    <div className="hud-dialer-container py-12">
                      <div className={`dialer-circular-btn ${isCalling ? 'active' : ''}`} onClick={handleCallToggle}>
                        <div className="dialer-ring-outer"></div>
                        <div className="dialer-ring-inner" style={{ borderColor: isCalling ? 'var(--danger)' : 'var(--accent-green)', boxShadow: isCalling ? '0 0 20px rgba(255, 77, 77, 0.4)' : '0 0 20px var(--accent-green-glow)' }}></div>
                        <div className="dialer-icon-box" style={{ borderColor: isCalling ? 'var(--danger)' : 'var(--accent-green)', color: isCalling ? 'var(--danger)' : 'var(--accent-green)', background: isCalling ? 'rgba(255, 77, 77, 0.05)' : 'rgba(0, 255, 179, 0.05)' }}>
                          {isCalling ? <PhoneOff size={40} /> : <Phone size={40} />}
                        </div>
                      </div>
                      <div className="waveform-viz mt-8">
                        {[...Array(20)].map((_, i) => (
                          <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.05}s`, height: isCalling ? '30px' : '2px', background: isCalling ? 'var(--danger)' : 'var(--accent-green)' }} />
                        ))}
                      </div>
                      <div className="hud-label mt-6" style={{ color: isCalling ? 'var(--danger)' : 'var(--accent-green)', fontSize: '0.8rem' }}>
                        {isCalling ? 'TERMINATE_ENCRYPTED_CALL' : 'INITIATE_SECURE_CALL'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Bar */}
              <div className="hud-bottom-actions">
                <div className="hud-action-tab" onClick={() => showToast('Opening WhatsApp...', 'info')}><MessageSquare size={20} /> <span>WHATSAPP</span></div>
                <div className="hud-action-tab" onClick={() => showToast('Sending Email...', 'info')}><Mail size={20} /> <span>EMAIL</span></div>
                <div className="hud-action-tab" onClick={() => showToast('Fetching Brochure...', 'info')}><FileText size={20} /> <span>BROCHURE</span></div>
                <div className="hud-action-tab" onClick={() => showToast('Taking Note...', 'info')}><Edit size={20} /> <span>NOTE</span></div>
                <div className="flex items-center justify-center p-4">
                  <button
                    type="button"
                    className={`theme-switch ${appSettings.theme === 'gold' || appSettings.theme === 'system' ? 'active' : ''}`}
                    aria-pressed={appSettings.theme === 'gold' || appSettings.theme === 'system'}
                    onClick={() => setAppSettings(prev => ({ ...prev, theme: prev.theme === 'gold' ? 'dark' : 'gold' }))}
                  >
                    <span>THEME ACTIVE</span>
                    <span className="theme-switch-track"><span className="theme-switch-thumb" /></span>
                  </button>
                </div>
              </div>
            </section>

            {/* Right Column: Utilities */}
            <aside className="panel utility-panel">
              {!isMobile && (
                <div className="hud-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="hud-label flex items-center gap-2"><BarChart3 size={14} /> SESSION_ACTIVITY</div>
                    <ChevronRight size={14} className="text-muted" />
                  </div>
                  <div className="flex items-center gap-1 h-12 my-4">
                    {[40, 60, 30, 80, 50, 70, 90, 40, 60, 80, 40, 50, 70, 60, 80].map((h, i) => (
                      <div key={i} className="flex-1 bg-neon-gold/20 rounded-t-sm relative overflow-hidden" style={{ height: `${h}%` }}>
                        <div className="absolute bottom-0 left-0 right-0 bg-neon-gold animate-pulse" style={{ height: '30%', opacity: 0.5 }} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <div className="text-[0.6rem] text-muted font-bold">Total Calls</div>
                      <div className="text-lg font-heading text-white">{callLogs.length}</div>
                    </div>
                    <div>
                      <div className="text-[0.6rem] text-muted font-bold">Success Rate</div>
                      <div className="text-lg font-heading text-success">85%</div>
                    </div>
                  </div>
                </div>
              )}

              {!isMobile && (
                <div className="hud-card flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="hud-label flex items-center gap-2"><Activity size={14} /> LIVE FEED</div>
                    <ChevronRight size={14} className="text-muted" />
                  </div>
                  <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    {[
                      { type: 'connected', name: 'jeelan', time: '10:24:53' },
                      { type: 'disconnected', name: 'babu', time: '10:23:18' },
                      { type: 'connected', name: 'gokul', time: '10:22:10' },
                      { type: 'skipped', name: 'HARI', time: '10:21:11' },
                      { type: 'connected', name: 'ksk', time: '10:20:05' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${item.type === 'connected' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {item.type === 'connected' ? <PhoneIncoming size={14} /> : <PhoneOff size={14} />}
                        </div>
                        <div className="flex-1">
                          <div className="text-[0.65rem] font-bold text-white">Call {item.type.charAt(0).toUpperCase() + item.type.slice(1)}</div>
                          <div className="text-[0.6rem] text-muted">{item.name}</div>
                        </div>
                        <div className="text-[0.6rem] font-mono opacity-50 text-white">{item.time}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-neon-outline w-full mt-4" style={{ borderStyle: 'solid', fontSize: '0.6rem' }} onClick={() => navigateTo('logs')}>VIEW ALL ACTIVITY</button>
                </div>
              )}

              {!isMobile && (
                <div className="hud-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="hud-label flex items-center gap-2"><Zap size={14} /> UTILITY ZONE</div>
                    <ChevronRight size={14} className="text-muted" />
                  </div>
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 mb-4 border border-gold-glow-soft rounded-lg flex items-center justify-center relative group">
                      <div className="absolute inset-0 bg-neon-gold/5 rounded-lg transform group-hover:rotate-45 transition-transform duration-500"></div>
                      <div className="absolute inset-2 border border-neon-gold/20"></div>
                      <div className="w-8 h-8 bg-neon-gold/20 animate-pulse rounded-sm"></div>
                      <Zap size={24} className="text-neon-gold absolute animate-bounce" style={{ color: 'var(--neon-gold)' }} />
                    </div>
                    <p className="text-[0.65rem] text-muted leading-relaxed">System monitoring and live recruitment metrics will be synchronized here.</p>
                  </div>
                  <button className="btn-neon w-full" style={{ fontSize: '0.7rem' }} onClick={() => showToast('AI Copilot Initializing...', 'success')}>LAUNCH AI COPILOT</button>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Admissions Drives Tab */}
        {currentTab === 'drives' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="tab-content" style={{ padding: isMobile ? '10px' : '24px' }}>
            {viewingDrive ? (
              <div className="flex flex-col h-full">
                <div className="campaign-header-tactical mb-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* LEFT: Title & Back Button */}
                    <div className="flex items-center gap-4">
                      <motion.button
                        whileHover={{ scale: 1.1, x: -2 }}
                        whileTap={{ scale: 0.9 }}
                        className="hud-icon-btn small shrink-0"
                        onClick={() => setViewingDrive(null)}
                      >
                        <ChevronLeft size={18} />
                      </motion.button>
                      <div className="min-w-0">
                        <div className="hud-kicker truncate">ACTIVE_CAMPAIGN</div>
                        <h2 className="hud-value-md m-0 truncate" style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontFamily: 'var(--font-heading)' }}>{viewingDrive.name}</h2>
                      </div>
                    </div>

                    {/* RIGHT/BOTTOM: Actions & Search */}
                    <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center gap-2'}`} style={{ position: 'relative' }}>
                      {/* Search Bar */}
                      <div className="search-box tactical" style={{ width: isMobile ? '100%' : '280px' }}>
                        <input
                          type="text"
                          placeholder="SEARCH_LEADS..."
                          className="search-input"
                          value={driveContactSearchTerm}
                          onChange={(e) => setDriveContactSearchTerm(e.target.value)}
                        />
                        <div className="search-btn"><Search size={14} /></div>
                      </div>

                      {/* Action Buttons */}
                      <div className={`flex gap-2 ${isMobile ? 'justify-end w-full' : ''}`}>
                        <button
                          className={`hud-icon-btn ${autoDialEnabled ? 'active' : ''}`}
                          onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                          title="Auto Dialer"
                          style={{ position: 'relative', flex: isMobile ? 1 : 'none' }}
                        >
                          <Power size={18} />
                          {isMobile && <span className="ml-2 text-[0.6rem] font-bold tracking-widest uppercase">Auto_Dial</span>}
                          {autoDialEnabled && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--success-green)', border: '1px solid #000' }}
                            />
                          )}
                        </button>

                        <button
                          className="hud-icon-btn"
                          onClick={() => setIsAddContactModalOpen(true)}
                          title="Add Contacts"
                          style={{ flex: isMobile ? 1 : 'none' }}
                        >
                          <UserPlus size={18} />
                          {isMobile && <span className="ml-2 text-[0.6rem] font-bold tracking-widest uppercase">Add_Lead</span>}
                        </button>

                        <button
                          className={`hud-icon-btn ${isDriveFilterOpen || driveFilterGender || driveFilterCourse || driveFilterBatch ? 'active' : ''}`}
                          onClick={() => setIsDriveFilterOpen(!isDriveFilterOpen)}
                          title="Filter Leads"
                          style={{ position: 'relative', zIndex: 1001, flex: isMobile ? 1 : 'none' }}
                        >
                          <Database size={18} />
                          {isMobile && <span className="ml-2 text-[0.6rem] font-bold tracking-widest uppercase">Filter</span>}
                        </button>
                      </div>

                      <AnimatePresence>
                        {isDriveFilterOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="settings-card-tactical"
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              zIndex: 1000,
                              width: '280px',
                              marginTop: '12px',
                              padding: '1.25rem',
                              border: '1px solid var(--neon-gold)',
                              boxShadow: '0 15px 40px rgba(0,0,0,0.8), 0 0 20px rgba(212, 175, 55, 0.1)'
                            }}
                          >
                            <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
                              <span className="hud-kicker" style={{ color: 'var(--neon-gold)', letterSpacing: '2px' }}>FILTER_LEADS</span>
                              {(driveFilterGender || driveFilterCourse || driveFilterBatch) && (
                                <button
                                  onClick={() => { setDriveFilterGender(''); setDriveFilterCourse(''); setDriveFilterBatch(''); }}
                                  style={{ fontSize: '0.6rem', color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                                >
                                  RESET_ALL
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col gap-5">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 opacity-50">
                                  <Users size={12} />
                                  <span className="hud-kicker" style={{ fontSize: '0.5rem' }}>GENDER_TYPE</span>
                                </div>
                                <select
                                  className="settings-input-tactical w-full"
                                  value={driveFilterGender}
                                  onChange={(e) => setDriveFilterGender(e.target.value)}
                                  style={{ fontSize: '0.75rem', height: '40px' }}
                                >
                                  <option value="">ALL_GENDERS</option>
                                  <option value="Male">MALE</option>
                                  <option value="Female">FEMALE</option>
                                  <option value="Other">OTHER</option>
                                </select>
                              </div>

                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 opacity-50">
                                  <LayoutGrid size={12} />
                                  <span className="hud-kicker" style={{ fontSize: '0.5rem' }}>COURSE_CODE</span>
                                </div>
                                <select
                                  className="settings-input-tactical w-full"
                                  value={driveFilterCourse}
                                  onChange={(e) => setDriveFilterCourse(e.target.value)}
                                  style={{ fontSize: '0.75rem', height: '40px' }}
                                >
                                  <option value="">ALL_COURSES</option>
                                  {Array.from(new Set(students.map(s => s.course))).filter(Boolean).map(course => (
                                    <option key={course} value={course}>{course.toUpperCase()}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 opacity-50">
                                  <Clock size={12} />
                                  <span className="hud-kicker" style={{ fontSize: '0.5rem' }}>BATCH_YEAR</span>
                                </div>
                                <select
                                  className="settings-input-tactical w-full"
                                  value={driveFilterBatch}
                                  onChange={(e) => setDriveFilterBatch(e.target.value)}
                                  style={{ fontSize: '0.75rem', height: '40px' }}
                                >
                                  <option value="">ALL_YEARS</option>
                                  {Array.from(new Set(students.map(s => s.year))).filter(Boolean).sort().map(year => (
                                    <option key={year} value={year}>{year}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5">
                              <button
                                className="btn btn-primary btn-glow w-full py-2"
                                style={{ fontSize: '0.7rem' }}
                                onClick={() => setIsDriveFilterOpen(false)}
                              >
                                APPLY_FILTERS
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="workspace" style={{ padding: 0, display: 'flex', overflow: 'hidden', height: isMobile ? 'calc(100vh - 130px)' : 'calc(100vh - 200px)' }}>
                  <section className={`list-panel ${isMobile && mobileViewMode === 'detail' ? 'mobile-hidden' : ''}`} style={{ width: isMobile ? '100%' : '350px', borderRight: isMobile ? 'none' : '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="student-list" style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                      {students
                        .filter(s => viewingDrive.contactIds.includes(s.id))
                        .filter(s => {
                          const matchesSearch = s.name.toLowerCase().includes(driveContactSearchTerm.toLowerCase()) ||
                            s.course.toLowerCase().includes(driveContactSearchTerm.toLowerCase());
                          const matchesGender = !driveFilterGender || s.gender === driveFilterGender;
                          const matchesCourse = !driveFilterCourse || s.course === driveFilterCourse;
                          const matchesBatch = !driveFilterBatch || s.year === driveFilterBatch;
                          return matchesSearch && matchesGender && matchesCourse && matchesBatch;
                        })
                        .map((student, index) => (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            key={student.id}
                            className={`student-card-hud ${activeStudent?.id === student.id ? 'active' : ''}`}
                            onClick={() => handleStudentSelect(student)}
                            style={{
                              marginBottom: '10px',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.pageX, y: e.pageY, student, driveId: viewingDrive.id });
                            }}
                          >
                            {activeStudent?.id === student.id && (
                              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '2px', background: 'var(--neon-gold)' }} />
                            )}

                            <div className="avatar-hud-wrap" style={{ width: '42px', height: '42px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                              <img src={student.avatar} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>

                            <div className="flex-1 min-w-0 ml-3">
                              <div className="flex justify-between items-start">
                                <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{student.name}</h4>
                              </div>
                              <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{student.course}</p>

                              <div className="flex items-center gap-2 mt-2">
                                <span className={`badge-${student.status === 'new' ? 'hud' : 'contacted'}`} style={{ fontSize: '0.55rem', padding: '1px 6px' }}>
                                  {student.status.toUpperCase()}
                                </span>
                                {student.notes && <Activity size={10} style={{ color: 'var(--neon-gold)', opacity: 0.4 }} />}
                              </div>
                            </div>

                            {activeStudent?.id === student.id && (
                              <div className="ml-2">
                                <ChevronRight size={14} color="var(--neon-gold)" />
                              </div>
                            )}
                          </motion.div>
                        ))}
                    </div>
                  </section>

                  {activeStudent && (
                    <section className={`action-panel ${isMobile && mobileViewMode === 'list' ? 'mobile-hidden' : ''}`} style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      overflowY: 'auto',
                      background: 'linear-gradient(180deg, #050505, #0a0a0c)',
                      position: 'relative',
                      borderLeft: isMobile ? 'none' : '1px solid rgba(212, 175, 55, 0.15)'
                    }}>
                      {/* TACTICAL OVERLAY ELEMENTS */}
                      <div style={{ position: 'absolute', top: 20, right: 20, opacity: 0.3, pointerEvents: 'none' }}>
                        <div className="hud-kicker" style={{ fontSize: '0.5rem', textAlign: 'right' }}>OBJECTIVE_ID: {activeStudent.id.substring(0, 8)}</div>
                        <div className="hud-kicker" style={{ fontSize: '0.4rem', textAlign: 'right' }}>COORD: 12.9716° N, 77.5946° E</div>
                      </div>

                      {/* TACTICAL HUD HEADER */}
                      <div className="action-header" style={{ padding: '2rem', background: 'linear-gradient(to bottom, rgba(212, 175, 55, 0.05), transparent)' }}>
                        <div className="flex gap-6 items-start">
                          <div className="hud-avatar-outer-glow" style={{ width: '80px', height: '80px', borderRadius: '12px', padding: '2px' }}>
                            <div className="hud-avatar-inner-wrap" style={{ width: '100%', height: '100%', borderRadius: '10px', overflow: 'hidden' }}>
                              <img src={activeStudent.avatar} alt={activeStudent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          </div>

                          <div className="action-details" style={{ flex: 1 }}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="hud-kicker" style={{ color: 'var(--neon-gold)', marginBottom: '4px' }}>CAMPAIGN_CONTACT</div>
                                <h2 className="hud-value-lg" style={{ fontSize: '1.8rem', margin: 0, lineHeight: 1.1 }}>{activeStudent.name.toUpperCase()}</h2>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className={`badge ${activeStudent.status === 'new' ? 'badge-new' : 'badge-contacted'}`} style={{ fontSize: '0.6rem' }}>
                                  {activeStudent.status.toUpperCase()}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: '4px', fontWeight: 800 }}>{activeStudent.course}</span>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-4">
                              <div className="flex flex-col">
                                <span className="hud-kicker" style={{ fontSize: '0.5rem', opacity: 0.5 }}>CONTACT_METHOD</span>
                                <span className="hud-value-sm" style={{ fontSize: '0.8rem', color: 'var(--neon-gold)' }}>{activeStudent.phoneNumbers[0]?.number || 'NO_DATA'}</span>
                              </div>
                              <div className="w-px h-8 bg-white/10" />
                              <div className="flex flex-col">
                                <span className="hud-kicker" style={{ fontSize: '0.5rem', opacity: 0.5 }}>BATCH_REF</span>
                                <span className="hud-value-sm" style={{ fontSize: '0.8rem' }}>CLASS_{activeStudent.year || '2024'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DIAL HUB - REDESIGNED CIRCULAR */}
                      <div className="hud-dialer-container" style={{ flex: 1, padding: '2rem 0' }}>
                        <div style={{ position: 'relative' }}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="dialer-circular-btn"
                            onClick={handleCallToggle}
                            style={{
                              width: '180px',
                              height: '180px',
                              background: isCalling
                                ? 'radial-gradient(circle, rgba(255, 77, 90, 0.2), rgba(5, 5, 5, 0.95))'
                                : 'radial-gradient(circle, rgba(212, 175, 55, 0.15), rgba(5, 5, 5, 0.95))',
                              border: isCalling ? '1px solid var(--danger)' : '1px solid var(--neon-gold)',
                              boxShadow: isCalling ? '0 0 40px rgba(255, 77, 90, 0.2)' : '0 0 40px rgba(212, 175, 55, 0.1)'
                            }}
                          >
                            <div className="dialer-ring-outer" style={{ borderStyle: isCalling ? 'solid' : 'dashed', borderColor: isCalling ? 'var(--danger)' : 'var(--neon-gold)' }} />
                            <div className="dialer-ring-inner" style={{ borderColor: isCalling ? 'var(--danger)' : 'var(--accent-green)' }} />

                            <div className="dialer-icon-box" style={{
                              background: isCalling ? 'rgba(255, 77, 90, 0.1)' : 'rgba(0, 255, 178, 0.05)',
                              boxShadow: isCalling ? 'inset 0 0 20px rgba(255, 77, 90, 0.2)' : 'inset 0 0 20px rgba(0, 255, 178, 0.1)'
                            }}>
                              {isCalling ? <PhoneOff size={48} color="var(--danger)" /> : <Phone size={48} color="var(--accent-green)" />}
                            </div>
                          </motion.button>

                          {isCalling && (
                            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
                              <div className="waveform-viz">
                                {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    className="waveform-bar"
                                    animate={{ height: [10, 30, 10] }}
                                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                    style={{ background: 'var(--danger)', width: '3px' }}
                                  />
                                ))}
                              </div>
                              <div className="hud-value-lg mt-2" style={{ fontSize: '1.2rem', color: 'var(--danger)' }}>{formatTime(callDuration)}</div>
                            </div>
                          )}
                        </div>

                        <div className="mt-12 text-center">
                          <div className="hud-kicker" style={{ fontSize: '0.7rem', color: isCalling ? 'var(--danger)' : 'var(--text-secondary)' }}>
                            {isCalling ? 'LIVE_COMM_LINK_ACTIVE' : 'READY_FOR_ENGAGEMENT'}
                          </div>
                          <div className="hud-value-sm mt-1" style={{ letterSpacing: '2px', opacity: 0.5 }}>
                            {isCalling ? 'SCANNING_FEEDBACK...' : 'INITIATE_TACTICAL_CALL'}
                          </div>
                        </div>
                      </div>

                      {/* QUICK COMMS BAR */}
                      <div className="px-8 pb-4">
                        <div className="flex gap-3">
                          <button
                            className="btn-neon-outline flex-1"
                            style={{ height: '50px', background: 'rgba(37, 211, 102, 0.05)', borderColor: 'rgba(37, 211, 102, 0.3)' }}
                            onClick={() => {
                              const num = activeStudent.phoneNumbers[0]?.number;
                              if (num) window.open(`https://wa.me/${num.replace(/\D/g, '')}?text=${getFormattedMessage(activeStudent)}`, '_blank');
                            }}
                          >
                            <MessageSquare size={18} style={{ color: '#25D366' }} />
                            <span style={{ color: '#25D366', fontSize: '0.7rem' }}>WHATSAPP_LINK</span>
                          </button>

                          <button
                            className="btn-neon-outline flex-1"
                            style={{ height: '50px', background: 'rgba(212, 175, 55, 0.05)', borderColor: 'rgba(212, 175, 55, 0.3)' }}
                            onClick={() => {
                              if (activeStudent.email) window.open(`mailto:${activeStudent.email}`, '_self');
                            }}
                          >
                            <Mail size={18} />
                            <span style={{ fontSize: '0.7rem' }}>EMAIL_DISPATCH</span>
                          </button>
                        </div>
                      </div>

                      {/* SESSION INTEL (NOTES) */}
                      <div className="p-8 pt-4 mt-auto" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(0, 0, 0, 0.2)' }}>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-neon-gold" />
                            <span className="hud-kicker" style={{ fontSize: '0.6rem', color: 'var(--neon-gold)' }}>SESSION_REMARKS_LOG</span>
                          </div>
                          <button
                            className="btn-primary"
                            onClick={() => { updateStudentInList(activeStudent); showToast('Intel Synchronized', 'success'); }}
                            style={{ height: '28px', padding: '0 12px', fontSize: '0.55rem', borderRadius: '4px' }}
                          >
                            <Save size={12} /> SYNC_LOG
                          </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <textarea
                            style={{
                              width: '100%',
                              height: '100px',
                              background: '#050505',
                              border: '1px solid rgba(212, 175, 55, 0.15)',
                              borderRadius: '4px',
                              color: '#d1d1d1',
                              padding: '12px',
                              fontSize: '0.75rem',
                              fontFamily: 'var(--font-mono)',
                              resize: 'none',
                              boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)'
                            }}
                            value={activeStudent.notes}
                            onChange={(e) => updateStudentInList({ ...activeStudent, notes: e.target.value })}
                            placeholder="Enter interaction intelligence..."
                          />
                          <div style={{ position: 'absolute', bottom: '8px', right: '12px', pointerEvents: 'none' }}>
                            <Activity size={12} style={{ color: 'var(--neon-gold)', opacity: 0.2 }} />
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>
            ) : (
              <>
                {!isMobile ? (
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <div className="hud-kicker">STRATEGIC_OPERATIONS</div>
                      <h2 className="hud-value-lg m-0" style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)' }}>Active Campaigns</h2>
                    </div>
                    <div className="flex gap-4">
                      <div className="search-box tactical" style={{ width: '320px' }}>
                        <input
                          type="text"
                          placeholder="SEARCH_CAMPAIGNS..."
                          className="search-input"
                          value={driveSearchTerm}
                          onChange={(e) => setDriveSearchTerm(e.target.value)}
                        />
                        <div className="search-btn"><Search size={18} /></div>
                      </div>
                      <button className="btn btn-primary btn-glow" onClick={openAddDriveModal}>
                        <FolderPlus size={18} /> NEW_DRIVE
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mobile-drives-header mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="hud-kicker">STRAT_OPS</div>
                        <h2 className="mobile-page-title" style={{ fontSize: '2rem' }}>Campaigns</h2>
                      </div>
                      <button className="hud-icon-btn active" onClick={openAddDriveModal}>
                        <FolderPlus size={18} />
                      </button>
                    </div>
                    <div className="search-box tactical w-full">
                      <input
                        type="text"
                        placeholder="SEARCH..."
                        className="search-input"
                        value={driveSearchTerm}
                        onChange={(e) => setDriveSearchTerm(e.target.value)}
                      />
                      <div className="search-btn"><Search size={16} /></div>
                    </div>
                  </div>
                )}

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

        {currentTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="tab-content"
            style={{
              height: isMobile ? 'auto' : 'calc(100vh - 110px)',
              overflow: 'hidden',
              padding: isMobile ? '16px' : '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {/* LUXURY TACTICAL HEADER */}
            <div className="flex justify-between items-end pb-3 border-b border-white/10 relative">
              <div className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-neon-gold to-transparent" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={14} className="text-neon-gold animate-pulse" />
                  <div className="hud-kicker" style={{ fontSize: '0.65rem', opacity: 0.8, letterSpacing: '2px' }}>INTEL_RECON_v6.0</div>
                </div>
                <h2 className="hud-value-lg m-0 leading-none" style={{ fontSize: isMobile ? '1.5rem' : '2rem', color: '#fff', textShadow: '0 0 20px rgba(212,175,55,0.3)' }}>TACTICAL_ANALYTICS</h2>
              </div>
              <div className="flex gap-6 items-center">
                <div className="flex flex-col items-end hidden md:flex">
                  <div className="hud-kicker" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>SYSTEM_TIME</div>
                  <div className="hud-value-sm" style={{ fontSize: '0.8rem', color: 'var(--neon-gold)' }}>{new Date().toLocaleTimeString()}</div>
                </div>
                <div className="h-8 w-px bg-white/10 hidden md:block" />
                <div className="flex flex-col items-end">
                  <div className="hud-kicker" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>OPS_STATUS</div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-success-green/10 border border-success-green/30 rounded-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse" style={{ boxShadow: '0 0 8px var(--success-green)' }} />
                    <span className="hud-value-sm text-success-green" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>NOMINAL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* DYNAMIC GRID - PREMIUM ZERO SCROLL */}
            <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-4 min-h-0">

              {/* TOP LEFT: CORE PIE CHART (LEAD STATUS) */}
              <div className="col-span-12 lg:col-span-4 row-span-3 settings-card-tactical p-5 flex flex-col min-h-0 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-gold/5 rounded-full blur-3xl -mr-10 -mt-10 transition-opacity group-hover:bg-neon-gold/10" />
                <div className="hud-kicker mb-4" style={{ fontSize: '0.65rem', color: 'var(--neon-gold)' }}>DISTRIBUTION_STATUS</div>
                <div className="flex-1 flex items-center justify-center relative min-h-0">
                  <svg viewBox="0 0 40 40" className="w-full h-full max-h-[190px] drop-shadow-2xl">
                    {[
                      { val: stats.new, color: 'rgba(212,175,55,0.15)', l: 'NEW' },
                      { val: stats.contacted, color: 'var(--gold-bright)', l: 'ACT' },
                      { val: stats.enrolled, color: 'var(--success-green)', l: 'ENR' },
                      { val: students.filter(s => s.status === 'not_interested').length, color: 'var(--danger-red)', l: 'NEG' }
                    ].reduce((acc: any, item, idx) => {
                      const total = stats.total || 1;
                      const pct = (item.val / total) * 100;
                      const offset = acc.offset;
                      if (pct > 0) {
                        acc.elements.push(
                          <motion.circle
                            key={idx} cx="20" cy="20" r="16" fill="none"
                            stroke={item.color} strokeWidth="4.5"
                            strokeDasharray={`${pct} ${100 - pct}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, delay: idx * 0.15, ease: "easeOut" }}
                            style={{ filter: `drop-shadow(0 0 4px ${item.color})` }}
                          />
                        );
                      }
                      acc.offset += pct;
                      return acc;
                    }, { offset: 0, elements: [] }).elements}
                    <circle cx="20" cy="20" r="12" fill="var(--bg-panel)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className="hud-value-lg" style={{ fontSize: '1.8rem', textShadow: '0 0 15px var(--neon-gold)' }}
                    >
                      {stats.total}
                    </motion.div>
                    <div className="hud-kicker" style={{ fontSize: '0.55rem', opacity: 0.7 }}>TOTAL_LEADS</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[
                    { l: 'NEW_TARGETS', v: stats.new, c: 'rgba(212,175,55,0.4)' },
                    { l: 'ACTIVE_COMMS', v: stats.contacted, c: 'var(--gold-bright)' },
                    { l: 'SECURED', v: stats.enrolled, c: 'var(--success-green)' },
                    { l: 'REJECTED', v: students.filter(s => s.status === 'not_interested').length, c: 'var(--danger-red)' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-black/20 rounded border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.c, boxShadow: `0 0 5px ${item.c}` }} />
                         <span className="hud-kicker" style={{ fontSize: '0.5rem' }}>{item.l}</span>
                      </div>
                      <span className="hud-value-sm" style={{ fontSize: '0.65rem' }}>{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOP CENTER: TACTICAL HISTOGRAM (ENGAGEMENT) */}
              <div className="col-span-12 lg:col-span-5 row-span-3 settings-card-tactical p-5 flex flex-col min-h-0 relative">
                <div className="flex justify-between items-center mb-4">
                  <div className="hud-kicker" style={{ fontSize: '0.65rem', color: 'var(--neon-gold)' }}>ENGAGEMENT_VELOCITY</div>
                  <div className="px-2 py-0.5 bg-neon-gold/10 border border-neon-gold/30 rounded-sm hud-value-sm text-neon-gold" style={{ fontSize: '0.55rem' }}>SIGNAL: OPTIMAL</div>
                </div>
                <div className="flex-1 flex items-end gap-1.5 px-2 min-h-0 relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 py-4">
                    {[1,2,3,4].map(i => <div key={i} className="w-full h-px bg-neon-gold border-b border-dashed border-neon-gold" />)}
                  </div>
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = 15 + Math.random() * 85;
                    const isPeak = h > 80;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                        <motion.div
                          className="w-full relative rounded-t-sm overflow-hidden"
                          style={{ height: `${h}%`, minHeight: '4px', background: isPeak ? 'var(--gold-bright)' : 'rgba(212,175,55,0.2)' }}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: i * 0.03, type: 'spring' }}
                          whileHover={{ scaleY: 1.05, filter: 'brightness(1.5)' }}
                        >
                           <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                           {isPeak && <div className="absolute top-0 left-0 w-full h-2 bg-white/40 blur-[1px]" />}
                        </motion.div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-mono text-neon-gold mt-1 absolute -top-4">{Math.round(h)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-3 px-2 border-t border-white/10 pt-2">
                  <span className="hud-kicker" style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>00:00_HRS</span>
                  <span className="hud-kicker" style={{ fontSize: '0.5rem', letterSpacing: '2px' }}>DEPLOYMENT_CYCLE</span>
                  <span className="hud-kicker" style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>23:59_HRS</span>
                </div>
              </div>

              {/* TOP RIGHT: CONVERSION AREA CHART */}
              <div className="col-span-12 lg:col-span-4 row-span-3 settings-card-tactical p-5 flex flex-col min-h-0 relative overflow-hidden">
                <div className="hud-kicker mb-4" style={{ fontSize: '0.65rem', color: 'var(--neon-gold)' }}>CONVERSION_MATRIX</div>
                <div className="flex-1 min-h-0 relative">
                  <svg viewBox="0 0 100 40" className="w-full h-full drop-shadow-xl" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--success-green)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--success-green)" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    {/* Background Grid */}
                    <path d="M 0 10 L 100 10 M 0 20 L 100 20 M 0 30 L 100 30" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="2 2" />
                    
                    <motion.path
                      d="M0 35 Q 20 10 40 22 T 80 8 T 100 18 L 100 40 L 0 40 Z" 
                      fill="url(#areaGradient)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                    <motion.path
                      d="M0 35 Q 20 10 40 22 T 80 8 T 100 18"
                      fill="none" stroke="var(--success-green)" strokeWidth="1.5"
                      filter="url(#glow)"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                    />
                    {[
                      {x: 0, y: 35}, {x: 20, y: 15}, {x: 40, y: 22}, {x: 60, y: 12}, {x: 80, y: 8}, {x: 100, y: 18}
                    ].map((pt, i) => (
                      <motion.circle 
                        key={pt.x} cx={pt.x} cy={pt.y} r="1.5" fill="#fff" 
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 + i*0.2 }}
                        style={{ filter: 'drop-shadow(0 0 3px var(--success-green))' }}
                      />
                    ))}
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="p-3 bg-gradient-to-br from-white/5 to-transparent rounded border border-white/10">
                    <div className="hud-kicker" style={{ fontSize: '0.5rem', opacity: 0.7 }}>EFFICIENCY_RATE</div>
                    <div className="hud-value-lg mt-1" style={{ fontSize: '1.2rem', color: 'var(--success-green)', textShadow: '0 0 10px rgba(0,255,178,0.3)' }}>{stats.conversionRate}%</div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-white/5 to-transparent rounded border border-white/10">
                    <div className="hud-kicker" style={{ fontSize: '0.5rem', opacity: 0.7 }}>PEAK_RESONANCE</div>
                    <div className="hud-value-lg mt-1" style={{ fontSize: '1.2rem', color: '#fff' }}>94.2<span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Hz</span></div>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: RECENT DEPLOYMENTS (LEFT) & TELEMETRY (RIGHT) */}
              <div className="col-span-12 lg:col-span-8 row-span-3 flex flex-col gap-4 min-h-0">
                <div className="settings-card-tactical flex-1 p-4 flex flex-col min-h-0 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-neon-gold/50 via-neon-gold/10 to-transparent" />
                  <div className="flex justify-between items-center mb-3 pl-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-neon-gold rounded-sm animate-pulse" />
                      <div className="hud-kicker" style={{ fontSize: '0.65rem' }}>LIVE_DEPLOYMENT_LOGS</div>
                    </div>
                    <div className="hud-kicker px-2 py-1 bg-black/40 rounded border border-white/10" style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>
                      NODE_ID: {Math.random().toString(36).substring(7).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="hud-kicker pb-2 pl-2" style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>TARGET_IDENTIFIER</th>
                          <th className="hud-kicker pb-2" style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>COMMS_STATUS</th>
                          <th className="hud-kicker pb-2" style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>DURATION</th>
                          <th className="hud-kicker pb-2 text-right pr-2" style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>TIMESTAMP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {callLogs.slice(0, 6).map((log, idx) => (
                          <motion.tr 
                            key={log.id} 
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                            className="group hover:bg-white/5 transition-colors cursor-default"
                          >
                            <td className="py-2.5 pl-2">
                              <div className="hud-value-sm truncate max-w-[150px] text-white group-hover:text-neon-gold transition-colors" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>{log.studentName.toUpperCase()}</div>
                              <div className="text-[7px] font-mono text-muted mt-0.5">{log.phoneNumber}</div>
                            </td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'completed' ? 'bg-success-green shadow-[0_0_5px_var(--success-green)]' : 'bg-danger-red shadow-[0_0_5px_var(--danger-red)]'}`} />
                                <span className={`text-[6px] font-black tracking-widest ${log.status === 'completed' ? 'text-success-green' : 'text-danger-red'}`}>
                                  {log.status === 'completed' ? 'LINK_ESTABLISHED' : 'LINK_FAILED'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 hud-value-sm" style={{ fontSize: '0.65rem' }}>{formatTime(log.duration)}</td>
                            <td className="py-2.5 text-[7px] font-mono text-muted text-right pr-2">{log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                    {callLogs.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <Activity size={24} className="mb-2" />
                        <span className="hud-kicker" style={{ fontSize: '0.6rem' }}>AWAITING_TELEMETRY</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BOTTOM RIGHT: METRICS CLUSTER - LUXURY REDESIGN */}
              <div className="col-span-12 lg:col-span-4 row-span-3 grid grid-cols-2 gap-3 min-h-0">
                {[
                  { l: 'TOTAL_RECORDS', v: stats.total, i: <Database size={14} />, c: 'var(--gold-bright)', b: 'rgba(255,217,90,0.1)' },
                  { l: 'SUCCESS_OPS', v: stats.enrolled, i: <CheckCircle2 size={14} />, c: 'var(--success-green)', b: 'rgba(0,255,178,0.1)' },
                  { l: 'AVG_INTEL', v: stats.avgCallTime + 's', i: <Clock size={14} />, c: '#fff', b: 'rgba(255,255,255,0.05)' },
                  { l: 'PENDING_TARGETS', v: stats.new, i: <Activity size={14} />, c: 'var(--neon-gold)', b: 'rgba(212,175,55,0.1)' }
                ].map((m, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    className="flex flex-col p-3 rounded bg-black/60 border border-white/10 relative overflow-hidden group shadow-lg backdrop-blur-md"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" style={{ color: m.c }}>{m.i}</div>
                    
                    {/* Tactical Corner Accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/30" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/30" />

                    <div className="flex flex-col h-full justify-between relative z-10">
                      <span className="hud-kicker" style={{ fontSize: '0.45rem', opacity: 0.6, letterSpacing: '1px' }}>{m.l}</span>
                      <div className="mt-2">
                        <div className="hud-value-lg leading-none" style={{ fontSize: '1.4rem', color: m.c, textShadow: `0 0 15px ${m.b}` }}>{m.v}</div>
                      </div>
                      <div className="mt-3 h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full relative"
                          style={{ background: m.c, width: '75%' }}
                          initial={{ width: 0 }}
                          animate={{ width: '75%' }}
                          transition={{ delay: 0.2 * i, duration: 1 }}
                        >
                          <div className="absolute top-0 right-0 w-4 h-full bg-white/50 blur-[2px]" />
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* REAL-TIME TELEMETRY TICKER - PREMIUM */}
            <div className="h-8 flex gap-3 mt-2">
              <div className="bg-neon-gold/10 px-4 flex items-center gap-3 rounded border border-neon-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.1)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-gold/20 to-transparent animate-pulse" />
                <span className="hud-kicker relative z-10" style={{ fontSize: '0.55rem', color: 'var(--gold-bright)' }}>LIVE_SYS_STATUS</span>
                <div className="flex gap-5 relative z-10">
                  {[
                    { k: 'CPU_LOAD', v: '18%' },
                    { k: 'MEM_ALLOC', v: '1.2GB' },
                    { k: 'UPLINK', v: 'SECURE' }
                  ].map(x => (
                    <div key={x.k} className="flex gap-1.5 text-[8px] font-black tracking-widest">
                      <span className="text-neon-gold/70">{x.k}:</span>
                      <span className="text-white drop-shadow-[0_0_2px_#fff]">{x.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 bg-black/40 border border-white/10 rounded overflow-hidden relative backdrop-blur-sm">
                 <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/80 to-transparent z-10" />
                 <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/80 to-transparent z-10" />
                <motion.div
                  className="absolute inset-0 flex items-center whitespace-nowrap"
                  animate={{ x: [0, -1000] }}
                  transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                >
                  <span className="hud-kicker font-mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '3px' }}>
                    [SYS_INIT] KERNEL BOOT SEQUENCE COMPLETE // [NET_SEC] ENCRYPTED TUNNEL ESTABLISHED ON PORT 443 // [DB_SYNC] 100% REPLICATION VERIFIED // [AI_CORE] PREDICTIVE RECRUITMENT MODELS ONLINE // [USER_AUTH] OPERATIVE ID: {loginEmail || 'AGENT_001'} AUTHORIZED // [SYS_WARN] NO ANOMALIES DETECTED // 
                    [SYS_INIT] KERNEL BOOT SEQUENCE COMPLETE // [NET_SEC] ENCRYPTED TUNNEL ESTABLISHED ON PORT 443 // [DB_SYNC] 100% REPLICATION VERIFIED // [AI_CORE] PREDICTIVE RECRUITMENT MODELS ONLINE // [USER_AUTH] OPERATIVE ID: {loginEmail || 'AGENT_001'} AUTHORIZED // [SYS_WARN] NO ANOMALIES DETECTED //
                  </span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {currentTab === 'logs' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="tab-content"
            style={{ padding: isMobile ? '1rem' : '2rem' }}
          >
            {/* HEADER AREA */}
            <div className="mb-8 flex justify-between items-end border-b border-white/5 pb-6">
              <div>
                <div className="hud-kicker" style={{ color: 'var(--neon-gold)', marginBottom: '4px' }}>TELEMETRY_LOGS_v4.0</div>
                <h2 className="hud-value-lg m-0" style={{ fontSize: isMobile ? '2rem' : '2.8rem', fontFamily: 'var(--font-heading)' }}>Recent Activity</h2>
                <div className="text-muted mt-2 font-mono" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                  Total Sessions: {callLogs.length} | Latency: 42ms | Status: <span className="text-success-green">ENCRYPTED</span>
                </div>
              </div>
              {!isMobile && (
                <div className="flex gap-3">
                  <button
                    className="btn btn-secondary"
                    onClick={() => { if (confirm('Wipe all session telemetry?')) setCallLogs([]); }}
                    style={{ fontSize: '0.65rem', height: '36px' }}
                  >
                    <Trash2 size={14} /> WIPE_LOGS
                  </button>
                  <button className="btn btn-primary btn-glow" style={{ fontSize: '0.65rem', height: '36px' }}>
                    <Download size={14} /> EXPORT_INTEL
                  </button>
                </div>
              )}
            </div>

            {callLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 bg-black/40 rounded-lg border border-dashed border-white/10">
                <Activity size={48} className="text-muted mb-4 opacity-20" />
                <p className="hud-kicker" style={{ fontSize: '0.8rem', opacity: 0.5 }}>NO_ACTIVE_TELEMETRY_FOUND</p>
                <p className="text-xs text-muted mt-2">Logs will populate once tactical engagement begins.</p>
              </div>
            ) : isMobile ? (
              /* MOBILE OPTIMIZED LOGS - REDESIGNED */
              <div className="flex flex-col gap-3">
                {callLogs.map(log => (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={log.id}
                    className="settings-card-tactical"
                    style={{ padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center border border-white/5">
                          <Phone size={18} className="text-neon-gold" />
                        </div>
                        <div>
                          <h4 className="m-0 text-sm font-bold text-white">{log.studentName.toUpperCase()}</h4>
                          <div className="text-[10px] font-mono text-muted mt-1">{log.phoneNumber}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-neon-gold">{log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className={`text-[9px] font-black mt-1 ${log.status === 'completed' ? 'text-success-green' : 'text-danger-red'}`}>
                          {log.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                      <div className="hud-value-sm" style={{ fontSize: '0.7rem' }}>DURATION: {formatTime(log.duration)}</div>
                      <div className="flex gap-2">
                        <button
                          className="hud-icon-btn small"
                          onClick={() => window.open(`tel:${log.phoneNumber.replace(/\D/g, '')}`, '_self')}
                        >
                          <Phone size={12} />
                        </button>
                        <button
                          className="hud-icon-btn small danger"
                          onClick={() => setCallLogs(callLogs.filter(l => l.id !== log.id))}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* DESKTOP TABLE VIEW - HIGH FIDELITY */
              <div className="settings-card-tactical p-0 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/2 border-b border-white/10">
                      <th className="hud-kicker p-6" style={{ fontSize: '0.65rem' }}>TIME_STAMP</th>
                      <th className="hud-kicker p-6" style={{ fontSize: '0.65rem' }}>OPERATIONAL_TARGET</th>
                      <th className="hud-kicker p-6" style={{ fontSize: '0.65rem' }}>COMM_IDENTIFIER</th>
                      <th className="hud-kicker p-6" style={{ fontSize: '0.65rem' }}>SESSION_LENGTH</th>
                      <th className="hud-kicker p-6" style={{ fontSize: '0.65rem' }}>LINK_STATUS</th>
                      <th className="hud-kicker p-6" style={{ fontSize: '0.65rem' }}>ENGAGEMENT_CONTROLS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {callLogs.map(log => (
                      <tr key={log.id} className="group hover:bg-white/2 transition-colors">
                        <td className="p-6">
                          <div className="hud-value-sm" style={{ fontSize: '0.85rem' }}>{log.timestamp.toLocaleTimeString()}</div>
                          <div className="text-[9px] text-muted font-mono mt-1">{log.timestamp.toLocaleDateString()}</div>
                        </td>
                        <td className="p-6">
                          <div className="hud-value-sm text-neon-gold" style={{ fontSize: '0.9rem', letterSpacing: '0.5px' }}>{log.studentName.toUpperCase()}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1 h-1 rounded-full bg-success-green/40" />
                            <span className="text-[9px] text-muted font-bold">RECRUIT_QUALIFIED</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="text-sm font-mono text-white/80">{log.phoneNumber}</div>
                        </td>
                        <td className="p-6">
                          <div className="hud-value-sm" style={{ fontSize: '0.85rem', color: log.duration > 0 ? '#fff' : 'var(--text-muted)' }}>
                            {log.duration > 0 ? formatTime(log.duration) : '00:00:00'}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'completed' ? 'bg-success-green animate-pulse' : 'bg-danger-red'}`} />
                            <span className={`badge ${log.status === 'completed' ? 'badge-contacted' : 'badge-rejected'}`} style={{ fontSize: '0.6rem', letterSpacing: '1px' }}>
                              {log.status.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex justify-end gap-2">
                            <button
                              className="hud-icon-btn"
                              onClick={() => {
                                showToast(`Initiating redial: ${log.studentName}`, 'info');
                                window.open(`tel:${log.phoneNumber.replace(/\D/g, '')}`, '_self');
                              }}
                              title="Redial"
                            >
                              <Phone size={16} />
                            </button>
                            <button
                              className="hud-icon-btn danger"
                              onClick={() => setCallLogs(callLogs.filter(l => l.id !== log.id))}
                              title="Archive Log"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="tab-content" style={{ padding: isMobile ? '16px' : '32px' }}>
            <div className="settings-section-tactical">
              {/* PAGE HEADER */}
              <div className="settings-section-header-tactical" style={{ marginBottom: '3rem' }}>
                <div className="hud-kicker">SYSTEM_CONFIGURATION</div>
                <h2 className="hud-value-lg m-0" style={{ fontSize: isMobile ? '2rem' : '2.8rem', fontFamily: 'var(--font-heading)' }}>Settings</h2>
              </div>

              {/* AUTOMATION SECTION */}
              <section>
                <div className="settings-section-header-tactical">
                  <h3 className="settings-section-title-tactical">Automations</h3>
                  <p className="settings-section-desc-tactical">Logic parameters for tactical outreach cycles.</p>
                </div>
                <div className="settings-card-tactical">
                  <div className="settings-row-tactical">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical">Auto-Dial Delay</div>
                      <div className="settings-hint-tactical">Wait interval between completed call and next initiation.</div>
                    </div>
                    <select
                      className="settings-input-tactical"
                      style={{ width: '140px' }}
                      value={appSettings.autoDialDelay}
                      onChange={(e) => {
                        setAppSettings({ ...appSettings, autoDialDelay: parseInt(e.target.value) });
                        showToast('Cycle Delay Updated');
                      }}
                    >
                      <option value={1}>1 SEC</option>
                      <option value={3}>3 SEC</option>
                      <option value={5}>5 SEC</option>
                      <option value={10}>10 SEC</option>
                    </select>
                  </div>
                  <div className="settings-row-tactical">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical">Operational Master Switch</div>
                      <div className="settings-hint-tactical">Global toggle for all automated dialer sequences.</div>
                    </div>
                    <div
                      className={`settings-toggle-tactical ${autoDialEnabled ? 'active' : ''}`}
                      onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                    >
                      <div className="settings-toggle-knob-tactical" />
                    </div>
                  </div>
                </div>
              </section>

              {/* PROFILE & COMMS SECTION */}
              <section>
                <div className="settings-section-header-tactical">
                  <h3 className="settings-section-title-tactical">Agent Profile</h3>
                  <p className="settings-section-desc-tactical">Identification and communication blueprints.</p>
                </div>
                <div className="settings-card-tactical">
                  <div className="settings-row-tactical column">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical">Tactical Caller ID</div>
                      <div className="settings-hint-tactical">Identifying name used for system-generated outreach.</div>
                    </div>
                    <input
                      type="text"
                      className="settings-input-tactical"
                      placeholder="ENTER_ID..."
                      value={appSettings.callerId}
                      onChange={(e) => setAppSettings({ ...appSettings, callerId: e.target.value })}
                      onBlur={() => showToast('ID Synchronized')}
                    />
                  </div>
                  <div className="settings-row-tactical column">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical">Response Blueprint (Template)</div>
                      <div className="settings-hint-tactical">Primary message structure for WhatsApp/SMS deployments.</div>
                    </div>
                    <textarea
                      className="settings-input-tactical"
                      style={{ minHeight: '100px', resize: 'vertical' }}
                      placeholder="CONFIGURE_TEMPLATE..."
                      value={appSettings.smsTemplate}
                      onChange={(e) => setAppSettings({ ...appSettings, smsTemplate: e.target.value })}
                      onBlur={() => showToast('Template Cached')}
                    />
                    <div className="settings-hint-tactical" style={{ color: 'var(--neon-gold)', opacity: 0.7, fontSize: '0.65rem' }}>
                      VARIABLES: [Name], [Course], [CallerId]
                    </div>
                  </div>
                </div>
              </section>

              {/* DISPLAY & THEME */}
              <section>
                <div className="settings-section-header-tactical">
                  <h3 className="settings-section-title-tactical">Visual Interface</h3>
                  <p className="settings-section-desc-tactical">Skin deployment for the command center HUD.</p>
                </div>
                <div className="settings-card-tactical">
                  <div className="theme-grid-tactical">
                    {[
                      { id: 'dark', name: 'NEON_DARK', icon: '🌑', color: '#050505' },
                      { id: 'gold', name: 'SOLAR_GOLD', icon: '☀️', color: '#101014' },
                      { id: 'silver', name: 'LUNAR_SILV', icon: '🌙', color: '#f0f0f0' },
                      { id: 'system', name: 'AUTO_SYNC', icon: '🔄', color: 'linear-gradient(90deg, #333, #eee)' }
                    ].map(t => (
                      <div
                        key={t.id}
                        className={`theme-card-tactical ${appSettings.theme === t.id ? 'active' : ''}`}
                        onClick={() => { setAppSettings({ ...appSettings, theme: t.id as any }); showToast(`${t.name} DEPLOYED`); }}
                      >
                        <div className="theme-preview-tactical" style={{ background: t.color }}>
                          <div style={{ width: '20%', background: 'rgba(212,175,55,0.2)', borderRight: '1px solid rgba(212,175,55,0.1)' }} />
                          <div className="flex-1 p-2 flex flex-col gap-1 justify-center">
                            <div style={{ height: '4px', width: '60%', background: 'var(--neon-gold)', borderRadius: '2px' }} />
                            <div style={{ height: '3px', width: '80%', background: 'rgba(212,175,55,0.2)', borderRadius: '2px' }} />
                          </div>
                        </div>
                        <div className="theme-name-tactical">{t.icon} {t.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* DATA MANAGEMENT */}
              <section>
                <div className="settings-section-header-tactical">
                  <h3 className="settings-section-title-tactical">Intelligence Database</h3>
                  <p className="settings-section-desc-tactical">Encryption, backup, and sync protocols.</p>
                </div>
                <div className="settings-card-tactical">
                  <div className="settings-row-tactical">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical">Intelligence Export (JSON)</div>
                      <div className="settings-hint-tactical">Download encrypted full-state backup of all tactical data.</div>
                    </div>
                    <button className="btn btn-primary btn-glow" style={{ padding: '8px 16px', fontSize: '0.7rem' }} onClick={() => {
                      const data = { students, drives, callLogs, settings: appSettings, exportDate: new Date().toISOString() };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `GFLB_INTEL_${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                      showToast('Intel Exported');
                    }}><Download size={14} /> EXPORT</button>
                  </div>

                  <div className="settings-row-tactical">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical">Bulk Lead Import</div>
                      <div className="settings-hint-tactical">Ingest external contact lists via CSV or Excel blueprint.</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.65rem' }} onClick={() => {
                        const csvContent = "Name,Phone No,Course / Degree,Gender,Date of Birth,Guardian Phone\nSanthosh Kumar,9876543210,B.Tech CS,Male,2005-05-20,9123456789";
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = "GFLB_TEMPLATE.csv";
                        link.click();
                      }}>BLUEPRINT</button>
                      <label className="btn btn-primary btn-glow" style={{ cursor: 'pointer', padding: '8px 12px', fontSize: '0.65rem' }}>
                        <Upload size={14} /> UPLOAD
                        <input
                          type="file"
                          accept=".csv, .xlsx, .xls"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) processFile(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="settings-row-tactical">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical">Cloud Intelligence Sync</div>
                      <div className="settings-hint-tactical">{isCloudEnabled ? 'REALTIME_SYNC_ACTIVE' : 'ACTIVATE_CLOUD_REPLICATION'}</div>
                    </div>
                    <button
                      className={`hud-icon-btn ${isCloudEnabled ? 'active' : ''}`}
                      onClick={() => {
                        const newState = !isCloudEnabled;
                        setIsCloudEnabled(newState);
                        localStorage.setItem('ksk_cloud_enabled', newState.toString());
                        showToast(newState ? 'Cloud Sync Online' : 'Cloud Sync Offline');
                      }}
                    >
                      <Cloud size={18} />
                    </button>
                  </div>
                </div>
              </section>

              {/* SECURITY */}
              <section style={{ marginBottom: '100px' }}>
                <div className="settings-section-header-tactical">
                  <h3 className="settings-section-title-tactical">Security Protocols</h3>
                  <p className="settings-section-desc-tactical">Access control and session termination.</p>
                </div>
                <div className="settings-card-tactical" style={{ border: '1px solid var(--danger-red)', background: 'rgba(255, 77, 90, 0.02)' }}>
                  <div className="settings-row-tactical">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical" style={{ color: 'var(--danger-red)' }}>Terminate Session</div>
                      <div className="settings-hint-tactical">Currently authenticated as {loginEmail || 'TACTICAL_OPERATIVE'}.</div>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ color: 'var(--danger-red)', borderColor: 'var(--danger-red)', padding: '10px 20px' }}
                      onClick={() => {
                        if (window.confirm('TERMINATE_ALL_ACTIVE_SESSIONS?')) {
                          setIsAuthenticated(false);
                          localStorage.removeItem('ksk_auth');
                          showToast('Session Terminated', 'info');
                        }
                      }}
                    >
                      <LogOut size={16} /> LOGOUT
                    </button>
                  </div>
                </div>
              </section>
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

      {/* Add Contacts to Drive Modal */}
      <AnimatePresence>
        {isAddContactModalOpen && viewingDrive && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-content"
              style={{ maxWidth: '600px' }}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="modal-header">
                <div>
                  <div className="hud-kicker" style={{ color: 'var(--neon-gold)' }}>DEPLOYMENT_REINFORCEMENT</div>
                  <h2 className="m-0" style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>Add Contacts to {viewingDrive.name}</h2>
                </div>
                <button className="btn-icon" onClick={() => { setIsAddContactModalOpen(false); setAddContactSearchTerm(''); }}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1rem' }}>
                <div className="search-box tactical mb-4" style={{ width: '100%' }}>
                  <input
                    type="text"
                    placeholder="FILTER_GLOBAL_DATABASE..."
                    className="search-input"
                    value={addContactSearchTerm}
                    onChange={(e) => setAddContactSearchTerm(e.target.value)}
                  />
                  <div className="search-btn"><Search size={14} /></div>
                </div>
                <div className="flex flex-col gap-2">
                  {students
                    .filter(s => !viewingDrive.contactIds.includes(s.id))
                    .filter(s =>
                      s.name.toLowerCase().includes(addContactSearchTerm.toLowerCase()) ||
                      s.course.toLowerCase().includes(addContactSearchTerm.toLowerCase())
                    )
                    .map(student => (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between p-3 rounded border transition-all cursor-pointer ${selectedContactsForDrive.includes(student.id) ? 'border-neon-gold bg-gold-glow-soft' : 'border-white/5 bg-white/2 hover:bg-white/5'}`}
                        onClick={() => {
                          setSelectedContactsForDrive(prev =>
                            prev.includes(student.id)
                              ? prev.filter(id => id !== student.id)
                              : [...prev, student.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded overflow-hidden border border-white/10">
                            <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{student.name}</div>
                            <div className="text-[10px] text-muted font-mono">{student.course}</div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedContactsForDrive.includes(student.id) ? 'bg-neon-gold border-neon-gold' : 'border-white/20'}`}>
                          {selectedContactsForDrive.includes(student.id) && <Check size={12} color="#000" strokeWidth={4} />}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div className="modal-footer flex justify-between items-center mt-6 pt-4 border-t border-white/5">
                <div className="hud-kicker" style={{ fontSize: '0.6rem', opacity: 0.6 }}>
                  {selectedContactsForDrive.length} OPERATIVES_SELECTED
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-secondary" style={{ fontSize: '0.7rem' }} onClick={() => { setIsAddContactModalOpen(false); setAddContactSearchTerm(''); }}>CANCEL</button>
                  <button
                    className="btn btn-primary btn-glow"
                    style={{ fontSize: '0.7rem' }}
                    disabled={selectedContactsForDrive.length === 0}
                    onClick={() => {
                      setDrives(prev => prev.map(d =>
                        d.id === viewingDrive.id
                          ? { ...d, contactIds: [...new Set([...d.contactIds, ...selectedContactsForDrive])] }
                          : d
                      ));
                      setViewingDrive(prev => prev ? { ...prev, contactIds: [...new Set([...prev.contactIds, ...selectedContactsForDrive])] } : null);
                      setIsAddContactModalOpen(false);
                      setSelectedContactsForDrive([]);
                      setAddContactSearchTerm('');
                      showToast(`Successfully deployed ${selectedContactsForDrive.length} new contacts.`, 'success');
                    }}
                  >
                    DEPLOY_TO_CAMPAIGN
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    <button className="btn btn-secondary" onClick={() => setEditingStudent({ ...editingStudent, avatar: getAvatar(editingStudent.name) })}>
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
                  <div className="input-group flex-1">
                    <label className="input-label">Lead Status</label>
                    <select
                      className="input-field"
                      value={editingStudent.status}
                      onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value as any })}
                      style={{ height: '45px' }}
                    >
                      <option value="new">🆕 New Lead</option>
                      <option value="contacted">📞 Contacted</option>
                      <option value="enrolled">🎓 Enrolled</option>
                      <option value="not_interested">❌ Not Interested</option>
                    </select>
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

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="input-group flex-1">
                    <label className="input-label">Gender</label>
                    <select
                      className="input-field"
                      value={editingStudent.gender}
                      onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="input-group flex-1">
                    <label className="input-label">Date of Birth</label>
                    <input
                      type="date"
                      className="input-field"
                      value={editingStudent.dob}
                      onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="input-group flex-1">
                    <label className="input-label">Email ID</label>
                    <input
                      type="email"
                      className="input-field"
                      placeholder="Email address"
                      value={editingStudent.email}
                      onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    />
                  </div>
                  <div className="input-group flex-1">
                    <label className="input-label">Guardian Phone No</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Guardian Contact"
                      value={editingStudent.guardianPhone}
                      onChange={(e) => setEditingStudent({ ...editingStudent, guardianPhone: e.target.value.replace(/[^\d+]/g, '') })}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Notes</label>
                  <textarea
                    className="input-field"
                    style={{ minHeight: '80px' }}
                    placeholder="Additional information..."
                    value={editingStudent.notes}
                    onChange={(e) => setEditingStudent({ ...editingStudent, notes: e.target.value })}
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
                  File: <strong>{csvPreview.fileName}</strong><br />
                  {csvPreview.sheets.length > 1
                    ? `Detected ${csvPreview.sheets.length} sheets. A Campaign will be created for each sheet.`
                    : `Sheet: ${csvPreview.sheets[0].name}. Select which columns correspond to our fields.`
                  }
                </p>

                <div className="flex flex-col gap-4">
                  {[
                    { label: 'Name', key: 'name' },
                    { label: 'Phone No', key: 'phone' },
                    { label: 'Course / Degree', key: 'course' },
                    { label: 'Gender', key: 'gender' },
                    { label: 'Date of Birth', key: 'dob' },
                    { label: 'Guardian Phone', key: 'guardianPhone' }
                  ].map(field => (
                    <div key={field.key} className="flex justify-between items-center p-3" style={{ background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 600 }}>{field.label}</span>
                      <select
                        value={csvMapping[field.key as keyof typeof csvMapping]}
                        onChange={(e) => setCsvMapping({ ...csvMapping, [field.key]: parseInt(e.target.value) })}
                        style={{ padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                      >
                        <option value="-1">(none)</option>
                        {csvPreview.sheets[0].headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="input-group mt-6">
                  <label className="input-label">Sync with Campaign (Optional)</label>
                  <select
                    className="input-field"
                    value={selectedDriveForImport}
                    onChange={(e) => setSelectedDriveForImport(e.target.value)}
                  >
                    <option value="">No Campaign (Import to Contacts only)</option>
                    {drives.map(drive => (
                      <option key={drive.id} value={drive.id}>{drive.name}</option>
                    ))}
                  </select>

                  {selectedDriveForImport && (
                    <div className="flex items-center gap-2 mt-3" style={{ padding: '0.5rem', background: 'rgba(var(--accent-rgb), 0.05)', borderRadius: '6px' }}>
                      <input
                        type="checkbox"
                        id="overrideCourse"
                        checked={overrideCourseWithDrive}
                        onChange={(e) => setOverrideCourseWithDrive(e.target.checked)}
                      />
                      <label htmlFor="overrideCourse" style={{ fontSize: '0.8rem', cursor: 'pointer' }}>
                        Set all contacts' <strong>Course / Degree</strong> to "{drives.find(d => d.id === selectedDriveForImport)?.name}"
                      </label>
                    </div>
                  )}

                  {!overrideCourseWithDrive && selectedDriveForImport && (
                    <p className="text-xs text-muted mt-2">
                      Contacts will be added to the campaign, but will keep their individual "Course / Degree" from the CSV.
                    </p>
                  )}
                </div>

                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(var(--accent-rgb), 0.05)', borderRadius: '8px', fontSize: '0.85rem' }}>
                  <strong>Preview ({csvPreview.sheets[0].name} - Row 1):</strong><br />
                  Name: {csvMapping.name !== -1 ? (csvPreview.sheets[0].rows[0][csvMapping.name] || 'N/A') : 'N/A'} |
                  Phone: {csvMapping.phone !== -1 ? (csvPreview.sheets[0].rows[0][csvMapping.phone] || 'N/A') : 'N/A'}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setIsCsvModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={async () => {
                  let totalImported = 0;
                  const allNewStudents: Student[] = [];
                  const updatedDrives = [...drives];

                  // Iterate through all sheets
                  let skippedDuplicates = 0;
                  for (const sheet of csvPreview.sheets) {
                    const sheetStudents: Student[] = sheet.rows.map((row, i) => {
                      const phoneRaw = csvMapping.phone !== -1 ? String(row[csvMapping.phone] || '') : '';
                      const phoneCleaned = cleanPhone(phoneRaw);

                      if (!phoneCleaned) return null;

                      // Check for duplicates in current memory or local state
                      const isDuplicate = students.some(s => s.phoneNumbers.some(p => cleanPhone(p.number) === phoneCleaned)) ||
                        allNewStudents.some(s => s.phoneNumbers.some(p => cleanPhone(p.number) === phoneCleaned));

                      if (isDuplicate) {
                        skippedDuplicates++;
                        return null;
                      }

                      const studentId = `imp_${Date.now()}_${sheet.name}_${i}`;
                      const csvCourse = csvMapping.course !== -1 ? (row[csvMapping.course] || sheet.name) : sheet.name;

                      return {
                        id: studentId,
                        name: csvMapping.name !== -1 ? (row[csvMapping.name] || 'Unnamed Lead') : 'Unnamed Lead',
                        phoneNumbers: [{
                          id: `p_${Date.now()}_${i}`,
                          type: 'Mobile',
                          number: phoneRaw.replace(/[^\d+]/g, '')
                        }],
                        course: csvCourse,
                        gender: csvMapping.gender !== -1 ? (row[csvMapping.gender] || '') : '',
                        dob: csvMapping.dob !== -1 ? (row[csvMapping.dob] || '') : '',
                        guardianPhone: csvMapping.guardianPhone !== -1 ? (String(row[csvMapping.guardianPhone]) || '').replace(/[^\d+]/g, '') : '',
                        year: 'N/A',
                        email: '',
                        status: 'new' as Student['status'],
                        notes: `Imported from ${csvPreview.fileName} (Sheet: ${sheet.name})`,
                        avatar: getAvatar(csvMapping.name !== -1 ? (row[csvMapping.name] || 'Unnamed Lead') : 'Unnamed Lead')
                      } as Student;
                    }).filter((s): s is Student => s !== null);

                    if (sheetStudents.length > 0) {
                      allNewStudents.push(...sheetStudents);
                      totalImported += sheetStudents.length;

                      // Check if a drive with the sheet name exists
                      const drive = updatedDrives.find(d => d.name.toLowerCase() === sheet.name.toLowerCase());

                      if (!drive) {
                        // Create new drive if it doesn't exist
                        const newDrive: Drive = {
                          id: `d_${Date.now()}_${sheet.name}`,
                          name: sheet.name,
                          description: `Auto-created from import: ${csvPreview.fileName}`,
                          contactIds: sheetStudents.map(s => s.id),
                          status: 'active'
                        };
                        updatedDrives.push(newDrive);
                        if (isCloudEnabled) await setDoc(doc(db, "drives", newDrive.id), newDrive);
                      } else {
                        // Update existing drive
                        drive.contactIds = [...drive.contactIds, ...sheetStudents.map(s => s.id)];
                        if (isCloudEnabled) await setDoc(doc(db, "drives", drive.id), drive);
                      }
                    }
                  }

                  // Bulk save students to cloud if enabled
                  if (isCloudEnabled) {
                    for (const s of allNewStudents) {
                      await setDoc(doc(db, "students", s.id), s);
                    }
                  }

                  setStudents(prev => [...allNewStudents, ...prev]);
                  setDrives(updatedDrives);
                  setIsCsvModalOpen(false);

                  const msg = skippedDuplicates > 0
                    ? `Imported ${totalImported} contacts. ${skippedDuplicates} duplicates were skipped.`
                    : `Imported ${totalImported} contacts across ${csvPreview.sheets.length} campaigns!`;

                  showToast(msg, skippedDuplicates > 0 ? 'info' : 'success');
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
