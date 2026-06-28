import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  QrCode,
  Scale,
  Activity,
  UserCheck,
  TrendingUp,
  Printer,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  AlertCircle,
  Database,
  Sparkles,
  Scan
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { generateMemberCardPDF, exportToExcel } from '../../utils/exportHelpers';

interface Plan {
  _id: string;
  name: string;
  price: number;
}

interface Member {
  _id: string;
  name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  height: number;
  weight: number;
  address: string;
  planId: Plan | null;
  membershipStart: string;
  membershipEnd: string;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  qrCode: string;
  status: 'active' | 'expired';
  isArchived: boolean;
  emergencyContact?: string;
  notes?: string;
}

interface ProgressLog {
  _id: string;
  weight: number;
  bmi: number;
  chest: number;
  waist: number;
  biceps: number;
  date: string;
}

interface PreviewRow {
  id: string;
  data: any;
  errors: string[];
  isDuplicate: boolean;
  isValid: boolean;
  confidence?: 'high' | 'review' | 'unable';
  confidenceFields?: Record<string, 'high' | 'review' | 'unable'>;
}

export const MemberManagement: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { showToast } = useNotification();
  const { user } = useAuth();
  const isSuspended = user?.status === 'suspended' || user?.subscription?.status === 'suspended' || user?.subscription?.status === 'expired';

  // Migration States
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationTab, setMigrationTab] = useState<'import' | 'history'>('import');
  
  // Excel Import States
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    successCount: number;
    updatedCount?: number;
    mergedCount?: number;
    duplicateCount: number;
    failedCount: number;
    errors: any[];
  } | null>(null);

  const [importStats, setImportStats] = useState<{
    imported: number;
    remaining: number;
    estimatedTime: string;
  }>({ imported: 0, remaining: 0, estimatedTime: 'Calculating...' });

  // Saved & Custom Mappings per Gym Owner
  const [savedMapping, setSavedMapping] = useState<Record<string, string>>({});
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [rawUploadRows, setRawUploadRows] = useState<any[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'merge'>('skip');

  // OCR Upload States
  const [ocrFiles, setOcrFiles] = useState<{ fileName: string; fileData: string }[]>([]);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProviderName, setOcrProviderName] = useState('MockOCRProvider');

  // Manual Migration States
  const [showManualMigrateModal, setShowManualMigrateModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'male',
    dob: '',
    height: '',
    weight: '',
    address: '',
    emergencyContact: '',
    planName: '',
    startDate: '',
    expiryDate: '',
    totalAmount: '',
    amountPaid: '',
    remainingDue: '',
    paymentStatus: 'unpaid',
    notes: ''
  });
  const [manualFormErrors, setManualFormErrors] = useState<any>({});
  const [savingManualMigration, setSavingManualMigration] = useState(false);

  // Import History Log State
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('');
  const [height, setHeight] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [address, setAddress] = useState('');
  const [planId, setPlanId] = useState('');
  const [membershipStart, setMembershipStart] = useState(new Date().toISOString().split('T')[0]);
  const [initialPayment, setInitialPayment] = useState<number | ''>('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [pendingWhatsAppUrl, setPendingWhatsAppUrl] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Edit Modal
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('male');
  const [editDob, setEditDob] = useState('');
  const [editHeight, setEditHeight] = useState<number | ''>('');
  const [editWeight, setEditWeight] = useState<number | ''>('');
  const [editAddress, setEditAddress] = useState('');
  const [editPlanId, setEditPlanId] = useState('');
  const [editMembershipStart, setEditMembershipStart] = useState('');
  const [editAmountPaid, setEditAmountPaid] = useState<number | ''>('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Detail Drawer / Progress Dashboard
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [logWeight, setLogWeight] = useState<number | ''>('');
  const [logChest, setLogChest] = useState<number | ''>('');
  const [logWaist, setLogWaist] = useState<number | ''>('');
  const [logBiceps, setLogBiceps] = useState<number | ''>('');
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    setLoading(true);
    setPlansLoading(true);
    setPlansLoaded(false);
    try {
      const [membersData, plansData] = await Promise.all([
        api.get('/members?includeArchived=true'),
        api.get('/plans')
      ]);
      setMembers(membersData);
      setPlans(plansData);
      setPlansLoaded(true);
      if (plansData.length > 0) {
        setPlanId(plansData[0]._id);
        setInitialPayment('');
      } else {
        setPlanId('');
        setInitialPayment('');
      }
    } catch (err: any) {
      showToast(err.message || 'Error retrieving member roster.', 'error');
    } finally {
      setLoading(false);
      setPlansLoading(false);
    }
  };

  // Migration History Log Fetch
  const fetchMigrationHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.get('/members/migration/history');
      setImportHistory(data);
    } catch (err) {
      console.error('Error fetching import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showMigrationModal && migrationTab === 'history') {
      fetchMigrationHistory();
    }
  }, [showMigrationModal, migrationTab]);

  useEffect(() => {
    if (showMigrationModal) {
      api.get('/members/migrate/mapping')
        .then(res => {
          setSavedMapping(res || {});
          setColumnMapping(res || {});
        })
        .catch(err => console.error('Failed to load saved mapping:', err));
    }
  }, [showMigrationModal]);

  // Excel Sample Template Downloader
  const downloadSampleTemplate = () => {
    const headers = [
      'Member Name',
      'Phone Number',
      'Email',
      'Gender',
      'Date of Birth',
      'Age (optional)',
      'Height (cm)',
      'Weight (kg)',
      'Address',
      'Emergency Contact',
      'Membership Plan',
      'Membership Start Date',
      'Membership Expiry Date',
      'Total Plan Amount',
      'Amount Paid',
      'Remaining Due',
      'Payment Status',
      'Medical Notes',
      'Active / Inactive'
    ];

    const sampleRow = [
      'Amit Kumar',
      '9876543210',
      'amit@example.com',
      'male',
      '1995-08-15',
      '30',
      '175',
      '72',
      'Jaipur, Rajasthan',
      '9876543211',
      'Premium Annual',
      '2026-01-01',
      '2027-01-01',
      '12000',
      '10000',
      '2000',
      'partial',
      'Knee injury history',
      'active'
    ];

    const instructions = [
      ['Column Name', 'Required?', 'Allowed Values / Constraints', 'Example'],
      ['Member Name', 'Yes', 'Full Name of the member', 'Amit Kumar'],
      ['Phone Number', 'Yes', '10-digit mobile number (Must be unique)', '9876543210'],
      ['Email', 'No', 'Valid email address format', 'amit@example.com'],
      ['Gender', 'Yes', 'male / female / other', 'male'],
      ['Date of Birth', 'Yes', 'YYYY-MM-DD format', '1995-08-15'],
      ['Age (optional)', 'No', 'Integer number', '30'],
      ['Height (cm)', 'Yes', 'Height in centimeters', '175'],
      ['Weight (kg)', 'Yes', 'Weight in kilograms', '72'],
      ['Address', 'No', 'Text string address', 'Jaipur, Rajasthan'],
      ['Emergency Contact', 'No', '10-digit mobile number', '9876543211'],
      ['Membership Plan', 'Yes', 'Plan name (Creates new plan if not exists)', 'Premium Annual'],
      ['Membership Start Date', 'Yes', 'YYYY-MM-DD format', '2026-01-01'],
      ['Membership Expiry Date', 'Yes', 'YYYY-MM-DD format', '2027-01-01'],
      ['Total Plan Amount', 'Yes', 'Number representing plan cost', '12000'],
      ['Amount Paid', 'Yes', 'Number representing amount paid so far', '10000'],
      ['Remaining Due', 'Yes', 'Total Plan Amount minus Amount Paid', '2000'],
      ['Payment Status', 'Yes', 'paid / partial / unpaid', 'partial'],
      ['Medical Notes', 'No', 'Any medical restrictions or notes', 'Knee injury history'],
      ['Active / Inactive', 'Yes', 'active / inactive', 'active']
    ];

    const wb = XLSX.utils.book_new();
    const wsTemplate = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);

    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    XLSX.writeFile(wb, 'gymledger_migration_template.xlsx');
  };

  // Drag and Drop File Upload Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(sheet);
        
        // Dynamic Excel header range extraction
        const headerRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        const headers = headerRows.length > 0
          ? headerRows[0].map(h => String(h || '').trim()).filter(h => h !== '')
          : [];

        setDetectedHeaders(headers);
        setRawUploadRows(json);
        autoDetectMapping(headers, json);
      } catch (err: any) {
        showToast(`Failed to parse Excel file: ${err.message}`, 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // AI-Assisted Mapping Synonyms Auto-Detection Heuristics (Exact & Substring Matches)
  const autoDetectMapping = (headers: string[], rawRows: any[]) => {
    const newMapping: Record<string, string> = { ...savedMapping };
    const synonyms: Record<string, string[]> = {
      name: ['Member Name', 'Customer Name', 'Client Name', 'Full Name', 'Member', 'Person', 'Name', 'FullName', 'name', 'customer', 'client'],
      phone: ['Phone Number', 'Phone', 'Mobile', 'Contact', 'Contact Number', 'Contact No', 'Mobile Number', 'Phone No', 'phone', 'mobile'],
      email: ['Email Address', 'Email', 'Mail ID', 'Mail', 'email', 'mail', 'Email ID'],
      gender: ['Gender', 'Sex', 'Gender Option', 'Sex Option', 'gender', 'sex'],
      dob: ['Date of Birth', 'DOB', 'Birth Date', 'Birthday', 'BirthDate', 'dob', 'birthdate'],
      height: ['Height (cm)', 'Height', 'Ht (cm)', 'Ht', 'height', 'ht'],
      weight: ['Weight (kg)', 'Weight', 'Wt (kg)', 'Wt', 'weight', 'wt'],
      address: ['Address', 'Location', 'Resident Area', 'Area', 'address', 'location'],
      emergencyContact: ['Emergency Contact', 'Emergency Phone', 'Emergency No', 'emergencyContact', 'emergency'],
      planName: ['Membership Plan', 'Membership', 'Plan', 'Subscription', 'Package', 'Plan Package', 'planName', 'plan', 'package'],
      startDate: ['Membership Start Date', 'Joining', 'Admission Date', 'Start Date', 'Joining Date', 'Admission', 'startDate', 'joining', 'admission'],
      expiryDate: ['Membership Expiry Date', 'Expiry', 'Renewal', 'Renewal Date', 'Expiry Date', 'expiryDate', 'expiry'],
      totalAmount: ['Total Plan Amount', 'Fees', 'Plan Amount', 'Amount', 'Fee', 'Total Amount', 'totalAmount', 'fees', 'amount', 'price'],
      amountPaid: ['Amount Paid', 'Paid', 'Collected', 'Received', 'amountPaid', 'paid'],
      remainingDue: ['Remaining Due', 'Balance', 'Outstanding', 'Remaining', 'Due', 'Pending', 'remainingDue', 'balance', 'due'],
      paymentStatus: ['Payment Status', 'paymentStatus', 'payStatus'],
      notes: ['Medical Notes', 'Notes', 'notes', 'medical'],
      status: ['Member Status', 'Status', 'Active / Inactive', 'status']
    };

    Object.keys(synonyms).forEach((fieldName) => {
      if (!newMapping[fieldName]) {
        // 1. Try exact match first
        let match = headers.find(h =>
          synonyms[fieldName].some(syn => h.toLowerCase().trim() === syn.toLowerCase().trim())
        );

        // 2. Fall back to partial match
        if (!match) {
          match = headers.find(h => {
            const hClean = h.toLowerCase().trim();
            return synonyms[fieldName].some(syn => {
              const synClean = syn.toLowerCase().trim();
              return hClean.includes(synClean) || synClean.includes(hClean);
            });
          });
        }

        if (match) {
          newMapping[fieldName] = match;
        }
      }
    });

    setColumnMapping(newMapping);
    recalculatePreviewRows(rawRows, newMapping);
  };

  const getDuplicateMappings = () => {
    const mapped = Object.entries(columnMapping).filter(([k, v]) => v !== '');
    const colToKeys: Record<string, string[]> = {};
    mapped.forEach(([k, v]) => {
      if (!colToKeys[v]) colToKeys[v] = [];
      colToKeys[v].push(k);
    });
    const dups = Object.entries(colToKeys).filter(([col, keys]) => keys.length > 1);
    return dups.map(([col, keys]) => `${col} (mapped to: ${keys.join(', ')})`);
  };

  // Recalculate Preview Rows & Validate using the active mapping config
  const recalculatePreviewRows = (rawRows: any[], mapping: Record<string, string>) => {
    const existingPhones = new Set(members.map(m => m.phone.trim()));
    const existingEmails = new Set(members.filter(m => m.email).map(m => m.email.trim().toLowerCase()));

    const processedPhones = new Set<string>();
    const processedEmails = new Set<string>();

    const getFieldVal = (row: any, fieldName: string, synonyms: string[]): any => {
      const mappedKey = mapping[fieldName];
      if (mappedKey !== undefined && mappedKey !== null && String(mappedKey).trim() !== '') {
        const val = row[mappedKey];
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
      }
      for (const syn of synonyms) {
        if (row[syn] !== undefined && row[syn] !== null && String(row[syn]).trim() !== '') {
          return row[syn];
        }
      }
      return undefined;
    };

    const tempPreview: PreviewRow[] = rawRows.map((row, idx) => {
      const nameVal = getFieldVal(row, 'name', ['Member Name', 'Customer Name', 'Client Name', 'Name', 'name']);
      const phoneVal = getFieldVal(row, 'phone', ['Phone Number', 'Phone', 'Mobile', 'Contact No', 'Contact Number', 'Mobile Number', 'phone']);
      const emailVal = getFieldVal(row, 'email', ['Email Address', 'Email', 'Mail ID', 'Mail', 'email']);
      const genderVal = getFieldVal(row, 'gender', ['Gender', 'gender']);
      const dobVal = getFieldVal(row, 'dob', ['Date of Birth', 'DOB', 'Birth Date', 'dob']);
      const heightVal = getFieldVal(row, 'height', ['Height (cm)', 'Height', 'height']);
      const weightVal = getFieldVal(row, 'weight', ['Weight (kg)', 'Weight', 'weight']);
      const addressVal = getFieldVal(row, 'address', ['Address', 'address']);
      const emergencyContactVal = getFieldVal(row, 'emergencyContact', ['Emergency Contact', 'Emergency Phone', 'emergencyContact']);
      const planNameVal = getFieldVal(row, 'planName', ['Membership Plan', 'Membership', 'Plan', 'Package', 'planName']);
      const startDateVal = getFieldVal(row, 'startDate', ['Membership Start Date', 'Joining Date', 'Admission Date', 'Start Date', 'startDate']);
      const expiryDateVal = getFieldVal(row, 'expiryDate', ['Membership Expiry Date', 'Expiry', 'Renewal Date', 'Expiry Date', 'expiryDate']);
      const totalAmountVal = getFieldVal(row, 'totalAmount', ['Total Plan Amount', 'Fees', 'Amount', 'totalAmount']);
      const amountPaidVal = getFieldVal(row, 'amountPaid', ['Amount Paid', 'Paid', 'amountPaid']);
      const remainingDueVal = getFieldVal(row, 'remainingDue', ['Remaining Due', 'Balance', 'Due', 'remainingDue']);
      const paymentStatusVal = getFieldVal(row, 'paymentStatus', ['Payment Status', 'paymentStatus']);
      const notesVal = getFieldVal(row, 'notes', ['Medical Notes', 'Notes', 'notes']);
      const statusVal = getFieldVal(row, 'status', ['Active / Inactive', 'Status', 'status']);

      const name = nameVal ? String(nameVal).trim() : '';
      const phone = phoneVal ? String(phoneVal).trim() : '';
      const email = emailVal ? String(emailVal).trim().toLowerCase() : '';
      const gender = genderVal ? String(genderVal).trim().toLowerCase() : '';
      const dob = dobVal;
      const height = heightVal ? Number(heightVal) : undefined;
      const weight = weightVal ? Number(weightVal) : undefined;
      const address = addressVal ? String(addressVal).trim() : '';
      const emergencyContact = emergencyContactVal ? String(emergencyContactVal).trim() : '';
      const planName = planNameVal ? String(planNameVal).trim() : '';
      const startDate = startDateVal;
      const expiryDate = expiryDateVal;
      const totalAmount = totalAmountVal ? Number(totalAmountVal) : 0;
      const amountPaid = amountPaidVal ? Number(amountPaidVal) : 0;
      const remainingDue = remainingDueVal ? Number(remainingDueVal) : 0;
      const paymentStatus = paymentStatusVal ? String(paymentStatusVal).trim().toLowerCase() : 'unpaid';
      const notes = notesVal ? String(notesVal).trim() : '';
      const statusStr = statusVal ? String(statusVal).trim().toLowerCase() : 'active';

      const rowErrors: string[] = [];
      let isDuplicate = false;

      // 1. Mandatory validations
      if (!name) rowErrors.push('Name is required');
      if (!phone) {
        rowErrors.push('Phone is required');
      } else {
        if (existingPhones.has(phone) || processedPhones.has(phone)) {
          isDuplicate = true;
          rowErrors.push(`Duplicate phone number: ${phone}`);
        }
        processedPhones.add(phone);
      }

      if (email) {
        if (existingEmails.has(email) || processedEmails.has(email)) {
          isDuplicate = true;
          rowErrors.push(`Duplicate email: ${email}`);
        }
        processedEmails.add(email);
      }

      // 2. Format validations
      if (gender && gender !== 'male' && gender !== 'female' && gender !== 'other') {
        rowErrors.push('Gender must be male, female, or other');
      }
      if (dob && isNaN(Date.parse(String(dob)))) {
        rowErrors.push('Invalid Date of Birth');
      }
      if (startDate && isNaN(Date.parse(String(startDate)))) {
        rowErrors.push('Invalid Start Date');
      }
      if (expiryDate && isNaN(Date.parse(String(expiryDate)))) {
        rowErrors.push('Invalid Expiry Date');
      }
      if (height !== undefined && (isNaN(height) || height <= 0)) {
        rowErrors.push('Height must be a positive number');
      }
      if (weight !== undefined && (isNaN(weight) || weight <= 0)) {
        rowErrors.push('Weight must be a positive number');
      }


      const parsedData = {
        name, phone, email, gender, dob, height, weight, address,
        emergencyContact, planName, startDate, expiryDate, totalAmount,
        amountPaid, remainingDue, paymentStatus, notes, status: statusStr
      };

      return {
        id: `row-${idx}-${Math.random()}`,
        data: parsedData,
        errors: rowErrors,
        isDuplicate,
        isValid: rowErrors.length === 0,
        confidence: row.confidence || 'high',
        confidenceFields: row.confidenceFields || {}
      };
    });

    setPreviewRows(tempPreview);
  };

  // Reactive Effect to recalculate rows on wizard mapping configuration change
  useEffect(() => {
    if (rawUploadRows.length > 0) {
      recalculatePreviewRows(rawUploadRows, columnMapping);
    }
  }, [columnMapping]);

  // Inline Cell Editing handler in Smart Preview Table
  const handleCellEdit = (rowId: string, fieldName: string, value: any) => {
    setPreviewRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const updatedData = { ...row.data, [fieldName]: value };

      const rowErrors: string[] = [];
      const name = updatedData.name || '';
      const phone = String(updatedData.phone || '').trim();
      const email = String(updatedData.email || '').trim().toLowerCase();
      const gender = String(updatedData.gender || '').trim().toLowerCase();
      const dob = updatedData.dob || '';
      const height = updatedData.height !== undefined && updatedData.height !== '' ? Number(updatedData.height) : undefined;
      const weight = updatedData.weight !== undefined && updatedData.weight !== '' ? Number(updatedData.weight) : undefined;
      const planName = String(updatedData.planName || '').trim();
      const startDate = updatedData.startDate || '';
      const expiryDate = updatedData.expiryDate || '';

      if (!name) rowErrors.push('Name is required');
      if (!phone) rowErrors.push('Phone is required');
      if (gender && gender !== 'male' && gender !== 'female' && gender !== 'other') {
        rowErrors.push('Gender must be male, female, or other');
      }
      if (dob && isNaN(Date.parse(String(dob)))) {
        rowErrors.push('Invalid Date of Birth');
      }
      if (startDate && isNaN(Date.parse(String(startDate)))) {
        rowErrors.push('Invalid Start Date');
      }
      if (expiryDate && isNaN(Date.parse(String(expiryDate)))) {
        rowErrors.push('Invalid Expiry Date');
      }
      if (height !== undefined && (isNaN(height) || height <= 0)) {
        rowErrors.push('Height must be a positive number');
      }
      if (weight !== undefined && (isNaN(weight) || weight <= 0)) {
        rowErrors.push('Weight must be a positive number');
      }


      // Remove error highlights on updated cells
      const updatedConfidenceFields = { ...row.confidenceFields };
      if (updatedConfidenceFields[fieldName]) {
        delete updatedConfidenceFields[fieldName];
      }

      return {
        ...row,
        data: updatedData,
        errors: rowErrors,
        isValid: rowErrors.length === 0,
        confidenceFields: updatedConfidenceFields
      };
    }));
  };

  // Helper converter for base64 file scanning
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  // Photo / Scanned Register/PDF OCR Processing Upload handler
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setOcrProcessing(true);
    setUploadFileName(`${files.length} page(s) / files`);
    setImportSummary(null);

    const fileList: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const base64 = await toBase64(f);
        fileList.push({
          fileName: f.name,
          fileData: base64
        });
      } catch (err) {
        console.error('Failed to convert file to base64:', err);
      }
    }

    try {
      const res = await api.post('/members/migrate/ocr', { files: fileList });
      if (res.success && res.rows) {
        setOcrProviderName(res.providerName || 'MockOCRProvider');
        const existingPhones = new Set(members.map(m => m.phone.trim()));
        const existingEmails = new Set(members.filter(m => m.email).map(m => m.email.trim().toLowerCase()));

        const tempPreview = res.rows.map((row: any, idx: number) => {
          const rowErrors: string[] = [];
          if (!row.name) rowErrors.push('Name is required');
          if (!row.phone) {
            rowErrors.push('Phone is required');
          } else if (existingPhones.has(row.phone.trim()) && duplicateStrategy === 'skip') {
            rowErrors.push(`Duplicate phone number: ${row.phone}`);
          }
          if (row.email && existingEmails.has(row.email.trim().toLowerCase()) && duplicateStrategy === 'skip') {
            rowErrors.push(`Duplicate email: ${row.email}`);
          }
          if (!row.gender) rowErrors.push('Gender is required');
          if (!row.dob) rowErrors.push('Date of Birth is required');
          if (row.height === undefined) rowErrors.push('Height is required');
          if (row.weight === undefined) rowErrors.push('Weight is required');
          if (!row.planName) rowErrors.push('Membership Plan is required');
          if (!row.startDate) rowErrors.push('Start Date is required');
          if (!row.expiryDate) rowErrors.push('Expiry Date is required');

          return {
            id: `ocr-${idx}-${Math.random()}`,
            data: row,
            errors: rowErrors,
            isValid: rowErrors.length === 0,
            confidence: row.confidence || 'high',
            confidenceFields: row.confidenceFields || {}
          };
        });

        setPreviewRows(tempPreview);
        showToast('Register documents processed with pluggable OCR provider successfully.', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'OCR document scanning failed.', 'error');
    } finally {
      setOcrProcessing(false);
    }
  };

  // Trigger batch sequential imports (Sequenced Chunks of size 100)
  const triggerBatchImport = async () => {
    const hasErrors = previewRows.some(r => !r.isValid);
    if (hasErrors) {
      showToast('Please correct all validation errors in the preview table before importing.', 'error');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportSummary(null);
    setImportStats({ imported: 0, remaining: previewRows.length, estimatedTime: 'Calculating...' });

    const batchSize = 100;
    let successCount = 0;
    let duplicateCount = 0;
    let updatedCount = 0;
    let mergedCount = 0;
    let failedCount = 0;
    const allErrors: any[] = [];
    const startTime = Date.now();

    // Save column mapping for Gym Owner
    try {
      await api.post('/members/migrate/mapping', { mapping: columnMapping });
    } catch (err) {
      console.error('Failed to save mapping config:', err);
    }

    for (let i = 0; i < previewRows.length; i += batchSize) {
      const batch = previewRows.slice(i, i + batchSize).map(r => r.data);
      try {
        const res = await api.post('/members/migrate/excel', {
          fileName: uploadFileName || 'universal_import.xlsx',
          members: batch,
          columnMapping,
          duplicateStrategy
        });
        
        successCount += res.successCount || 0;
        updatedCount += res.updatedCount || 0;
        mergedCount += res.mergedCount || 0;
        duplicateCount += res.duplicateCount || 0;
        failedCount += res.failedCount || 0;
        if (res.importHistory && res.importHistory.rowErrors) {
          allErrors.push(...res.importHistory.rowErrors);
        }
      } catch (err: any) {
        console.error('Batch import failed:', err);
        failedCount += batch.length;
        allErrors.push({ row: i + 1, error: err.message || 'Batch request failed' });
      }

      const processedCount = Math.min(previewRows.length, i + batchSize);
      const remaining = previewRows.length - processedCount;
      const elapsedMs = Date.now() - startTime;
      const avgMsPerRecord = elapsedMs / processedCount;
      const estRemainingMs = remaining * avgMsPerRecord;
      const estRemainingSec = Math.ceil(estRemainingMs / 1000);
      
      let estimatedTimeStr = 'Calculating...';
      if (processedCount > 0) {
        estimatedTimeStr = estRemainingSec > 60
          ? `${Math.floor(estRemainingSec / 60)}m ${estRemainingSec % 60}s remaining`
          : `${estRemainingSec}s remaining`;
      }

      setImportProgress(Math.min(100, Math.round((processedCount / previewRows.length) * 100)));
      setImportStats({
        imported: successCount + updatedCount + mergedCount,
        remaining,
        estimatedTime: remaining === 0 ? 'Completed' : estimatedTimeStr
      });
    }

    setImporting(false);
    setImportSummary({
      successCount,
      updatedCount,
      mergedCount,
      duplicateCount,
      failedCount,
      errors: allErrors
    });

    setPreviewRows([]);
    setUploadFileName('');
    showToast(`Universal import completed successfully.`, 'success');
    loadMembersData();
  };

  // Download error log as CSV
  const downloadErrorReport = (errors: any[]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Row Number,Name,Error Description"].join(",") + "\n"
      + errors.map(e => `${e.row || ''},"${e.name || ''}","${e.error || ''}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gymledger_import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit manual migration form
  const handleManualMigrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormErrors({});
    
    const errors: any = {};
    if (!manualForm.name) errors.name = 'Full Name is required.';
    if (!manualForm.phone) {
      errors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(manualForm.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits.';
    }
    if (!manualForm.gender) errors.gender = 'Gender is required.';
    if (!manualForm.dob) errors.dob = 'Date of Birth is required.';
    if (!manualForm.height || isNaN(Number(manualForm.height)) || Number(manualForm.height) <= 0) {
      errors.height = 'Valid height (cm) is required.';
    }
    if (!manualForm.weight || isNaN(Number(manualForm.weight)) || Number(manualForm.weight) <= 0) {
      errors.weight = 'Valid weight (kg) is required.';
    }
    if (!manualForm.planName) errors.planName = 'Membership Plan Name is required.';
    if (!manualForm.startDate) errors.startDate = 'Start Date is required.';
    if (!manualForm.expiryDate) errors.expiryDate = 'Expiry Date is required.';
    if (!manualForm.totalAmount || isNaN(Number(manualForm.totalAmount))) {
      errors.totalAmount = 'Plan amount is required.';
    }
    
    if (Object.keys(errors).length > 0) {
      setManualFormErrors(errors);
      showToast('Please fix all validation errors.', 'error');
      return;
    }

    setSavingManualMigration(true);
    try {
      const payload = {
        ...manualForm,
        height: Number(manualForm.height),
        weight: Number(manualForm.weight),
        totalAmount: Number(manualForm.totalAmount),
        amountPaid: Number(manualForm.amountPaid || 0),
        remainingDue: Number(manualForm.remainingDue || 0)
      };

      await api.post('/members/migrate/manual', payload);
      showToast(`Member ${manualForm.name} migrated successfully!`, 'success');
      
      setManualForm({
        name: '',
        phone: '',
        email: '',
        gender: 'male',
        dob: '',
        height: '',
        weight: '',
        address: '',
        emergencyContact: '',
        planName: '',
        startDate: '',
        expiryDate: '',
        totalAmount: '',
        amountPaid: '',
        remainingDue: '',
        paymentStatus: 'unpaid',
        notes: ''
      });
      setShowManualMigrateModal(false);
      setShowMigrationModal(false);
      loadMembersData();
    } catch (err: any) {
      showToast(err.message || 'Manual migration failed.', 'error');
    } finally {
      setSavingManualMigration(false);
    }
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (plansLoading) {
      showToast('Membership plans are still loading...', 'error');
      return;
    }
    if (!plansLoaded) {
      showToast('Membership plans have not loaded yet.', 'error');
      return;
    }
    if (plans.length === 0) {
      showToast('No Membership Plans Available. Please create a plan first.', 'error');
      return;
    }

    const errors: Record<string, string> = {};
    setFormErrors({});

    if (!name) {
      errors.name = 'Full Name is required.';
    }

    const phoneRegex = /^\d{10}$/;
    if (!phone) {
      errors.phone = 'Phone number is required.';
    } else if (!phoneRegex.test(phone)) {
      errors.phone = 'Phone number must contain exactly 10 digits.';
    }

    if (emergencyContact && !phoneRegex.test(emergencyContact)) {
      errors.emergencyContact = 'Phone number must contain exactly 10 digits.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = 'Email is required.';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email.';
    }

    if (!planId) {
      errors.planId = 'Please select a membership plan.';
    }

    if (!dob) {
      errors.dob = 'Date of Birth is required.';
    } else {
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
        errors.dob = 'Date of Birth cannot be in the future.';
      } else {
        const age = new Date().getFullYear() - dobDate.getFullYear();
        if (age < 10 || age > 100) {
          errors.dob = 'Age must be between 10 and 100.';
        }
      }
    }

    if (!height) {
      errors.height = 'Height is required.';
    } else if (Number(height) <= 0) {
      errors.height = 'Height must be a positive number.';
    }

    if (!weight) {
      errors.weight = 'Weight is required.';
    } else if (Number(weight) <= 0) {
      errors.weight = 'Weight must be greater than 0.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Validation Failed', 'error');
      return;
    }

    setAdding(true);
    try {
      const res = await api.post('/members', {
        name,
        phone,
        email,
        gender,
        dob,
        height,
        weight,
        address,
        planId,
        membershipStart,
        amountPaid: initialPayment,
        emergencyContact,
        notes
      });
      showToast('Member registered successfully!', 'success');
      setShowAddModal(false);
      resetAddForm();
      loadMembersData();

      if (res && res.whatsappUrl) {
        setPendingWhatsAppUrl(res.whatsappUrl);
        setWhatsAppModalOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to register member.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (plansLoading) {
      showToast('Membership plans are still loading...', 'error');
      return;
    }
    if (!plansLoaded) {
      showToast('Membership plans have not loaded.', 'error');
      return;
    }
    if (plans.length === 0) {
      showToast('No membership plans available.', 'error');
      return;
    }
    if (!editName || !editPhone || !editEmail || !editPlanId) {
      showToast('Name, Phone, Email and Membership plan are required.', 'error');
      return;
    }

    // Strict validations
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(editPhone)) {
      showToast('Phone number must be exactly 10 digits.', 'error');
      return;
    }
    if (!phoneRegex.test(editEmergency)) {
      showToast('Emergency contact number must be exactly 10 digits.', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    const dobDate = new Date(editDob);
    if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
      showToast('Date of Birth cannot be in the future.', 'error');
      return;
    }
    if (Number(editHeight) <= 0) {
      showToast('Height must be a positive number.', 'error');
      return;
    }
    if (Number(editWeight) <= 0) {
      showToast('Weight must be a positive number.', 'error');
      return;
    }

    setUpdating(true);
    try {
      const res = await api.put(`/members/${selectedMember._id}`, {
        name: editName,
        phone: editPhone,
        email: editEmail,
        gender: editGender,
        dob: editDob,
        height: editHeight,
        weight: editWeight,
        address: editAddress,
        planId: editPlanId,
        membershipStart: editMembershipStart,
        amountPaid: editAmountPaid,
        emergencyContact: editEmergency,
        notes: editNotes
      });
      showToast('Member profile updated.', 'success');
      setShowEditModal(false);
      loadMembersData();

      if (res && res.whatsappUrl) {
        showToast('WhatsApp link generated successfully!', 'info');
        window.open(res.whatsappUrl, '_blank');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update member profile.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this member? Their payment and attendance history will be preserved.')) return;
    try {
      await api.delete(`/members/${id}`);
      showToast('Member profile archived successfully.', 'success');
      loadMembersData();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive member.', 'error');
    }
  };

  const handleRestoreMember = async (id: string) => {
    if (!window.confirm('Restore this member profile?')) return;
    try {
      await api.put(`/members/${id}/restore`, {});
      showToast('Member profile restored successfully.', 'success');
      loadMembersData();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore member.', 'error');
    }
  };

  const loadProgressLogs = async (memberId: string) => {
    try {
      const logs = await api.get(`/members/${memberId}/progress`);
      setProgressLogs(logs);
    } catch (err: any) {
      showToast('Error loading progress history.', 'error');
    }
  };

  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailMember) return;
    setSavingProgress(true);
    try {
      await api.post(`/members/${detailMember._id}/progress`, {
        weight: logWeight,
        chest: logChest,
        waist: logWaist,
        biceps: logBiceps
      });
      showToast('Weight progress parameter logged.', 'success');
      loadProgressLogs(detailMember._id);
      loadMembersData(); // Reload weights in lists
    } catch (err: any) {
      showToast('Failed to log weight progress.', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  const openAddModal = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  const resetAddForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setGender('male');
    setDob('');
    setHeight('');
    setWeight('');
    setAddress('');
    setEmergencyContact('');
    setNotes('');
    if (plans.length > 0) {
      setPlanId(plans[0]._id);
      setInitialPayment('');
    }
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditEmail(member.email);
    setEditGender(member.gender);
    setEditDob(member.dob ? member.dob.split('T')[0] : '');
    setEditHeight(member.height);
    setEditWeight(member.weight);
    setEditAddress(member.address);
    setEditPlanId(member.planId?._id || '');
    setEditMembershipStart(member.membershipStart ? member.membershipStart.split('T')[0] : '');
    setEditAmountPaid(member.amountPaid);
    setEditEmergency(member.emergencyContact || '');
    setEditNotes(member.notes || '');
    setShowEditModal(true);
  };

  const openDetailDrawer = (member: Member) => {
    navigate(`/app/members/${member._id}`);
  };

  const calculateBMI = (hCm: number, wKg: number) => {
    const hM = hCm / 100;
    return parseFloat((wKg / (hM * hM)).toFixed(1));
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-sky-400' };
    if (bmi < 25) return { label: 'Normal', color: 'text-emerald-400' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-amber-400' };
    return { label: 'Obese', color: 'text-rose-400' };
  };

  const handlePrintCard = () => {
    if (detailMember) {
      const gymName = user?.branding?.gymName || user?.gymName || 'GymLedger';
      generateMemberCardPDF(detailMember, gymName);
    }
  };

  const handleExportExcel = () => {
    const formatted = filteredMembers.map((m) => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isExpired = new Date(m.membershipEnd) < todayStart;
      return {
        'Full Name': m.name,
        'Phone Number': m.phone,
        'Email Address': m.email || 'N/A',
        'Gender': m.gender.toUpperCase(),
        'Height (cm)': m.height,
        'Weight (kg)': m.weight,
        'Plan Name': m.planId?.name || 'Deleted Plan',
        'Start Date': new Date(m.membershipStart).toLocaleDateString('en-IN'),
        'Expiry Date': new Date(m.membershipEnd).toLocaleDateString('en-IN'),
        'Outstanding Dues (INR)': m.remainingAmount,
        'Membership Status': !isExpired ? 'Active' : 'Expired',
        'Access QR Code': m.qrCode
      };
    });
    exportToExcel(formatted, 'members_roster_report', 'Members');
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isExpired = new Date(m.membershipEnd) < todayStart;

    if (filterStatus === 'archived') {
      return matchesSearch && m.isArchived;
    }
    if (m.isArchived) return false;

    if (filterStatus === 'active') return matchesSearch && !isExpired;
    if (filterStatus === 'expired') return matchesSearch && isExpired;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members Directory</h1>
          <p className="text-xs text-muted-foreground">Manage active memberships, weight diagnostics, and QR passes.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-sm shadow-sm flex-1 sm:flex-none"
          >
            Export Excel
          </button>
          {!isSuspended && (
            <>
              <button
                onClick={() => {
                  setShowMigrationModal(true);
                  setMigrationTab('import');
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white text-sm shadow-md flex-1 sm:flex-none cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" /> Import Existing Members
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md flex-1 sm:flex-none cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Register Member
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border">
        <div className="relative flex-grow max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or contact number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
        >
          <option value="all">All Members</option>
          <option value="active">Active Members</option>
          <option value="expired">Expired Members</option>
          <option value="archived">Archived Members</option>
        </select>
      </div>

      {/* List content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground font-semibold">No members registered matching filters.</p>
        </div>
      ) : (
        <>
          {/* Card Layout for Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredMembers.map((member) => {
              const today = new Date();
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isExpired = new Date(member.membershipEnd) < todayStart;
              return (
                <div key={member._id} className="p-4 rounded-xl bg-card border space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{member.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        !isExpired
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                          : 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                      }`}
                    >
                      {!isExpired ? 'Active' : 'Expired'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Phone: <span className="text-foreground">{member.phone}</span></div>
                    <div>Plan: <span className="text-foreground">{member.planId?.name || 'Deleted Plan'}</span></div>
                    <div>Remaining: <span className="text-rose-400 font-bold">₹{member.remainingAmount}</span></div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => openDetailDrawer(member)}
                      className="flex-1 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" /> Open Profile
                    </button>
                    {member.isArchived ? (
                      <button
                        onClick={() => handleRestoreMember(member._id)}
                        className="px-4 py-2 bg-emerald-950/40 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-950/60 rounded-lg text-xs font-semibold transition-colors flex-1"
                      >
                        Restore
                      </button>
                    ) : (
                      <>
                        {!isSuspended && (
                          <>
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-2 border hover:bg-muted text-foreground rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member._id)}
                              className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Member Name</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Contact Info</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Active Plan</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Dues / Expiry</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredMembers.map((member) => {
                  const today = new Date();
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isExpired = new Date(member.membershipEnd) < todayStart;
                  return (
                    <tr key={member._id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.gender} | Weight: {member.weight}kg</div>
                      </td>
                      <td className="p-4">
                        <div>{member.phone}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </td>
                      <td className="p-4 font-semibold text-primary">{member.planId?.name || 'Deleted Plan'}</td>
                      <td className="p-4">
                        <div className="font-bold text-rose-400">₹{member.remainingAmount} Balance</div>
                        <div className="text-xs text-muted-foreground">Expires {new Date(member.membershipEnd).toLocaleDateString('en-IN')}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            !isExpired
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                              : 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                          }`}
                        >
                          {!isExpired ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailDrawer(member)}
                          className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Activity className="w-3.5 h-3.5" /> Profile
                        </button>
                        {member.isArchived ? (
                          <button
                            onClick={() => handleRestoreMember(member._id)}
                            className="px-2.5 py-1.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-950/60 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            Restore
                          </button>
                        ) : (
                          <>
                            {!isSuspended && (
                              <>
                                <button
                                  onClick={() => openEditModal(member)}
                                  className="p-1.5 border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(member._id)}
                                  className="p-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Register New Member</h2>

            <form onSubmit={handleRegisterMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rohan Khanna"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {formErrors.name && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 91111 91111"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {formErrors.phone && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@gmail.com"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {formErrors.email && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {formErrors.dob && <p className="text-[10px] text-rose-500 mt-1 font-medium">{formErrors.dob}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {formErrors.height && <p className="text-[10px] text-rose-500 mt-1 font-medium">{formErrors.height}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {formErrors.weight && <p className="text-[10px] text-rose-500 mt-1 font-medium">{formErrors.weight}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Address Location</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street and Area details..."
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Membership Plan</label>
                  {plansLoading ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">Loading Plans...</option>
                    </select>
                  ) : !plansLoaded ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">Plans Not Loaded</option>
                    </select>
                  ) : plans.length === 0 ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">No Plans Available</option>
                    </select>
                  ) : (
                    <select
                      value={planId}
                      onChange={(e) => {
                        setPlanId(e.target.value);
                        const planObj = plans.find((p) => p._id === e.target.value);
                        if (planObj) setInitialPayment(planObj.price);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none z-10"
                    >
                      <option value="" className="bg-card text-foreground">Select a plan</option>
                      {plans.map((p) => (
                        <option key={p._id} value={p._id} className="bg-card text-foreground">
                          {p.name} (₹{p.price})
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.planId && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.planId}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={membershipStart}
                    onChange={(e) => setMembershipStart(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Deposit Collected (₹)</label>
                  <input
                    type="number"
                    required
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Guardian Phone..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {formErrors.emergencyContact && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.emergencyContact}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Staff Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Medical conditions, goals..."
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {adding ? 'Registering...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit Member Profile</h2>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={editHeight}
                    onChange={(e) => setEditHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={editWeight}
                    onChange={(e) => setEditWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Active Plan</label>
                  {plansLoading ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">Loading Plans...</option>
                    </select>
                  ) : !plansLoaded ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">Plans Not Loaded</option>
                    </select>
                  ) : plans.length === 0 ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">No Plans Available</option>
                    </select>
                  ) : (
                    <select
                      value={editPlanId}
                      onChange={(e) => setEditPlanId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none z-10"
                    >
                      {plans.map((p) => (
                        <option key={p._id} value={p._id} className="bg-card text-foreground">
                          {p.name} (₹{p.price})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editMembershipStart}
                    onChange={(e) => setEditMembershipStart(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Dues Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    required
                    value={editEmergency}
                    onChange={(e) => setEditEmergency(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Staff Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Detail Drawer */}
      {showDrawer && detailMember && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card border-l shadow-2xl flex flex-col justify-between transform transition-all duration-300 animate-slide-over">
          {/* Drawer Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-extrabold text-base text-foreground">Member Wellness &amp; Pass</h2>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Digital Pass */}
            <div className="p-6 rounded-2xl bg-background border space-y-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div id="pass-card-area" className="w-full max-w-xs p-5 bg-card border rounded-2xl flex flex-col items-center text-center space-y-3 relative shadow">
                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Gym Entry Pass
                </span>
                
                {/* QR server generated QR code */}
                <div className="w-32 h-32 bg-white p-2 rounded-xl flex items-center justify-center border shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${detailMember.qrCode}`}
                    alt="Member QR Pass"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div>
                  <div className="font-extrabold text-sm">{detailMember.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{detailMember.qrCode}</div>
                </div>

                <div className="w-full border-t border-dashed pt-2.5 text-[10px] text-muted-foreground">
                  Gym Studio: <span className="font-bold text-foreground">{user?.branding?.gymName || user?.gymName || 'GymLedger'}</span>
                </div>
              </div>

              <button
                onClick={handlePrintCard}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              >
                <Printer className="w-3.5 h-3.5" /> Print QR Pass
              </button>
            </div>

            {/* 2. BMI diagnostics */}
            <div className="p-5 rounded-2xl bg-background border space-y-3">
              <h3 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1">
                <Scale className="w-4 h-4 text-primary" /> BMI Wellness Diagnostics
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-card border rounded-xl">
                  <span className="text-muted-foreground block">BMI Score</span>
                  <span className="text-xl font-bold text-foreground">
                    {calculateBMI(detailMember.height, detailMember.weight)}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-xl">
                  <span className="text-muted-foreground block">Classification</span>
                  <span className={`text-xl font-bold ${getBMICategory(calculateBMI(detailMember.height, detailMember.weight)).color}`}>
                    {getBMICategory(calculateBMI(detailMember.height, detailMember.weight)).label}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Weight logger */}
            <div className="p-5 rounded-2xl bg-background border space-y-4">
              <h3 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" /> Log Weight Progress
              </h3>

              <form onSubmit={handleLogProgress} className="flex gap-2">
                <input
                  type="number"
                  required
                  value={logWeight}
                  onChange={(e) => setLogWeight(Number(e.target.value))}
                  placeholder="New Weight (kg)"
                  className="flex-grow px-3 py-1.5 rounded-lg border bg-card text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingProgress}
                  className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs rounded-lg transition-all"
                >
                  {savingProgress ? 'Logging...' : 'Save Log'}
                </button>
              </form>
            </div>

            {/* 4. Weight history charts */}
            {progressLogs.length > 0 && (
              <div className="p-5 rounded-2xl bg-background border space-y-3">
                <h3 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1">
                  <Activity className="w-4 h-4 text-primary" /> Weight History Trend
                </h3>

                <div className="w-full h-44 text-xs font-sans mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressLogs}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        stroke="#888888"
                      />
                      <YAxis domain={['auto', 'auto']} stroke="#888888" />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Welcome Confirmation Modal */}
      {whatsAppModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border rounded-3xl p-6 shadow-2xl relative text-center">
            <h3 className="text-lg font-bold text-foreground mb-2">Member Registered Successfully</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Would you like to send the welcome WhatsApp message to this member now?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (pendingWhatsAppUrl) {
                    window.open(pendingWhatsAppUrl, '_blank');
                  }
                  setWhatsAppModalOpen(false);
                  setPendingWhatsAppUrl(null);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Send WhatsApp
              </button>
              <button
                onClick={() => {
                  setWhatsAppModalOpen(false);
                  setPendingWhatsAppUrl(null);
                }}
                className="w-full py-2.5 bg-secondary hover:bg-secondary-hover text-foreground rounded-xl text-xs font-semibold transition-all border border-border/40"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migration Hub Modal */}
      {showMigrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-card border rounded-3xl p-6 shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setShowMigrationModal(false);
                setPreviewRows([]);
                setUploadFileName('');
                setImportSummary(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Database className="w-6 h-6 text-indigo-500" />
              <h2 className="text-xl font-bold">Existing Member Migration Hub</h2>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6 gap-4 text-sm font-semibold">
              <button
                onClick={() => setMigrationTab('import')}
                className={`pb-2 border-b-2 transition-colors ${migrationTab === 'import' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                New Import / Manual Entry
              </button>
              <button
                onClick={() => setMigrationTab('history')}
                className={`pb-2 border-b-2 transition-colors ${migrationTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Migration Audit Log History
              </button>
            </div>

            {/* Tab: Import */}
            {migrationTab === 'import' && (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Excel / CSV Import Option */}
                  <div className="p-4 border rounded-2xl bg-muted/20 space-y-3">
                    <h3 className="font-bold text-xs flex items-center gap-1.5 text-emerald-400">
                      <FileSpreadsheet className="w-4 h-4" /> Excel / CSV Upload
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Upload any Excel or CSV member roster sheet. Detects headers instantly for mapping.
                    </p>
                    <button
                      onClick={downloadSampleTemplate}
                      className="w-full py-1.5 border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 font-semibold text-[10px] rounded-lg flex items-center justify-center gap-1 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Schema Template
                    </button>

                    <div className="border border-dashed border-border/80 rounded-xl p-3 flex flex-col items-center justify-center text-center relative hover:bg-muted/10 transition-colors">
                      <UploadCloud className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {uploadFileName && !ocrProcessing ? uploadFileName : "Upload Excel / CSV"}
                      </span>
                      <input
                        type="file"
                        accept=".xlsx,.csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Scanned Register Paper OCR Import Option */}
                  <div className="p-4 border rounded-2xl bg-muted/20 space-y-3">
                    <h3 className="font-bold text-xs flex items-center gap-1.5 text-indigo-400">
                      <Scan className="w-4 h-4" /> Paper Register OCR
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Scan register notebooks, printed rosters, or photos. Pluggable OCR processes files.
                    </p>
                    <div className="border border-dashed border-border/80 rounded-xl p-3 flex flex-col items-center justify-center text-center relative hover:bg-muted/10 transition-colors h-[115px]">
                      {ocrProcessing ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                          <span className="text-[10px] font-semibold text-indigo-400">OCR Processing...</span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {uploadFileName && ocrProcessing ? uploadFileName : "Scan Photos / PDF Pages"}
                          </span>
                          <input
                            type="file"
                            multiple
                            accept="image/*,.pdf"
                            onChange={handleOcrUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Manual Migration Option */}
                  <div className="p-4 border rounded-2xl bg-muted/20 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-xs flex items-center gap-1.5 text-violet-400">
                        <Users className="w-4 h-4" /> Manual Onboarding
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-normal">
                        Manually migrate a single member preserving historical dates, fees, and active plan details.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowManualMigrateModal(true)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition-all shadow-md"
                    >
                      Onboard Single Member Manually
                    </button>
                  </div>
                </div>

                {/* Import progress bar */}
                {importing && (
                  <div className="p-4 border border-indigo-500/30 bg-indigo-950/20 rounded-xl space-y-2 text-xs font-semibold">
                    <div className="flex justify-between text-indigo-400 font-bold">
                      <span>Importing member records...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                      <span>Imported: <strong className="text-indigo-400">{importStats.imported}</strong></span>
                      <span>Remaining: <strong className="text-indigo-400">{importStats.remaining}</strong></span>
                      <span>Est. Time: <strong className="text-indigo-400">{importStats.estimatedTime}</strong></span>
                    </div>
                  </div>
                )}

                {/* Import summary completion */}
                {importSummary && (
                  <div className="p-4 border border-emerald-500/20 bg-emerald-950/10 rounded-2xl space-y-3">
                    <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Universal Import Process Completed
                    </h4>
                    <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                      <div className="p-1.5 border rounded-lg bg-card">
                        <span className="text-muted-foreground block text-[8px] uppercase">Created</span>
                        <span className="text-sm font-bold text-emerald-400">{importSummary.successCount}</span>
                      </div>
                      <div className="p-1.5 border rounded-lg bg-card">
                        <span className="text-muted-foreground block text-[8px] uppercase">Updated</span>
                        <span className="text-sm font-bold text-sky-400">{importSummary.updatedCount || 0}</span>
                      </div>
                      <div className="p-1.5 border rounded-lg bg-card">
                        <span className="text-muted-foreground block text-[8px] uppercase">Merged</span>
                        <span className="text-sm font-bold text-purple-400">{importSummary.mergedCount || 0}</span>
                      </div>
                      <div className="p-1.5 border rounded-lg bg-card">
                        <span className="text-muted-foreground block text-[8px] uppercase">Skipped</span>
                        <span className="text-sm font-bold text-amber-400">{importSummary.duplicateCount}</span>
                      </div>
                      <div className="p-1.5 border rounded-lg bg-card">
                        <span className="text-muted-foreground block text-[8px] uppercase">Failed</span>
                        <span className="text-sm font-bold text-rose-400">{importSummary.failedCount}</span>
                      </div>
                    </div>
                    {importSummary.errors.length > 0 && (
                      <button
                        onClick={() => downloadErrorReport(importSummary.errors)}
                        className="py-1 px-3 border border-rose-500/30 hover:bg-rose-950/20 text-rose-400 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <AlertCircle className="w-3.5 h-3.5" /> Download Error Report
                      </button>
                    )}
                  </div>
                )}

                {/* Column Mapping Wizard (renders when headers detected) */}
                {detectedHeaders.length > 0 && (
                  <div className="p-4 border rounded-2xl bg-muted/10 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <h4 className="font-bold text-xs text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 animate-pulse" /> Column Mapping Wizard
                      </h4>
                      <button
                        onClick={() => autoDetectMapping(detectedHeaders, rawUploadRows)}
                        className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold hover:text-indigo-300 bg-indigo-950/30 px-2 py-1 rounded-md border border-indigo-500/20"
                      >
                        <Sparkles className="w-3 h-3" /> Auto-Suggest Columns
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-[10px]">
                      {[
                        { key: 'name', label: 'Member Name *' },
                        { key: 'phone', label: 'Phone Number *' },
                        { key: 'email', label: 'Email Address' },
                        { key: 'gender', label: 'Gender *' },
                        { key: 'dob', label: 'Date of Birth *' },
                        { key: 'height', label: 'Height (cm) *' },
                        { key: 'weight', label: 'Weight (kg) *' },
                        { key: 'planName', label: 'Membership Plan *' },
                        { key: 'startDate', label: 'Membership Start Date *' },
                        { key: 'expiryDate', label: 'Membership Expiry Date *' },
                        { key: 'totalAmount', label: 'Total Plan Amount (₹)' },
                        { key: 'amountPaid', label: 'Amount Paid (₹)' },
                        { key: 'remainingDue', label: 'Remaining Due (₹)' },
                        { key: 'address', label: 'Address' },
                        { key: 'emergencyContact', label: 'Emergency Contact' },
                        { key: 'notes', label: 'Medical Notes' },
                        { key: 'status', label: 'Member Status' }
                      ].map(f => (
                        <div key={f.key} className="space-y-1 p-2 border rounded-lg bg-card/40">
                          <span className="font-semibold text-muted-foreground block truncate">{f.label}</span>
                          <select
                            value={columnMapping[f.key] || ''}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="w-full text-[10px] p-1 border rounded bg-background text-foreground"
                          >
                            <option value="">-- Ignored --</option>
                            {detectedHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Mapping Stats bar */}
                    <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t text-[10px]">
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 rounded-md">Matched Fields: {Object.keys(columnMapping).filter(k => columnMapping[k]).length}</span>
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground border rounded-md">Unmatched Fields: {Object.keys(columnMapping).filter(k => !columnMapping[k]).length}</span>
                      </div>
                      {['name', 'phone'].filter(k => !columnMapping[k]).length > 0 ? (
                        <span className="px-2 py-0.5 bg-rose-950/40 text-rose-400 border border-rose-500/20 rounded-md font-bold">
                          Missing Required: {['name', 'phone'].filter(k => !columnMapping[k]).map(m => m === 'name' ? 'Member Name' : 'Phone Number').join(', ')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 rounded-md font-bold">
                          All Required Mapped
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Duplicate Strategy & Smart Preview table */}
                {previewRows.length > 0 && (
                  <div className="space-y-4">
                    {/* Dynamic Import Preview Summary Card */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-2xl bg-card border shadow-sm text-xs">
                      {/* Matched Fields */}
                      <div className="p-3 rounded-xl bg-background border flex flex-col justify-between space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Matched Fields</span>
                        <div className="text-lg font-extrabold text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5">
                          {Object.keys(columnMapping).filter(k => columnMapping[k]).length} Mapped
                        </div>
                      </div>

                      {/* Unmatched Fields */}
                      <div className="p-3 rounded-xl bg-background border flex flex-col justify-between space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Unmatched Columns</span>
                        <div className="text-lg font-extrabold text-amber-500">
                          {detectedHeaders.length - Object.keys(columnMapping).filter(k => columnMapping[k]).length} Ignored
                        </div>
                      </div>

                      {/* Missing Required */}
                      <div className="p-3 rounded-xl bg-background border flex flex-col justify-between space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Missing Required</span>
                        <div className="text-xs font-bold mt-1">
                          {['name', 'phone'].filter(k => !columnMapping[k]).length > 0 ? (
                            <span className="text-rose-500 dark:text-rose-400">
                              {['name', 'phone'].filter(k => !columnMapping[k]).map(m => m === 'name' ? 'Name' : 'Phone').join(', ')}
                            </span>
                          ) : (
                            <span className="text-emerald-500 dark:text-emerald-400">None ✔</span>
                          )}
                        </div>
                      </div>

                      {/* Duplicate Mappings */}
                      <div className="p-3 rounded-xl bg-background border flex flex-col justify-between space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Duplicate Columns</span>
                        <div className="text-xs font-bold mt-1">
                          {getDuplicateMappings().length > 0 ? (
                            <span className="text-rose-500 dark:text-rose-400" title={getDuplicateMappings().join(', ')}>
                              {getDuplicateMappings().length} Found ⚠️
                            </span>
                          ) : (
                            <span className="text-emerald-500 dark:text-emerald-400">None ✔</span>
                          )}
                        </div>
                      </div>

                      {/* Invalid Rows */}
                      <div className="p-3 rounded-xl bg-background border flex flex-col justify-between space-y-1 col-span-2 md:col-span-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Validation Errors</span>
                        <div className="text-lg font-extrabold flex items-center gap-1.5">
                          {previewRows.filter(r => !r.isValid).length > 0 ? (
                            <span className="text-rose-500 dark:text-rose-400">
                              {previewRows.filter(r => !r.isValid).length} Rows ❌
                            </span>
                          ) : (
                            <span className="text-emerald-500 dark:text-emerald-400">0 Errors ✔</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Duplicate strategy selection */}
                    <div className="p-3 border rounded-xl bg-card space-y-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">Duplicate Handling Strategy</span>
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] font-semibold">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="dupStrategy" checked={duplicateStrategy === 'skip'} onChange={() => setDuplicateStrategy('skip')} className="text-indigo-600 focus:ring-0" />
                          <span>Skip duplicate phone records</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="dupStrategy" checked={duplicateStrategy === 'update'} onChange={() => setDuplicateStrategy('update')} className="text-indigo-600 focus:ring-0" />
                          <span>Overwrite / Update profile details</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="dupStrategy" checked={duplicateStrategy === 'merge'} onChange={() => setDuplicateStrategy('merge')} className="text-indigo-600 focus:ring-0" />
                          <span>Merge empty fields only</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs">Smart Preview Table</h4>
                        {previewRows[0] && previewRows[0].id.startsWith('ocr-') && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 rounded-md">
                            Processed via Pluggable {ocrProviderName}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 bg-muted rounded-full">Total: {previewRows.length}</span>
                        <span className="px-2 py-0.5 bg-emerald-950/30 text-emerald-400 rounded-full">Valid: {previewRows.filter(r => r.isValid).length}</span>
                        <span className="px-2 py-0.5 bg-amber-950/30 text-amber-400 rounded-full">Duplicates: {previewRows.filter(r => r.isDuplicate).length}</span>
                        <span className="px-2 py-0.5 bg-rose-950/30 text-rose-400 rounded-full">Errors: {previewRows.filter(r => !r.isValid).length}</span>
                      </div>
                    </div>

                    {/* Interactive Preview Table with inline inputs & confidence highlights */}
                    <div className="max-h-[300px] overflow-y-auto border rounded-xl bg-card">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="border-b bg-muted/40 font-bold sticky top-0 z-10">
                            <th className="p-2 whitespace-nowrap">Status</th>
                            <th className="p-2 whitespace-nowrap">Member Name *</th>
                            <th className="p-2 whitespace-nowrap">Phone *</th>
                            <th className="p-2 whitespace-nowrap">Plan Name *</th>
                            <th className="p-2 whitespace-nowrap">Gender *</th>
                            <th className="p-2 whitespace-nowrap">DOB *</th>
                            <th className="p-2 whitespace-nowrap">Height / Weight</th>
                            <th className="p-2 whitespace-nowrap">Start / Expiry Date</th>
                            <th className="p-2 whitespace-nowrap">Amount / Paid / Due</th>
                            <th className="p-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {previewRows.map(row => {
                            const getFieldStyle = (fieldName: string) => {
                              const confidence = row.confidenceFields?.[fieldName];
                              if (confidence === 'unable' || !row.data[fieldName]) {
                                return 'border-rose-500/50 bg-rose-950/20 text-rose-300';
                              }
                              if (confidence === 'review') {
                                return 'border-amber-500/50 bg-amber-950/20 text-amber-300';
                              }
                              return 'border-border focus:ring-1 focus:ring-primary';
                            };

                            return (
                              <tr key={row.id} className={`hover:bg-muted/5 ${!row.isValid ? 'bg-rose-950/5' : row.isDuplicate ? 'bg-amber-950/5' : ''}`}>
                                <td className="p-2">
                                  <div className="flex flex-col gap-0.5">
                                    {row.confidence === 'unable' ? (
                                      <span className="px-1 py-0.5 text-[8px] font-bold bg-rose-950/40 text-rose-400 border border-rose-500/30 rounded flex items-center justify-center">🔴 ILLEGIBLE</span>
                                    ) : row.confidence === 'review' ? (
                                      <span className="px-1 py-0.5 text-[8px] font-bold bg-amber-950/40 text-amber-400 border border-amber-500/30 rounded flex items-center justify-center">🟡 REVIEW</span>
                                    ) : (
                                      <span className="px-1 py-0.5 text-[8px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 rounded flex items-center justify-center">🟢 HIGH</span>
                                    )}
                                    {row.errors.length > 0 ? (
                                      <span className="text-[8px] text-rose-400 leading-tight font-semibold block max-w-[120px] truncate" title={row.errors.join(', ')}>
                                        {row.errors[0]}
                                      </span>
                                    ) : (
                                      <span className="text-[8px] text-emerald-400 font-bold block">✓ Ready</span>
                                    )}
                                  </div>
                                </td>

                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={row.data.name || ''}
                                    onChange={(e) => handleCellEdit(row.id, 'name', e.target.value)}
                                    placeholder="Name"
                                    className={`p-1 border text-xs rounded-lg bg-card w-24 ${getFieldStyle('name')}`}
                                  />
                                </td>

                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={row.data.phone || ''}
                                    onChange={(e) => handleCellEdit(row.id, 'phone', e.target.value)}
                                    placeholder="Phone"
                                    className={`p-1 border text-xs rounded-lg bg-card w-24 ${getFieldStyle('phone')}`}
                                  />
                                </td>

                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={row.data.planName || ''}
                                    onChange={(e) => handleCellEdit(row.id, 'planName', e.target.value)}
                                    placeholder="Plan"
                                    className={`p-1 border text-xs rounded-lg bg-card w-24 ${getFieldStyle('planName')}`}
                                  />
                                </td>

                                <td className="p-2">
                                  <select
                                    value={row.data.gender || ''}
                                    onChange={(e) => handleCellEdit(row.id, 'gender', e.target.value)}
                                    className={`p-1 border text-xs rounded-lg bg-card w-16 ${getFieldStyle('gender')}`}
                                  >
                                    <option value="">--</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                  </select>
                                </td>

                                <td className="p-2">
                                  <input
                                    type="date"
                                    value={row.data.dob ? row.data.dob.split('T')[0] : ''}
                                    onChange={(e) => handleCellEdit(row.id, 'dob', e.target.value)}
                                    className={`p-1 border text-xs rounded-lg bg-card w-24 ${getFieldStyle('dob')}`}
                                  />
                                </td>

                                <td className="p-2">
                                  <div className="flex gap-0.5 items-center">
                                    <input
                                      type="number"
                                      placeholder="Ht"
                                      value={row.data.height === undefined ? '' : row.data.height}
                                      onChange={(e) => handleCellEdit(row.id, 'height', e.target.value === '' ? undefined : Number(e.target.value))}
                                      className={`p-1 border text-xs rounded bg-card w-10 ${getFieldStyle('height')}`}
                                    />
                                    <input
                                      type="number"
                                      placeholder="Wt"
                                      value={row.data.weight === undefined ? '' : row.data.weight}
                                      onChange={(e) => handleCellEdit(row.id, 'weight', e.target.value === '' ? undefined : Number(e.target.value))}
                                      className={`p-1 border text-xs rounded bg-card w-10 ${getFieldStyle('weight')}`}
                                    />
                                  </div>
                                </td>

                                <td className="p-2">
                                  <div className="flex gap-0.5 items-center">
                                    <input
                                      type="date"
                                      value={row.data.startDate ? row.data.startDate.split('T')[0] : ''}
                                      onChange={(e) => handleCellEdit(row.id, 'startDate', e.target.value)}
                                      className={`p-1 border text-xs rounded bg-card w-24 ${getFieldStyle('startDate')}`}
                                    />
                                    <input
                                      type="date"
                                      value={row.data.expiryDate ? row.data.expiryDate.split('T')[0] : ''}
                                      onChange={(e) => handleCellEdit(row.id, 'expiryDate', e.target.value)}
                                      className={`p-1 border text-xs rounded bg-card w-24 ${getFieldStyle('expiryDate')}`}
                                    />
                                  </div>
                                </td>

                                <td className="p-2">
                                  <div className="flex gap-0.5 items-center">
                                    <input
                                      type="number"
                                      placeholder="Price"
                                      value={row.data.totalAmount === undefined ? '' : row.data.totalAmount}
                                      onChange={(e) => handleCellEdit(row.id, 'totalAmount', e.target.value === '' ? 0 : Number(e.target.value))}
                                      className="p-1 border text-xs rounded bg-card w-12"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Paid"
                                      value={row.data.amountPaid === undefined ? '' : row.data.amountPaid}
                                      onChange={(e) => handleCellEdit(row.id, 'amountPaid', e.target.value === '' ? 0 : Number(e.target.value))}
                                      className="p-1 border text-xs rounded bg-card w-12"
                                    />
                                    <input
                                      type="number"
                                      placeholder="Due"
                                      value={row.data.remainingDue === undefined ? '' : row.data.remainingDue}
                                      onChange={(e) => handleCellEdit(row.id, 'remainingDue', e.target.value === '' ? 0 : Number(e.target.value))}
                                      className="p-1 border text-xs rounded bg-card w-12"
                                    />
                                  </div>
                                </td>

                                <td className="p-2 text-right">
                                  <button
                                    onClick={() => setPreviewRows(prev => prev.filter(r => r.id !== row.id))}
                                    className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded hover:bg-rose-950/20"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setPreviewRows([]);
                          setDetectedHeaders([]);
                          setRawUploadRows([]);
                        }}
                        className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-muted"
                      >
                        Clear Selection
                      </button>
                      <button
                        onClick={triggerBatchImport}
                        disabled={importing || previewRows.length === 0 || previewRows.some(r => !r.isValid)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importing ? 'Importing...' : 'Begin Batch Import'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: History */}
            {migrationTab === 'history' && (
              <div className="flex-1 overflow-y-auto">
                {loadingHistory ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  </div>
                ) : importHistory.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs font-semibold">
                    No migration imports recorded yet.
                  </div>
                ) : (
                  <div className="border rounded-2xl overflow-hidden bg-card text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40 font-bold">
                          <th className="p-3">Import Date</th>
                          <th className="p-3">File / Action</th>
                          <th className="p-3">Imported By</th>
                          <th className="p-3 text-center">Total Rows</th>
                          <th className="p-3 text-center text-emerald-400">Success</th>
                          <th className="p-3 text-center text-rose-400">Failed</th>
                          <th className="p-3 text-center text-amber-400">Duplicate</th>
                          <th className="p-3 text-right">Logs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importHistory.map((hist) => (
                          <tr key={hist._id} className="hover:bg-muted/10">
                            <td className="p-3">{new Date(hist.createdAt).toLocaleString('en-IN')}</td>
                            <td className="p-3 font-semibold">{hist.fileName}</td>
                            <td className="p-3 text-muted-foreground">{hist.importedBy}</td>
                            <td className="p-3 text-center font-bold">{hist.totalRecords}</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">{hist.successCount}</td>
                            <td className="p-3 text-center text-rose-400 font-bold">{hist.failedCount}</td>
                            <td className="p-3 text-center text-amber-400 font-bold">{hist.duplicateCount}</td>
                            <td className="p-3 text-right">
                              {hist.rowErrors && hist.rowErrors.length > 0 ? (
                                <button
                                  onClick={() => downloadErrorReport(hist.rowErrors)}
                                  className="text-rose-400 hover:text-rose-300 font-bold hover:underline"
                                >
                                  Download Error Log
                                </button>
                              ) : (
                                <span className="text-muted-foreground">No Errors</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Existing Member Migration Modal */}
      {showManualMigrateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border rounded-3xl p-6 shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setShowManualMigrateModal(false);
                setManualFormErrors({});
              }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Add Existing Migrated Member</h2>

            <form onSubmit={handleManualMigrationSubmit} className="space-y-4 overflow-y-auto pr-2 flex-1">
              <div className="border-b pb-2 font-bold text-xs text-indigo-400 uppercase tracking-wide">
                1. Personal Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={manualForm.name}
                    onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Amit Kumar"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {manualFormErrors.name && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number (10 digits)</label>
                  <input
                    type="tel"
                    required
                    value={manualForm.phone}
                    onChange={(e) => setManualForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="9876543210"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {manualFormErrors.phone && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={manualForm.email}
                    onChange={(e) => setManualForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="amit@example.com"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                  <select
                    value={manualForm.gender}
                    onChange={(e) => setManualForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={manualForm.dob}
                    onChange={(e) => setManualForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {manualFormErrors.dob && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.dob}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.height}
                    onChange={(e) => setManualForm(prev => ({ ...prev, height: e.target.value }))}
                    placeholder="175"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {manualFormErrors.height && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.height}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.weight}
                    onChange={(e) => setManualForm(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="70"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {manualFormErrors.weight && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.weight}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Address</label>
                  <input
                    type="text"
                    value={manualForm.address}
                    onChange={(e) => setManualForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Area, City..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    value={manualForm.emergencyContact}
                    onChange={(e) => setManualForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                    placeholder="Emergency Phone..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-b pb-2 pt-4 font-bold text-xs text-indigo-400 uppercase tracking-wide">
                2. Membership Plan & Financial Opening Balances
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Membership Plan Name</label>
                  <input
                    type="text"
                    required
                    value={manualForm.planName}
                    onChange={(e) => setManualForm(prev => ({ ...prev, planName: e.target.value }))}
                    placeholder="e.g. Premium Annual"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {manualFormErrors.planName && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.planName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={manualForm.startDate}
                      onChange={(e) => setManualForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                    />
                    {manualFormErrors.startDate && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.startDate}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={manualForm.expiryDate}
                      onChange={(e) => setManualForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                    />
                    {manualFormErrors.expiryDate && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.expiryDate}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Total Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.totalAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const paid = Number(manualForm.amountPaid || 0);
                      setManualForm(prev => ({
                        ...prev,
                        totalAmount: e.target.value,
                        remainingDue: String(val - paid)
                      }));
                    }}
                    placeholder="12000"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {manualFormErrors.totalAmount && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.totalAmount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={manualForm.amountPaid}
                    onChange={(e) => {
                      const paid = Number(e.target.value);
                      const total = Number(manualForm.totalAmount || 0);
                      setManualForm(prev => ({
                        ...prev,
                        amountPaid: e.target.value,
                        remainingDue: String(total - paid)
                      }));
                    }}
                    placeholder="10000"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Remaining Due (₹)</label>
                  <input
                    type="number"
                    value={manualForm.remainingDue}
                    onChange={(e) => setManualForm(prev => ({ ...prev, remainingDue: e.target.value }))}
                    placeholder="2000"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none bg-muted/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Payment Status</label>
                  <select
                    value={manualForm.paymentStatus}
                    onChange={(e) => setManualForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="paid">Paid (Fully)</option>
                    <option value="partial">Partial Dues</option>
                    <option value="unpaid">Unpaid / Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Medical Notes</label>
                  <input
                    type="text"
                    value={manualForm.notes}
                    onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any previous ailments or details..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualMigrateModal(false);
                    setManualFormErrors({});
                  }}
                  className="flex-1 py-2.5 border hover:bg-muted rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingManualMigration}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {savingManualMigration ? 'Saving Migration...' : 'Confirm Manual Migration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
