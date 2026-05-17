/* noinspection CssInlineStyles */
/* noinspection CssInlineStyles, JSUnusedGlobalSymbols */
import React, { useState, useEffect, useRef } from 'react';
import {
  Phone, Users, LayoutDashboard, Settings, Search,
  PhoneCall, PhoneOff, MessageSquare, Mail,
  FileText, Copy, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronDown, X, Plus, Trash, Trash2, Edit, Edit3, SkipForward, Power, Download, FolderPlus, Cloud, LogOut, Bell,
  Grid3x3, Delete, Database, Upload, BarChart3, Check, UserPlus,
  LayoutGrid, Layers, Activity, Zap, MoreHorizontal, PhoneIncoming, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import * as XLSX from 'xlsx';
import { db } from './firebase';
import {
  collection, doc, setDoc, onSnapshot, query,
  orderBy, deleteDoc
} from 'firebase/firestore';
import { studentsData, scripts, type Student } from './data';
import gflbLogo from './assets/GFLB LOGO.png';
import './App.css';

const getAvatar = (name: string, existingAvatar?: string) => {
  if (existingAvatar && !existingAvatar.includes('default_avatar.png') && existingAvatar.startsWith('http')) {
    return existingAvatar;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff`;
};

const cleanPhone = (num: string) => (num || '').replace(/[^\d+]/g, '');

const csvCell = (row: unknown[], index: number) =>
  index !== -1 ? String(row[index] ?? '') : '';

const createCallLogId = () => `log_${Date.now()}`;

const ENGAGEMENT_BAR_HEIGHTS = Array.from({ length: 24 }, (_, i) => 15 + ((i * 37 + 13) % 86));

const applyAutoSyncTime = () => {
  const h = new Date().getHours();
  const isDay = h >= 6 && h < 18;
  document.body.setAttribute('data-auto-time', isDay ? 'day' : 'night');
  if (document.body.classList.contains('theme-auto-sync')) {
    document.body.classList.toggle('theme-lunar-silv', isDay);
  }
};

type GoogleJwtPayload = { name?: string; email?: string; picture?: string };

type CsvSheetPreview = { name: string; headers: string[]; rows: unknown[][] };

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
  theme: 'dark' | 'emerald' | 'gold' | 'silver' | 'system';
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
  const [activeStudent, setActiveStudent] = useState<Student | null>(() => {
    const saved = localStorage.getItem('ksk_students');
    let parsed = saved ? JSON.parse(saved) : studentsData;
    parsed = parsed.map((s: Student) => ({
      ...s,
      avatar: getAvatar(s.name, s.avatar)
    }));
    return parsed.length > 0 ? parsed[0] : null;
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
      theme: 'dark',
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

  const [autoDialEnabled, setAutoDialEnabled] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [mobileViewMode, setMobileViewMode] = useState<'list' | 'detail'>('list');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isNewContact, setIsNewContact] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{
    sheets: CsvSheetPreview[];
    fileName: string;
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
  const [isDriveFilterOpen, setIsDriveFilterOpen] = useState(false);
  const [driveFilterGender, setDriveFilterGender] = useState('');
  const [driveFilterCourse, setDriveFilterCourse] = useState('');
  const [driveFilterBatch, setDriveFilterBatch] = useState('');
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [selectedContactsForDrive, setSelectedContactsForDrive] = useState<string[]>([]);
  const [addContactSearchTerm, setAddContactSearchTerm] = useState('');
  const [analyticsNodeId] = useState(() =>
    Math.random().toString(36).substring(7).toUpperCase()
  );
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const selectedPhone = activeStudent ? (activeStudent.phoneNumbers[0] ?? null) : null;

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
    document.body.classList.remove(
      'theme-neon-dark', 'theme-neon-emerald',
      'theme-solar-gold', 'theme-lunar-silv', 'theme-auto-sync'
    );
    document.body.removeAttribute('data-auto-time');

    if (appSettings.theme === 'dark' || appSettings.theme === 'emerald') {
      document.body.classList.add('theme-neon-emerald');
    } else if (appSettings.theme === 'gold') {
      document.body.classList.add('theme-solar-gold');
    } else if (appSettings.theme === 'silver') {
      document.body.classList.add('theme-lunar-silv');
    } else {
      // AUTO_SYNC
      document.body.classList.add('theme-auto-sync');
      applyAutoSyncTime();
    }
  }, [appSettings.theme]);

  // Keep AUTO_SYNC refreshed every 60 seconds
  useEffect(() => {
    if (appSettings.theme !== 'system') return;
    const id = setInterval(applyAutoSyncTime, 60_000);
    return () => clearInterval(id);
  }, [appSettings.theme]);

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

  useEffect(() => {
    if (!isCalling) return;
    const interval = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
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

  const resolveScript = (content: string, student: Student) =>
    content
      .replace(/\[Name\]/g, student.name.split(' ')[0])
      .replace(/\[Course\]/g, student.course)
      .replace(/\[Your Name\]/g, appSettings.callerId);

  const getFilteredStudentList = () => {
    const q = searchTerm.toLowerCase();
    const digits = searchTerm.replace(/[^\d+]/g, '');
    return students
      .filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q) ||
        (digits.length > 0 && s.phoneNumbers.some(p => p.number.replace(/[^\d+]/g, '').includes(digits)))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const openWhatsApp = (student: Student) => {
    const num = student.phoneNumbers[0]?.number;
    if (!num) {
      showToast('No phone number on file', 'error');
      return;
    }
    window.open(`https://wa.me/${cleanPhone(num)}?text=${getFormattedMessage(student)}`, '_blank');
  };

  const openEmail = (student: Student) => {
    const subject = encodeURIComponent(`Admission inquiry — ${student.course}`);
    const body = getFormattedMessage(student);
    if (student.email) {
      window.open(`mailto:${student.email}?subject=${subject}&body=${body}`, '_self');
    } else {
      window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
      showToast('No email on file — opened mail composer', 'info');
    }
  };

  const downloadBrochure = (student: Student) => {
    const text = [
      'GFLB University — Admissions Brochure',
      '',
      `Prepared for: ${student.name}`,
      `Program: ${student.course}`,
      `Academic year: ${student.year}`,
      '',
      'For full brochure and fee structure, contact admissions@university.edu',
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Brochure_${student.name.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Brochure downloaded', 'success');
  };

  const focusSessionNotes = () => {
    document.getElementById('session-notes-textarea')?.focus();
    showToast('Session notes ready', 'info');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
    } catch {
      showToast('Copy failed', 'error');
    }
  };

  const exportIntel = () => {
    const data = { students, drives, callLogs, settings: appSettings, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GFLB_INTEL_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Intel exported', 'success');
  };

  const exportCallLogsIntel = () => {
    const blob = new Blob([JSON.stringify(callLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GFLB_CALL_LOGS_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Call logs exported', 'success');
  };

  const deleteCallLogById = async (id: string) => {
    if (isCloudEnabled) {
      try {
        await deleteDoc(doc(db, 'callLogs', id));
      } catch {
        showToast('Failed to delete log from cloud', 'error');
        return;
      }
    }
    setCallLogs(prev => prev.filter(l => l.id !== id));
    showToast('Log entry removed', 'success');
  };

  const wipeAllCallLogs = async () => {
    if (!window.confirm('Wipe all session telemetry?')) return;
    if (isCloudEnabled) {
      await Promise.all(
        callLogs.map(log =>
          deleteDoc(doc(db, 'callLogs', log.id)).catch(() => undefined)
        )
      );
    }
    setCallLogs([]);
    showToast('All logs wiped', 'success');
  };


  const importIntelBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(String(event.target?.result)) as {
          students?: Student[];
          drives?: Drive[];
          callLogs?: CallLog[];
          settings?: AppSettings;
        };
        if (data.students?.length) {
          setStudents(data.students.map(s => ({ ...s, avatar: getAvatar(s.name, s.avatar) })));
          setActiveStudent(data.students[0]);
        }
        if (data.drives) setDrives(data.drives);
        if (data.callLogs) {
          setCallLogs(
            data.callLogs.map(log => ({
              ...log,
              timestamp: new Date(log.timestamp),
            }))
          );
        }
        if (data.settings) setAppSettings(data.settings);
        showToast('Backup restored successfully', 'success');
      } catch {
        showToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const removeContactFromDrive = async (driveId: string, studentId: string) => {
    const drive = drives.find(d => d.id === driveId);
    if (!drive) return;
    const updatedDrive = { ...drive, contactIds: drive.contactIds.filter(id => id !== studentId) };
    if (isCloudEnabled) {
      try {
        await setDoc(doc(db, 'drives', updatedDrive.id), updatedDrive);
      } catch {
        showToast('Failed to update campaign in cloud', 'error');
        return;
      }
    }
    setDrives(drives.map(d => (d.id === updatedDrive.id ? updatedDrive : d)));
    if (viewingDrive?.id === updatedDrive.id) setViewingDrive(updatedDrive);
    showToast('Contact removed from campaign', 'info');
  };

  const handleCallToggle = async () => {
    if (!activeStudent || activeStudent.phoneNumbers.length === 0 || !selectedPhone) {
      showToast('No phone number available to call', 'error');
      return;
    }

    if (!isCalling) {
      setCallDuration(0);
      setIsCalling(true);
      showToast(`Dialing ${selectedPhone.number}...`, 'info');
      const dialNumber = selectedPhone.number.replace(/[^\d+]/g, '');
      window.open(`tel:${dialNumber}`, '_self');
    } else {
      setIsCalling(false);
      showToast(`Call ended. Duration: ${formatTime(callDuration)}`, 'success');

      const newLog: CallLog = {
        id: createCallLogId(),
        studentName: activeStudent.name,
        phoneNumber: selectedPhone.number,
        duration: callDuration,
        timestamp: new Date(),
        status: callDuration > 0 ? 'completed' : 'missed',
      };

      if (isCloudEnabled) {
        try {
          await setDoc(doc(db, "callLogs", newLog.id), newLog);
        } catch {
          showToast('Failed to save call log to cloud', 'error');
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
      } catch {
        showToast('Failed to update cloud contact', 'error');
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
    if (isCalling || !activeStudent) return;

    let list: Student[] = [];
    if (currentTab === 'contacts') {
      list = getFilteredStudentList();
    } else if (currentTab === 'drives' && viewingDrive) {
      list = students
        .filter(s => viewingDrive.contactIds.includes(s.id))
        .filter(s => {
          const matchesSearch = s.name.toLowerCase().includes(driveContactSearchTerm.toLowerCase()) ||
            s.course.toLowerCase().includes(driveContactSearchTerm.toLowerCase());
          const matchesGender = !driveFilterGender || s.gender === driveFilterGender;
          const matchesCourse = !driveFilterCourse || s.course === driveFilterCourse;
          const matchesBatch = !driveFilterBatch || s.year === driveFilterBatch;
          return matchesSearch && matchesGender && matchesCourse && matchesBatch;
        });
    } else {
      list = getFilteredStudentList();
    }

    if (list.length <= 1) return;

    const currentIndex = list.findIndex(s => s.id === activeStudent.id);
    const nextIndex = (currentIndex + 1) % list.length;
    setActiveStudent(list[nextIndex]);
    showToast(`Skipped to ${list[nextIndex].name}`, 'info');
  };

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
      const sheetsData: CsvSheetPreview[] = [];

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        if (json.length > 0) {
          const headers = json[0].map((h) => String(h ?? '').trim());
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
        } catch {
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
        } catch {
          showToast('Failed to save campaign to cloud', 'error');
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
      } catch {
        showToast('Failed to delete contact from cloud', 'error');
      }
    }
    const updatedStudents = students.filter(s => s.id !== id);

    if (activeStudent?.id === id) {
      // Find the next student in the current list context before updating students state
      let list: Student[] = [];
      if (currentTab === 'contacts') {
        list = getFilteredStudentList();
      } else if (currentTab === 'drives' && viewingDrive) {
        list = students
          .filter(s => viewingDrive.contactIds.includes(s.id))
          .filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(driveContactSearchTerm.toLowerCase()) ||
              s.course.toLowerCase().includes(driveContactSearchTerm.toLowerCase());
            const matchesGender = !driveFilterGender || s.gender === driveFilterGender;
            const matchesCourse = !driveFilterCourse || s.course === driveFilterCourse;
            const matchesBatch = !driveFilterBatch || s.year === driveFilterBatch;
            return matchesSearch && matchesGender && matchesCourse && matchesBatch;
          });
      } else {
        list = getFilteredStudentList();
      }

      const currentIndex = list.findIndex(s => s.id === id);
      const nextStudent = list[currentIndex + 1] || list[currentIndex - 1] || updatedStudents[0] || null;
      setActiveStudent(nextStudent);

      if (isMobile && updatedStudents.length === 0) setMobileViewMode('list');
    }

    setStudents(updatedStudents);
    setDrives(drives.map(d => ({
      ...d,
      contactIds: d.contactIds.filter(cId => cId !== id)
    })));
    showToast('Contact deleted successfully.', 'success');
  };

  const deleteDrive = async (id: string) => {
    if (!window.confirm('Delete this campaign permanently?')) return;
    if (isCloudEnabled) {
      try {
        await deleteDoc(doc(db, "drives", id));
      } catch {
        showToast('Failed to delete campaign from cloud', 'error');
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

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        showToast('Authentication failed', 'error');
        return;
      }
      const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
      setIsAuthenticated(true);
      localStorage.setItem('ksk_auth', 'true');
      localStorage.setItem('ksk_user', JSON.stringify({
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture
      }));
      setLoginEmail(decoded.email ?? '');
      showToast(`Welcome, ${decoded.name ?? 'User'}!`, 'success');
    } catch {
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
    avgCallTime: callLogs.length > 0 ? Math.round(callLogs.reduce((acc, log) => acc + log.duration, 0) / callLogs.length) : 0,
    callSuccessRate: callLogs.length > 0
      ? Math.round((callLogs.filter(l => l.status === 'completed').length / callLogs.length) * 100)
      : 0,
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
              <div className="mobile-logo-box mobile-logo-box-login">
                <div className="logo-glow-sweep" />
                <img src={gflbLogo} alt="GFLB Studio" className="animated-logo" />
              </div>
            ) : (
              <img src={gflbLogo} alt="GFLB Studio" className="animated-logo login-logo-img" />
            )}
            <p>Sign in to your agent dashboard</p>
          </div>

          <div className="google-login-wrap">
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
            <div className="input-group input-group-no-mb">
              <label className="input-label">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="agent@university.edu"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="input-group input-group-no-mb">
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
            <div className="nav-spacer"></div>
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
            <span>Drive</span>
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
            <h1 className="h1-heading-font">GFLB CALLER PRO</h1>
          </div>
          <div className="header-actions">
            {!isMobile && (
              <button
                type="button"
                className={`auto-dialer-toggle ${autoDialEnabled ? 'active' : ''}`}
                onClick={() => setAutoDialEnabled(!autoDialEnabled)}
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
              <label className="hud-icon-btn hud-label-import" title="Import contacts">
                <Upload size={20} />
                <input
                  type="file"
                  title="Import contacts"
                  accept=".csv,.xlsx,.xls"
                  className="file-input-hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) processFile(file);
                    e.target.value = '';
                  }}
                />
              </label>
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
                  <button className="search-btn" title="Search contacts"><Search size={18} /></button>
                </div>
                <div className="student-list flex-1 overflow-y-auto pr-1">
                  {filteredStudents.map(student => (
                    <div
                      key={student.id}
                      className={`student-card-hud student-card-inner ${activeStudent?.id === student.id ? 'active is-active' : 'is-inactive'}`}
                      onClick={() => handleStudentSelect(student)}
                    >
                      <div className={`avatar-hud-wrap avatar-hud-circle ${activeStudent?.id === student.id ? 'is-active' : 'is-inactive'}`}>
                        <div className="w-full h-full rounded-full flex items-center justify-center bg-zinc-900 font-bold text-xs avatar-initials">
                          {student.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 {...{ style: Object.assign({}, { margin: 0, fontSize: '0.85rem', color: activeStudent?.id === student.id ? 'var(--neon-gold)' : '#fff' }) as any }}>{student.name}</h4>
                        <p {...{ style: Object.assign({}, { margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }) as any }}>{student.course}</p>
                      </div>
                      <span className={`badge-hud badge-${student.status}`} {...{ style: Object.assign({}, { fontSize: '0.6rem', padding: '2px 6px' }) as any }}>{student.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                {!isMobile && (
                  <button className="btn-neon-outline btn-solid-border w-full mt-4" onClick={openAddContactModal}>+ ADD NEW CONTACT</button>
                )}
              </div>
            </section>

            {/* Middle Column: Profile & Dialer */}
            <section className={`profile-panel ${isMobile && mobileViewMode === 'list' ? 'mobile-hidden' : ''}`}>
              <div className="flex-1 overflow-y-auto profile-scroll-no-bar">
                {activeStudent ? (
                  <div className="p-8">
                    {isMobile && (
                      <button type="button" className="mobile-back-to-list" onClick={() => setMobileViewMode('list')}>
                        <ChevronLeft size={18} />
                        Contacts List
                      </button>
                    )}
                    {/* Header Card */}
                    <div className="flex items-center gap-8 mb-12">
                      <div className="hud-avatar-outer-glow hud-avatar-outer">
                        <div className="hud-avatar-inner-wrap hud-avatar-inner">
                          <div className="w-full h-full flex items-center justify-center bg-black text-3xl font-black profile-initials">
                            {activeStudent.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="hud-tag-label profile-tag-label">LEAD_PROFILE</div>
                        <h2 className="hud-value-lg profile-name">{activeStudent.name}</h2>
                        <div className="flex items-center gap-3">
                          <span className="badge-hud badge-new">{activeStudent.status.toUpperCase()}</span>
                          <span className="profile-course-text">{activeStudent.course}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-neon-outline" onClick={skipToNext} title="Skip to next lead"><SkipForward size={14} /> SKIP</button>
                        <button className="btn-neon-outline" onClick={() => openEditContactModal(activeStudent)} title="Modify current lead"><Edit size={14} /> EDIT</button>
                        <button className="btn-neon-outline btn-neon-danger" onClick={() => { deleteStudent(activeStudent.id); setActiveStudent(null); }} title="Erase lead permanently"><Trash size={14} /> DELETE</button>
                      </div>
                    </div>

                    {/* Channels */}
                    <div className="hud-label mb-4">COMM_CHANNELS</div>
                    <div className="hud-card hud-card-gold-border mb-12">
                      <div className="flex items-center gap-6">
                        <div className="w-10 h-10 rounded bg-gold-glow-soft flex items-center justify-center text-gold phone-icon-gold"><Phone size={20} /></div>
                        <div className="flex-1">
                          <div className="text-[0.6rem] text-muted font-bold">MOBILE</div>
                          <div className="text-xl font-mono tracking-widest text-white">{activeStudent.phoneNumbers[0]?.number}</div>
                        </div>
                        <div className="flex gap-2"><MoreHorizontal size={20} /></div>
                      </div>
                    </div>

                    {/* Central Dialer */}
                    <div className="hud-dialer-container py-12">
                      <div className={`dialer-circular-btn ${isCalling ? 'active' : ''}`} onClick={handleCallToggle}>
                        <div className="dialer-ring-outer"></div>
                        <div className={`dialer-ring-inner ${isCalling ? 'dialer-ring-inner-dynamic-active' : 'dialer-ring-inner-dynamic-idle'}`}></div>
                        <div className={`dialer-icon-box ${isCalling ? 'dialer-icon-box-active' : 'dialer-icon-box-idle'}`}>
                          {isCalling ? <PhoneOff size={40} /> : <Phone size={40} />}
                        </div>
                      </div>
                      <div className="waveform-viz mt-8">
                        {[...Array(20)].map((_, i) => (
                          <div key={i} className={`waveform-bar ${isCalling ? 'waveform-bar-active' : 'waveform-bar-idle'}`} {...{ style: Object.assign({}, { animationDelay: `${i * 0.05}s` }) as any }} />
                        ))}
                      </div>
                      <div className={`hud-label mt-6 ${isCalling ? 'hud-label-active' : 'hud-label-idle'}`}>
                        {isCalling ? 'TERMINATE_ENCRYPTED_CALL' : 'INITIATE_SECURE_CALL'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                    <Users size={48} className="text-neon-gold mb-4 animate-pulse" />
                    <div className="hud-kicker">AWAITING_OPERATIVE_SELECTION</div>
                    <p className="text-xs text-muted max-w-xs mt-2 leading-relaxed">No lead is currently active. Select a target from the left list to engage.</p>
                  </div>
                )}
              </div>

              {/* Bottom Bar */}
              <div className="hud-bottom-actions">
                <div className="hud-action-tab" onClick={() => activeStudent && openWhatsApp(activeStudent)}><MessageSquare size={20} /> <span>WHATSAPP</span></div>
                <div className="hud-action-tab" onClick={() => activeStudent && openEmail(activeStudent)}><Mail size={20} /> <span>EMAIL</span></div>
                <div className="hud-action-tab" onClick={() => activeStudent && downloadBrochure(activeStudent)}><FileText size={20} /> <span>BROCHURE</span></div>
                <div className="hud-action-tab" onClick={focusSessionNotes}><Edit size={20} /> <span>NOTE</span></div>
                <div className="flex items-center justify-center p-4">
                  <button
                    type="button"
                    className={`theme-switch active`}
                    title="Cycle Theme"
                    onClick={() => {
                      const order: AppSettings['theme'][] = ['dark', 'gold', 'silver', 'system'];
                      const cur = order.indexOf(appSettings.theme);
                      const next = order[(cur + 1) % order.length];
                      const labels: Record<string, string> = { dark: 'NEON_EMERALD', gold: 'SOLAR_GOLD', silver: 'LUNAR_SILV', system: 'AUTO_SYNC' };
                      setAppSettings(prev => ({ ...prev, theme: next }));
                      showToast(`${labels[next]} DEPLOYED`, 'success');
                    }}
                  >
                    <span className="theme-label-sublabel">{{
                      dark: '🟢 NEON_EMERALD',
                      gold: '☀️ SOLAR_GOLD',
                      silver: '🌙 LUNAR_SILV',
                      system: '🔄 AUTO_SYNC',
                    }[appSettings.theme as string] ?? '🎨 THEME'}</span>
                    <span className="theme-switch-track"><span /></span>
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
                      <div key={i} className="flex-1 bg-neon-gold/20 rounded-t-sm relative overflow-hidden activity-bar-pct" {...{ style: Object.assign({}, { height: `${h}%` }) as any }}>
                        <div className="absolute bottom-0 left-0 right-0 bg-neon-gold animate-pulse activity-bar-fill" />
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
                      <div className="text-lg font-heading text-success">{stats.callSuccessRate}%</div>
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
                    {(callLogs.length > 0 ? callLogs.slice(0, 8).map(log => ({
                      type: log.status === 'completed' ? 'connected' as const : 'disconnected' as const,
                      name: log.studentName,
                      time: log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                      id: log.id,
                    })) : [
                      { type: 'disconnected' as const, name: 'No activity yet', time: '--:--:--', id: 'empty' },
                    ]).map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-2 border-b border-white/5">
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${item.type === 'connected' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {item.type === 'connected' ? <PhoneIncoming size={14} /> : <PhoneOff size={14} />}
                        </div>
                        <div className="flex-1">
                          <div className="text-[0.65rem] font-bold text-white">Call {item.type === 'connected' ? 'Completed' : 'Missed'}</div>
                          <div className="text-[0.6rem] text-muted">{item.name}</div>
                        </div>
                        <div className="text-[0.6rem] font-mono opacity-50 text-white">{item.time}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-neon-outline btn-neon-solid-sm w-full mt-4" onClick={() => navigateTo('logs')}>VIEW ALL ACTIVITY</button>
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
                      <Zap size={24} className="text-neon-gold absolute animate-bounce " />
                    </div>
                    <p className="text-[0.65rem] text-muted leading-relaxed">System monitoring and live recruitment metrics will be synchronized here.</p>
                  </div>
                  <button className="btn-neon w-full" {...{ style: Object.assign({}, { fontSize: '0.7rem' }) as any }} onClick={() => showToast('AI Copilot Initializing...', 'success')}>LAUNCH AI COPILOT</button>
                </div>)}
            </aside>
          </div>
        )}



        {/* Admissions Drives Tab */}
        {currentTab === 'drives' && (
          viewingDrive ? (
            <div className="workspace">
              {/* Left Column: Drive Leads */}
              <section className={`panel list-panel ${isMobile && mobileViewMode === 'detail' ? 'mobile-hidden' : ''}`}>
                <div className="p-6 h-full flex flex-col">
                  <div className="contacts-panel-header mb-6">
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.1, x: -2 }}
                        whileTap={{ scale: 0.9 }}
                        className="hud-icon-btn small shrink-0"
                        onClick={() => { setViewingDrive(null); setActiveStudent(null); }}
                        title="Back to Drives"
                      >
                        <ChevronLeft size={16} />
                      </motion.button>
                      <div className="min-w-0 flex-1">
                        <div className="hud-kicker truncate">ACTIVE_DRIVE</div>
                        <h2 className="truncate" {...{ style: Object.assign({}, { margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-heading)' }) as any }}>{viewingDrive.name}</h2>
                        <p>{students.filter(s => viewingDrive.contactIds.includes(s.id)).length} active leads</p>
                      </div>
                    </div>
                  </div>

                  {/* Filter and Action Controls Cluster */}
                  <div className="flex gap-2 mb-4" {...{ style: Object.assign({}, { position: 'relative' }) as any }}>
                    <div className="search-box flex-1">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search leads..."
                        value={driveContactSearchTerm}
                        onChange={(e) => setDriveContactSearchTerm(e.target.value)}
                      />
                      <button className="search-btn" title="Search"><Search size={16} /></button>
                    </div>
                    <button
                      className={`hud-icon-btn small ${autoDialEnabled ? 'active' : ''}`}
                      onClick={() => setAutoDialEnabled(!autoDialEnabled)}
                      title="Auto Dialer"
                    >
                      <Power size={16} />
                    </button>

                    <button
                      className="hud-icon-btn small"
                      onClick={() => setIsAddContactModalOpen(true)}
                      title="Add Contacts"
                    >
                      <UserPlus size={16} />
                    </button>

                    <button
                      className={`hud-icon-btn small ${isDriveFilterOpen || driveFilterGender || driveFilterCourse || driveFilterBatch ? 'active' : ''}`}
                      onClick={() => setIsDriveFilterOpen(!isDriveFilterOpen)}
                      title="Filter Leads"
                      {...{ style: Object.assign({}, { zIndex: 1001 }) as any }}
                    >
                      <Database size={16} />
                    </button>

                    <AnimatePresence>
                      {isDriveFilterOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="settings-card-tactical drive-filter-dropdown"
                        >
                          <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
                            <span className="hud-kicker" >FILTER_LEADS</span>
                            {(driveFilterGender || driveFilterCourse || driveFilterBatch) && (
                              <button
                                onClick={() => { setDriveFilterGender(''); setDriveFilterCourse(''); setDriveFilterBatch(''); }}
                                className="filter-reset-btn"
                              >
                                RESET_ALL
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 opacity-50">
                                <Users size={12} />
                                <span className="hud-kicker" {...{ style: Object.assign({}, { fontSize: '0.5rem' }) as any }}>GENDER_TYPE</span>
                              </div>
                              <select
                                title="Filter by gender"
                                className="settings-input-tactical w-full filter-select-tactical"
                                value={driveFilterGender}
                                onChange={(e) => setDriveFilterGender(e.target.value)}
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
                                <span className="hud-kicker" {...{ style: Object.assign({}, { fontSize: '0.5rem' }) as any }}>COURSE_CODE</span>
                              </div>
                              <select
                                title="Filter by course"
                                className="settings-input-tactical w-full filter-select-tactical"
                                value={driveFilterCourse}
                                onChange={(e) => setDriveFilterCourse(e.target.value)}
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
                                <span className="hud-kicker" {...{ style: Object.assign({}, { fontSize: '0.5rem' }) as any }}>BATCH_YEAR</span>
                              </div>
                              <select
                                title="Filter by batch year"
                                className="settings-input-tactical w-full filter-select-tactical"
                                value={driveFilterBatch}
                                onChange={(e) => setDriveFilterBatch(e.target.value)}
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
                              className="btn btn-primary btn-glow w-full py-2 filter-apply-btn"
                              onClick={() => setIsDriveFilterOpen(false)}
                            >
                              APPLY_FILTERS
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="student-list flex-1 overflow-y-auto pr-1">
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
                      .map((student) => (
                        <div
                          key={student.id}
                          className={`student-card-hud student-card-inner ${activeStudent?.id === student.id ? 'active is-active' : 'is-inactive'}`}
                          onClick={() => handleStudentSelect(student)}
                        >
                          <div className={`avatar-hud-wrap avatar-hud-circle ${activeStudent?.id === student.id ? 'is-active' : 'is-inactive'}`}>
                            <div className="w-full h-full rounded-full flex items-center justify-center bg-zinc-900 font-bold text-xs avatar-initials">
                              {student.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 {...{ style: Object.assign({}, { margin: 0, fontSize: '0.85rem', color: activeStudent?.id === student.id ? 'var(--neon-gold)' : '#fff' }) as any }}>{student.name}</h4>
                            <p {...{ style: Object.assign({}, { margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }) as any }}>{student.course}</p>
                          </div>
                          <span className={`badge-hud badge-${student.status}`} {...{ style: Object.assign({}, { fontSize: '0.6rem', padding: '2px 6px' }) as any }}>{student.status.toUpperCase()}</span>
                        </div>
                      ))}
                  </div>
                  {!isMobile && (
                    <button className="btn-neon-outline btn-solid-border w-full mt-4" onClick={() => setIsAddContactModalOpen(true)}>+ DEPLOY NEW LEADS</button>
                  )}
                </div>
              </section>

              {/* Middle Column: Profile & Dialer */}
              <section className={`profile-panel ${isMobile && mobileViewMode === 'list' ? 'mobile-hidden' : ''}`}>
                <div className="flex-1 overflow-y-auto profile-scroll-no-bar">
                  {activeStudent ? (
                    <div className="p-8">
                      {isMobile && (
                        <button type="button" className="mobile-back-to-list" onClick={() => setMobileViewMode('list')}>
                          <ChevronLeft size={18} />
                          Drive Leads
                        </button>
                      )}
                      {/* Header Card */}
                      <div className="flex items-center gap-8 mb-12">
                        <div className="hud-avatar-outer-glow hud-avatar-outer">
                          <div className="hud-avatar-inner-wrap hud-avatar-inner">
                            <div className="w-full h-full flex items-center justify-center bg-black text-3xl font-black profile-initials">
                              {activeStudent.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="hud-tag-label profile-tag-label">DRIVE_LEAD</div>
                          <h2 className="hud-value-lg profile-name">{activeStudent.name}</h2>
                          <div className="flex items-center gap-3">
                            <span className="badge-hud badge-new">{activeStudent.status.toUpperCase()}</span>
                            <span className="profile-course-text">{activeStudent.course}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="btn-neon-outline" onClick={skipToNext} title="Skip to next lead"><SkipForward size={14} /> SKIP</button>
                          <button className="btn-neon-outline" onClick={() => openEditContactModal(activeStudent)} title="Modify current lead"><Edit size={14} /> EDIT</button>
                          <button className="btn-neon-outline btn-neon-danger" onClick={() => { deleteStudent(activeStudent.id); setActiveStudent(null); }} title="Erase lead permanently"><Trash size={14} /> DELETE</button>
                        </div>
                      </div>

                      {/* Channels */}
                      <div className="hud-label mb-4">COMM_CHANNELS</div>
                      <div className="hud-card hud-card-gold-border mb-12">
                        <div className="flex items-center gap-6">
                          <div className="w-10 h-10 rounded bg-gold-glow-soft flex items-center justify-center text-gold phone-icon-gold"><Phone size={20} /></div>
                          <div className="flex-1">
                            <div className="text-[0.6rem] text-muted font-bold">MOBILE</div>
                            <div className="text-xl font-mono tracking-widest text-white">{activeStudent.phoneNumbers[0]?.number}</div>
                          </div>
                          <div className="flex gap-2"><MoreHorizontal size={20} /></div>
                        </div>
                      </div>

                      {/* Central Dialer */}
                      <div className="hud-dialer-container py-12">
                        <div className={`dialer-circular-btn ${isCalling ? 'active' : ''}`} onClick={handleCallToggle}>
                          <div className="dialer-ring-outer"></div>
                          <div className={`dialer-ring-inner ${isCalling ? 'dialer-ring-inner-dynamic-active' : 'dialer-ring-inner-dynamic-idle'}`}></div>
                          <div className={`dialer-icon-box ${isCalling ? 'dialer-icon-box-active' : 'dialer-icon-box-idle'}`}>
                            {isCalling ? <PhoneOff size={40} /> : <Phone size={40} />}
                          </div>
                        </div>
                        <div className="waveform-viz mt-8">
                          {[...Array(20)].map((_, i) => (
                            <div key={i} className={`waveform-bar ${isCalling ? 'waveform-bar-active' : 'waveform-bar-idle'}`} {...{ style: Object.assign({}, { animationDelay: `${i * 0.05}s` }) as any }} />
                          ))}
                        </div>
                        <div className={`hud-label mt-6 ${isCalling ? 'hud-label-active' : 'hud-label-idle'}`}>
                          {isCalling ? 'TERMINATE_ENCRYPTED_CALL' : 'INITIATE_SECURE_CALL'}
                        </div>
                      </div>

                      {/* Session Intelligence */}
                      <div className="hud-label mb-4">INTERACTION_INTELLIGENCE</div>
                      <div className="hud-card mb-12 p-0 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-gold/30 to-transparent" />
                        <div className="p-6">
                          <textarea
                            className="w-full bg-black/60 border border-white/10 rounded focus:border-neon-gold/50 focus:outline-none custom-scrollbar transition-all"
                            {...{
                              style: Object.assign({}, {
                                height: '120px',
                                borderRadius: '4px',
                                color: '#d1d1d1',
                                padding: '12px',
                                fontSize: '0.75rem',
                                fontFamily: 'var(--font-mono)',
                                resize: 'none'
                              }) as any
                            }}
                            id="session-notes-textarea"
                            ref={notesRef}
                            key={activeStudent.id}
                            defaultValue={activeStudent.notes}
                            onBlur={() => updateStudentInList({ ...activeStudent, notes: notesRef.current?.value ?? activeStudent.notes }) as any}
                            placeholder="Enter interaction intelligence..."
                          />
                          <div className="session-notes-icon">
                            <Activity size={12} className="notes-icon" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                      <Users size={48} className="text-neon-gold mb-4 animate-pulse" />
                      <div className="hud-kicker">NO_ACTIVE_DRIVE_LEAD</div>
                      <p className="text-xs text-muted max-w-xs mt-2 leading-relaxed">No campaign lead is currently selected. Focus a contact from the left column to launch communications.</p>
                    </div>
                  )}
                </div>

                {/* Bottom Bar */}
                <div className="hud-bottom-actions">
                  <div className="hud-action-tab" onClick={() => activeStudent && openWhatsApp(activeStudent)}><MessageSquare size={20} /> <span>WHATSAPP</span></div>
                  <div className="hud-action-tab" onClick={() => activeStudent && openEmail(activeStudent)}><Mail size={20} /> <span>EMAIL</span></div>
                  <div className="hud-action-tab" onClick={() => activeStudent && downloadBrochure(activeStudent)}><FileText size={20} /> <span>BROCHURE</span></div>
                  <div className="hud-action-tab" onClick={focusSessionNotes}><Edit size={20} /> <span>NOTE</span></div>
                  <div className="flex items-center justify-center p-4">
                    <button
                      type="button"
                      className={`theme-switch active`}
                      title="Cycle Theme"
                      onClick={() => {
                        const order: AppSettings['theme'][] = ['dark', 'gold', 'silver', 'system'];
                        const cur = order.indexOf(appSettings.theme);
                        const next = order[(cur + 1) % order.length];
                        const labels: Record<string, string> = { dark: 'NEON_EMERALD', gold: 'SOLAR_GOLD', silver: 'LUNAR_SILV', system: 'AUTO_SYNC' };
                        setAppSettings(prev => ({ ...prev, theme: next }));
                        showToast(`${labels[next]} DEPLOYED`, 'success');
                      }}
                    >
                      <span className="theme-label-sublabel">{{
                        dark: '🟢 NEON_EMERALD',
                        gold: '☀️ SOLAR_GOLD',
                        silver: '🌙 LUNAR_SILV',
                        system: '🔄 AUTO_SYNC',
                      }[appSettings.theme as string] ?? '🎨 THEME'}</span>
                      <span className="theme-switch-track"><span /></span>
                    </button>
                  </div>
                </div>
              </section>

              {/* Right Column: Telemetry Panel */}
              <aside className="panel utility-panel">
                {!isMobile && (
                  <div className="hud-card">
                    <div className="flex items-center justify-between mb-4">
                      <div className="hud-label flex items-center gap-2"><BarChart3 size={14} /> SESSION_ACTIVITY</div>
                      <ChevronRight size={14} className="text-muted" />
                    </div>
                    <div className="flex items-center gap-1 h-12 my-4">
                      {[40, 60, 30, 80, 50, 70, 90, 40, 60, 80, 40, 50, 70, 60, 80].map((h, i) => (
                        <div key={i} className="flex-1 bg-neon-gold/20 rounded-t-sm relative overflow-hidden activity-bar-pct" {...{ style: Object.assign({}, { height: `${h}%` }) as any }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-neon-gold animate-pulse activity-bar-fill" />
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
                        <div className="text-lg font-heading text-success">{stats.callSuccessRate}%</div>
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
                      {(callLogs.length > 0 ? callLogs.slice(0, 8).map(log => ({
                        type: log.status === 'completed' ? 'connected' as const : 'disconnected' as const,
                        target: log.studentName,
                        duration: `${Math.floor(log.duration / 60)}m ${log.duration % 60}s`,
                        timestamp: new Date(log.timestamp).toLocaleTimeString()
                      })) : [
                        { type: 'connected' as const, target: 'NODE_ALPHA', duration: 'ACTIVE', timestamp: '10:42:18' },
                        { type: 'disconnected' as const, target: 'NODE_BETA', duration: 'STANDBY', timestamp: '10:41:05' }
                      ]).map((feed, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <div>
                            <div className="text-xs font-bold text-white">{feed.target}</div>
                            <div className="text-[0.6rem] text-muted">{feed.timestamp}</div>
                          </div>
                          <div className="text-right">
                            <span className={`text-[0.6rem] font-bold ${feed.type === 'connected' ? 'text-success' : 'text-danger'}`}>{feed.type.toUpperCase()}</span>
                            <div className="text-[0.6rem] text-muted">{feed.duration}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`tab-content ${isMobile ? 'drives-tab-content-mobile' : 'drives-tab-content-desktop'}`}>
              <>
                {!isMobile ? (
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <div className="hud-kicker">STRATEGIC_OPERATIONS</div>
                      <h2 className="hud-value-lg m-0 campaigns-h2">Active Drive</h2>
                    </div>
                    <div className="flex gap-4">
                      <div className="search-box tactical campaigns-search-box">
                        <input
                          type="text"
                          placeholder="SEARCH_Drive..."
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
                        <h2 className="mobile-page-title drive-mobile-h2">Drive</h2>
                      </div>
                      <button className="hud-icon-btn active" title="Create new campaign" onClick={openAddDriveModal}>
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
                        {...{ style: Object.assign({}, { cursor: 'pointer' }) as any }}
                        onClick={() => {
                          setViewingDrive(drive);
                          const driveStudents = students.filter(s => drive.contactIds.includes(s.id));
                          if (driveStudents.length > 0) {
                            setActiveStudent(driveStudents[0]);
                          } else {
                            setActiveStudent(null);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <h3 className="m-0">{drive.name}</h3>
                          <div className="flex gap-2">
                            <button className="btn-icon p-1 drive-edit-btn" onClick={(e) => { e.stopPropagation(); openEditDriveModal(drive); }} title="Edit Campaign">
                              <Edit3 size={16} />
                            </button>
                            <button className="btn-icon p-1 drive-delete-btn" onClick={(e) => { e.stopPropagation(); deleteDrive(drive.id); }} title="Delete Campaign">
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
            </motion.div>
          )
        )}

        {currentTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="tab-content"
          >
            {/* LUXURY TACTICAL HEADER */}
            <div className="flex justify-between items-end pb-3 border-b border-white/10 relative">
              <div className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-neon-gold to-transparent" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={14} className="text-neon-gold animate-pulse" />
                  <div className="hud-kicker" {...{ style: Object.assign({}, { fontSize: '0.65rem', opacity: 0.8, letterSpacing: '2px' }) as any }}>INTEL_RECON_v6.0</div>
                </div>
                <h2 className="hud-value-lg m-0 leading-none" {...{ style: Object.assign({}, { fontSize: isMobile ? '1.5rem' : '2rem', color: '#fff', textShadow: '0 0 20px rgba(212,175,55,0.3)' }) as any }}>TACTICAL_ANALYTICS</h2>
              </div>
              <div className="flex gap-6 items-center">
                <div className="flex flex-col items-end hidden md:flex">
                  <div className="hud-kicker" {...{ style: Object.assign({}, { fontSize: '0.55rem', color: 'var(--text-muted)' }) as any }}>SYSTEM_TIME</div>
                  <div className="hud-value-sm" {...{ style: Object.assign({}, { fontSize: '0.8rem', color: 'var(--neon-gold)' }) as any }}>{new Date().toLocaleTimeString()}</div>
                </div>
                <div className="h-8 w-px bg-white/10 hidden md:block" />
                <div className="flex flex-col items-end">
                  <div className="hud-kicker" {...{ style: Object.assign({}, { fontSize: '0.55rem', color: 'var(--text-muted)' }) as any }}>OPS_STATUS</div>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-success-green/10 border border-success-green/30 rounded-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse" {...{ style: Object.assign({}, { boxShadow: '0 0 8px var(--success-green)' }) as any }} />
                    <span className="hud-value-sm text-success-green" {...{ style: Object.assign({}, { fontSize: '0.7rem', letterSpacing: '1px' }) as any }}>NOMINAL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* DYNAMIC GRID - ULTRA PREMIUM HUD */}
            <div className="flex-1 grid grid-cols-12 gap-5 min-h-0 relative">
              {/* Animated HUD Background Grid */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]" {...{ style: Object.assign({}, { backgroundImage: 'linear-gradient(var(--neon-gold) 1px, transparent 1px), linear-gradient(90deg, var(--neon-gold) 1px, transparent 1px)', backgroundSize: '40px 40px' }) as any }} />

              {/* TOP LEFT: DISTRIBUTION RADAR (Donut) */}
              <div className="col-span-12 lg:col-span-4 h-[32vh] lg:h-auto settings-card-tactical p-0 flex flex-col relative overflow-hidden group border border-white/10 bg-black/40 backdrop-blur-md rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                {/* Cyber Corner Brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-gold/50" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-gold/50" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-gold/50" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-gold/50" />

                <div className="p-4 border-b border-white/5 bg-gradient-to-r from-neon-gold/10 to-transparent flex justify-between items-center">
                  <div className="hud-kicker text-neon-gold tracking-[3px] text-[0.65rem] font-bold">TARGET_DISTRIBUTION</div>
                  <Activity size={14} className="text-neon-gold opacity-50" />
                </div>

                <div className="flex-1 flex items-center justify-center relative min-h-0 p-4">
                  {/* Radar Sweep */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 m-auto w-36 h-36 rounded-full border border-neon-gold/20"
                    {...{ style: Object.assign({}, { background: 'conic-gradient(from 0deg, transparent 70%, rgba(212,175,55,0.2) 100%)' }) as any }}
                  />
                  <svg viewBox="0 0 40 40" className="w-full h-full max-h-[180px] drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] relative z-10">
                    {[
                      { val: stats.new, color: 'rgba(212,175,55,0.2)', l: 'NEW' },
                      { val: stats.contacted, color: 'var(--gold-bright)', l: 'ACT' },
                      { val: stats.enrolled, color: 'var(--success-green)', l: 'ENR' },
                      { val: students.filter(s => s.status === 'not_interested').length, color: 'var(--danger-red)', l: 'NEG' }
                    ].reduce((acc, item, idx) => {
                      const total = stats.total || 1;
                      const pct = (item.val / total) * 100;
                      const offset = acc.offset;
                      if (pct > 0) {
                        acc.elements.push(
                          <motion.circle
                            key={idx} cx="20" cy="20" r="15.5" fill="none"
                            stroke={item.color} strokeWidth="3"
                            strokeDasharray={`${pct} ${100 - pct}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="butt"
                            initial={{ pathLength: 0, opacity: 0, rotate: -90 }}
                            animate={{ pathLength: 1, opacity: 1, rotate: -90 }}
                            transition={{ duration: 2, delay: idx * 0.2, ease: 'circOut' }}
                            {...{ style: Object.assign({}, { transformOrigin: 'center' }) as any }}
                          />
                        );
                      }
                      acc.offset += pct;
                      return acc;
                    }, { offset: 0, elements: [] as any[] }).elements}
                    {/* Inner decorative rings */}
                    <circle cx="20" cy="20" r="12" fill="var(--bg-panel)" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" strokeDasharray="1 1" />
                    <circle cx="20" cy="20" r="10" fill="rgba(0,0,0,0.5)" />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.8 }}
                      className="text-white font-black text-2xl tracking-tighter" {...{ style: Object.assign({}, { textShadow: '0 0 20px var(--neon-gold)' }) as any }}
                    >
                      {stats.total}
                    </motion.div>
                    <div className="text-[0.45rem] font-mono text-neon-gold/80 tracking-widest mt-1">LEAD_COUNT</div>
                  </div>
                </div>

                {/* Legend Grid */}
                <div className="grid grid-cols-2 gap-[1px] bg-white/5 border-t border-white/5">
                  {[
                    { l: 'NEW_TARGETS', v: stats.new, c: 'rgba(212,175,55,0.4)' },
                    { l: 'ACTIVE_COMMS', v: stats.contacted, c: 'var(--gold-bright)' },
                    { l: 'SECURED_OPS', v: stats.enrolled, c: 'var(--success-green)' },
                    { l: 'REJECTED_LNK', v: students.filter(s => s.status === 'not_interested').length, c: 'var(--danger-red)' }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                      className="flex items-center justify-between p-2.5 bg-black/40 transition-colors relative overflow-hidden"
                    >
                      <motion.div
                        className="absolute left-0 top-0 bottom-0 w-[2px]"
                        {...{ style: Object.assign({}, { backgroundColor: item.c }) as any }}
                        initial={{ height: 0 }}
                        animate={{ height: '100%' }}
                        transition={{ delay: 1 + i * 0.1 }}
                      />
                      <div className="flex items-center gap-2 pl-1">
                        <div className="w-1 h-1 rounded-sm" {...{ style: Object.assign({}, { background: item.c, boxShadow: `0 0 8px ${item.c}` }) as any }} />
                        <span className="text-[0.5rem] font-mono tracking-wider text-white/70">{item.l}</span>
                      </div>
                      <span className="text-[0.75rem] font-bold text-white">{item.v}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* CENTER & RIGHT COLUMN CONTAINER */}
              <div className="col-span-12 lg:col-span-8 flex flex-col gap-5 min-h-0">

                {/* TOP ROW: HISTOGRAM & METRICS CLUSTER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-auto lg:h-[45%]">

                  {/* HISTOGRAM: ENGAGEMENT VELOCITY */}
                  <div className="settings-card-tactical p-4 flex flex-col relative overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md rounded-lg group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-neon-gold/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <BarChart3 size={14} className="text-neon-gold" />
                        <div className="hud-kicker text-neon-gold tracking-[2px] text-[0.6rem]">VELOCITY_MATRIX</div>
                      </div>
                      <div className="px-2 py-0.5 bg-success-green/10 border border-success-green/30 rounded text-[0.5rem] font-mono text-success-green animate-pulse shadow-[0_0_10px_rgba(0,255,178,0.2)]">
                        SYNC: STABLE
                      </div>
                    </div>

                    <div className="flex-1 flex items-end gap-[2px] px-1 relative z-10">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 py-2">
                        {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-px border-b border-dashed border-neon-gold/30" />)}
                      </div>

                      {ENGAGEMENT_BAR_HEIGHTS.map((h, i) => {
                        const isPeak = h > 75;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/bar relative">
                            {/* Hover Tooltip */}
                            <div className="absolute -top-6 bg-black border border-neon-gold/50 text-neon-gold text-[0.5rem] px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none font-mono">
                              VOL: {Math.round(h)}%
                            </div>

                            <motion.div
                              className="w-full relative rounded-t-[1px] overflow-hidden"
                              {...{ style: Object.assign({}, { height: `${h}%`, minHeight: '2px', background: isPeak ? 'var(--neon-gold)' : 'rgba(212,175,55,0.15)' }) as any }}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{ delay: i * 0.04, type: 'spring', damping: 12 }}
                              whileHover={{ scaleY: 1.05, opacity: 1, filter: 'brightness(1.5)' }}
                            >
                              {/* Stacked block effect */}
                              <div className="absolute inset-0 opacity-20" {...{ style: Object.assign({}, { backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 3px)' }) as any }} />
                              {isPeak && <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/40 to-transparent" />}
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-2 pt-1 border-t border-white/5 opacity-50">
                      <span className="font-mono text-[0.45rem] text-white tracking-widest">T-24H</span>
                      <span className="font-mono text-[0.45rem] text-neon-gold tracking-widest">REALTIME</span>
                    </div>
                  </div>

                  {/* METRICS CLUSTER: 4 CARDS */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l: 'TOTAL_RECORDS', v: stats.total, i: <Database size={16} />, c: 'var(--gold-bright)', b: 'rgba(255,217,90,0.15)' },
                      { l: 'SUCCESS_OPS', v: stats.enrolled, i: <CheckCircle2 size={16} />, c: 'var(--success-green)', b: 'rgba(0,255,178,0.15)' },
                      { l: 'AVG_INTEL_SEC', v: stats.avgCallTime + 's', i: <Clock size={16} />, c: '#fff', b: 'rgba(255,255,255,0.08)' },
                      { l: 'PENDING_TARGETS', v: stats.new, i: <Activity size={16} />, c: 'var(--neon-gold)', b: 'rgba(212,175,55,0.15)' }
                    ].map((m, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ y: -2, scale: 1.02 }}
                        className="flex flex-col p-3.5 rounded-lg bg-black/60 border border-white/10 relative overflow-hidden group shadow-[0_4px_15px_rgba(0,0,0,0.5)] backdrop-blur-md"
                      >
                        {/* Animated Scanline Effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-1000 ease-in-out" />

                        <div className="absolute -right-2 -top-2 p-3 opacity-10 group-hover:opacity-30 group-hover:rotate-12 transition-all duration-500" {...{ style: Object.assign({}, { color: m.c }) as any }}>
                          {React.cloneElement(m.i, { size: 48 })}
                        </div>

                        {/* Tiny tactical corner dots */}
                        <div className="absolute top-1.5 left-1.5 w-0.5 h-0.5 bg-white/30" />
                        <div className="absolute bottom-1.5 right-1.5 w-0.5 h-0.5 bg-white/30" />

                        <div className="flex flex-col h-full justify-between relative z-10">
                          <span className="font-mono text-[0.45rem] tracking-[2px] opacity-70 text-white">{m.l}</span>
                          <div className="mt-2 flex items-baseline gap-1">
                            <motion.div
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                              className="font-black text-2xl tracking-tighter" {...{ style: Object.assign({}, { color: m.c, textShadow: `0 0 20px ${m.b}` }) as any }}
                            >
                              {m.v}
                            </motion.div>
                          </div>
                          <div className="mt-2.5 h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full relative shadow-[0_0_8px_currentColor]"
                              {...{ style: Object.assign({}, { background: m.c, width: '100%' }) as any }}
                              initial={{ x: '-100%' }}
                              animate={{ x: '0%' }}
                              transition={{ delay: 0.5 + i * 0.15, duration: 1, type: 'spring' }}
                            >
                              <div className="absolute top-0 right-0 w-8 h-full bg-white/60 blur-[1px]" />
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* BOTTOM ROW: TELEMETRY TABLE WITH HACKER EFFECT */}
                <div className="flex-1 settings-card-tactical p-0 flex flex-col relative overflow-hidden border border-white/10 bg-black/50 backdrop-blur-md rounded-lg shadow-2xl">
                  {/* Left edge accent */}
                  <div className="absolute top-0 left-0 w-[3px] h-full bg-gradient-to-b from-neon-gold via-neon-gold/20 to-transparent" />

                  <div className="p-3.5 border-b border-white/10 flex justify-between items-center bg-black/40">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-neon-gold rounded-full animate-ping" />
                        <div className="w-1.5 h-1.5 bg-neon-gold rounded-full animate-pulse delay-75" />
                        <div className="w-1.5 h-1.5 bg-neon-gold rounded-full animate-pulse delay-150" />
                      </div>
                      <div className="hud-kicker text-white tracking-[3px] text-[0.65rem]">LIVE_NETWORK_TELEMETRY</div>
                    </div>
                    <div className="font-mono text-[0.55rem] tracking-widest text-neon-gold bg-neon-gold/10 px-2 py-1 rounded border border-neon-gold/20">
                      NODE: {analyticsNodeId}
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar relative">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-black/90 backdrop-blur-md z-10">
                        <tr>
                          <th className="py-2.5 pl-4 font-mono text-[0.5rem] tracking-widest text-white/50 border-b border-white/10">TARGET_ID</th>
                          <th className="py-2.5 font-mono text-[0.5rem] tracking-widest text-white/50 border-b border-white/10">CONNECTION_STATUS</th>
                          <th className="py-2.5 font-mono text-[0.5rem] tracking-widest text-white/50 border-b border-white/10">SESS_DURATION</th>
                          <th className="py-2.5 pr-4 text-right font-mono text-[0.5rem] tracking-widest text-white/50 border-b border-white/10">SYS_TIMESTAMP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {callLogs.slice(0, 8).map((log, idx) => (
                          <motion.tr
                            key={log.id}
                            initial={{ opacity: 0, backgroundColor: 'rgba(212,175,55,0.2)' }}
                            animate={{ opacity: 1, backgroundColor: 'transparent' }}
                            transition={{ delay: idx * 0.08, duration: 0.8 }}
                            className="group hover:bg-white/5 transition-all cursor-default"
                          >
                            <td className="py-3 pl-4">
                              <div className="text-[0.7rem] font-bold text-white group-hover:text-neon-gold tracking-wider transition-colors drop-shadow-md">
                                {log.studentName.toUpperCase()}
                              </div>
                              <div className="text-[0.45rem] text-white/40 mt-1">{log.phoneNumber}</div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'completed' ? 'bg-success-green shadow-[0_0_8px_var(--success-green)]' : 'bg-danger-red shadow-[0_0_8px_var(--danger-red)] animate-pulse'}`} />
                                <span className={`text-[0.5rem] font-bold tracking-widest ${log.status === 'completed' ? 'text-success-green' : 'text-danger-red'}`}>
                                  {log.status === 'completed' ? 'LINK_SECURED' : 'LINK_DROPPED'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="text-[0.65rem] text-white/80">{formatTime(log.duration)}</div>
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <div className="text-[0.55rem] text-neon-gold/60">
                                {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>

                    {callLogs.length === 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                          className="w-16 h-16 border-2 border-dashed border-white/10 rounded-full flex items-center justify-center mb-3"
                        >
                          <Activity size={20} className="text-white/20" />
                        </motion.div>
                        <span className="font-mono text-[0.6rem] tracking-[4px] text-white/30 animate-pulse">AWAITING_TELEMETRY</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* REAL-TIME TELEMETRY TICKER - CYBERPUNK EDITION */}
            <div className="h-10 mt-4 flex gap-3 relative z-10">
              <div className="bg-gradient-to-r from-neon-gold/20 to-neon-gold/5 px-5 flex items-center gap-4 rounded-lg border border-neon-gold/40 shadow-[0_0_20px_rgba(212,175,55,0.15)] relative overflow-hidden backdrop-blur-md hidden md:flex">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50" />
                <span className="font-mono text-[0.55rem] font-bold tracking-[3px] text-neon-gold drop-shadow-[0_0_5px_var(--neon-gold)]">SYS_CORE</span>
                <div className="w-[1px] h-4 bg-neon-gold/30" />
                <div className="flex gap-6 relative z-10">
                  {[
                    { k: 'CPU', v: '18%' },
                    { k: 'MEM', v: '1.2G' },
                    { k: 'NET', v: 'OK' }
                  ].map(x => (
                    <div key={x.k} className="flex gap-1.5 font-mono text-[0.5rem] tracking-widest">
                      <span className="text-neon-gold/50">{x.k}:</span>
                      <span className="text-white font-bold">{x.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 bg-black/60 border border-white/10 rounded-lg overflow-hidden relative backdrop-blur-md flex items-center">
                {/* Gradient Fades for Marquee */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black via-black/80 to-transparent z-10" />

                <motion.div
                  className="absolute inset-0 flex items-center whitespace-nowrap px-4"
                  animate={{ x: [0, -1500] }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                >
                  <span className="font-mono text-[0.55rem] text-neon-gold/70 tracking-[4px]">
                    [SYS_INIT] KERNEL BOOT SEQUENCE COMPLETE &nbsp;//&nbsp; [NET_SEC] ENCRYPTED TUNNEL ESTABLISHED ON PORT 443 &nbsp;//&nbsp; [DB_SYNC] 100% REPLICATION VERIFIED &nbsp;//&nbsp; [AI_CORE] PREDICTIVE RECRUITMENT MODELS ONLINE &nbsp;//&nbsp; [USER_AUTH] OPERATIVE ID: {loginEmail || 'AGENT_001'} AUTHORIZED &nbsp;//&nbsp; [SYS_WARN] NO ANOMALIES DETECTED &nbsp;//&nbsp;
                    [SYS_INIT] KERNEL BOOT SEQUENCE COMPLETE &nbsp;//&nbsp; [NET_SEC] ENCRYPTED TUNNEL ESTABLISHED ON PORT 443 &nbsp;//&nbsp; [DB_SYNC] 100% REPLICATION VERIFIED &nbsp;//&nbsp; [AI_CORE] PREDICTIVE RECRUITMENT MODELS ONLINE &nbsp;//&nbsp; [USER_AUTH] OPERATIVE ID: {loginEmail || 'AGENT_001'} AUTHORIZED &nbsp;//&nbsp; [SYS_WARN] NO ANOMALIES DETECTED &nbsp;//&nbsp;
                  </span>
                </motion.div>
              </div>
            </div>
          </motion.div>)}

        {currentTab === 'logs' && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`tab-content ${isMobile ? 'logs-tab-padding-mobile' : 'logs-tab-padding-desktop'}`}
          >
            {/* HEADER AREA */}
            <div className="mb-8 flex justify-between items-end border-b border-white/5 pb-6">
              <div>
                <div className="hud-kicker" >TELEMETRY_LOGS_v4.0</div>
                <h2 className={`hud-value-lg m-0 ${isMobile ? 'logs-h2-mobile' : 'logs-h2-desktop'}`}>Recent Activity</h2>
                <div className="text-muted mt-2 font-mono logs-meta">
                  Total Sessions: {callLogs.length} | Latency: 42ms | Status: <span className="text-success-green">ENCRYPTED</span>
                </div>
              </div>
              {!isMobile && (
                <div className="flex gap-3">
                  <button
                    className="btn btn-secondary logs-wipe-btn"
                    onClick={wipeAllCallLogs}
                  >
                    <Trash2 size={14} /> WIPE_LOGS
                  </button>
                  <button className="btn btn-primary btn-glow logs-export-btn" onClick={exportCallLogsIntel}>
                    <Download size={14} /> EXPORT_INTEL
                  </button>
                </div>
              )}
            </div>

            {callLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 bg-black/40 rounded-lg border border-dashed border-white/10">
                <Activity size={48} className="text-muted mb-4 opacity-20" />
                <p className="hud-kicker logs-empty-kicker">NO_ACTIVE_TELEMETRY_FOUND</p>
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
                    className="settings-card-tactical mobile-log-card"
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
                        <div className="text-[10px] font-bold text-neon-gold">{log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) as any}</div>
                        <div className={`text-[9px] font-black mt-1 ${log.status === 'completed' ? 'text-success-green' : 'text-danger-red'}`}>
                          {log.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                      <div className="hud-value-sm mobile-log-duration">DURATION: {formatTime(log.duration)}</div>
                      <div className="flex gap-2">
                        <button
                          className="hud-icon-btn small"
                          onClick={() => window.open(`tel:${log.phoneNumber.replace(/\D/g, '')}`, '_self')}
                          title="Call this number"
                        >
                          <Phone size={12} />
                        </button>
                        <button
                          className="hud-icon-btn small danger"
                          title="Delete log entry"
                          onClick={() => deleteCallLogById(log.id)}
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
                      <th className="hud-kicker p-6" {...{ style: Object.assign({}, { fontSize: '0.65rem' }) as any }}>TIME_STAMP</th>
                      <th className="hud-kicker p-6" {...{ style: Object.assign({}, { fontSize: '0.65rem' }) as any }}>OPERATIONAL_TARGET</th>
                      <th className="hud-kicker p-6" {...{ style: Object.assign({}, { fontSize: '0.65rem' }) as any }}>COMM_IDENTIFIER</th>
                      <th className="hud-kicker p-6" {...{ style: Object.assign({}, { fontSize: '0.65rem' }) as any }}>SESSION_LENGTH</th>
                      <th className="hud-kicker p-6" {...{ style: Object.assign({}, { fontSize: '0.65rem' }) as any }}>LINK_STATUS</th>
                      <th className="hud-kicker p-6" {...{ style: Object.assign({}, { fontSize: '0.65rem' }) as any }}>ENGAGEMENT_CONTROLS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {callLogs.map(log => (
                      <tr key={log.id} className="group hover:bg-white/2 transition-colors">
                        <td className="p-6">
                          <div className="hud-value-sm" {...{ style: Object.assign({}, { fontSize: '0.85rem' }) as any }}>{log.timestamp.toLocaleTimeString()}</div>
                          <div className="text-[9px] text-muted font-mono mt-1">{log.timestamp.toLocaleDateString()}</div>
                        </td>
                        <td className="p-6">
                          <div className="hud-value-sm text-neon-gold" {...{ style: Object.assign({}, { fontSize: '0.9rem', letterSpacing: '0.5px' }) as any }}>{log.studentName.toUpperCase()}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1 h-1 rounded-full bg-success-green/40" />
                            <span className="text-[9px] text-muted font-bold">RECRUIT_QUALIFIED</span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="text-sm font-mono text-white/80">{log.phoneNumber}</div>
                        </td>
                        <td className="p-6">
                          <div className="hud-value-sm" {...{ style: Object.assign({}, { fontSize: '0.85rem', color: log.duration > 0 ? '#fff' : 'var(--text-muted)' }) as any }}>
                            {log.duration > 0 ? formatTime(log.duration) : '00:00:00'}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'completed' ? 'bg-success-green animate-pulse' : 'bg-danger-red'}`} />
                            <span className={`badge table-log-badge ${log.status === 'completed' ? 'badge-contacted' : 'badge-rejected'}`}>
                              {log.status.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex justify-end gap-2">
                            <button
                              className="hud-icon-btn"
                              onClick={() => {
                                const student = students.find(s => s.name === log.studentName);
                                if (student) {
                                  setActiveStudent(student);
                                  navigateTo('contacts');
                                  if (isMobile) setMobileViewMode('detail');
                                }
                                window.open(`tel:${log.phoneNumber.replace(/\D/g, '')}`, '_self');
                                showToast(`Redialing ${log.studentName}`, 'info');
                              }}
                              title="Redial"
                            >
                              <Phone size={16} />
                            </button>
                            <button
                              className="hud-icon-btn danger"
                              onClick={() => deleteCallLogById(log.id)}
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
              </div>)}
          </motion.div>
        )}

        {/* Settings Tab */}
        {currentTab === 'settings' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`tab-content ${isMobile ? 'settings-tab-padding-mobile' : 'settings-tab-padding-desktop'}`}>
            <div className="settings-section-tactical">
              {/* PAGE HEADER */}
              <div className="settings-section-header-tactical settings-page-header">
                <div className="hud-kicker">SYSTEM_CONFIGURATION</div>
                <h2 className={`hud-value-lg m-0 ${isMobile ? 'settings-h2-mobile' : 'settings-h2-desktop'}`}>Settings</h2>
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
                      title="Select auto-dial delay"
                      className="settings-input-tactical"
                      {...{ style: Object.assign({}, { width: '140px' }) as any }}
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
                      onChange={(e) => setAppSettings({ ...appSettings, callerId: e.target.value }) as any}
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
                      {...{ style: Object.assign({}, { minHeight: '100px', resize: 'vertical' }) as any }}
                      placeholder="CONFIGURE_TEMPLATE..."
                      value={appSettings.smsTemplate}
                      onChange={(e) => setAppSettings({ ...appSettings, smsTemplate: e.target.value }) as any}
                      onBlur={() => showToast('Template Cached')}
                    />
                    <div className="settings-hint-tactical settings-hint-gold">
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
                      {
                        id: 'dark', name: 'NEON_EMERALD', icon: '🟢',
                        bg: '#040706',
                        sidebar: '#050807',
                        accent: '#57FF8A',
                        accentSoft: 'rgba(87,255,138,0.18)',
                        label: 'Cyberpunk Green',
                      },
                      {
                        id: 'gold', name: 'SOLAR_GOLD', icon: '☀️',
                        bg: '#050505',
                        sidebar: '#060606',
                        accent: '#FFC400',
                        accentSoft: 'rgba(255,196,0,0.18)',
                        label: 'Luxury Neon Gold',
                      },
                      {
                        id: 'silver', name: 'LUNAR_SILV', icon: '🌙',
                        bg: 'linear-gradient(145deg, #F4F7FC 0%, #E9EFF8 50%, #DCE6F2 100%)',
                        sidebar: 'rgba(255,255,255,0.55)',
                        accent: '#8FA8C8',
                        accentSoft: 'rgba(143,168,200,0.28)',
                        label: 'Glassmorphism Light',
                      },
                      {
                        id: 'system', name: 'AUTO_SYNC', icon: '🔄',
                        bg: 'linear-gradient(135deg,#040706 0%,#050505 100%)',
                        sidebar: 'rgba(255,255,255,0.05)',
                        accent: '#57FF8A',
                        accentSoft: 'rgba(87,255,138,0.10)',
                        label: 'Time-based Smart',
                      },
                    ].map(t => (
                      <div
                        key={t.id}
                        className={`theme-card-tactical ${appSettings.theme === t.id ? 'active' : ''}`}
                        onClick={() => { setAppSettings({ ...appSettings, theme: t.id as AppSettings['theme'] }); showToast(`${t.name} DEPLOYED`); }}
                        {...{ style: appSettings.theme === t.id ? { borderColor: t.accent, boxShadow: `0 0 20px ${t.accentSoft}` } : {} }}
                      >
                        {/* Mini HUD preview */}
                        <div className="theme-preview-tactical" {...{ style: Object.assign({}, { background: t.bg, border: `1px solid ${t.accentSoft}` }) as any }}>
                          {/* Fake sidebar */}
                          <div {...{ style: Object.assign({}, { width: '18%', background: t.sidebar, borderRight: `1px solid ${t.accentSoft}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingTop: 4 }) as any }}>
                            {[1, 2, 3].map(i => <div key={i} {...{ style: Object.assign({}, { width: '55%', height: 5, borderRadius: 2, background: i === 1 ? t.accent : t.accentSoft }) as any }} />)}
                          </div>
                          {/* Fake content */}
                          <div {...{ style: Object.assign({}, { flex: 1, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 3 }) as any }}>
                            <div {...{ style: Object.assign({}, { height: 5, width: '70%', background: t.accent, borderRadius: 2, opacity: 0.9 }) as any }} />
                            <div {...{ style: Object.assign({}, { height: 3, width: '90%', background: t.accentSoft, borderRadius: 2 }) as any }} />
                            <div {...{ style: Object.assign({}, { height: 3, width: '55%', background: t.accentSoft, borderRadius: 2 }) as any }} />
                            <div {...{ style: Object.assign({}, { marginTop: 3, height: 12, width: '40%', borderRadius: 4, background: t.accent, opacity: 0.8 }) as any }} />
                          </div>
                        </div>
                        <div className="theme-name-tactical" {...{ style: Object.assign({}, { color: appSettings.theme === t.id ? t.accent : undefined }) as any }}>
                          {t.icon} {t.name}
                          <div {...{ style: Object.assign({}, { fontSize: '0.62rem', opacity: 0.6, fontFamily: 'Inter, sans-serif', textTransform: 'none', fontWeight: 400, marginTop: 2 }) as any }}>{t.label}</div>
                        </div>
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
                    <button className="btn btn-primary btn-glow settings-export-btn" onClick={exportIntel}><Download size={14} /> EXPORT</button>
                  </div>

                  <div className="settings-row-tactical">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical">Bulk Lead Import</div>
                      <div className="settings-hint-tactical">Ingest external contact lists via CSV or Excel blueprint.</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-secondary settings-blueprint-btn" onClick={() => {
                        const csvContent = "Name,Phone No,Course / Degree,Gender,Date of Birth,Guardian Phone\nSanthosh Kumar,9876543210,B.Tech CS,Male,2005-05-20,9123456789";
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = "GFLB_TEMPLATE.csv";
                        link.click();
                      }}>BLUEPRINT</button>
                      <label className="btn btn-primary btn-glow" {...{ style: Object.assign({}, { cursor: 'pointer', padding: '8px 12px', fontSize: '0.65rem' }) as any }}>
                        <Upload size={14} /> UPLOAD
                        <input
                          type="file"
                          accept=".csv, .xlsx, .xls"
                          {...{ style: Object.assign({}, { display: 'none' }) as any }}
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
                      <div className="settings-label-tactical">Restore Backup (JSON)</div>
                      <div className="settings-hint-tactical">Import a previously exported GFLB_INTEL backup file.</div>
                    </div>
                    <label className="btn btn-secondary" {...{ style: Object.assign({}, { cursor: 'pointer', padding: '8px 12px', fontSize: '0.65rem' }) as any }}>
                      <Database size={14} /> RESTORE
                      <input
                        type="file"
                        accept=".json,application/json"
                        {...{ style: Object.assign({}, { display: 'none' }) as any }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) importIntelBackup(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div className="settings-row-tactical">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical">Cloud Intelligence Sync</div>
                      <div className="settings-hint-tactical">{isCloudEnabled ? 'REALTIME_SYNC_ACTIVE' : 'ACTIVATE_CLOUD_REPLICATION'}</div>
                    </div>
                    <button
                      title={isCloudEnabled ? 'Disable cloud sync' : 'Enable cloud sync'}
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
              <section {...{ style: Object.assign({}, { marginBottom: '100px' }) as any }}>
                <div className="settings-section-header-tactical">
                  <h3 className="settings-section-title-tactical">Security Protocols</h3>
                  <p className="settings-section-desc-tactical">Access control and session termination.</p>
                </div>
                <div className="settings-card-tactical settings-danger-card">
                  <div className="settings-row-tactical">
                    <div className="settings-info-tactical">
                      <div className="settings-label-tactical settings-danger-label">Terminate Session</div>
                      <div className="settings-hint-tactical">Currently authenticated as {loginEmail || 'TACTICAL_OPERATIVE'}.</div>
                    </div>
                    <button
                      className="btn btn-secondary"
                      {...{ style: Object.assign({}, { color: 'var(--danger-red)', borderColor: 'var(--danger-red)', padding: '10px 20px' }) as any }}
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
            } else if (currentTab === 'contacts') {
              openAddContactModal();
            } else {
              setIsDialPadOpen(true);
            }
          }}
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          {...{
            style: Object.assign({}, {
              background: currentTab === 'drives'
                ? 'linear-gradient(135deg, var(--accent-success), #059669)'
                : 'linear-gradient(135deg, #8c6909, #d5a216)',
              boxShadow: currentTab === 'drives'
                ? '0 0 24px rgba(16, 185, 129, 0.45)'
                : '0 0 24px rgba(213, 162, 22, 0.45)'
            }) as any
          }}
        >
          {currentTab === 'drives' ? <Plus size={28} /> : currentTab === 'contacts' ? <UserPlus size={24} /> : <Grid3x3 size={24} />}
        </motion.button>)}

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
              {...{ style: Object.assign({}, { maxWidth: '600px' }) as any }}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
            >
              <div className="modal-header">
                <div>
                  <div className="hud-kicker modal-add-contacts-header-kicker">DEPLOYMENT_REINFORCEMENT</div>
                  <h2 className="m-0 modal-add-contacts-h2">Add Contacts to {viewingDrive.name}</h2>
                </div>
                <button className="btn-icon" title="Close" onClick={() => { setIsAddContactModalOpen(false); setAddContactSearchTerm(''); }}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body modal-add-contacts-body">
                <div className="search-box tactical mb-4 modal-search-full-w">
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
                <div className="hud-kicker modal-footer-kicker">
                  {selectedContactsForDrive.length} OPERATIVES_SELECTED
                </div>
                <div className="flex gap-3">
                  <button className="btn btn-secondary modal-cancel-btn" onClick={() => { setIsAddContactModalOpen(false); setAddContactSearchTerm(''); }}>CANCEL</button>
                  <button
                    className="btn btn-primary btn-glow modal-deploy-btn"
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
                    DEPLOY_TO_Drive
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>)}
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
                <button className="btn-icon" title="Close" onClick={() => setIsEditModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Avatar</label>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden bg-black/40 flex items-center justify-center">
                      <img
                        src={editingStudent.avatar}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = getAvatar(editingStudent.name))}
                      />
                    </div>
                    <label className="btn btn-secondary" {...{ style: Object.assign({}, { cursor: 'pointer', fontSize: '0.65rem' }) as any }}>
                      <Upload size={14} className="mr-2" /> CHOOSE IMAGE
                      <input
                        type="file"
                        accept="image/*"
                        {...{ style: Object.assign({}, { display: 'none' }) as any }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditingStudent({ ...editingStudent, avatar: reader.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <button className="btn btn-icon" title="Reset to default" onClick={() => setEditingStudent({ ...editingStudent, avatar: getAvatar(editingStudent.name) }) as any}>
                      <SkipForward size={14} />
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
                    onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value }) as any}
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
                      onChange={(e) => setEditingStudent({ ...editingStudent, course: e.target.value }) as any}
                    />
                  </div>
                  <div className="input-group flex-1">
                    <label className="input-label">Batch / Year</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="E.g. First Year"
                      value={editingStudent.year}
                      onChange={(e) => setEditingStudent({ ...editingStudent, year: e.target.value }) as any}
                    />
                  </div>
                </div>

                {/* Phone Numbers CRUD */}
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="input-label phone-label-m0">Phone Numbers</label>
                    <button className="btn btn-secondary phone-add-btn" onClick={addPhoneNumber}>
                      <Plus size={14} /> Add Number
                    </button>
                  </div>

                  {editingStudent.phoneNumbers.map((phone) => {
                    const prefixMatch = phone.number.match(/^\+\d+\s*/);
                    const currentPrefix = prefixMatch ? prefixMatch[0].trim() : '+91';
                    const numberWithoutPrefix = prefixMatch ? phone.number.slice(prefixMatch[0].length).trim() : phone.number.trim();

                    return (
                      <div key={phone.id} className="flex gap-2 mb-2">
                        <select
                          title="Phone type"
                          className="btn btn-secondary"
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
                          title="Country code"
                          className="btn btn-secondary !w-20"
                          value={currentPrefix}
                          onChange={(e) => {
                            const newPrefix = e.target.value;
                            handlePhoneChange(phone.id, 'number', `${newPrefix} ${numberWithoutPrefix}`);
                          }}
                        >
                          <option value="+91">+91</option>
                          <option value="+1">+1</option>
                          <option value="+44">+44</option>
                          <option value="+971">+971</option>
                        </select>
                        <input
                          type="text"
                          className="input-field flex-1"
                          value={numberWithoutPrefix}
                          placeholder="98765 43210"
                          onChange={(e) => {
                            handlePhoneChange(phone.id, 'number', `${currentPrefix} ${e.target.value}`);
                          }}
                        />
                        <button className="btn-icon" title="Remove phone number" onClick={() => removePhoneNumber(phone.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  }) as any}
                  {editingStudent.phoneNumbers.length === 0 && (
                    <p className="text-sm text-muted">No phone numbers. Add one to make calls.</p>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="input-group flex-1">
                    <label className="input-label">Gender</label>
                    <select
                      title="Select gender"
                      className="input-field"
                      value={editingStudent.gender}
                      onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value }) as any}
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
                      title="Date of birth"
                      placeholder="YYYY-MM-DD"
                      className="input-field"
                      onFocus={(e) => (e.target.type = 'date')}
                      onBlur={(e) => { if (!e.target.value) e.target.type = 'date' }}
                      value={editingStudent.dob}
                      onChange={(e) => setEditingStudent({ ...editingStudent, dob: e.target.value }) as any}
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
                      onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value }) as any}
                    />
                  </div>
                  <div className="input-group flex-1">
                    <label className="input-label">Guardian Phone No</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Guardian Contact"
                      value={editingStudent.guardianPhone}
                      onChange={(e) => setEditingStudent({ ...editingStudent, guardianPhone: e.target.value.replace(/[^\d+]/g, '') }) as any}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Notes</label>
                  <textarea
                    className="input-field"
                    {...{ style: Object.assign({}, { minHeight: '80px' }) as any }}
                    placeholder="Additional information..."
                    value={editingStudent.notes}
                    onChange={(e) => setEditingStudent({ ...editingStudent, notes: e.target.value }) as any}
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
          </motion.div>)}
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
                  <div className="flex-1"></div>
                  <button className="btn-icon transparent" title="Close" onClick={() => setIsDialPadOpen(false)}>
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* MOBILE HEADER */}
              {isMobile && (
                <div className="dialpad-header">
                  <span className="text-xl font-bold">Phone Dialer</span>
                  <button className="btn-icon" title="Close dialer" onClick={() => setIsDialPadOpen(false)}>
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
                              <span className="history-meta">{log.phoneNumber} • {log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) as any}</span>
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
                          <button className="dialpad-clear-btn" title="Delete last digit" onClick={() => setDialNumber(prev => prev.slice(0, -1))}>
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
                <button className="btn-icon" title="Close" onClick={() => setIsDriveModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="input-label">Drive Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="E.g. Engineering Target 2026"
                    value={editingDrive.name}
                    onChange={(e) => setEditingDrive({ ...editingDrive, name: e.target.value }) as any}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea
                    className="input-field"
                    {...{ style: Object.assign({}, { minHeight: '80px' }) as any }}
                    placeholder="Drive details..."
                    value={editingDrive.description}
                    onChange={(e) => setEditingDrive({ ...editingDrive, description: e.target.value }) as any}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Bulk Add Phone Numbers</label>
                  <textarea
                    className="input-field"
                    {...{ style: Object.assign({}, { minHeight: '80px' }) as any }}
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
                      title="Select drive status"
                      className="input-field"
                      value={editingDrive.status}
                      onChange={(e) => setEditingDrive({ ...editingDrive, status: e.target.value as Drive['status'] }) as any}
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
                  <button className={`btn btn-secondary drive-delete-btn ${isMobile ? '' : 'mr-auto'}`} onClick={() => deleteDrive(editingDrive.id)}>
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <div className="flex gap-2 w-full md:w-auto">
                  <button className="btn btn-secondary flex-1 md:flex-none" onClick={() => setIsDriveModalOpen(false)}>Cancel</button>
                  <button className="btn btn-primary flex-1 md:flex-none" onClick={saveDrive}>{isNewDrive ? 'Create Drive' : 'Save Changes'}</button>
                </div>
              </div>
            </motion.div>
          </motion.div>)}
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
              className="fixed inset-0 z-40 context-fixed-overlay"
              onClick={() => setContextMenu(null)}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
            ></div>
            <motion.div
              initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
              exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
              className={isMobile ? 'mobile-bottom-sheet' : ''}
              {...{
                style: isMobile ? {} : {
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
                }
              }}
            >
              {isMobile && <div className="sheet-handle" />}
              <div className={isMobile ? 'flex flex-col gap-3' : ''}>
                <button
                  className="w-full text-left p-4 hover:bg-tertiary rounded-xl flex items-center gap-4 transition-all active:scale-95"
                  {...{
                    style: Object.assign({}, {
                      backgroundColor: isMobile ? 'rgba(213, 162, 22, 0.08)' : 'transparent',
                      border: isMobile ? '1px solid rgba(213, 162, 22, 0.15)' : 'none',
                      color: 'var(--text-primary)',
                      width: '100%',
                      cursor: 'pointer',
                      fontSize: isMobile ? '1.15rem' : '0.9rem',
                      fontWeight: 600
                    }) as any
                  }}
                  onClick={() => {
                    openEditContactModal(contextMenu.student);
                    setContextMenu(null);
                  }}
                >
                  <Edit3 size={isMobile ? 24 : 16} {...{ style: Object.assign({}, { color: 'var(--accent-primary)' }) as any }} />
                  <div className="flex flex-col">
                    <span>Edit Contact</span>
                    {isMobile && <span {...{ style: Object.assign({}, { fontSize: '0.75rem', opacity: 0.6, fontWeight: 400 }) as any }}>Modify details or phone numbers</span>}
                  </div>
                </button>
                <button
                  className="w-full text-left p-4 hover:bg-tertiary rounded-xl flex items-center gap-4 transition-all active:scale-95"
                  {...{
                    style: Object.assign({}, {
                      backgroundColor: isMobile ? 'rgba(255, 45, 85, 0.05)' : 'transparent',
                      border: isMobile ? '1px solid rgba(255, 45, 85, 0.1)' : 'none',
                      color: 'var(--accent-danger)',
                      width: '100%',
                      cursor: 'pointer',
                      fontSize: isMobile ? '1.15rem' : '0.9rem',
                      fontWeight: 600
                    }) as any
                  }}
                  onClick={() => {
                    removeContactFromDrive(contextMenu.driveId, contextMenu.student.id);
                    setContextMenu(null);
                  }}
                >
                  <Trash2 size={isMobile ? 24 : 16} />
                  <div className="flex flex-col">
                    <span>Remove from Drive</span>
                    {isMobile && <span {...{ style: Object.assign({}, { fontSize: '0.75rem', opacity: 0.6, fontWeight: 400 }) as any }}>Delete this lead from {viewingDrive?.name}</span>}
                  </div>
                </button>
              </div>
            </motion.div>
          </>)}
        {isCsvModalOpen && csvPreview && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="modal-content" {...{ style: Object.assign({}, { maxWidth: '600px' }) as any }} initial={{ y: 50 }} animate={{ y: 0 }}>
              <div className="modal-header">
                <h2>Map CSV Columns</h2>
                <button className="btn-icon" title="Close" onClick={() => setIsCsvModalOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <p {...{ style: Object.assign({}, { marginBottom: '1.5rem', color: 'var(--text-secondary)' }) as any }}>
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
                    <div key={field.key} className="flex justify-between items-center p-3 csv-mapping-row">
                      <span className="csv-mapping-label">{field.label}</span>
                      <select
                        title={`Map column for ${field.label}`}
                        value={csvMapping[field.key as keyof typeof csvMapping]}
                        onChange={(e) => setCsvMapping({ ...csvMapping, [field.key]: parseInt(e.target.value) }) as any}
                        className="csv-mapping-select"
                      >
                        <option value="-1">(none)</option>
                        {csvPreview.sheets[0].headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="input-group mt-6">
                  <label className="input-label">Sync with Drive (Optional)</label>
                  <select
                    title="Sync with campaign"
                    className="input-field"
                    value={selectedDriveForImport}
                    onChange={(e) => setSelectedDriveForImport(e.target.value)}
                  >
                    <option value="">No Drive (Import to Contacts only)</option>
                    {drives.map(drive => (
                      <option key={drive.id} value={drive.id}>{drive.name}</option>
                    ))}
                  </select>

                  {selectedDriveForImport && (
                    <div className="flex items-center gap-2 mt-3 csv-override-wrap">
                      <input
                        type="checkbox"
                        id="overrideCourse"
                        checked={overrideCourseWithDrive}
                        onChange={(e) => setOverrideCourseWithDrive(e.target.checked)}
                      />
                      <label htmlFor="overrideCourse" className="csv-override-label">
                        Set all contacts' <strong>Course / Degree</strong> to "{drives.find(d => d.id === selectedDriveForImport)?.name}"
                      </label>
                    </div>
                  )}

                  {!overrideCourseWithDrive && selectedDriveForImport && (
                    <p className="text-xs text-muted mt-2">
                      Contacts will be added to the Drive, but will keep their individual "Course / Degree" from the CSV.
                    </p>
                  )}
                </div>

                <div className="csv-preview-box">
                  <strong>Preview ({csvPreview.sheets[0].name} - Row 1):</strong><br />
                  Name: {csvMapping.name !== -1 ? csvCell(csvPreview.sheets[0].rows[0], csvMapping.name) || 'N/A' : 'N/A'} |
                  Phone: {csvMapping.phone !== -1 ? csvCell(csvPreview.sheets[0].rows[0], csvMapping.phone) || 'N/A' : 'N/A'}
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
                      const phoneRaw = csvCell(row, csvMapping.phone);
                      const phoneCleaned = cleanPhone(phoneRaw);

                      if (!phoneCleaned) return null;

                      const isDuplicate = students.some(s => s.phoneNumbers.some(p => cleanPhone(p.number) === phoneCleaned)) ||
                        allNewStudents.some(s => s.phoneNumbers.some(p => cleanPhone(p.number) === phoneCleaned));

                      if (isDuplicate) {
                        skippedDuplicates++;
                        return null;
                      }

                      const studentId = `imp_${Date.now()}_${sheet.name}_${i}`;
                      const leadName = csvMapping.name !== -1 ? csvCell(row, csvMapping.name) || 'Unnamed Lead' : 'Unnamed Lead';
                      const csvCourse = csvMapping.course !== -1 ? csvCell(row, csvMapping.course) || sheet.name : sheet.name;

                      return {
                        id: studentId,
                        name: leadName,
                        phoneNumbers: [{
                          id: `p_${Date.now()}_${i}`,
                          type: 'Mobile',
                          number: phoneRaw.replace(/[^\d+]/g, '')
                        }],
                        course: csvCourse,
                        gender: csvCell(row, csvMapping.gender),
                        dob: csvCell(row, csvMapping.dob),
                        guardianPhone: cleanPhone(csvCell(row, csvMapping.guardianPhone)),
                        year: 'N/A',
                        email: '',
                        status: 'new' as Student['status'],
                        notes: `Imported from ${csvPreview.fileName} (Sheet: ${sheet.name})`,
                        avatar: getAvatar(leadName)
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

        {isCopilotOpen && activeStudent && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCopilotOpen(false)}
          >
            <motion.div
              className="modal-content"
              {...{ style: Object.assign({}, { maxWidth: '560px' }) as any }}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <div className="hud-kicker" {...{ style: Object.assign({}, { color: 'var(--neon-gold)' }) as any }}>AI CALL SCRIPTS</div>
                  <h2 className="m-0">Copilot — {activeStudent.name}</h2>
                </div>
                <button className="btn-icon" title="Close" onClick={() => setIsCopilotOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-body" {...{ style: Object.assign({}, { maxHeight: '60vh', overflowY: 'auto' }) as any }}>
                {scripts.map((script) => {
                  const text = resolveScript(script.content, activeStudent);
                  return (
                    <motion.div key={script.title} className="settings-card-tactical mb-4" {...{ style: Object.assign({}, { padding: '1rem' }) as any }}>
                      <div className="font-bold text-sm mb-2" {...{ style: Object.assign({}, { color: 'var(--neon-gold)' }) as any }}>{script.title}</div>
                      <p className="text-sm text-muted m-0 mb-3" {...{ style: Object.assign({}, { lineHeight: 1.5 }) as any }}>{text}</p>
                      <div className="flex gap-2 flex-wrap">
                        <button type="button" className="btn btn-secondary" {...{ style: Object.assign({}, { fontSize: '0.7rem' }) as any }} onClick={() => copyToClipboard(text)}>
                          <Copy size={14} /> Copy
                        </button>
                        <button type="button" className="btn btn-primary" {...{ style: Object.assign({}, { fontSize: '0.7rem' }) as any }} onClick={() => openWhatsApp({ ...activeStudent, phoneNumbers: activeStudent.phoneNumbers }) as any}>
                          <MessageSquare size={14} /> WhatsApp
                        </button>
                      </div>
                    </motion.div>
                  );
                }) as any}
              </div>
            </motion.div>
          </motion.div>)}
      </AnimatePresence>
    </div>
  );
}

export default App;
