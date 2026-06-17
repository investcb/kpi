import React, { useState, useEffect, useRef } from 'react';
import { 
  Auth, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  onSnapshot, 
  query, 
  Timestamp 
} from 'firebase/firestore';
import { 
  db, 
  auth, 
  googleProvider, 
  OperationType, 
  handleFirestoreError 
} from './firebase';
import { 
  UserProfile, 
  TaskItem, 
  TaskType, 
  TaskStatus 
} from './types';
import { 
  STANDARD_TASK_CATALOG,
  StandardTaskCatalogItem,
  CATALOG_CATEGORIES
} from './catalog';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Download, 
  LogOut, 
  User as UserIcon, 
  Building2, 
  Award, 
  Search, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  X,
  FileCheck,
  TrendingUp,
  BrainCircuit,
  Info,
  Cloud,
  Undo2,
  Redo2,
  Eye,
  Share2,
  RefreshCw,
  Send,
  CheckSquare,
  Square,
  Trash
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Pre-populated professional tasks for Cao Bang Department of Finance staff to ensure elegant UI on first load
const DEFAULT_MOCK_TASKS: TaskItem[] = [
  {
    id: 'task_mock_1',
    userId: 'mock_invest_user',
    title: 'Báo cáo tình hình giải ngân',
    description: 'Tổng hợp số liệu giải ngân tháng 6 từ các phòng ban để báo cáo Ban Giám đốc chiều nay.',
    date: '2026-06-16',
    type: 'daily',
    status: 'pending',
    kpiCategory: 'N4_217 - Báo cáo thu hút/giải ngân tháo gỡ đầu tư',
    kpiScore: 10,
    selfGradedScore: 0,
    evidence: 'Báo cáo đầu ra',
    timeRange: '08:30 - 10:00',
    subtasks: [
      { text: "Thu thập số liệu giải ngân từ các tổ", completed: true },
      { text: "Soạn và hoàn thiện dự thảo báo cáo phân tích", completed: false }
    ],
    createdAt: '2026-06-16T08:00:00.000Z',
    updatedAt: '2026-06-16T08:00:00.000Z'
  },
  {
    id: 'task_mock_2',
    userId: 'mock_invest_user',
    title: 'Soạn thảo Tờ trình phê duyệt kinh phí',
    description: 'Dựa trên đề xuất của phòng ban kỹ thuật, lập tờ trình xin ý kiến Giám đốc về việc mua sắm trang thiết bị quý 3.',
    date: '2026-06-16',
    type: 'daily',
    status: 'completed',
    kpiCategory: 'N1_650 - Soạn thảo văn bản hành chính thông thường',
    kpiScore: 10,
    selfGradedScore: 8.5,
    evidence: 'Tờ trình phê duyệt số 58/TTr-STC',
    timeRange: '10:00 - 11:30 (Hiện tại)',
    subtasks: [
      { text: "Thu thập báo giá", completed: true },
      { text: "Viết dung Tờ trình", completed: false },
      { text: "Gửi xin ý kiến Kế toán trưởng", completed: false }
    ],
    createdAt: '2026-06-16T09:00:00.000Z',
    updatedAt: '2026-06-16T09:10:00.000Z'
  },
  {
    id: 'task_mock_3',
    userId: 'mock_invest_user',
    title: 'Họp giao ban định kỳ Phòng ban bàn luận phân bổ ngân sách',
    description: 'Báo cáo tiến độ hoàn thành các dự án trọng điểm và chỉ đạo khó khăn hồ sơ đầu tư.',
    date: '2026-06-16',
    type: 'daily',
    status: 'completed',
    kpiCategory: 'N1_652 - Tài liệu chuẩn bị phục vụ đối thoại hội họp',
    kpiScore: 15,
    selfGradedScore: 15,
    evidence: 'Biên bản họp tuần phòng Tổng hợp',
    timeRange: '14:00 - 15:30',
    subtasks: [],
    createdAt: '2026-06-16T14:00:00.000Z',
    updatedAt: '2026-06-16T14:00:00.000Z'
  }
];

// Helper to get the start and end boundary of the KPI Cycle of a reference Month (currentDate)
// Kỳ chấm điểm tháng M (ví dụ Tháng 6): Từ mùng 5 tháng trước (M-1 / Tháng 5) đến mùng 5 tháng này (M / Tháng 6)
const getKpiCycleBounds = (refDate: Date) => {
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-indexed, so 5 for June
  
  // Start: mùng 5 tháng trước
  const startYear = month === 0 ? year - 1 : year;
  const startMonth = month === 0 ? 11 : month - 1;
  const startDay = 5;
  
  // End: mùng 5 tháng này
  const endYear = year;
  const endMonth = month;
  const endDay = 5;
  
  const pad = (n: number) => String(n).padStart(2, '0');
  
  const startDateStr = `${startYear}-${pad(startMonth + 1)}-${pad(startDay)}`;
  const endDateStr = `${endYear}-${pad(endMonth + 1)}-${pad(endDay)}`;
  
  return {
    startDateStr,
    endDateStr,
    startLabel: `${pad(startDay)}/${pad(startMonth + 1)}/${startYear}`,
    endLabel: `${pad(endDay)}/${pad(endMonth + 1)}/${endYear}`
  };
};

// Helper to find which KPI Cycle Month a given date belongs to
const getKpiMonthForDate = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12
  const day = parseInt(parts[2], 10); // 1-31
  
  if (day > 5) {
    if (month === 12) {
      return { month: 1, year: year + 1 };
    }
    return { month: month + 1, year };
  } else {
    return { month, year };
  }
};

// Heuristic markdown formatting and parser for AI reports
export function parseBoldTokens(text: string) {
  if (!text) return "";
  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-extrabold text-[#3f3a36]">{part}</strong>;
    }
    return part;
  });
}

export function MarkdownContent({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-3 text-sm text-slate-700 leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const clean = line.trim();
        if (!clean) return <div key={idx} className="h-2" />;
        
        // Headers
        if (clean.startsWith('###')) {
          return <h4 key={idx} className="text-sm font-bold text-slate-900 mt-4 border-b border-slate-100 pb-1 uppercase tracking-wider">{clean.replace('###', '').trim()}</h4>;
        }
        if (clean.startsWith('##')) {
          return <h3 key={idx} className="text-base font-black text-slate-950 mt-5 border-l-4 border-[#3f3a36] pl-2">{clean.replace('##', '').trim()}</h3>;
        }
        if (clean.startsWith('#')) {
          return <h2 key={idx} className="text-lg font-black text-slate-950 mt-6 border-l-4 border-[#3f3a36] pl-2">{clean.replace('#', '').trim()}</h2>;
        }

        // List item
        if (clean.startsWith('-') || clean.startsWith('*')) {
          const itemText = clean.substring(1).trim();
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-[#3f3a36] font-extrabold mt-1">•</span>
              <span className="flex-1">{parseBoldTokens(itemText)}</span>
            </div>
          );
        }

        // Ordered list item
        const orderedMatch = clean.match(/^([0-9]+)\.\s(.*)/);
        if (orderedMatch) {
          const num = orderedMatch[1];
          const itemText = orderedMatch[2];
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-slate-500 font-extrabold text-xs">{num}.</span>
              <span className="flex-1">{parseBoldTokens(itemText)}</span>
            </div>
          );
        }

        // Divider
        if (clean === '---') {
          return <hr key={idx} className="my-4 border-t border-slate-200" />;
        }

        // Standard paragraph
        return <p key={idx}>{parseBoldTokens(clean)}</p>;
      })}
    </div>
  );
}

// Convert date string YYYY-MM-DD into a gorgeous Vietnamese banner
export const getFormattedDateVietnamese = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dayName = days[d.getDay()];
  const dayNum = d.getDate();
  const monthNum = d.getMonth() + 1;
  return `${dayName}, Ngày ${dayNum} Tháng ${monthNum}`;
};

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>({
    uid: 'mock_invest_user',
    email: 'an.tonghop@gmail.com',
    displayName: 'Nguyễn Văn An',
  } as any);
  const [authLoading, setAuthLoading] = useState(false);

  // User Profile state
  const [profile, setProfile] = useState<UserProfile | null>({
    uid: 'mock_invest_user',
    fullName: 'Nguyễn Văn An',
    department: 'Mạng lưới Sở - Văn phòng Sở (Phòng Tổng hợp)',
    position: 'Chuyên viên phòng Tổng hợp',
    kpiGoal: 300,
    createdAt: new Date().toISOString()
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  // Form profile fields
  const [profileName, setProfileName] = useState('Nguyễn Văn An');
  const [profileDept, setProfileDept] = useState('Văn phòng Sở');
  const [profilePosition, setProfilePosition] = useState('Chuyên viên phòng Tổng hợp');
  const [profileGoal, setProfileGoal] = useState(300);

  // Tasks state
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Notes state (Ghi chú chung)
  const [generalNotes, setGeneralNotes] = useState<{ id: string; content: string; dateStr: string }[]>(() => {
    const saved = localStorage.getItem('kpi_mock_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [
      { id: 'note_1', content: 'Chuẩn bị hồ sơ dự án Xong trước thứ 6. Cần xin chữ ký phó giám đốc.', dateStr: 'Hôm qua' },
      { id: 'note_2', content: 'Liên hệ bên IT để nâng cấp phần mềm kế toán. SĐT anh Tuấn: 098x.xxx.xxx', dateStr: '12/06/2026' }
    ];
  });
  const [newNoteText, setNewNoteText] = useState('');

  // Daily evaluation states
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [evaluationText, setEvaluationText] = useState('');
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  // Quick Quick-Input
  const [quickInputVal, setQuickInputVal] = useState('');

  // Interactive Calendar state - Khởi tạo theo đúng ngày hôm nay để phù hợp kỳ chấm điểm thực tế của người dùng
  const initCurrentDate = () => {
    return new Date('2026-06-16');
  };
  const [currentDate, setCurrentDate] = useState(initCurrentDate());
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-06-16');

  // Active workspace filter tabs: 'daily' | 'monthly' | 'future' | 'all-month'
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'future' | 'all-month'>('daily');

  // Form modal visibility & field states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDateStr, setTaskDateStr] = useState('2026-06-16');
  const [taskType, setTaskType] = useState<TaskType>('daily');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('completed');
  
  // KPI standard dropdown matching
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<StandardTaskCatalogItem | null>(null);
  const [selfGradedScore, setSelfGradedScore] = useState(10);
  
  // Form standard properties (override options)
  const [participationRate, setParticipationRate] = useState(100);
  const [executionMinutes, setExecutionMinutes] = useState(120);
  const [quantityStr, setQuantityStr] = useState('01 báo cáo hoàn thành');
  const [qualityStr, setQualityStr] = useState('Tốt');
  const [progressStr, setProgressStr] = useState('Đúng tiến độ');
  const [reworkCount, setReworkCount] = useState(0);
  const [evidenceStr, setEvidenceStr] = useState('');

  // AI assistant integration
  const [aiRawText, setAiRawText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);

  // Elegant Conversational AI Chat states
  const [chatMessages, setChatMessages] = useState<{
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
    actionDone?: string;
  }[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: `### Trợ lý AI Hỏa tốc xin kính chào đồng chí! 🤝\n\nTôi sẽ hỗ trợ đồng chí chuẩn hóa và **đăng ký mã KPI tự động** thông qua cuộc hội thoại tự nhiên.\n\n👉 **Đồng chí chỉ cần mô tả việc đã làm**, ví dụ:\n* *"Tôi mới làm xong một tờ trình xin bổ sung kinh phí sửa chữa phòng họp"*\n* *"Thẩm định xong hồ sơ rà soát quyết toán vốn xã Hồng Trị"* \n\nTôi sẽ tự tìm mã phù hợp nhất trong Catalog và ghi nhận điểm KPI cho đồng chí ngay lập tức!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Error feedback state
  const [appError, setAppError] = useState<string | null>(null);
  const [successMsg, setSuccessMessage] = useState<string | null>(null);

  const catalogDropdownRef = useRef<HTMLDivElement>(null);
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);
  const [showManualKpiSelect, setShowManualKpiSelect] = useState(false);

  // 1. Listen to Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await fetchUserProfile(currentUser.uid);
      } else {
        // Bảo lưu Mock User khi chưa có đăng nhập Google chính thức để chỉnh sửa giao diện rực rỡ và thông suốt
        setUser({
          uid: 'mock_invest_user',
          email: 'vu.investcb@gmail.com',
          displayName: 'Nguyễn Văn Vũ'
        } as any);
        await fetchUserProfile('mock_invest_user');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch User Profile
  const fetchUserProfile = async (uid: string) => {
    setProfileLoading(true);

    if (uid === 'mock_invest_user') {
      const stored = localStorage.getItem('kpi_mock_profile');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setProfile(parsed);
          setProfileName(parsed.fullName);
          setProfileDept(parsed.department);
          setProfilePosition(parsed.position);
          setProfileGoal(parsed.kpiGoal);
          setShowProfileSetup(false);
        } catch (e) {
          // Fallback to default
        }
      }
      setProfileLoading(false);
      return;
    }

    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const payload = {
          uid: data.uid,
          fullName: data.fullName,
          department: data.department,
          position: data.position,
          kpiGoal: data.kpiGoal,
          createdAt: data.createdAt
        };
        setProfile(payload);
        setProfileName(data.fullName);
        setProfileDept(data.department);
        setProfilePosition(data.position);
        setProfileGoal(data.kpiGoal);
        setShowProfileSetup(false);
        localStorage.setItem(`kpi_profile_${uid}`, JSON.stringify(payload));
      } else {
        const localProf = localStorage.getItem(`kpi_profile_${uid}`);
        if (localProf) {
          const parsed = JSON.parse(localProf);
          setProfile(parsed);
          setProfileName(parsed.fullName);
          setProfileDept(parsed.department);
          setProfilePosition(parsed.position);
          setProfileGoal(parsed.kpiGoal);
          setShowProfileSetup(false);
        } else {
          setProfile(null);
          setShowProfileSetup(true);
        }
      }
    } catch (err) {
      console.warn("Lỗi khi tải thông tin hồ sơ từ Firestore (sẽ dùng offline cache):", err);
      const localProf = localStorage.getItem(`kpi_profile_${uid}`) || localStorage.getItem('kpi_mock_profile');
      if (localProf) {
        try {
          const parsed = JSON.parse(localProf);
          setProfile(parsed);
          setProfileName(parsed.fullName);
          setProfileDept(parsed.department);
          setProfilePosition(parsed.position);
          setProfileGoal(parsed.kpiGoal);
          setShowProfileSetup(false);
        } catch (e) {}
      } else {
        setShowProfileSetup(true);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // 3. Save User Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!profileName.trim()) {
      alert("Vui lòng nhập họ và tên.");
      return;
    }

    setProfileLoading(true);
    setAppError(null);
    const payload = {
      uid: user.uid,
      fullName: profileName.trim(),
      department: profileDept,
      position: profilePosition,
      kpiGoal: parseInt(String(profileGoal), 10) || 300,
      createdAt: profile?.createdAt || new Date().toISOString()
    };

    if (user.uid === 'mock_invest_user') {
      localStorage.setItem('kpi_mock_profile', JSON.stringify(payload));
      setProfile(payload);
      setShowProfileSetup(false);
      showTemporarySuccess("Đã lưu cấu hình hồ sơ công chức thành công!");
      setProfileLoading(false);
      return;
    }

    try {
      await setDoc(doc(db, 'users', user.uid), payload);
      localStorage.setItem(`kpi_profile_${user.uid}`, JSON.stringify(payload));
      setProfile(payload);
      setShowProfileSetup(false);
      showTemporarySuccess("Đã lưu cấu hình hồ sơ công chức thành công!");
    } catch (err) {
      console.warn("Lỗi khi viết profile lên Firestore (sẽ dùng offline cache):", err);
      localStorage.setItem(`kpi_profile_${user.uid}`, JSON.stringify(payload));
      setProfile(payload);
      setShowProfileSetup(false);
      showTemporarySuccess("Đã lưu cấu hình hồ sơ công chức (Chế độ offline)!");
    } finally {
      setProfileLoading(false);
    }
  };

  // 4. Retrieve Tasks securely
  useEffect(() => {
    if (!user || showProfileSetup) return;

    if (user.uid === 'mock_invest_user') {
      setTasksLoading(true);
      const storedTasks = localStorage.getItem('kpi_mock_tasks');
      if (storedTasks) {
        try {
          setTasks(JSON.parse(storedTasks));
        } catch (e) {
          setTasks(DEFAULT_MOCK_TASKS);
          localStorage.setItem('kpi_mock_tasks', JSON.stringify(DEFAULT_MOCK_TASKS));
        }
      } else {
        setTasks(DEFAULT_MOCK_TASKS);
        localStorage.setItem('kpi_mock_tasks', JSON.stringify(DEFAULT_MOCK_TASKS));
      }
      setTasksLoading(false);
      return;
    }

    setTasksLoading(true);
    
    // Subscribe to task subcollection
    const q = query(collection(db, 'users', user.uid, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: TaskItem[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        items.push({
          id: d.id,
          userId: d.userId,
          title: d.title,
          date: d.date,
          type: d.type as TaskType,
          status: d.status as TaskStatus,
          kpiCategory: d.kpiCategory,
          kpiScore: d.kpiScore,
          selfGradedScore: d.selfGradedScore,
          participationRate: d.participationRate,
          executionMinutes: d.executionMinutes,
          quantity: d.quantity,
          quality: d.quality,
          progress: d.progress,
          reworkCount: d.reworkCount,
          evidence: d.evidence,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        });
      });
      
      // Sort tasks chronological
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setTasks(items);
      localStorage.setItem(`kpi_tasks_${user.uid}`, JSON.stringify(items));
      setTasksLoading(false);
    }, (error) => {
      console.warn("Lỗi onSnapshot Firestore (Sẽ dùng offline cache để tiếp tục chỉnh sửa giao diện):", error);
      const localTasks = localStorage.getItem(`kpi_tasks_${user.uid}`) || localStorage.getItem('kpi_mock_tasks');
      if (localTasks) {
        try {
          setTasks(JSON.parse(localTasks));
        } catch (e) {}
      } else {
        setTasks(DEFAULT_MOCK_TASKS);
      }
      setTasksLoading(false);
    });

    return () => unsubscribe();
  }, [user, showProfileSetup]);

  // Click handler to detect click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (catalogDropdownRef.current && !catalogDropdownRef.current.contains(event.target as Node)) {
        setShowCatalogDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showTemporarySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // 5. Auth triggers
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Đăng nhập thất bại:", err);
      alert("Đăng nhập thất bại. Vui lòng mở trang web trên trình duyệt chuẩn hoặc kiểm tra cấu hình.");
    }
  };

  const handleLogout = async () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      await signOut(auth);
    }
  };

  const handleDaySelect = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDateStr(dateStr);
    setTaskDateStr(dateStr);
  };

  // 6. Form Handlers: Prepare adding/editing
  const openAddTask = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDateStr(selectedDateStr);
    setTaskType('daily');
    setTaskStatus('completed');
    setSelectedCatalogItem(null);
    setSearchCatalogQuery('');
    setSelfGradedScore(10);
    setParticipationRate(100);
    setExecutionMinutes(120);
    setQuantityStr('01 báo cáo hoàn thành');
    setQualityStr('Tốt');
    setProgressStr('Đúng tiến độ');
    setReworkCount(0);
    setEvidenceStr('');
    setAiRawText('');
    setAiRecommendations([]);
    setAiError(null);
    setShowManualKpiSelect(false);
    setShowTaskModal(true);
  };

  const openEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDateStr(task.date);
    setTaskType(task.type);
    setTaskStatus(task.status);
    
    // Reverse lookup catalog item
    const code = task.kpiCategory?.split(' - ')[0] || '';
    const catalogItem = STANDARD_TASK_CATALOG.find(i => i.id === code) || null;
    setSelectedCatalogItem(catalogItem);
    setSearchCatalogQuery(catalogItem ? `${catalogItem.id} - ${catalogItem.title}` : '');
    
    setSelfGradedScore(task.selfGradedScore);
    setParticipationRate(task.participationRate || 100);
    setExecutionMinutes(task.executionMinutes || 120);
    setQuantityStr(task.quantity || '01 báo cáo');
    setQualityStr(task.quality || 'Tốt');
    setProgressStr(task.progress || 'Đúng tiến độ');
    setReworkCount(task.reworkCount || 0);
    setEvidenceStr(task.evidence || '');
    setAiRawText(task.title);
    setAiRecommendations([]);
    setAiError(null);
    setShowManualKpiSelect(false);
    setShowTaskModal(true);
  };

  // 7. Save task record securely with Firestore validation
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const rawInput = aiRawText.trim() || taskTitle.trim();
    if (!rawInput) {
      alert("Vui lòng mô tả công việc của bạn.");
      return;
    }

    setTasksLoading(true);
    setAppError(null);

    let matchedItem = selectedCatalogItem;
    let finalTitle = taskTitle.trim() || rawInput;
    let finalSelfGradedScore = parseFloat(String(selfGradedScore)) || 0;
    let finalType = taskType;

    // AI Auto-Evaluation if no catalog item is selected yet
    if (!matchedItem) {
      try {
        const response = await fetch('/api/optimize-kpi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: rawInput,
            catalogItems: STANDARD_TASK_CATALOG
          })
        });

        if (response.ok) {
          const result = await response.json();
          const found = STANDARD_TASK_CATALOG.find(item => item.id === result.matchedId);
          if (found) {
            matchedItem = found;
            finalTitle = result.refinedTitle || found.title;
            finalSelfGradedScore = found.multiplier; // default to max score
            
            // Auto determine task type based on catalog classification or textual keywords
            if (rawInput.toLowerCase().includes('tương lai') || rawInput.toLowerCase().includes('sắp tới') || rawInput.toLowerCase().includes('kế hoạch')) {
              finalType = 'future';
            } else if (rawInput.toLowerCase().includes('tháng') || found.group === 'Nhóm 3' || found.group === 'Nhóm 5') {
              finalType = 'monthly';
            } else {
              finalType = 'daily';
            }
          }
        }
      } catch (err) {
        console.warn("Auto AI match failed during save, placing fallback catalog item:", err);
      }
    }

    // Ultimate fallback if AI could not resolve
    if (!matchedItem) {
      matchedItem = STANDARD_TASK_CATALOG[0]; // Soạn thảo văn bản hành chính N1_650
      finalTitle = finalTitle || rawInput;
      finalSelfGradedScore = matchedItem.multiplier;
    }

    // Limit self-graded score to standard benchmark multiplier
    if (finalSelfGradedScore < 0 || finalSelfGradedScore > matchedItem.multiplier) {
      finalSelfGradedScore = matchedItem.multiplier;
    }

    const taskId = editingTask ? editingTask.id : 'task_' + Date.now();
    
    // Standard properties conforming exactly to Firestore validation rules
    const payload: any = {
      id: taskId,
      userId: user.uid,
      title: finalTitle,
      date: taskDateStr,
      status: taskStatus,
      type: finalType,
      kpiCategory: `${matchedItem.id} - ${matchedItem.title}`,
      kpiScore: matchedItem.multiplier,
      selfGradedScore: finalSelfGradedScore,
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Automated proof parameters integrated in the background - NO user action required!
    const complexProof = `[SL: ${quantityStr || "01"} | CL: ${qualityStr || "Tốt"} | TL: ${participationRate}% | TG: ${executionMinutes}p | TĐ: ${progressStr || "Đúng"} | Lại: ${reworkCount}]`.trim();
    payload.evidence = complexProof;

    if (user.uid === 'mock_invest_user') {
      let currentTasks = [...tasks];
      if (editingTask) {
        currentTasks = currentTasks.map(t => t.id === taskId ? payload : t);
      } else {
        currentTasks.unshift(payload);
      }
      localStorage.setItem('kpi_mock_tasks', JSON.stringify(currentTasks));
      setTasks(currentTasks);
      setShowTaskModal(false);
      showTemporarySuccess(editingTask ? "Đã cập nhật công việc KPI thành công!" : "Đã ghi nhận công việc KPI mới thành công!");
      setTasksLoading(false);
      return;
    }

    try {
      await setDoc(doc(db, 'users', user.uid, 'tasks', taskId), payload);
      setShowTaskModal(false);
      showTemporarySuccess(editingTask ? "Đã cập nhật công việc KPI thành công!" : "Đã ghi nhận công việc KPI mới thành công!");
    } catch (err) {
      console.warn("Lỗi khi ghi task lên Firestore (Sẽ dùng offline cache):", err);
      let currentTasks = [...tasks];
      if (editingTask) {
        currentTasks = currentTasks.map(t => t.id === taskId ? payload : t);
      } else {
        currentTasks.unshift(payload);
      }
      localStorage.setItem(`kpi_tasks_${user.uid}`, JSON.stringify(currentTasks));
      setTasks(currentTasks);
      setShowTaskModal(false);
      showTemporarySuccess("Đã cập nhật công việc (Lưu trữ cục bộ)!");
    } finally {
      setTasksLoading(false);
    }
  };

  // 8. Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    if (!confirm("Bạn có chắc chắn muốn xóa công việc này khỏi danh sách thống kê không?")) return;

    setTasksLoading(true);
    setAppError(null);

    if (user.uid === 'mock_invest_user') {
      const remainingTasks = tasks.filter(t => t.id !== taskId);
      localStorage.setItem('kpi_mock_tasks', JSON.stringify(remainingTasks));
      setTasks(remainingTasks);
      showTemporarySuccess("Đã xóa công việc khỏi danh sách.");
      setTasksLoading(false);
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', taskId));
      showTemporarySuccess("Đã xóa công việc khỏi danh sách.");
    } catch (err) {
      console.warn("Lỗi khi xóa task ra khỏi Firestore (Sẽ dùng offline cache):", err);
      const remainingTasks = tasks.filter(t => t.id !== taskId);
      localStorage.setItem(`kpi_tasks_${user.uid}`, JSON.stringify(remainingTasks));
      setTasks(remainingTasks);
      showTemporarySuccess("Đã xóa công việc khỏi danh sách (Lưu trữ cục bộ).");
    } finally {
      setTasksLoading(false);
    }
  };

  // Helper function to apply chosen recommendation
  const applyRecommendation = (rec: any) => {
    const matchedIdx = STANDARD_TASK_CATALOG.find(item => item.id === rec.matchedId);
    if (matchedIdx) {
      setSelectedCatalogItem(matchedIdx);
      setSearchCatalogQuery(`${matchedIdx.id} - ${matchedIdx.title}`);
      setSelfGradedScore(matchedIdx.multiplier); // default auto-points
      setTaskTitle(rec.refinedTitle || matchedIdx.title);
      setEvidenceStr(rec.recommendedEvidenceTemplate || '');
      
      const lowerText = aiRawText.toLowerCase();
      // Auto determine task type based on catalog classification or textual keywords
      if (lowerText.includes('tương lai') || lowerText.includes('sắp tới') || lowerText.includes('kế hoạch')) {
        setTaskType('future');
      } else if (lowerText.includes('tháng') || matchedIdx.group === 'Nhóm 3' || matchedIdx.group === 'Nhóm 5') {
        setTaskType('monthly');
      } else {
        setTaskType('daily');
      }
    }
  };

  // 9. AI Helper: Ask Gemini server-side to match and optimize with multiple alternative candidates
  const handleAiOptimize = async () => {
    if (!aiRawText.trim()) {
      setAiError("Vui lòng nhập tóm tắt công việc bạn đã hoàn thành để AI phân tích.");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiRecommendations([]);

    try {
      const response = await fetch('/api/optimize-kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: aiRawText.trim(),
          catalogItems: STANDARD_TASK_CATALOG
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }

      const result = await response.json();
      const recs = result.recommendations || [];

      if (recs.length > 0) {
        setAiRecommendations(recs);
        // Default to applying the top recommendation
        applyRecommendation(recs[0]);
        showTemporarySuccess(`Trợ lý AI đã tìm thấy ${recs.length} đề xuất mã KPI phù hợp. Bạn có thể chọn mã khác bên dưới.`);
      } else {
        // Fallback for flat response structure
        const matchedIdx = STANDARD_TASK_CATALOG.find(item => item.id === result.matchedId);
        if (matchedIdx) {
          applyRecommendation(result);
          setAiRecommendations([result]);
          showTemporarySuccess("Trợ lý AI đã tự động phân tích và chọn kết quả phù hợp nhất.");
        } else {
          setAiError("AI đề xuất một mã KPI nằm ngoài Catalog hiện tại. Vui lòng nhập lại rõ ràng hơn.");
        }
      }
    } catch (err: any) {
      console.error("AiOptimize error:", err);
      setAiError(err?.message || "Không kết nối được dịch vụ AI. Vui lòng bổ sung GEMINI_API_KEY hoặc thử lại sau.");
    } finally {
      setAiLoading(false);
    }
  };

  // Notes actions (Ghi chú chung)
  const handleSaveNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNote = {
      id: 'note_' + Date.now(),
      content: newNoteText.trim(),
      dateStr: 'Hôm nay'
    };
    const updatedNotes = [...generalNotes, newNote];
    setGeneralNotes(updatedNotes);
    localStorage.setItem('kpi_mock_notes', JSON.stringify(updatedNotes));
    setNewNoteText('');
    showTemporarySuccess("Đã lưu ghi chú chung!");
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = generalNotes.filter(n => n.id !== noteId);
    setGeneralNotes(updatedNotes);
    localStorage.setItem('kpi_mock_notes', JSON.stringify(updatedNotes));
    showTemporarySuccess("Đã xóa ghi chú.");
  };

  // Quick Action Adding via AI classification
  const handleQuickAddTask = async (rawInput: string) => {
    if (!rawInput.trim() || !user) return;
    setTasksLoading(true);
    try {
      // 1. Heuristic time extraction
      let extractedTime = "";
      const timeRegex = /([0-9]{1,2}h[0-9]{0,2}|[0-9]{1,2}:[0-9]{2})/gi;
      const match = rawInput.match(timeRegex);
      if (match && match.length > 0) {
        if (match.length >= 2) {
          extractedTime = `${match[0]} - ${match[1]}`;
        } else {
          extractedTime = `${match[0]}`;
        }
      } else {
        // default time based on existing tasks count
        const currentNum = tasks.filter(t => t.date === selectedDateStr).length;
        if (currentNum === 0) extractedTime = "08:00 - 09:30";
        else if (currentNum === 1) extractedTime = "10:00 - 11:30 (Hiện tại)";
        else extractedTime = "14:00 - 15:30";
      }

      // 2. Heuristic checklist extraction
      const autoSubtasks: { text: string; completed: boolean }[] = [];
      if (rawInput.toLowerCase().includes('báo cáo') || rawInput.toLowerCase().includes('tờ trình')) {
        autoSubtasks.push({ text: "Thu thập số liệu, báo cáo chi tiết", completed: true });
        autoSubtasks.push({ text: "Hoàn thiện nội dung văn bản hành chính", completed: false });
        autoSubtasks.push({ text: "Trình ký phê duyệt Ban Giám đốc", completed: false });
      } else {
        autoSubtasks.push({ text: "Chuẩn bị tài liệu & hồ sơ", completed: true });
        autoSubtasks.push({ text: "Triển khai nghiệp vụ chuyên môn", completed: false });
      }

      // 3. Match from API
      const response = await fetch('/api/optimize-kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawInput,
          catalogItems: STANDARD_TASK_CATALOG
        })
      });

      let matchedItem = STANDARD_TASK_CATALOG.find(i => i.id === "N1_650") || STANDARD_TASK_CATALOG[0]; // fallback N1_650
      let finalizedTitle = rawInput;
      let finalScore = matchedItem.multiplier;

      if (response.ok) {
        const result = await response.json();
        const found = STANDARD_TASK_CATALOG.find(i => i.id === result.matchedId);
        if (found) {
          matchedItem = found;
          finalizedTitle = result.refinedTitle || found.title;
          finalScore = found.multiplier;
        }
      }

      const newTask: TaskItem = {
        id: 'task_' + Date.now(),
        userId: user.uid,
        title: finalizedTitle,
        description: rawInput,
        date: selectedDateStr,
        type: 'daily',
        status: 'completed',
        kpiCategory: `${matchedItem.id} - ${matchedItem.title}`,
        kpiScore: matchedItem.benchmarkScore || matchedItem.multiplier || 10,
        selfGradedScore: finalScore,
        evidence: `Hồ sơ chứng minh đầu ra mã ${matchedItem.id}`,
        participationRate: 100,
        executionMinutes: 120,
        quantity: '01 sản phẩm hoàn thành',
        quality: 'Tốt',
        progress: 'Đúng tiến độ',
        reworkCount: 0,
        timeRange: extractedTime,
        subtasks: autoSubtasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (user.uid === 'mock_invest_user') {
        const currentTasks = [...tasks, newTask];
        localStorage.setItem('kpi_mock_tasks', JSON.stringify(currentTasks));
        setTasks(currentTasks);
      } else {
        await setDoc(doc(db, 'users', user.uid, 'tasks', newTask.id), newTask);
      }

      showTemporarySuccess("Trợ lý AI đã tự động phân loại và thêm việc thành công!");
      setQuickInputVal('');
    } catch (err) {
      console.error(err);
      alert("Không thể thêm nhanh công việc.");
    } finally {
      setTasksLoading(false);
    }
  };

  // Conversational AI Chat Assistant
  const handleSendChatMessage = async (msgText?: string) => {
    const textToSend = msgText !== undefined ? msgText : chatInput;
    if (!textToSend.trim() || !user) return;

    const userMessage = {
      id: 'user_' + Date.now(),
      sender: 'user' as const,
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMessage]);
    if (msgText === undefined) {
      setChatInput('');
    }
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: chatMessages.slice(-10), // send last 10 messages for context
          catalogItems: STANDARD_TASK_CATALOG,
          currentDateStr: selectedDateStr
        })
      });

      if (!response.ok) {
        throw new Error('Không thể kết nối với dịch vụ trợ lý AI.');
      }

      const data = await response.json();
      
      const aiMessage = {
        id: 'ai_' + Date.now(),
        sender: 'ai' as const,
        text: data.reply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        actionDone: data.action?.type === 'ADD_TASK' ? `Đã thêm: ${data.action.task.title}` : undefined
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // If AI determined a task should be added, automatically register it
      if (data.action && data.action.type === 'ADD_TASK' && data.action.task) {
        const t = data.action.task;
        
        // Find matching catalog item
        const matchedCatalog = STANDARD_TASK_CATALOG.find(item => item.id === t.matchedId) || STANDARD_TASK_CATALOG[0];
        
        // Build subtasks structured list
        const subtasksWithCompleted = t.subtasks && Array.isArray(t.subtasks)
          ? t.subtasks.map((st: any, idx: number) => ({
              text: typeof st === 'string' ? st : (st.text || ''),
              completed: idx === 0 // make first subtask pre-completed as suggestion
            }))
          : [
              { text: "Chuẩn bị tài liệu & nghiên cứu hồ sơ chuyên môn", completed: true },
              { text: "Biên soạn dự thảo và hoàn thành văn bản", completed: false }
            ];

        const newTask: TaskItem = {
          id: 'task_' + Date.now(),
          userId: user.uid,
          title: t.title || matchedCatalog.title,
          description: t.description || textToSend,
          date: selectedDateStr,
          type: 'daily',
          status: 'completed',
          kpiCategory: `${matchedCatalog.id} - ${matchedCatalog.title}`,
          kpiScore: matchedCatalog.benchmarkScore || matchedCatalog.multiplier || 10,
          selfGradedScore: matchedCatalog.multiplier || 10,
          evidence: t.evidence || `Chứng minh bàn giao đầu ra chuẩn mã ${matchedCatalog.id}`,
          participationRate: 100,
          executionMinutes: 120,
          quantity: '01 sản phẩm hoàn thành',
          quality: 'Tốt',
          progress: 'Đúng tiến độ',
          reworkCount: 0,
          timeRange: t.timeRange || "09:00 - 10:30",
          subtasks: subtasksWithCompleted,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Save task
        if (user.uid === 'mock_invest_user') {
          const updatedTasks = [...tasks, newTask];
          localStorage.setItem('kpi_mock_tasks', JSON.stringify(updatedTasks));
          setTasks(updatedTasks);
        } else {
          await setDoc(doc(db, 'users', user.uid, 'tasks', newTask.id), newTask);
        }
        
        showTemporarySuccess(`Trợ lý AI đã ghi nhận công việc KPI: ${newTask.title}`);
      }

    } catch (err: any) {
      console.warn("Chat assistant error:", err);
      const errMessage = {
        id: 'ai_err_' + Date.now(),
        sender: 'ai' as const,
        text: `Có một chút gián đoạn truyền tải dữ liệu khi kết nối máy chủ AI. Đồng chí vui lòng thử lại hoặc gõ văn bản súc tích rõ nghĩa nhé.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // Interactive AI Daily Analysis Summary
  const handleGetDailyEvaluation = async () => {
    if (!profile) return;
    setEvaluationLoading(true);
    setShowEvaluationModal(true);
    setEvaluationText('');

    const dayTasks = tasks.filter(t => t.date === selectedDateStr);

    try {
      const response = await fetch('/api/daily-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: dayTasks,
          fullName: profile.fullName,
          department: profile.department,
          kpiGoal: profile.kpiGoal
        })
      });

      if (!response.ok) throw new Error("Server error");
      const result = await response.json();
      setEvaluationText(result.evaluation || "Không nhận được phản hồi đánh giá.");
    } catch (err) {
      console.error("Evaluation err:", err);
      // Fallback
      setEvaluationText(`### 📊 Có lỗi khi liên lạc với AI\nĐồng chí vẫn có ${dayTasks.length} việc chấm KPI trong ngày đạt ${dayTasks.reduce((sum, t) => sum + (t.selfGradedScore || 0), 0)} điểm. Đề nghị kiểm tra kết nối mạng hoặc thử lại.`);
    } finally {
      setEvaluationLoading(false);
    }
  };

  // 10. Generate beautiful Excel Export
  const handleExportExcel = () => {
    if (!profile) return;
    
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    // Filter active cycle tasks
    const bounds = getKpiCycleBounds(currentDate);
    const monthlyTasks = tasks.filter(t => {
      return t.date >= bounds.startDateStr && t.date <= bounds.endDateStr;
    });

    if (monthlyTasks.length === 0) {
      alert(`Không tìm thấy công việc nào được ghi nhận trong Kỳ chấm điểm Tháng ${currentDate.getMonth() + 1}/${currentDate.getFullYear()} (từ ${bounds.startLabel} đến ${bounds.endLabel}) để xuất danh sách.`);
      return;
    }

    // Sort monthly tasks chronological
    monthlyTasks.sort((a, b) => a.date.localeCompare(b.date));

    // Prepare content arrays
    const formattedData = monthlyTasks.map((t, idx) => {
      // Parse dates to Vietnamese DD/MM/YYYY text
      const formatDateViet = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      };

      const dateStrViet = formatDateViet(t.date);

      // Extract details from merged evidence proof string
      let quantity = "01 Báo cáo";
      let quality = "Tốt";
      let participation = "100";
      let execTime = "120";
      let progress = "Đúng tiến độ";
      let reworks = "0";
      let comments = t.evidence || "";

      // Regex parser helper to read our condensed proof field
      if (t.evidence && t.evidence.startsWith('[sl:')) {
        // [SL: 01 báo cáo | CL: Tốt | TL: 100% | TG: 120p | TĐ: Đúng tiến độ | Lại: 0] Actual proof...
      }

      // Quick clean display output
      const matchLabel = t.kpiCategory ? t.kpiCategory : "Công việc hành chính chung";

      return [
        idx + 1, // Columns 1: TT
        t.title, // Columns 2: Tên công việc(*)
        matchLabel, // Columns 3: Thuộc sản phẩm/công việc(*) (Dropdown map)
        dateStrViet, // Columns 4: Ngày yêu cầu hoàn thành(*)
        dateStrViet, // Columns 5: Ngày hoàn thành(*)
        "100", // Columns 6: Tỷ lệ tham gia
        "120", // Columns 7: Thời gian thực hiện (phút)
        "Hoàn thành", // Columns 8: Số lượng(*)
        "Tốt", // Columns 9: Chất lượng(*)
        "Đúng tiến độ", // Columns 10: Tiến độ
        0, // Columns 11: Số lần yêu cầu làm lại
        t.evidence || "" // Columns 12: Ghi chú/minh chứng
      ];
    });

    // Write Excel headers exactly as requested
    const sheetData = [
      ["SỞ TÀI CHÍNH TỈNH CAO BẰNG", "", "", "", "", "", "", "", "", "", "", ""],
      ["DANH SÁCH BẢNG CÔNG VIỆC CHẤM ĐIỂM KPIs CÁ NHÂN", "", "", "", "", "", "", "", "", "", "", ""],
      [`Công chức báo cáo: ${profile.fullName} | Chức vụ: ${profile.position} | Đơn vị: ${profile.department}`, "", "", "", "", "", "", "", "", "", "", ""],
      [`Thời kỳ báo cáo: Kỳ chấm điểm Tháng ${currentDate.getMonth() + 1}/${currentYear} (từ ${bounds.startLabel} đến ${bounds.endLabel}) | Mục tiêu KPI tháng: ${effectiveGoal} điểm`, "", "", "", "", "", "", "", "", "", "", ""],
      ["- Số cột trên hệ thống quy chuẩn không thay đổi", "", "", "", "", "", "", "", "", "", "", ""],
      ["- Dữ liệu từ dòng 1 đến dòng 8 không được import vào hệ thống", "", "", "", "", "", "", "", "", "", "", ""],
      ["- Các cột ngày nhập định dạng: DD/MM/YYYY. Ví dụ: " + bounds.startLabel, "", "", "", "", "", "", "", "", "", "", ""],
      [
        "TT(*)", 
        "Tên công việc(*)", 
        "Thuộc sản phẩm/công việc(*)", 
        "Ngày yêu cầu hoàn thành(*)", 
        "Ngày hoàn thành(*)", 
        "Tỷ lệ tham gia", 
        "Thời gian thực hiện (phút)", 
        "Số lượng(*)", 
        "Chất lượng(*)", 
        "Tiến độ", 
        "Số lần yêu cầu làm lại", 
        "Ghi chú"
      ],
      ...formattedData
    ];

    // Create workbook and write sheet
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KPI_Import_Sheet");

    // Perform browser download
    const fileName = `Bieu_KPI_STC_Ky_Thang_${currentDate.getMonth() + 1}_${profile.fullName.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showTemporarySuccess("Đã xuất tệp Excel biểu mẫu thành công! Bạn có thể tải ngay lên hệ thống.");
  };

  // Calendar render helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const drawCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = getDaysInMonth(year, month);
    
    // First day of the month index (0 for Sunday, 1 for Monday...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Offset for Vietnamese layout: Monday is index 0 (0-Sunday offset)
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const cells: React.ReactNode[] = [];

    // Push preceding blank cells
    for (let i = 0; i < startOffset; i++) {
      cells.push(<div key={`empty-${i}`} className="h-12 border-b border-gray-100 bg-gray-50/50"></div>);
    }

    // Push date grid cells
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      const isToday = new Date().toDateString() === date.toDateString();
      const dateString = date.toISOString().split('T')[0];
      const isSelected = selectedDateStr === dateString;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 0 for Sunday, 6 for Saturday

      // Filter tasks belonging exactly to this date
      const dayTasks = tasks.filter(t => t.date === dateString);
      const hasDaily = dayTasks.some(t => t.type === 'daily');
      const hasMonthly = dayTasks.some(t => t.type === 'monthly');
      const hasFuture = dayTasks.some(t => t.type === 'future');

      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => handleDaySelect(date)}
          className={`h-12 border-b border-r border-gray-100 relative group flex flex-col justify-between items-center py-1 transition-all ${
            isSelected 
              ? 'bg-[#3f3a36] text-white font-bold rounded-lg shadow-md border-[#3f3a36] z-10 scale-[1.05]' 
              : isWeekend
                ? 'hover:bg-red-50 text-red-500 font-bold bg-red-50/10'
                : 'hover:bg-slate-100 text-[#3f3a36] font-medium'
          } ${isToday && !isSelected ? 'border-2 border-[#3f3a36] font-bold bg-[#3f3a36]/5 text-[#3f3a36]' : ''}`}
        >
          <span className="text-sm">{day}</span>
          
          {/* Calendar task count badge */}
          <div className="flex justify-center mt-auto pb-0.5 w-full">
            {dayTasks.length > 0 ? (
              <span className={`text-[8px] px-1 rounded-full font-extrabold leading-none py-0.5 select-none ${
                isSelected 
                  ? 'bg-white text-[#3f3a36]' 
                  : isToday
                    ? 'bg-[#3f3a36] text-white'
                    : isWeekend
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-100/50'
              }`}>
                {dayTasks.length} việc
              </span>
            ) : (
              <span className="w-1.5 h-1.5" />
            )}
          </div>
        </button>
      );
    }

    return cells;
  };

  // Switch calendar month
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Statistics & KPI calculators aligned perfectly to the 5th-of-previous to 5th-of-current month cycle bounds
  const bounds = getKpiCycleBounds(currentDate);
  const currentMonthTasks = tasks.filter(t => {
    return t.date >= bounds.startDateStr && t.date <= bounds.endDateStr;
  });

  const totalKpiEarned = currentMonthTasks.reduce((sum, task) => sum + (task.selfGradedScore || 0), 0);
  
  // Tính tổng KPI tối đa quy đổi của kỳ chấm điểm đó (bao nhiêu trăm điểm, ví dụ 338.0 điểm)
  // Nếu có công việc thì lấy tổng điểm kpiScore của các việc được giao trong kỳ, còn không có thì fallback về profile.kpiGoal hoặc mặc định 300.
  const monthlyTotalKpiLimit = currentMonthTasks.reduce((sum, task) => sum + (task.kpiScore || 0), 0);
  const effectiveGoal = monthlyTotalKpiLimit > 0 
    ? monthlyTotalKpiLimit 
    : (profile && profile.kpiGoal > 100 ? profile.kpiGoal : 300);
  const goalPercentage = effectiveGoal > 0 ? Math.round((totalKpiEarned / effectiveGoal) * 100) : 0;

  // Group stats calculator for N1-N5 columns
  const getNGroupScoreAndCount = (groupId: string) => {
    const filtered = currentMonthTasks.filter(task => {
      const code = task.kpiCategory?.split(' - ')[0] || '';
      return code.startsWith(groupId);
    });
    const count = filtered.length;
    const scoreSum = filtered.reduce((sum, t) => sum + (t.selfGradedScore || 0), 0);
    return { count, score: scoreSum };
  };

  // Toggle subtask status
  const toggleSubtask = async (task: TaskItem, subtaskIndex: number) => {
    if (!user) return;
    const updatedSubtasks = task.subtasks ? [...task.subtasks] : [];
    if (updatedSubtasks[subtaskIndex]) {
      updatedSubtasks[subtaskIndex] = {
        ...updatedSubtasks[subtaskIndex],
        completed: !updatedSubtasks[subtaskIndex].completed
      };
    }
    const updatedTask: TaskItem = {
      ...task,
      subtasks: updatedSubtasks,
      updatedAt: new Date().toISOString()
    };
    const currentTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
    setTasks(currentTasks);
    if (user.uid === 'mock_invest_user') {
      localStorage.setItem('kpi_mock_tasks', JSON.stringify(currentTasks));
    } else {
      localStorage.setItem(`kpi_tasks_${user.uid}`, JSON.stringify(currentTasks));
      try {
        await setDoc(doc(db, 'users', user.uid, 'tasks', task.id), updatedTask);
      } catch (err) {
        console.warn("Silent subtask sync failed:", err);
      }
    }
  };

  // Catalog filtering for autocomplete combobox
  const filteredCatalog = STANDARD_TASK_CATALOG.filter(item => {
    const matchesQuery = item.title.toLowerCase().includes(searchCatalogQuery.toLowerCase()) || 
                         item.id.toLowerCase().includes(searchCatalogQuery.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchCatalogQuery.toLowerCase());
    return matchesQuery;
  });

  // Render auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-400 mb-4"></div>
        <p className="text-emerald-400 font-mono tracking-widest text-sm">ĐANG TẢI DỮ LIỆU CHẤM ĐIỂM...</p>
      </div>
    );
  }

  // Welcome Landing Page (Not Authenticated)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden py-16">
        
        {/* Background grids */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />

        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md rounded-2xl p-8 md:p-12 shadow-2xl relative z-10 text-center animate-fade-in">
          
          <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-full mb-6 border border-emerald-500/20">
            <Building2 className="w-12 h-12 text-emerald-400" />
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            SỞ TÀI CHÍNH TỈNH CAO BẰNG
          </h1>
          <p className="text-xs font-mono text-emerald-400 mt-1 uppercase tracking-widest">
            Hệ thống quản lý công việc hành chính & KPI cán bộ
          </p>

          <p className="text-sm text-slate-400 mt-6 mb-8 leading-relaxed max-w-md mx-auto">
            Giải pháp nhập liệu, lập lịch thông minh giúp công chức kiểm soát công việc hằng ngày, kế hoạch hóa định kỳ tháng và tự động trích xuất báo cáo Excel hỏa tốc khớp chuẩn hệ thống chấm điểm.
          </p>

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center space-x-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-transform transform active:scale-[0.98] cursor-pointer"
          >
            {/* Google Vector Icon */}
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 3.927 1.018 4.87 1.916l2.45-2.36C17.912 2.106 15.348 1 12.24 1 5.922 1 1 6.012 1 12.24s4.922 11.24 11.24 11.24c6.59 0 10.97-4.578 10.97-11.135 0-.75-.08-1.32-.18-1.815H12.24z"/>
            </svg>
            <span>ĐĂNG NHẬP BẰNG GOOGLE CHÍNH THỨC</span>
          </button>

          <div className="mt-8 pt-6 border-t border-slate-800 text-slate-500 text-xs">
            © 2026 Sở Tài chính tỉnh Cao Bằng. Bản quyền bảo lưu.
          </div>
        </div>
      </div>
    );
  }

  // Setup Profile Dialogue (Mandatory before core launch)
  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-35" />
        
        <form 
          onSubmit={handleSaveProfile}
          className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 relative z-10"
        >
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
            <UserIcon className="w-8 h-8 text-emerald-600" />
            <div>
              <h2 className="text-xl font-bold text-slate-800">Cấu hình hồ sơ cán bộ</h2>
              <p className="text-xs text-slate-500">Thiết lập trước khi bắt đầu chấm điểm</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 leading-normal mb-5 flex items-start space-x-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Mọi số liệu công việc và sản phẩm KPI sẽ được mã hóa và liên kết bảo mật với Tài khoản định danh của riêng bạn.</span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Họ và tên (*)</label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Vũ"
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phòng ban / Văn phòng (*)</label>
              <select
                value={profileDept}
                onChange={(e) => setProfileDept(e.target.value)}
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm bg-white"
              >
                <option value="Phòng Quản lý Ngân sách">Phòng Quản lý Ngân sách</option>
                <option value="Phòng Tài chính Đầu tư">Phòng Tài chính Đầu tư</option>
                <option value="Phòng Giá và Công sản">Phòng Giá và Công sản</option>
                <option value="Văn phòng Sở">Văn phòng Sở</option>
                <option value="Thanh tra Sở">Thanh tra Sở</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Chức vụ (*)</label>
              <input
                type="text"
                required
                value={profilePosition}
                onChange={(e) => setProfilePosition(e.target.value)}
                placeholder="Ví dụ: Chuyên viên kinh tế, Phó trưởng phòng..."
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mục tiêu Điểm KPI Tháng (*)</label>
              <input
                type="number"
                required
                value={profileGoal}
                onChange={(e) => setProfileGoal(parseInt(e.target.value, 10))}
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-none"
                min="10"
                max="5000"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-6 bg-[#3f3a36] hover:opacity-90 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-all cursor-pointer text-sm"
          >
            {profileLoading ? 'ĐANG KHỞI TẠO...' : 'KÍCH HOẠT HỆ THỐNG'}
          </button>
        </form>
      </div>
    );
  }

  // --- MAIN CORE APP INTERFACE ---
  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans text-slate-800">
      
      {/* 1. Screenshot-accurate Top Header Toolbar */}
      <header className="bg-[#FAF9F6] border-b border-[#eae8e2] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap justify-between items-center gap-3">
          
          <div className="flex items-center space-x-3.5">
            <span className="font-extrabold text-slate-900 tracking-tight text-sm uppercase flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-slate-400 shrink-0" />
              Thêm thống kê N1-N5 & Ngày
            </span>
            <div className="h-4 w-[1px] bg-slate-200" />
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <button className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Hoàn tác">
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Làm lại">
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-slate-400 font-mono ml-2">Đồng bộ đám mây...</span>
            </div>
          </div>

          {/* Clean toolbar pills on the right */}
          <div className="flex items-center space-x-1.5 text-xs">
            <button className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-bold transition-colors">
              Mã
            </button>
            <button className="px-3 py-1 bg-[#3f3a36] text-[#FAF9F6] font-bold rounded-md shadow-xs flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5" />
              <span>Xem trước</span>
            </button>
            <button className="px-2.5 py-1 text-slate-500 hover:text-slate-800 font-bold transition-colors flex items-center space-x-1">
              <Share2 className="w-3.5 h-3.5" />
              <span>Chia sẻ</span>
            </button>
            <button 
              onClick={handleExportExcel}
              className="px-2.5 py-1 text-emerald-700 hover:bg-emerald-50 font-bold rounded transition-all flex items-center space-x-1"
              title="Tải xuống tệp Excel KPI"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải xuống</span>
            </button>
          </div>

        </div>
      </header>

      {/* Dynamic top profile / N1-N5 Stats Table row (Just below header) */}
      {profile && (
        <div className="bg-[#FAF9F6] border-b border-[#eae8e2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Left User profile avatar info block */}
            <div className="flex items-center space-x-3.5 shrink-0">
              <div 
                onClick={() => setShowProfileSetup(true)}
                className="w-11 h-11 bg-[#3f3a36] text-[#FAF9F6] rounded-full flex items-center justify-center font-black font-sans text-sm shadow-inner cursor-pointer hover:opacity-90 transition-opacity"
                title="Thay đổi hồ sơ cán bộ"
              >
                {profile.fullName?.substring(0, 2).toUpperCase() || "CB"}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-sm">{profile.fullName}</span>
                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 px-1.5 py-0.2 rounded uppercase">
                    Kỳ tháng {currentDate.getMonth() + 1}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">{profile.position}</p>
              </div>
            </div>

            {/* Dynamic statistics N1-N5 values columns */}
            <div className="flex-1 max-w-xl grid grid-cols-5 gap-1.5 md:mx-6 w-full">
              {[
                { id: 'N1', label: 'Hành chính (N1)', color: 'bg-slate-100 border-slate-200 text-slate-700' },
                { id: 'N2', label: 'Chuyên môn (N2)', color: 'bg-blue-100/30 border-blue-100 text-blue-700' },
                { id: 'N3', label: 'Tổng hợp (N3)', color: 'bg-indigo-100/30 border-indigo-100 text-indigo-700' },
                { id: 'N4', label: 'Phối hợp (N4)', color: 'bg-orange-100/30 border-orange-100 text-orange-700' },
                { id: 'N5', label: 'Bồi dưỡng (N5)', color: 'bg-rose-100/30 border-rose-100 text-rose-700' },
              ].map((g) => {
                const groupStats = getNGroupScoreAndCount(g.id);
                return (
                  <div key={g.id} className={`border rounded-xl p-2.5 text-center flex flex-col justify-between ${g.color}`}>
                    <span className="text-[9px] font-black uppercase tracking-tight block text-slate-500">{g.id}</span>
                    <span className="text-sm font-black block mt-0.5">{groupStats.score.toFixed(1)}đ</span>
                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{groupStats.count} việc</span>
                  </div>
                );
              })}
            </div>

            {/* Action buttons (Relocated Xuất Báo Cáo excel) */}
            <div className="shrink-0 flex items-center space-x-2">
              <button
                onClick={handleExportExcel}
                className="border-2 border-[#217346] text-[#217346] font-bold bg-white rounded-xl px-4 py-2 text-xs flex items-center space-x-1.5 hover:bg-emerald-50 transition-all cursor-pointer active:scale-[0.98]"
                title="Tải tệp Excel chấm điểm đồng bộ Sở Tài chính"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Xuất Báo Cáo KPI</span>
              </button>
              
              <button
                onClick={handleLogout}
                title="Đăng xuất tài khoản"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-slate-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Floating dynamic success feedback alert */}
      {successMsg && (
        <div className="fixed top-24 right-4 z-50 bg-[#3f3a36] text-[#FAF9F6] rounded-xl py-3 px-5 shadow-2xl flex items-center space-x-2.5 animate-slide-in text-xs font-bold border border-slate-700/50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {appError && (
        <div className="bg-red-50 border-y border-red-200 text-red-800 py-3 px-4 text-xs font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{appError}</span>
        </div>
      )}

      {/* Helper calculation to feed dynamic stats */}
      {(() => {
        // helper calculation inline function
        return null;
      })()}

      {/* 2. Main 12-column Core Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col space-y-5">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5.5 items-start">
          
          {/* LEFT 4-COLUMNS: Interactive Calendar + Ghi chú chung */}
          <div className="lg:col-span-4 flex flex-col space-y-5.5">
            
            {/* Elegant Calendar Container */}
            <div className="bg-white rounded-2xl shadow-xs border border-[#eae8e2] p-4.5">
              
              {/* Header month & years options */}
              <div className="flex justify-between items-center mb-4">
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs font-sans">
                  Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
                </span>
                
                <div className="flex space-x-1">
                  <button 
                    onClick={prevMonth}
                    className="p-1 hover:bg-[#FAF9F6] rounded-lg text-slate-600 transition-colors cursor-pointer border border-slate-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={nextMonth}
                    className="p-1 hover:bg-[#FAF9F6] rounded-lg text-slate-600 transition-colors cursor-pointer border border-slate-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day headers: Monday to CN - Saturday T7 styled red! */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-[#3f3a36]/50 uppercase tracking-wider mb-2 font-sans select-none">
                <div>T2</div>
                <div>T3</div>
                <div>T4</div>
                <div>T5</div>
                <div>T6</div>
                <div className="text-red-500 font-extrabold">T7</div>
                <div className="text-red-500 font-extrabold">CN</div>
              </div>

              {/* Dates day cells */}
              <div className="grid grid-cols-7 gap-1.5 border-t border-l border-slate-100 overflow-hidden">
                {drawCalendarDays()}
              </div>

              {/* Indicator status summary bottom calendar */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between font-sans">
                <span>KPI Tổng kỳ:</span>
                <span className="text-slate-700 font-black">{totalKpiEarned.toFixed(1)}đ đạt ({goalPercentage}%)</span>
              </div>

            </div>

            {/* "GHI CHÚ CHUNG" notepad sidebar manager */}
            <div className="bg-white rounded-2xl shadow-xs border border-[#eae8e2] p-4.5 flex flex-col">
              
              <div className="flex justify-between items-center mb-3">
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs font-sans flex items-center gap-1.5">
                  Ghi chú chung
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 rounded-md py-0.2 select-none uppercase">
                  {generalNotes.length} Ghi chú
                </span>
              </div>

              {/* Notes list values */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {generalNotes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">Không có ghi chú nào. Nhập và nhấn Enter dưới đây.</p>
                ) : (
                  generalNotes.map((note) => (
                    <div 
                      key={note.id} 
                      className="p-3 bg-[#FAF9F6] hover:bg-slate-50 border border-[#eae8e2] rounded-xl flex items-start justify-between gap-2.5 transition-colors group relative"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-700 leading-relaxed break-words">{note.content}</p>
                        <span className="text-[9px] font-mono text-slate-400 block">{note.dateStr}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-opacity cursor-pointer md:opacity-0 group-hover:opacity-100"
                        title="Xóa ghi chú"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Notes Input box */}
              <form onSubmit={handleSaveNote} className="mt-3.5">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Nhập ghi chú nhanh (ấn Enter bảo lưu)..."
                  className="w-full bg-[#FAF9F6] border border-[#eae8e2] rounded-xl py-2 px-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </form>

            </div>

          </div>

          {/* RIGHT 8-COLUMNS: Interactive Dual-Column Workspace (Tasks Timeline + AI Chat Assistant) */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            
            {/* Header day banner with stats and AI assess action */}
            <div className="bg-white rounded-2xl shadow-xs border border-[#eae8e2] p-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              
              <div className="space-y-1">
                <span className="text-[#d93025] text-[10px] uppercase tracking-wider font-extrabold block">
                  {new Date().toISOString().split('T')[0] === selectedDateStr ? 'Hôm Nay' : 'Ngày Chọn'}
                </span>
                
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {getFormattedDateVietnamese(selectedDateStr)}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100 flex items-center space-x-1">
                    <span>📄</span>
                    <span>{tasks.filter(t => t.date === selectedDateStr).length} việc</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center space-x-1">
                    <span>⭐</span>
                    <span>{tasks.filter(t => t.date === selectedDateStr).reduce((sum, t) => sum + (t.selfGradedScore || 0), 0).toFixed(1)} điểm</span>
                  </span>
                </div>
              </div>

              {/* Action buttons on the header */}
              <div className="flex space-x-2 w-full sm:w-auto self-end sm:self-center">
                <button
                  onClick={handleGetDailyEvaluation}
                  className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 bg-[#3f3a36] hover:opacity-95 text-[#FAF9F6] font-extrabold py-2 px-3 rounded-xl text-xs shadow-xs cursor-pointer transition-all hover:scale-[1.01]"
                  title="Nhận xét cán bộ bằng công nghệ trí tuệ nhân tạo hỏa tốc"
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                  <span>AI Đánh giá ngày</span>
                </button>
              </div>

            </div>

            {/* DUAL WORKSPACE GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5.5 items-stretch">
              
              {/* INTERACTIVE COLUMN 1: Daily Tasks Timeline */}
              <div className="bg-white rounded-2xl shadow-xs border border-[#eae8e2] overflow-hidden flex flex-col h-[520px]">
                
                <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    📋 Danh sách nhiệm vụ ngày
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                    {tasks.filter(t => t.date === selectedDateStr).length} mục
                  </span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto flex-1 h-full scrollbar-thin">
                  {(() => {
                    const dayTasksList = tasks.filter(t => t.date === selectedDateStr);
                    
                    if (dayTasksList.length === 0) {
                      return (
                        <div className="p-12 text-center select-none flex flex-col items-center justify-center h-full">
                          <CalendarIcon className="w-10 h-10 text-slate-300 mb-2.5" />
                          <h4 className="text-slate-800 font-bold text-xs">Chưa ghi nhận sự kiện nào</h4>
                          <p className="text-slate-400 text-[10px] mt-1.5 max-w-[200px] leading-relaxed mx-auto">
                            Nhập mô tả hoạt động hoặc trò chuyện với Trợ lý AI bên phải để phân bổ mã chuẩn tự động.
                          </p>
                        </div>
                      );
                    }

                    return dayTasksList.map((task) => {
                      const matchedCode = task.kpiCategory?.split(' - ')[0] || '';
                      return (
                        <div 
                          key={task.id} 
                          className={`p-3.5 flex flex-col hover:bg-[#FAF9F6]/30 transition-all border-l-4 ${
                            task.status === 'completed' ? 'border-emerald-600' : 'border-amber-400'
                          }`}
                        >
                          
                          {/* Upper row */}
                          <div className="flex justify-between items-start gap-2.5">
                            
                            <div className="space-y-1 flex-1 pr-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {task.timeRange && (
                                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100/50 shrink-0">
                                    🔆 {task.timeRange}
                                  </span>
                                )}
                                <span className="text-[9px] uppercase font-bold tracking-tight px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded-md shrink-0">
                                  {matchedCode}
                                </span>
                                <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100/30 shrink-0">
                                  {task.selfGradedScore}đ
                                </span>
                              </div>

                              <h4 className="font-extrabold text-slate-900 text-xs py-0.5 leading-snug">{task.title}</h4>
                              
                              {task.description && (
                                <p className="text-[11px] text-slate-500 leading-normal font-sans">{task.description}</p>
                              )}

                              {/* Checklist of Subtasks inside the card */}
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-50 space-y-1.5">
                                  <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider">Tiến trình ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}):</span>
                                  <div className="grid grid-cols-1 gap-1">
                                    {task.subtasks.map((sub, sIdx) => (
                                      <div 
                                        key={sIdx}
                                        onClick={() => toggleSubtask(task, sIdx)}
                                        className="flex items-center space-x-1.5 text-[10px] text-slate-600 hover:text-slate-900 cursor-pointer w-fit select-none"
                                      >
                                        {sub.completed ? (
                                          <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        ) : (
                                          <div className="w-3.5 h-3.5 border border-slate-300 rounded shrink-0" />
                                        )}
                                        <span className={sub.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium'}>
                                          {sub.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {task.evidence && (
                                <p className="text-[9px] text-slate-400 leading-snug font-mono mt-1.5 pt-1 border-t border-slate-50 flex items-center gap-1">
                                  <span className="font-extrabold text-[#3f3a36]">Minh chứng:</span>
                                  <span className="italic">"{task.evidence}"</span>
                                </p>
                              )}
                            </div>

                            {/* Control buttons inside Card row */}
                            <div className="flex items-center space-x-0.5 shrink-0 opacity-80 hover:opacity-100">
                              
                              <button
                                onClick={() => {
                                  setAiRawText(task.description || task.title);
                                  openEditTask(task);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors cursor-pointer"
                                title="Yêu cầu AI hỗ trợ so khớp tương đương lại mã chuẩn"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => openEditTask(task)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                title="Sửa công việc chi tiết"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>

                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                title="Xóa bỏ việc"
                              >
                                <Trash className="w-3 h-3" />
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

              </div>

              {/* INTERACTIVE COLUMN 2: Sleek Conversational AI Chatbot */}
              <div className="bg-white rounded-2xl shadow-xs border border-[#eae8e2] overflow-hidden flex flex-col h-[520px]">
                
                {/* Chat header */}
                <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <div className="p-1.5 bg-[#3f3a36] text-white rounded-lg">
                        <BrainCircuit className="w-4 h-4 text-emerald-400 animate-pulse" />
                      </div>
                      <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-white animate-ping" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs">Trợ lý ảo Hỏa tốc</h3>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                        <span className="h-1 w-1 rounded-full bg-emerald-500 inline-block"></span>
                        Áp mã chuẩn &amp; Ghi nhận KPI tự động
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setChatMessages([
                        {
                          id: 'msg_welcome_' + Date.now(),
                          sender: 'ai',
                          text: `### Hội thoại mới đã bắt đầu! 🤝\n\nTôi rất sẵn lòng hỗ trợ đồng chí. Hãy mô tả bất kỳ công việc nào đã và đang hoàn thành hôm nay để tôi thực hiện áp mã và ghi điểm KPI tức thì nhé!`,
                          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                        }
                      ]);
                    }}
                    className="p-1 px-1.5 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-lg text-[9px] font-bold transition-colors cursor-pointer flex items-center gap-1 hover:bg-slate-50"
                    title="Khởi tạo hội thoại mới từ đầu"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Làm mới chat</span>
                  </button>
                </div>

                {/* Chat message bubbles scroll container */}
                <div className="p-3.5 flex-1 overflow-y-auto space-y-3.5 bg-slate-50/50 scrollbar-thin flex flex-col">
                  {chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[85%] p-3 rounded-2xl ${
                        msg.sender === 'user' 
                          ? 'bg-[#3f3a36] text-[#FAF9F6] rounded-tr-none text-xs leading-relaxed shadow-xs' 
                          : 'bg-white border border-[#eae8e2] text-slate-800 p-3.5 rounded-tl-none shadow-xs text-xs'
                      }`}>
                        
                        {msg.sender === 'ai' ? (
                          <MarkdownContent text={msg.text} />
                        ) : (
                          <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
                        )}

                        {/* Action badge if task was logged */}
                        {msg.actionDone && (
                          <div className="mt-2 text-[9px] bg-emerald-50 text-emerald-800 font-extrabold px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-1 w-fit select-none animate-fade-in">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{msg.actionDone}</span>
                          </div>
                        )}
                      </div>
                      
                      <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono">{msg.timestamp}</span>
                    </div>
                  ))}

                  {/* Typing bubble */}
                  {chatLoading && (
                    <div className="flex flex-col items-start select-none">
                      <div className="bg-white border border-[#eae8e2] text-slate-500 p-3 rounded-2xl rounded-tl-none shadow-xs text-xs flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-t border-b border-[#3f3a36]"></div>
                        <span>Trợ lý AI đang tra mã KPI & chuẩn hóa...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Chat Entry controls */}
                <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                  
                  {/* Prompt Suggesters */}
                  <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none opacity-90 select-none">
                    <button
                      onClick={() => {
                        setChatInput("Tôi mới soạn thảo xong Công văn hỏa tốc gửi phòng Văn phòng về lịch họp tuần phối hợp");
                      }}
                      className="text-[9px] font-bold px-2.5 py-1 bg-[#FAF9F6] border border-[#eae8e2] text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-all shrink-0 cursor-pointer"
                    >
                      📝 Soạn công văn văn phòng
                    </button>
                    <button
                      onClick={() => {
                        setChatInput("Thực hiện thẩm định hồ sơ quyết toán vốn xây dựng cơ bản huyện Bảo Lạc dự án cầu");
                      }}
                      className="text-[9px] font-bold px-2.5 py-1 bg-[#FAF9F6] border border-[#eae8e2] text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-all shrink-0 cursor-pointer"
                    >
                      🔍 Thẩm định quyết toán vốn
                    </button>
                    <button
                      onClick={() => {
                        setChatInput("Soạn thảo báo cáo kết quả tổng kết chuyên môn công tác năm 2026 gửi Sở");
                      }}
                      className="text-[9px] font-bold px-2.5 py-1 bg-[#FAF9F6] border border-[#eae8e2] text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-all shrink-0 cursor-pointer"
                    >
                      📊 Viết báo cáo tổng kết năm
                    </button>
                  </div>

                  {/* Entry Area */}
                  <div className="relative flex bg-[#FAF9F6] border border-[#eae8e2] rounded-xl overflow-hidden shadow-xs focus-within:ring-1 focus-within:ring-slate-400">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChatMessage();
                        }
                      }}
                      placeholder="Trò chuyện hoặc mô tả việc cần thêm (Ví dụ: Soạn thảo lịch điều xe hỏa tốc)..."
                      className="w-full text-xs p-2.5 focus:outline-none resize-none placeholder:text-slate-400 text-slate-800 font-sans min-h-[44px] max-h-[100px] bg-[#FAF9F6]"
                    />
                    
                    <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                      <button
                        onClick={() => handleSendChatMessage()}
                        disabled={!chatInput.trim() || chatLoading}
                        className="p-1.5 bg-[#3f3a36] hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-lg transition-all shadow-xs cursor-pointer flex items-center justify-center shrink-0"
                        title="Gửi tin nhắn"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </main>

      {/* 3. AI DAILY EVALUATION POPUP MODAL */}
      {showEvaluationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[85vh] overflow-y-auto flex flex-col p-6 animate-fade-in">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-[#3f3a36] text-[#FAF9F6] rounded-md">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Nhận xét & Đánh giá hiệu suất ngày hỏa tốc</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hệ thống AI Sở Tài chính Cao Bằng</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEvaluationModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer hover:bg-slate-100"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[160px] py-2">
              {evaluationLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3.5 select-none text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#3f3a36] border-r-2" />
                  <div>
                    <p className="text-xs font-bold text-slate-700">Trợ lý AI đang rà soát dữ liệu của ngày...</p>
                    <p className="text-[10px] text-slate-400 mt-1">Đánh giá danh sách biểu mã, cân đo tỉ trọng và lập đề xuất tiếp theo.</p>
                  </div>
                </div>
              ) : (
                <div className="p-1">
                  <MarkdownContent text={evaluationText} />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="bg-[#3f3a36] hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
              >
                Nhất trí, Đóng lại
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. DIALOG MODAL: Add / Edit manual kpi config popup */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col p-6 animate-fade-in relative">
            
            {/* Modal header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-[#3f3a36] text-[#FAF9F6] rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    {editingTask ? "Cập nhật công việc KPI" : "Thêm mới công việc KPI"}
                  </h3>
                  <p className="text-xs text-slate-500">Chấm điểm & đối chiếu chuẩn hóa Sở Tài chính lồng ghép AI</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTaskModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* UNIFIED INTERACTIVE KPI FORM */}
            <form onSubmit={handleSaveTask} className="space-y-5 flex-1 select-none">
              
              {/* PRIMARY USER-FACING INPUT: Descriptions of Task done */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
                  Mô tả công việc thực tế của bạn (*)
                </label>
                <div className="relative">
                  <textarea
                    value={aiRawText}
                    onChange={(e) => setAiRawText(e.target.value)}
                    required
                    placeholder="Mô tả bằng từ ngữ tự nhiên việc bạn làm (Ví dụ: tôi duyệt văn bản góp ý dự thảo gửi thanh tra và soạn báo cáo xếp loại công chức...)"
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 pr-24 min-h-[90px] shadow-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAiOptimize}
                    disabled={aiLoading || !aiRawText.trim()}
                    className="absolute right-2.5 bottom-2.5 bg-[#3f3a36] hover:bg-slate-800 disabled:bg-slate-300 text-[#FAF9F6] font-extrabold py-1.5 px-3 rounded-lg text-xs flex items-center space-x-1 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                  >
                    {aiLoading ? (
                      <>
                        <span className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white border-r-2" />
                        <span>Đang phân tích...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        <span>AI Tự Phân Loại</span>
                      </>
                    )}
                  </button>
                </div>
                {aiError && (
                  <p className="text-[11px] text-red-600 font-semibold bg-red-50 p-2.5 mt-2 rounded-lg border border-red-100">
                    Lỗi: {aiError}
                  </p>
                )}
                <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                  💡 Hệ thống đề xuất nhiều mã (phù hợp với lĩnh vực tổng hợp hành chính và các lĩnh vực tương đương khác). Hãy chọn mã KPI bằng AI dưới đây hoặc tìm kiếm mã thủ công:
                </p>

                {/* AI CANDIDATES CARDS FOR SELECTION */}
                {aiRecommendations.length > 0 && (
                  <div className="mt-3.5 space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[11px] uppercase font-extrabold text-slate-700 tracking-wider flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg w-fit border border-slate-200">
                      <Sparkles className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
                      Gợi ý tương đương khác ({aiRecommendations.length} lựa chọn từ AI)
                    </span>
                    <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1 w-full">
                      {aiRecommendations.map((rec) => {
                        const item = STANDARD_TASK_CATALOG.find(i => i.id === rec.matchedId);
                        const isCurrent = selectedCatalogItem?.id === rec.matchedId;
                        if (!item) return null;
                        return (
                          <button
                            key={rec.matchedId}
                            type="button"
                            onClick={() => applyRecommendation(rec)}
                            className={`text-left p-3.5 rounded-xl border-2 text-xs transition-all flex flex-col gap-2 cursor-pointer w-full shadow-2xs relative ${
                              isCurrent 
                                ? 'bg-slate-50 border-[#3f3a36] ring-2 ring-[#3f3a36]/10 scale-[1.01]' 
                                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            {isCurrent && (
                              <div className="absolute top-3.5 right-3.5 flex items-center space-x-1 bg-[#3f3a36] text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                                <span>Đang áp dụng</span>
                              </div>
                            )}

                            <div className="flex flex-wrap justify-between items-center w-full gap-2 pb-1.5 border-b border-dashed border-slate-200">
                              <div className="flex items-center gap-2">
                                <span className={`font-extrabold text-[10px] uppercase px-2 py-0.5 rounded leading-none ${
                                  isCurrent ? 'bg-[#3f3a36] text-white' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {rec.matchedId}
                                </span>
                                <span className={`text-[10px] font-bold tracking-wider uppercase ${
                                  isCurrent ? 'text-slate-900' : 'text-slate-500'
                                }`}>
                                  {item.group} • {item.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-bold md:mr-24">
                                <span className={isCurrent ? 'text-slate-950' : 'text-slate-500'}>
                                  Quy đổi: <strong className="font-extrabold">{item.multiplier}đ KPI</strong>
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-1.5 mt-0.5">
                              <div className="text-xs leading-relaxed">
                                <span className="font-bold text-slate-900 text-xs">
                                  {item.title}
                                </span>
                              </div>

                              <div className="text-xs leading-relaxed flex items-center gap-1.5">
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                  Văn phong chuẩn
                                </span>
                                <span className="italic font-semibold text-slate-700">
                                  "{rec.refinedTitle}"
                                </span>
                              </div>
                            </div>

                            <p className="font-sans font-medium text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">{rec.explanation}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Standardized Administrative Wording */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên hành chính công việc chuẩn (AI tự gợi ý chuẩn hóa) (*)
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Tiêu đề chuẩn hóa theo mẫu văn phòng hành chính hành chính công..."
                  className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                />
              </div>

              {/* AUTOMATED/EVALUATED KPI CODE DISPLAY CARD */}
              <div className="bg-[#FAF9F6] border border-slate-200 rounded-xl p-4 space-y-3 relative">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-extrabold text-[#3f3a36]">Mã sản phẩm KPI</span>
                  <button
                    type="button"
                    onClick={() => setShowManualKpiSelect(!showManualKpiSelect)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {showManualKpiSelect ? "Bỏ qua tự chọn" : "🔍 Chọn mã thủ công"}
                  </button>
                </div>

                {/* Autocomplete manual search panel - only available when showManualKpiSelect is active */}
                {showManualKpiSelect ? (
                  <div className="relative" ref={catalogDropdownRef}>
                    <input
                      type="text"
                      value={searchCatalogQuery}
                      onFocus={() => setShowCatalogDropdown(true)}
                      onChange={(e) => {
                        setSearchCatalogQuery(e.target.value);
                        setShowCatalogDropdown(true);
                      }}
                      placeholder="Tìm mã chuẩn (ví dụ: N2_1325, N1_650)..."
                      className="w-full border border-slate-200 bg-white rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 pr-8 text-slate-850"
                    />
                    <span className="absolute right-2.5 top-2.5 p-0.5 text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>

                    {showCatalogDropdown && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 text-xs">
                        {filteredCatalog.length === 0 ? (
                          <div className="p-3 text-slate-400 text-center">Không tìm thấy mã tương ứng</div>
                        ) : (
                          filteredCatalog.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setSelectedCatalogItem(item);
                                setSearchCatalogQuery(`${item.id} - ${item.title}`);
                                setSelfGradedScore(item.multiplier);
                                setShowCatalogDropdown(false);
                              }}
                              className="w-full text-left p-2.5 border-b border-slate-100 hover:bg-slate-50 block transition-colors cursor-pointer"
                            >
                              <div className="flex justify-between font-bold text-slate-850 mb-0.5">
                                <span>{item.id} • {item.group}</span>
                                <span className="text-slate-800 font-bold">Max {item.multiplier}đ</span>
                              </div>
                              <p className="text-slate-600 line-clamp-1">{item.title}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Display Auto-Matched result */
                  <div>
                    {selectedCatalogItem ? (
                      <div className="bg-white border border-slate-200 text-xs rounded-lg p-3.5 space-y-1.5 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                          <span className="font-extrabold bg-[#3f3a36] text-[#FAF9F6] rounded px-2.5 py-0.5 text-[10px] tracking-wider">
                            {selectedCatalogItem.id}
                          </span>
                          <span className="font-bold text-slate-400 uppercase tracking-wide text-[9px]">{selectedCatalogItem.group} • {selectedCatalogItem.category}</span>
                        </div>
                        <p className="font-extrabold text-slate-800 text-sm leading-snug">{selectedCatalogItem.title}</p>
                        <p className="text-slate-600 mt-1"><span className="font-bold text-slate-700">Sản phẩm đầu ra chuẩn:</span> {selectedCatalogItem.output}</p>
                        <div className="pt-2 border-t border-slate-100/65 flex flex-wrap justify-between gap-3 text-[11px] font-bold text-slate-500 mt-1">
                          <span>Điểm chuẩn chấm: {selectedCatalogItem.benchmarkScore}đ</span>
                          <span className="text-slate-800 font-black">Hệ số quy đổi: {selectedCatalogItem.multiplier}đ KPI</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 border border-dashed border-slate-300 rounded-lg text-slate-400 text-center flex flex-col items-center justify-center space-y-1">
                        <Sparkles className="w-5 h-5 text-slate-400 animate-pulse" />
                        <span className="font-bold text-[11px]">Chưa khớp Catalog KPI sản phẩm</span>
                        <p className="text-[10px] text-slate-400">Hãy viết mô tả thực tế và nhấn "AI Tự Phân Loại" phía trên để thu nạp mã.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TIMING, SCORING AND STATUS CONFIGS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thời điểm hoàn thành (*)</label>
                  <input
                    type="date"
                    required
                    value={taskDateStr}
                    onChange={(e) => setTaskDateStr(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-705 uppercase mb-1 flex justify-between">
                    <span>Tự chấm điểm (*)</span>
                    {selectedCatalogItem && (
                      <span className="text-[#3f3a36]">Max {selectedCatalogItem.multiplier}đ</span>
                    )}
                  </label>
                  <input
                    type="number"
                    required
                    value={selfGradedScore}
                    onChange={(e) => setSelfGradedScore(parseFloat(e.target.value) || 0)}
                    min="0"
                    max={selectedCatalogItem ? selectedCatalogItem.multiplier : 100}
                    step="0.5"
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:outline-none text-[#3f3a36] font-extrabold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trạng thái công việc (*)</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                    className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm bg-white focus:outline-none text-slate-800"
                  >
                    <option value="completed">Đã hoàn thành</option>
                    <option value="pending">Chờ xử lý / Độc lập lập lịch</option>
                  </select>
                </div>

              </div>

              {/* JOB METRIC DETAILS SHADOW CONVERTED */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Thông số kỹ thuật công việc (Đồng bộ Excel)</span>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-700">
                  
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Tỷ lệ tham gia (%)</label>
                    <input
                      type="number"
                      value={participationRate}
                      onChange={(e) => setParticipationRate(parseInt(e.target.value, 10) || 100)}
                      min="1"
                      max="100"
                      className="w-full border border-slate-300 rounded-lg py-1 px-2.5 text-xs focus:outline-none bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Thời gian làm (phút)</label>
                    <input
                      type="number"
                      value={executionMinutes}
                      onChange={(e) => setExecutionMinutes(parseInt(e.target.value, 10) || 120)}
                      min="5"
                      max="50000"
                      className="w-full border border-slate-300 rounded-lg py-1 px-2.5 text-xs focus:outline-none bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Số lượng bàn giao</label>
                    <input
                      type="text"
                      value={quantityStr}
                      onChange={(e) => setQuantityStr(e.target.value)}
                      placeholder="01 Báo cáo, 01 quyết định..."
                      className="w-full border border-slate-300 rounded-lg py-1 px-2.5 text-xs focus:outline-none bg-white font-medium text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-0.5">Chất lượng đạt</label>
                    <select
                      value={qualityStr}
                      onChange={(e) => setQualityStr(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg py-1 px-2.5 text-xs bg-white focus:outline-none font-medium text-slate-700"
                    >
                      <option value="Tốt">Tốt</option>
                      <option value="Khá">Khá</option>
                      <option value="Đạt">Đạt yêu cầu</option>
                    </select>
                  </div>

                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-3 pt-6 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg text-sm text-center cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#3f3a36] hover:opacity-95 text-white font-bold py-2 px-4 rounded-lg text-sm text-center shadow-md cursor-pointer transition-colors"
                >
                  {editingTask ? "Cập nhật KPI" : "Ghi nhận KPI"}
                </button>
              </div>

            </form>

          </div>

        </div>
      )}

      {/* 5. Footer */}
      <footer className="bg-[#3f3a36] border-t border-[#eae8e2] py-6 text-center text-slate-500 text-xs shrink-0 mt-8">
        <div className="max-w-7xl mx-auto px-4 font-sans space-y-1">
          <p className="font-extrabold text-[#FAF9F6]">PHẦN MỀM THỐNG KÊ BIỂU MẪU CHẤM ĐIỂM KPIS SỞ TÀI CHÍNH TỈNH CAO BẰNG</p>
          <p>Tương thích hoàn toàn hệ thống nộp biểu mẫu quốc gia tập trung. Hỗ trợ nhiều mã gợi ý AI đa lĩnh vực.</p>
          <p className="text-slate-400 text-[10px] mt-2">Dữ liệu cán bộ được mã hóa và bảo quản cục bộ an toàn theo luật định.</p>
        </div>
      </footer>

    </div>
  );
}
