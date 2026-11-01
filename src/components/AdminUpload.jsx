import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Database,
  RefreshCw,
  Loader2,
  Trash2,
  Download,
  Search,
  FileText,
  FileEdit,
  Check,
  MapPin,
  Plus,
  Edit,
  X,
  FileDown,
  FileUp,
  UserCheck,
  Type,
  PenTool,
  Image as ImageIcon,
  Camera,
  User,
  Calendar,
  Layers,
  Phone,
  HelpCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { parseDutyFile } from '../utils/fileParser';
import * as XLSX from 'xlsx';
import BulkLegalPdfModal from './BulkLegalPdfModal';
import ToggleSwitch from './ToggleSwitch';

export default function AdminUpload({
  records = [],
  onUpdateRecords,
  onResetToDefault,
  customNote = '',
  isNoteEnabled = true,
  onUpdateNote,
  customBriefing = '',
  isBriefingEnabled = true,
  onUpdateBriefing,
  helplineList = [],
  isHelplineEnabled = true,
  onUpdateHelpline,
  attendanceMap = {},
  eventTitle = '',
  eventSubtitle = '',
  onUpdateEventHeadings,
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  onUpdateSignature,
  events = [],
  activeEventId = '',
  onSelectActiveEvent,
  customLabels = {},
  onUpdateCustomLabels
}) {
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [uploadMode, setUploadMode] = useState('append'); // 'append' (merge with existing) | 'replace' (overwrite)
  
  // Custom Labels State
  const [labelsInput, setLabelsInput] = useState({
    duty_place: customLabels?.duty_place || '',
    shift: customLabels?.shift || '',
    zone: customLabels?.zone || '',
    zonal_incharge: customLabels?.zonal_incharge || '',
    sector: customLabels?.sector || '',
    sector_incharge: customLabels?.sector_incharge || '',
    briefing: customLabels?.briefing || ''
  });
  const [labelsSaved, setLabelsSaved] = useState(false);
  
  // Note State
  const [noteText, setNoteText] = useState(customNote || '');
  const [noteToggle, setNoteToggle] = useState(isNoteEnabled !== undefined ? isNoteEnabled : true);
  const [noteSaved, setNoteSaved] = useState(false);

  // Briefing Place State
  const [briefingText, setBriefingText] = useState(customBriefing || '');
  const [briefingToggle, setBriefingToggle] = useState(isBriefingEnabled !== undefined ? isBriefingEnabled : true);
  const [briefingSaved, setBriefingSaved] = useState(false);

  // Manual Helpline Contacts State
  const [helplineContacts, setHelplineContacts] = useState(() => {
    if (Array.isArray(helplineList) && helplineList.length > 0) return helplineList;
    return [
      { id: '1', title: 'पुलिस कंट्रोल रूम (अयोध्या)', number: '9454417465' },
      { id: '2', title: 'पुलिस सिटी कन्ट्रोल रुम (अयोध्या)', number: '9454402648' },
      { id: '3', title: 'मेला नियंत्रण कक्ष / ड्यूटी हेल्पडेस्क', number: '9454402655' }
    ];
  });
  const [helplineToggle, setHelplineToggle] = useState(isHelplineEnabled !== false);
  const [helplineSaved, setHelplineSaved] = useState(false);

  // Event Headings State
  const [titleInput, setTitleInput] = useState(eventTitle);
  const [subtitleInput, setSubtitleInput] = useState(eventSubtitle);
  const [headingsSaved, setHeadingsSaved] = useState(false);

  // Signature & Signatory State
  const [signText, setSignText] = useState(signatoryText);
  const [signaturePreview, setSignaturePreview] = useState(signatureImg);
  const [signatureSaved, setSignatureSaved] = useState(false);

  // Bulk Legal PDF Modal State
  const [isBulkPdfModalOpen, setIsBulkPdfModalOpen] = useState(false);
  const [showTemplateGuide, setShowTemplateGuide] = useState(false);

  // Duty Edit/Add Modal State
  const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState(null);
  const [dutyFormData, setDutyFormData] = useState({
    id: '',
    name: '',
    rank: 'का0',
    mobile: '',
    duty_place: '',
    zone: '',
    zonal_incharge: '',
    sector: '',
    sector_incharge: '',
    posting: '',
    district: '',
    shift: 'प्रातः 09:00 बजे से मेला समाप्ति तक',
    photo: ''
  });

  const fileInputRef = useRef(null);
  const jsonImportRef = useRef(null);
  const signatureInputRef = useRef(null);
  const officerPhotoInputRef = useRef(null);

  // Attendance stats
  const reportedCount = Object.keys(attendanceMap).length;
  const totalCount = records.length;
  const attendancePercent = totalCount > 0 ? Math.round((reportedCount / totalCount) * 100) : 0;

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('कृपया केवल इमेज फ़ाइल (PNG, JPG, SVG) चुनें।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setSignaturePreview(base64);
      if (onUpdateSignature) {
        onUpdateSignature(base64, signText);
        setStatusMsg({ type: 'success', text: 'आधिकारिक हस्ताक्षर सफलतापूर्वक अपलोड एवं सहेज दिया गया है!' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOfficerPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setDutyFormData(prev => ({ ...prev, photo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignatoryText = (e) => {
    e?.preventDefault();
    if (onUpdateSignature) {
      onUpdateSignature(signaturePreview, signText.trim() || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या');
      setSignatureSaved(true);
      setTimeout(() => setSignatureSaved(false), 2000);
      setStatusMsg({ type: 'success', text: 'हस्ताक्षरकर्ता पदनाम सफलतापूर्वक सहेज दिया गया है।' });
    }
  };

  const handleRemoveSignature = () => {
    setSignaturePreview('');
    if (signatureInputRef.current) signatureInputRef.current.value = '';
    if (onUpdateSignature) {
      onUpdateSignature('', signText);
      setStatusMsg({ type: 'success', text: 'अपलोड किया गया हस्ताक्षर हटा दिया गया है।' });
    }
  };

  const handleOpenDutyModal = (dutyRecord = null) => {
    if (dutyRecord) {
      setEditingDuty(dutyRecord);
      setDutyFormData({
        id: dutyRecord.id || `PN-${Math.floor(100000 + Math.random() * 900000)}`,
        name: dutyRecord.name || '',
        rank: dutyRecord.rank || 'का0',
        mobile: dutyRecord.mobile || '',
        duty_place: dutyRecord.duty_place || '',
        zone: dutyRecord.zone || '',
        zonal_incharge: dutyRecord.zonal_incharge || dutyRecord.zonal || '',
        sector: dutyRecord.sector || '',
        sector_incharge: dutyRecord.sector_incharge || '',
        posting: dutyRecord.posting || '',
        district: dutyRecord.district || '',
        shift: dutyRecord.shift || 'प्रातः 09:00 बजे से मेला समाप्ति तक',
        photo: dutyRecord.photo || ''
      });
    } else {
      setEditingDuty(null);
      setDutyFormData({
        id: `PN-${Math.floor(100000 + Math.random() * 900000)}`,
        name: '',
        rank: 'का0',
        mobile: '',
        duty_place: 'राम जन्मभूमि परिसर - मुख्य द्वार',
        zone: 'जोन-01 (मंदिर परिसर)',
        zonal_incharge: '',
        sector: 'सेक्टर-01 (मुख्य प्रवेश द्वार)',
        sector_incharge: '',
        posting: 'थाना कोतवाली',
        district: 'अयोध्या',
        shift: 'प्रातः 09:00 बजे से मेला समाप्ति तक',
        photo: ''
      });
    }
    setIsDutyModalOpen(true);
  };

  const handleSaveDutyRecord = (e) => {
    e.preventDefault();
    if (!dutyFormData.name.trim() || !dutyFormData.mobile.trim() || !dutyFormData.duty_place.trim()) {
      alert('कृपया नाम, मोबाइल नंबर एवं ड्यूटी स्थान अनिवार्य रूप से भरें।');
      return;
    }

    if (editingDuty) {
      const updated = records.map(r => r.id === editingDuty.id ? dutyFormData : r);
      onUpdateRecords(updated);
      setStatusMsg({ type: 'success', text: `ड्यूटी रिकॉर्ड "${dutyFormData.name}" संशोधित कर दिया गया है।` });
    } else {
      onUpdateRecords([dutyFormData, ...records]);
      setStatusMsg({ type: 'success', text: `नया ड्यूटी रिकॉर्ड "${dutyFormData.name}" सफलतापूर्वक जोड़ा गया।` });
    }

    setIsDutyModalOpen(false);
    setEditingDuty(null);
  };

  const handleDeleteDutyRecord = (id, name) => {
    if (window.confirm(`क्या आप ID: ${id} (${name}) का ड्यूटी आवंटन हटाना चाहते हैं?`)) {
      const updated = records.filter(r => r.id !== id);
      onUpdateRecords(updated);
      setStatusMsg({ type: 'success', text: `ड्यूटी रिकॉर्ड ${id} हटा दिया गया है।` });
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const parsedRecords = await parseDutyFile(file);
      if (parsedRecords && parsedRecords.length > 0) {
        // Detect duplicates by PNO and Mobile
        const existingPnoSet = new Set(
          (records || []).map(r => (r.id || '').trim().toLowerCase()).filter(Boolean)
        );
        const existingMobileSet = new Set(
          (records || []).map(r => (r.mobile || '').replace(/\D/g, '')).filter(m => m.length >= 10)
        );

        let duplicatePnoCount = 0;
        let duplicateMobileCount = 0;

        for (const r of parsedRecords) {
          const cleanPno = (r.id || '').trim().toLowerCase();
          const cleanMob = (r.mobile || '').replace(/\D/g, '');
          if (cleanPno && existingPnoSet.has(cleanPno)) duplicatePnoCount++;
          if (cleanMob.length >= 10 && existingMobileSet.has(cleanMob)) duplicateMobileCount++;
        }

        if (uploadMode === 'append' && records && records.length > 0) {
          // Smart merge without losing previous data
          const existingKeySet = new Set(
            records.map(r => `${(r.id || '').trim().toLowerCase()}_${(r.mobile || '').trim()}_${(r.name || '').trim().toLowerCase()}_${(r.duty_place || '').trim().toLowerCase()}`)
          );

          const newUniqueRecords = [];
          let duplicateExactCount = 0;

          for (const newRec of parsedRecords) {
            const key = `${(newRec.id || '').trim().toLowerCase()}_${(newRec.mobile || '').trim()}_${(newRec.name || '').trim().toLowerCase()}_${(newRec.duty_place || '').trim().toLowerCase()}`;
            if (!existingKeySet.has(key)) {
              existingKeySet.add(key);
              newUniqueRecords.push(newRec);
            } else {
              duplicateExactCount++;
            }
          }

          const mergedRecords = [...records, ...newUniqueRecords];
          onUpdateRecords(mergedRecords);

          let msg = `🎉 सफलता! Excel फ़ाइल "${file.name}" से कुल ${parsedRecords.length} में से ${newUniqueRecords.length} नए रिकॉर्ड्स जोड़े गए! - अब कुल: ${mergedRecords.length} जवान।`;
          if (duplicatePnoCount > 0 || duplicateMobileCount > 0) {
            msg += ` (⚠️ सूचना: ${duplicatePnoCount} PNO व ${duplicateMobileCount} मोबाइल नंबर पहले से मौजूद थे)`;
          }

          setStatusMsg({
            type: 'success',
            text: msg
          });
        } else {
          onUpdateRecords(parsedRecords);
          let msg = `🎉 सफलता! Excel फ़ाइल "${file.name}" से कुल ${parsedRecords.length} ड्यूटी पास रिकॉर्ड्स इनजेस्ट एवं सहेजे गए!`;
          if (duplicatePnoCount > 0 || duplicateMobileCount > 0) {
            msg += ` (⚠️ सूचना: पूर्व डेटाबेस के ${duplicatePnoCount} PNO / ${duplicateMobileCount} मोबाइल ओवरराइट किए गए)`;
          }
          setStatusMsg({
            type: 'success',
            text: msg
          });
        }
      } else {
        setStatusMsg({ type: 'error', text: 'अमान्य डेटा: फ़ाइल में कोई ड्यूटी रिकॉर्ड प्राप्त नहीं हुए।' });
      }
    } catch (err) {
      console.error("File parse error:", err);
      setStatusMsg({ type: 'error', text: `फ़ाइल प्रोसेसिंग त्रुटि: ${err.message || 'फ़ाइल पढ़ने में विफल।'}` });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Sync state when props change
  useEffect(() => {
    setNoteText(customNote || '');
    setNoteToggle(isNoteEnabled !== undefined ? isNoteEnabled : (customNote ? true : false));
  }, [customNote, isNoteEnabled]);

  useEffect(() => {
    setBriefingText(customBriefing || '');
    setBriefingToggle(isBriefingEnabled !== undefined ? isBriefingEnabled : (customBriefing ? true : false));
  }, [customBriefing, isBriefingEnabled]);

  useEffect(() => {
    setTitleInput(eventTitle || '');
    setSubtitleInput(eventSubtitle || '');
  }, [eventTitle, eventSubtitle]);

  useEffect(() => {
    setSignText(signatoryText || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या');
    setSignaturePreview(signatureImg || '');
  }, [signatoryText, signatureImg]);

  useEffect(() => {
    setLabelsInput({
      duty_place: customLabels?.duty_place || '',
      shift: customLabels?.shift || '',
      zone: customLabels?.zone || '',
      zonal_incharge: customLabels?.zonal_incharge || '',
      sector: customLabels?.sector || '',
      sector_incharge: customLabels?.sector_incharge || '',
      briefing: customLabels?.briefing || ''
    });
  }, [customLabels]);

  const handleSaveCustomLabels = (e) => {
    e?.preventDefault();
    if (onUpdateCustomLabels) {
      onUpdateCustomLabels(labelsInput);
      setLabelsSaved(true);
      setTimeout(() => setLabelsSaved(false), 2000);
      setStatusMsg({ type: 'success', text: 'ड्यूटी पास के कॉलम हेडिंग्स सफलतापूर्वक सहेज दिए गए हैं।' });
    }
  };

  const handleSaveHeadings = (e) => {
    e?.preventDefault();
    if (onUpdateEventHeadings) {
      onUpdateEventHeadings(titleInput.trim() || eventTitle || 'पुलिस सुरक्षा व्यवस्था', subtitleInput.trim() || eventSubtitle || 'ड्यूटी पास');
      setHeadingsSaved(true);
      setTimeout(() => setHeadingsSaved(false), 2000);
      setStatusMsg({ type: 'success', text: 'मेला / कार्यक्रम शीर्षक सफलतापूर्वक सहेज दिया गया है।' });
    }
  };

  const handleSaveNoteSetting = (e) => {
    e?.preventDefault();
    const shouldEnable = noteText.trim().length > 0 ? true : noteToggle;
    setNoteToggle(shouldEnable);
    onUpdateNote(noteText, shouldEnable);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    setStatusMsg({ type: 'success', text: 'नोट सफलतापूर्वक सहेज दिया गया है और ड्यूटी पास पर सक्रिय है।' });
  };

  const handleToggleNote = (newEnabledState) => {
    setNoteToggle(newEnabledState);
    onUpdateNote(noteText, newEnabledState);
  };

  const handleSaveBriefingSetting = (e) => {
    e?.preventDefault();
    const shouldEnable = briefingText.trim().length > 0 ? true : briefingToggle;
    setBriefingToggle(shouldEnable);
    onUpdateBriefing(briefingText, shouldEnable);
    setBriefingSaved(true);
    setTimeout(() => setBriefingSaved(false), 2000);
    setStatusMsg({ type: 'success', text: 'ब्रीफिंग स्थान सफलतापूर्वक सहेज दिया गया है और ड्यूटी पास पर सक्रिय है।' });
  };

  const handleToggleBriefing = (newEnabledState) => {
    setBriefingToggle(newEnabledState);
    onUpdateBriefing(briefingText, newEnabledState);
  };

  useEffect(() => {
    if (Array.isArray(helplineList) && helplineList.length > 0) {
      setHelplineContacts(helplineList);
    }
    setHelplineToggle(isHelplineEnabled !== false);
  }, [helplineList, isHelplineEnabled]);

  const handleToggleHelpline = (newEnabledState) => {
    setHelplineToggle(newEnabledState);
    if (onUpdateHelpline) {
      onUpdateHelpline(helplineContacts, newEnabledState);
    }
  };

  const handleAddHelplineContact = () => {
    setHelplineContacts(prev => [
      ...prev,
      { id: String(Date.now()), title: 'नवीन हेल्पलाइन / नोडल संपर्क', number: '' }
    ]);
  };

  const handleUpdateContactItem = (idx, field, value) => {
    setHelplineContacts(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleRemoveContactItem = (idx) => {
    setHelplineContacts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveHelplineSetting = (e) => {
    e?.preventDefault();
    if (onUpdateHelpline) {
      onUpdateHelpline(helplineContacts, helplineToggle);
    }
    setHelplineSaved(true);
    setTimeout(() => setHelplineSaved(false), 2000);
    setStatusMsg({ type: 'success', text: 'हेल्पलाइन संपर्क नंबर सफलतापूर्वक सहेज दिए गए हैं।' });
  };

  const handleDownloadSampleExcel = () => {
    // 1. Sheet 1: Standard Police Duty Roster
    const sampleRoster = [
      {
        "क्र० सं०": 1,
        "पीएनओ": "162340101",
        "पद": "निरीक्षक",
        "नाम": "राजेश कुमार सिंह",
        "मोबाइल": "9454402655",
        "मूल तैनाती / थाना": "थाना कोतवाली",
        "जनपद": "अयोध्या",
        "जोन": "जोन-01 (मंदिर परिसर)",
        "जोनल प्रभारी": "क्षेत्राधिकारी नगर, अयोध्या (9454402648)",
        "सेक्टर": "सेक्टर-01 (मुख्य प्रवेश द्वार)",
        "सेक्टर प्रभारी": "निरीक्षक कोतवाली, अयोध्या (9454402655)",
        "ड्यूटी स्थल": "सेक्टर-01 नियंत्रण कक्ष / मुख्य द्वार",
        "ड्यूटी समय / शिफ्ट": "प्रातः 06:00 बजे से दोपहर 02:00 बजे तक",
        "ब्रीफिंग स्थल": "पुलिस लाइन परेड ग्राउंड, अयोध्या",
        "शस्त्र": "पिस्टल मय 10 चक्र"
      },
      {
        "क्र० सं०": 2,
        "पीएनओ": "182340202",
        "पद": "उ0नि0",
        "नाम": "अमित कुमार वर्मा",
        "मोबाइल": "9454400001",
        "मूल तैनाती / थाना": "थाना कैंट",
        "जनपद": "अयोध्या",
        "जोन": "जोन-01 (मंदिर परिसर)",
        "जोनल प्रभारी": "क्षेत्राधिकारी नगर, अयोध्या (9454402648)",
        "सेक्टर": "सेक्टर-01 (मुख्य प्रवेश द्वार)",
        "सेक्टर प्रभारी": "निरीक्षक कोतवाली, अयोध्या (9454402655)",
        "ड्यूटी स्थल": "राम जन्मभूमि परिसर - मुख्य द्वार बैरियर-A",
        "ड्यूटी समय / शिफ्ट": "प्रातः 06:00 बजे से दोपहर 02:00 बजे तक",
        "ब्रीफिंग स्थल": "पुलिस लाइन परेड ग्राउंड, अयोध्या",
        "शस्त्र": "ग्लाक पिस्टल मय 20 चक्र"
      },
      {
        "क्र० सं०": 3,
        "पीएनओ": "192340303",
        "पद": "हे0का0",
        "नाम": "राम प्रकाश यादव",
        "मोबाइल": "9454400002",
        "मूल तैनाती / थाना": "थाना पूराकलंदर",
        "जनपद": "अयोध्या",
        "जोन": "जोन-01 (मंदिर परिसर)",
        "जोनल प्रभारी": "",
        "सेक्टर": "सेक्टर-01 (मुख्य प्रवेश द्वार)",
        "सेक्टर प्रभारी": "",
        "ड्यूटी स्थल": "कनक भवन - मुख्य निकास द्वार बैरियर",
        "ड्यूटी समय / शिफ्ट": "प्रातः 06:00 बजे से दोपहर 02:00 बजे तक",
        "ब्रीफिंग स्थल": "पुलिस लाइन परेड ग्राउंड, अयोध्या",
        "शस्त्र": "डंडा"
      },
      {
        "क्र० सं०": 4,
        "पीएनओ": "212340404",
        "पद": "का0",
        "नाम": "सुनील कुमार",
        "मोबाइल": "9454400003",
        "मूल तैनाती / थाना": "थाना इनायतनगर",
        "जनपद": "अयोध्या",
        "जोन": "जोन-01 (मंदिर परिसर)",
        "जोनल प्रभारी": "",
        "सेक्टर": "सेक्टर-01 (मुख्य प्रवेश द्वार)",
        "सेक्टर प्रभारी": "",
        "ड्यूटी स्थल": "हनुमान गढ़ी सीढ़ियों के पास सुरक्षा बैरियर",
        "ड्यूटी समय / शिफ्ट": "प्रातः 06:00 बजे से दोपहर 02:00 बजे तक",
        "ब्रीफिंग स्थल": "पुलिस लाइन परेड ग्राउंड, अयोध्या",
        "शस्त्र": "लाठी"
      },
      {
        "क्र० सं०": 5,
        "पीएनओ": "222340505",
        "पद": "म0का0",
        "नाम": "पूजा देवी",
        "मोबाइल": "9454400004",
        "मूल तैनाती / थाना": "महिला थाना",
        "जनपद": "अयोध्या",
        "जोन": "जोन-01 (मंदिर परिसर)",
        "जोनल प्रभारी": "",
        "सेक्टर": "सेक्टर-01 (मुख्य प्रवेश द्वार)",
        "सेक्टर प्रभारी": "",
        "ड्यूटी स्थल": "महिला तलाशी बूथ - गेट नं० 3",
        "ड्यूटी समय / शिफ्ट": "प्रातः 06:00 बजे से दोपहर 02:00 बजे तक",
        "ब्रीफिंग स्थल": "पुलिस लाइन परेड ग्राउंड, अयोध्या",
        "शस्त्र": "लाठी"
      },
      {
        "क्र० सं०": 6,
        "पीएनओ": "172340606",
        "पद": "उ0नि0",
        "नाम": "दिनेश कुमार सिंह",
        "मोबाइल": "9454402688",
        "मूल तैनाती / थाना": "थाना रुदौली",
        "जनपद": "अयोध्या",
        "जोन": "जोन-02 (सरयू घाट एवं मेला क्षेत्र)",
        "जोनल प्रभारी": "क्षेत्राधिकारी रुदौली, अयोध्या (9454402650)",
        "सेक्टर": "सेक्टर-02 (राम की पैड़ी)",
        "सेक्टर प्रभारी": "उ0नि0 दिनेश कुमार सिंह (9454402688)",
        "ड्यूटी स्थल": "राम की पैड़ी - कंट्रोल वॉच टावर",
        "ड्यूटी समय / शिफ्ट": "दोपहर 02:00 बजे से रात्रि 10:00 बजे तक",
        "ब्रीफिंग स्थल": "पुलिस लाइन परेड ग्राउंड, अयोध्या",
        "शस्त्र": "पिस्टल मय 10 चक्र"
      },
      {
        "क्र० सं०": 7,
        "पीएनओ": "202340707",
        "पद": "का0",
        "नाम": "संजय कुमार",
        "मोबाइल": "9454400005",
        "मूल तैनाती / थाना": "थाना बीकापुर",
        "जनपद": "अयोध्या",
        "जोन": "जोन-02 (सरयू घाट एवं मेला क्षेत्र)",
        "जोनल प्रभारी": "",
        "सेक्टर": "सेक्टर-02 (राम की पैड़ी)",
        "सेक्टर प्रभारी": "",
        "ड्यूटी स्थल": "सरयू आरती स्थल - सुरक्षा घेरा",
        "ड्यूटी समय / शिफ्ट": "दोपहर 02:00 बजे से रात्रि 10:00 बजे तक",
        "ब्रीफिंग स्थल": "पुलिस लाइन परेड ग्राउंड, अयोध्या",
        "शस्त्र": "लाठी"
      }
    ];

    // 2. Sheet 2: Comprehensive Guidelines & Rules Sheet
    const instructionsData = [
      {
        "कॉलम शीर्षक (Column Header)": "क्र० सं०",
        "अनिवार्यता (Requirement)": "वैकल्पिक (Optional)",
        "नियम व विवरण (Instructions & Guidelines)": "जवानों की क्रम संख्या (1, 2, 3...)।",
        "मानक उदाहरण (Sample Value)": "1"
      },
      {
        "कॉलम शीर्षक (Column Header)": "पीएनओ",
        "अनिवार्यता (Requirement)": "अनुशंसित (Recommended)",
        "नियम व विवरण (Instructions & Guidelines)": "उत्तर प्रदेश पुलिस का 9 या 10 अंकों का व्यक्तिगत PNO नंबर। इससे ड्यूटी कार्ड सर्च व डुप्लिकेट पहचान में कोई भ्रम नहीं होता।",
        "मानक उदाहरण (Sample Value)": "162340101"
      },
      {
        "कॉलम शीर्षक (Column Header)": "पद",
        "अनिवार्यता (Requirement)": "अनुशंसित (Recommended)",
        "नियम व विवरण (Instructions & Guidelines)": "मानक पदनाम भरें: निरीक्षक, उ0नि0, हे0का0, का0, म0का0, टीसी, चालक आदि।",
        "मानक उदाहरण (Sample Value)": "उ0नि0"
      },
      {
        "कॉलम शीर्षक (Column Header)": "नाम",
        "अनिवार्यता (Requirement)": "अनिवार्य (MANDATORY)",
        "नियम व विवरण (Instructions & Guidelines)": "पुलिसकर्मी का पूरा नाम। नाम के आगे पदनाम भी लिखा जा सकता है।",
        "मानक उदाहरण (Sample Value)": "अमित कुमार वर्मा"
      },
      {
        "कॉलम शीर्षक (Column Header)": "मोबाइल",
        "अनिवार्यता (Requirement)": "अनिवार्य (MANDATORY)",
        "नियम व विवरण (Instructions & Guidelines)": "10 अंकों का मोबाइल नंबर। जवान इसी नंबर या PNO से अपना ड्यूटी कार्ड खोजते हैं।",
        "मानक उदाहरण (Sample Value)": "9454400001"
      },
      {
        "कॉलम शीर्षक (Column Header)": "मूल तैनाती / थाना",
        "अनिवार्यता (Requirement)": "अनुशंसित (Recommended)",
        "नियम व विवरण (Instructions & Guidelines)": "जवान का गृह थाना, पुलिस लाइन या वर्तमान तैनाती स्थान।",
        "मानक उदाहरण (Sample Value)": "थाना कोतवाली"
      },
      {
        "कॉलम शीर्षक (Column Header)": "जनपद",
        "अनिवार्यता (Requirement)": "अनुशंसित (Recommended)",
        "नियम व विवरण (Instructions & Guidelines)": "जवान का गृह जनपद अथवा वर्तमान पोस्टिंग जिला।",
        "मानक उदाहरण (Sample Value)": "अयोध्या"
      },
      {
        "कॉलम शीर्षक (Column Header)": "जोन",
        "अनिवार्यता (Requirement)": "अनुशंसित (Recommended)",
        "नियम व विवरण (Instructions & Guidelines)": "ड्यूटी जोन का नाम या संख्या (जैसे: जोन-01 (मंदिर परिसर))।",
        "मानक उदाहरण (Sample Value)": "जोन-01 (मंदिर परिसर)"
      },
      {
        "कॉलम शीर्षक (Column Header)": "जोनल प्रभारी",
        "अनिवार्यता (Requirement)": "अनुशंसित (Recommended)",
        "नियम व विवरण (Instructions & Guidelines)": "जोनल अधिकारी का पद, नाम व सीयूजी नंबर। यदि जोन के किसी 1 जवान के सामने भी भर देंगे तो बाकी सभी जवानों में स्वतः जुड़ जाएगा।",
        "मानक उदाहरण (Sample Value)": "क्षेत्राधिकारी नगर, अयोध्या (9454402648)"
      },
      {
        "कॉलम शीर्षक (Column Header)": "सेक्टर",
        "अनिवार्यता (Requirement)": "अनुशंसित (Recommended)",
        "नियम व विवरण (Instructions & Guidelines)": "ड्यूटी सेक्टर का नाम या संख्या।",
        "मानक उदाहरण (Sample Value)": "सेक्टर-01 (मुख्य प्रवेश द्वार)"
      },
      {
        "कॉलम शीर्षक (Column Header)": "सेक्टर प्रभारी",
        "अनिवार्यता (Requirement)": "अत्यंत महत्वपूर्ण (CRITICAL)",
        "नियम व विवरण (Instructions & Guidelines)": "सेक्टर प्रभारी का पद, नाम व मोबाइल नंबर। यदि एक सेक्टर में केवल 1 पंक्ति में भर देंगे तो उस सेक्टर के सभी जवानों के कार्ड में सेक्टर प्रभारी स्वतः प्रिंट होगा!",
        "मानक उदाहरण (Sample Value)": "निरीक्षक कोतवाली, अयोध्या (9454402655)"
      },
      {
        "कॉलम शीर्षक (Column Header)": "ड्यूटी स्थल",
        "अनिवार्यता (Requirement)": "अनिवार्य (MANDATORY)",
        "नियम व विवरण (Instructions & Guidelines)": "ड्यूटी प्वाइंट का स्पष्ट नाम जहां जवान तैनात रहेगा।",
        "मानक उदाहरण (Sample Value)": "राम जन्मभूमि परिसर - मुख्य द्वार बैरियर-A"
      },
      {
        "कॉलम शीर्षक (Column Header)": "ड्यूटी समय / शिफ्ट",
        "अनिवार्यता (Requirement)": "अनुशंसित (Recommended)",
        "नियम व विवरण (Instructions & Guidelines)": "ड्यूटी की पाली अथवा समय (उदा० प्रातः 06:00 से दोपहर 02:00)।",
        "मानक उदाहरण (Sample Value)": "प्रातः 06:00 बजे से दोपहर 02:00 बजे तक"
      },
      {
        "कॉलम शीर्षक (Column Header)": "ब्रीफिंग स्थल",
        "अनिवार्यता (Requirement)": "अनुशंसित (Recommended)",
        "नियम व विवरण (Instructions & Guidelines)": "ब्रीफिंग का स्थान व समय।",
        "मानक उदाहरण (Sample Value)": "पुलिस लाइन परेड ग्राउंड, अयोध्या"
      },
      {
        "कॉलम शीर्षक (Column Header)": "शस्त्र",
        "अनिवार्यता (Requirement)": "वैकल्पिक (Optional)",
        "नियम व विवरण (Instructions & Guidelines)": "आवंटित शस्त्र की स्थिति (उदा० पिस्टल मय 10 चक्र, डंडा, लाठी, निहत्था)।",
        "मानक उदाहरण (Sample Value)": "पिस्टल मय 10 चक्र"
      }
    ];

    const wb = XLSX.utils.book_new();

    // Sheet 1: Duty_Roster
    const ws = XLSX.utils.json_to_sheet(sampleRoster);
    ws['!cols'] = [
      { wch: 8 },  // क्र० सं०
      { wch: 14 }, // पीएनओ
      { wch: 10 }, // पद
      { wch: 22 }, // नाम
      { wch: 14 }, // मोबाइल
      { wch: 20 }, // मूल तैनाती / थाना
      { wch: 12 }, // जनपद
      { wch: 24 }, // जोन
      { wch: 34 }, // जोनल प्रभारी
      { wch: 28 }, // सेक्टर
      { wch: 36 }, // सेक्टर प्रभारी
      { wch: 38 }, // ड्यूटी स्थल
      { wch: 30 }, // ड्यूटी समय / शिफ्ट
      { wch: 32 }, // ब्रीफिंग स्थल
      { wch: 20 }  // शस्त्र
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Duty_Roster");

    // Sheet 2: Instructions_निर्देश
    const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
    wsInstructions['!cols'] = [
      { wch: 26 }, // कॉलम शीर्षक
      { wch: 20 }, // अनिवार्यता
      { wch: 65 }, // नियम व विवरण
      { wch: 36 }  // मानक उदाहरण
    ];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instructions_निर्देश");

    XLSX.writeFile(wb, "Police_Duty_Roster_Standard_Template.xlsx");
    setStatusMsg({ type: 'success', text: 'मानक पुलिस ड्यूटी एक्सेल टेम्पलेट (Police_Duty_Roster_Standard_Template.xlsx) 2 शीट्स सहित सफलतापूर्वक डाउनलोड हो गया है।' });
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Police_Duty_${(eventTitle || 'Database').replace(/\s+/g, '_')}_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMsg({ type: 'success', text: 'पूर्ण डेटाबेस JSON बैकअप सफलतापूर्वक डाउनलोड हो गया है।' });
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result);
        if (Array.isArray(imported) && imported.length > 0) {
          if (uploadMode === 'append' && records && records.length > 0) {
            const merged = [...records, ...imported];
            onUpdateRecords(merged);
            setStatusMsg({ type: 'success', text: `सफलतापूर्वक ${imported.length} ड्यूटी रिकॉर्ड्स जोड़े गए! अब कुल: ${merged.length} जवान।` });
          } else {
            onUpdateRecords(imported);
            setStatusMsg({ type: 'success', text: `सफलतापूर्वक ${imported.length} ड्यूटी रिकॉर्ड्स JSON बैकअप से लोड किए गए!` });
          }
        } else {
          alert('अमान्य JSON बैकअप फ़ाइल।');
        }
      } catch (err) {
        alert('JSON पढ़ने में त्रुटि: ' + err.message);
      }
    };
    reader.readAsText(file);
    if (jsonImportRef.current) jsonImportRef.current.value = '';
  };

  const handleClearData = () => {
    if (window.confirm(`⚠️ क्या आप "${eventTitle}" का संपूर्ण ड्यूटी डेटा हटाकर रीसेट करना चाहते हैं?`)) {
      onUpdateRecords([]);
      setStatusMsg({ type: 'success', text: 'समस्त ड्यूटी रिकॉर्ड्स हटा दिए गए हैं।' });
    }
  };

  const filteredRecords = records.filter(r =>
    (r.name || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (r.mobile || '').includes(filterQuery) ||
    (r.duty_place || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (r.zone || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
    (r.sector || '').toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 font-devanagari text-slate-950">
      {/* Active Event Selector Banner */}
      {events.length > 0 && (
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-bold">सक्रिय इवेंट:</div>
              <div className="text-base sm:text-lg font-black text-slate-950">{eventTitle}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-600 shrink-0">इवेंट स्विच करें:</label>
            <select
              value={activeEventId}
              onChange={(e) => onSelectActiveEvent?.(e.target.value)}
              className="bg-slate-50 text-slate-900 border border-slate-300 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-auto cursor-pointer"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title} ({evt.records?.length || 0} बल)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Top Attendance & Reporting Dashboard Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
              लाइव उपस्थिति
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 font-black font-mono border border-emerald-300">
                {attendancePercent}% उपस्थित
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              उपस्थित: <strong className="text-slate-900">{reportedCount}</strong> / {totalCount} जवान
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkPdfModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-slate-300" />
            <span>बल्क पास प्रिंट / PDF</span>
          </button>
        </div>
      </div>

      {/* 1. TOP EXCEL UPLOAD DROPZONE */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 text-center space-y-3.5 shadow-xs relative overflow-hidden transition">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-6 h-6" />
        </div>

        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {eventTitle}
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
            ड्यूटी एक्सेल शीट अपलोड करें
          </h2>
        </div>

        {/* Upload Mode Selector */}
        <div className="max-w-md mx-auto bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setUploadMode('append')}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              uploadMode === 'append'
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70 font-medium'
            }`}
          >
            <span>पुराने डेटा में जोड़ें</span>
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('replace')}
            className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              uploadMode === 'replace'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70 font-medium'
            }`}
          >
            <span>नया डेटा बदलें</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.docx,.json"
            onChange={handleFileChange}
            className="hidden"
            id="excel-file-input"
          />
          <label
            htmlFor="excel-file-input"
            className="cursor-pointer px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer active:scale-98"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>एक्सेल फ़ाइल चुनें और अपलोड करें</span>
          </label>

          <button
            onClick={handleDownloadSampleExcel}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl border border-emerald-600 flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-98"
            title="मानक 2-शीट पुलिस ड्यूटी एक्सेल टेम्पलेट डाउनलोड करें"
          >
            <Download className="w-4 h-4" />
            <span>मानक Excel टेम्पलेट डाउनलोड</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTemplateGuide(!showTemplateGuide)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span>शीट प्रारूप गाइड {showTemplateGuide ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* Collapsible Excel Format Guidelines Section */}
        {showTemplateGuide && (
          <div className="mt-4 p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-amber-50/40 rounded-2xl border border-amber-200/80 shadow-xs text-left space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-black shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900">
                    📋 मानक पुलिस ड्यूटी एक्सेल प्रारूप गाइड (Excel Template Guidelines)
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    इस प्रारूप का उपयोग करने से कभी भी सेक्टर प्रभारी, ड्यूटी स्थल या मोबाइल नंबर की समस्या नहीं आएगी।
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadSampleExcel}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>रेडी टेम्पलेट (.xlsx) लें</span>
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1. ऑटो सेक्टर प्रभारी लिंक</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  एक सेक्टर में सिर्फ 1 जवान के आगे सेक्टर प्रभारी लिख देने से उस सेक्टर के बाकी सभी जवानों के ड्यूटी कार्ड में सेक्टर प्रभारी स्वतः जुड़ जाता है।
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-blue-800 font-black text-xs">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>2. स्लैश (/) ऑटो-स्प्लिट</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  यदि सेक्टर कॉलम में <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">सेक्टर-1 / उ0नि0 राम प्रकाश (9454402655)</code> एक साथ लिखा है, तो सिस्टम सेक्टर व प्रभारी को अपने आप अलग कर लेता है।
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 font-black text-xs">
                  <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>3. PNO व 10-अंक मोबाइल</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  जवान PNO या मोबाइल से कार्ड सर्च करते हैं। वैज्ञानिक संख्या प्रारूप (उदा० 9.45E+09) को सिस्टम स्वतः सामान्य नंबर में बदल देता है।
                </p>
              </div>
            </div>

            {/* Column Reference Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 text-slate-800 font-black border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">कॉलम नाम</th>
                    <th className="p-2.5">स्थिति</th>
                    <th className="p-2.5">विवरण व सुझाव</th>
                    <th className="p-2.5">उदाहरण</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-bold text-slate-900">नाम (Name)</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">अनिवार्य</span></td>
                    <td className="p-2.5">जवान/अधिकारी का नाम</td>
                    <td className="p-2.5 font-mono text-[11px]">अमित कुमार</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-bold text-slate-900">मोबाइल (Mobile)</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">अनिवार्य</span></td>
                    <td className="p-2.5">10 अंकों का फोन नंबर (सर्च व व्हाट्सएप हेतु)</td>
                    <td className="p-2.5 font-mono text-[11px]">9454400001</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-bold text-slate-900">ड्यूटी स्थल (Duty Point)</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">अनिवार्य</span></td>
                    <td className="p-2.5">तैनाती का सटीक प्वाइंट / बैरियर</td>
                    <td className="p-2.5 font-mono text-[11px]">राम जन्मभूमि - मुख्य द्वार</td>
                  </tr>
                  <tr className="hover:bg-amber-50/60 bg-amber-50/30">
                    <td className="p-2.5 font-bold text-slate-900">सेक्टर प्रभारी (Sector Incharge)</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">अत्यंत महत्वपूर्ण</span></td>
                    <td className="p-2.5">सेक्टर अधिकारी का पद, नाम व सीयूजी (1 सेक्टर में 1 बार भी काफी है)</td>
                    <td className="p-2.5 font-mono text-[11px]">निरीक्षक कोतवाली (9454402655)</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-bold text-slate-900">सेक्टर (Sector)</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">अनुशंसित</span></td>
                    <td className="p-2.5">सेक्टर का नाम या नंबर</td>
                    <td className="p-2.5 font-mono text-[11px]">सेक्टर-01 (मंदिर क्षेत्र)</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-bold text-slate-900">जोन व जोनल प्रभारी</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">अनुशंसित</span></td>
                    <td className="p-2.5">जोन व जोनल अधिकारी विवरण</td>
                    <td className="p-2.5 font-mono text-[11px]">जोन-01 / क्षेत्राधिकारी नगर</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-bold text-slate-900">पीएनओ व पद (PNO & Rank)</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">अनुशंसित</span></td>
                    <td className="p-2.5">PNO संख्या व पदनाम (उ0नि0, का0 आदि)</td>
                    <td className="p-2.5 font-mono text-[11px]">182340202 | उ0नि0</td>
                  </tr>
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-bold text-slate-900">मूल तैनाती, समय, शस्त्र, ब्रीफिंग</td>
                    <td className="p-2.5"><span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">वैकल्पिक</span></td>
                    <td className="p-2.5">थाना, ड्यूटी समय/शिफ्ट, शस्त्र स्थिति व ब्रीफिंग स्थल</td>
                    <td className="p-2.5 font-mono text-[11px]">थाना कैंट | 06:00-14:00 | लाठी</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-between gap-2 shadow-sm ${
          statusMsg.type === 'success' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-rose-100 text-rose-950 border border-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-500 hover:text-slate-950">✕</button>
        </div>
      )}

      {/* 2. UNIFIED SETTINGS SECTION (ALL 4 SETTINGS IN A 2x2 GRID) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-base font-black text-slate-900">
            पोर्टल व ड्यूटी पास सेटिंग्स
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* SETTING 1: EVENT HEADINGS */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 flex items-center justify-center shrink-0">
                  <Type className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    मेला / कार्यक्रम का शीर्षक
                  </h3>
                </div>
              </div>

              <form onSubmit={handleSaveHeadings} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    मुख्य शीर्षक:
                  </label>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g. श्रावण झूला मेला"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    उप-शीर्षक / जनपद:
                  </label>
                  <input
                    type="text"
                    value={subtitleInput}
                    onChange={(e) => setSubtitleInput(e.target.value)}
                    placeholder="e.g. ड्यूटी कार्ड अयोध्या-2026"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    {headingsSaved ? <Check className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                    <span>{headingsSaved ? 'सहेजा गया!' : 'शीर्षक सहेजें'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* SETTING 2: OFFICIAL SIGNATURE & DESIGNATION */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 flex items-center justify-center shrink-0">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    हस्ताक्षर व पदनाम
                  </h3>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    हस्ताक्षरकर्ता पदनाम:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={signText}
                      onChange={(e) => setSignText(e.target.value)}
                      placeholder="e.g. वरिष्ठ पुलिस अधीक्षक, अयोध्या"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-black text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSignatoryText}
                      className="h-10 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer transition active:scale-95"
                    >
                      {signatureSaved ? '✓ सहेजा गया' : 'सहेजें'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    हस्ताक्षर इमेज (PNG/JPG):
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      ref={signatureInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                      id="signature-file-input"
                    />
                    <label
                      htmlFor="signature-file-input"
                      className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-sm"
                    >
                      <ImageIcon className="w-4 h-4 text-amber-700" />
                      <span>हस्ताक्षर इमेज चुनें</span>
                    </label>

                    {signaturePreview && (
                      <button
                        type="button"
                        onClick={handleRemoveSignature}
                        className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 rounded-xl text-xs font-black cursor-pointer"
                      >
                        हटाएं ✕
                      </button>
                    )}
                  </div>

                  {signaturePreview && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={signaturePreview}
                          alt="Signature Preview"
                          className="h-10 max-w-[120px] object-contain bg-white border rounded p-1"
                        />
                        <span className="text-[11px] font-bold text-emerald-800">हस्ताक्षर सक्रिय है ✓</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SETTING 3: NOTE SETTINGS */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 flex items-center justify-center shrink-0">
                    <FileEdit className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">
                      नोट
                    </h3>
                  </div>
                </div>

                <ToggleSwitch
                  enabled={noteToggle}
                  onChange={handleToggleNote}
                />
              </div>

              <form onSubmit={handleSaveNoteSetting} className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    नोट टेक्स्ट (खाली रखने पर रो नहीं दिखेगी):
                  </label>
                  <textarea
                    rows={2}
                    value={noteText}
                    disabled={!noteToggle}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="यदि यहाँ लिखेंगे तभी नोट दिखेगा..."
                    className={`w-full p-3 bg-slate-50 border rounded-xl text-xs sm:text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition ${
                      !noteToggle ? 'opacity-50 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNoteText('');
                      handleToggleNote(false);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-rose-100 text-rose-800 text-xs rounded-xl border border-slate-300 font-black cursor-pointer"
                  >
                    नोट हटाएं
                  </button>

                  <button
                    type="submit"
                    className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    {noteSaved ? <Check className="w-3.5 h-3.5" /> : <FileEdit className="w-3.5 h-3.5" />}
                    <span>{noteSaved ? 'सहेजा गया!' : 'नोट सहेजें'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* SETTING 4: BRIEFING PLACE SETTINGS */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-950">
                      ब्रीफिंग स्थल
                    </h3>
                  </div>
                </div>

                <ToggleSwitch
                  enabled={briefingToggle}
                  onChange={handleToggleBriefing}
                />
              </div>

              <form onSubmit={handleSaveBriefingSetting} className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-900 mb-1">
                    ब्रीफिंग स्थान (खाली रखने पर रो नहीं दिखेगी):
                  </label>
                  <textarea
                    rows={2}
                    value={briefingText}
                    disabled={!briefingToggle}
                    onChange={(e) => setBriefingText(e.target.value)}
                    placeholder="उदा: नियंत्रण कक्ष अयोध्या / संबंधित थाना..."
                    className={`w-full p-3 bg-slate-50 border rounded-xl text-xs sm:text-sm font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition ${
                      !briefingToggle ? 'opacity-50 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setBriefingText('');
                      handleToggleBriefing(false);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-rose-100 text-rose-800 text-xs rounded-xl border border-slate-300 font-black cursor-pointer"
                  >
                    स्थान हटाएं
                  </button>

                  <button
                    type="submit"
                    className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    {briefingSaved ? <Check className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                    <span>{briefingSaved ? 'सहेजा गया!' : 'स्थान सहेजें'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* SETTING 5: CUSTOM COLUMN LABELS / HEADINGS (FULL WIDTH) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">
                  ड्यूटी पास टेबल हेडिंग्स (कॉलम नाम)
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setLabelsInput({
                  duty_place: '',
                  shift: '',
                  zone: '',
                  zonal_incharge: '',
                  sector: '',
                  sector_incharge: '',
                  briefing: ''
                });
                if (onUpdateCustomLabels) onUpdateCustomLabels({});
                setStatusMsg({ type: 'success', text: 'कॉलम हेडिंग्स डिफ़ॉल्ट पर रीसेट कर दी गई हैं।' });
              }}
              className="text-xs font-black text-slate-600 hover:text-slate-950 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 cursor-pointer"
            >
              डिफ़ॉल्ट नाम रीसेट करें
            </button>
          </div>

          <form onSubmit={handleSaveCustomLabels} className="space-y-4 pt-1 text-xs font-bold">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className="text-slate-800 font-black">
                  1. 'ड्यूटी का स्थान' हेडिंग:
                </label>
                <input
                  type="text"
                  value={labelsInput.duty_place}
                  onChange={(e) => setLabelsInput({ ...labelsInput, duty_place: e.target.value })}
                  placeholder="डिफ़ॉल्ट: ड्यूटी का स्थान (या पिकेट/बैरियर)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white mt-1"
                />
              </div>

              <div>
                <label className="text-slate-800 font-black">
                  2. 'दिनाँक व समय' हेडिंग:
                </label>
                <input
                  type="text"
                  value={labelsInput.shift}
                  onChange={(e) => setLabelsInput({ ...labelsInput, shift: e.target.value })}
                  placeholder="डिफ़ॉल्ट: दिनाँक व समय (या पाली/समय)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white mt-1"
                />
              </div>

              <div>
                <label className="text-slate-800 font-black">
                  3. 'जोन / व्यवस्था' हेडिंग:
                </label>
                <input
                  type="text"
                  value={labelsInput.zone}
                  onChange={(e) => setLabelsInput({ ...labelsInput, zone: e.target.value })}
                  placeholder="डिफ़ॉल्ट: जोन / व्यवस्था (या सर्किल/क्षेत्र)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white mt-1"
                />
              </div>

              <div>
                <label className="text-slate-800 font-black">
                  4. 'जोनाल प्रभारी' हेडिंग:
                </label>
                <input
                  type="text"
                  value={labelsInput.zonal_incharge}
                  onChange={(e) => setLabelsInput({ ...labelsInput, zonal_incharge: e.target.value })}
                  placeholder="डिफ़ॉल्ट: जोनाल प्रभारी (या क्षेत्राधिकारी/नोडल)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white mt-1"
                />
              </div>

              <div>
                <label className="text-slate-800 font-black">
                  5. 'सेक्टर' हेडिंग:
                </label>
                <input
                  type="text"
                  value={labelsInput.sector}
                  onChange={(e) => setLabelsInput({ ...labelsInput, sector: e.target.value })}
                  placeholder="डिफ़ॉल्ट: सेक्टर (या थाना क्षेत्र/चौकी)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white mt-1"
                />
              </div>

              <div>
                <label className="text-slate-800 font-black">
                  6. 'सेक्टर प्रभारी' हेडिंग:
                </label>
                <input
                  type="text"
                  value={labelsInput.sector_incharge}
                  onChange={(e) => setLabelsInput({ ...labelsInput, sector_incharge: e.target.value })}
                  placeholder="डिफ़ॉल्ट: सेक्टर प्रभारी (या प्रभारी निरीक्षक)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white mt-1"
                />
              </div>

              <div>
                <label className="text-slate-800 font-black">
                  7. 'ब्रीफिंग स्थान' हेडिंग:
                </label>
                <input
                  type="text"
                  value={labelsInput.briefing}
                  onChange={(e) => setLabelsInput({ ...labelsInput, briefing: e.target.value })}
                  placeholder="डिफ़ॉल्ट: ब्रीफिंग स्थान (या एकत्रीकरण स्थल)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
              >
                {labelsSaved ? <Check className="w-4 h-4 stroke-[3] text-emerald-400" /> : <Layers className="w-4 h-4 text-amber-400" />}
                <span>{labelsSaved ? 'हेडिंग्स सहेजी गईं!' : 'कॉलम हेडिंग्स सहेजें'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* SETTING 6: MANUAL HELPLINE / EMERGENCY SUPPORT NUMBERS (FULL WIDTH) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">
                  कंट्रोल रूम व हेल्पलाइन नंबर
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ToggleSwitch
                enabled={helplineToggle}
                onChange={handleToggleHelpline}
              />
            </div>
          </div>

          <form onSubmit={handleSaveHelplineSetting} className="space-y-4 pt-1 text-xs font-bold">
            <div className="space-y-3">
              {helplineContacts.map((contact, idx) => (
                <div
                  key={contact.id || idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="w-full sm:w-1/2">
                    <label className="text-[11px] font-black text-slate-700 block mb-1">
                      संपर्क / पदनाम:
                    </label>
                    <input
                      type="text"
                      value={contact.title || ''}
                      disabled={!helplineToggle}
                      onChange={(e) => handleUpdateContactItem(idx, 'title', e.target.value)}
                      placeholder="उदा: पुलिस कंट्रोल रूम (अयोध्या)"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="w-full sm:w-5/12">
                    <label className="text-[11px] font-black text-slate-700 block mb-1">
                      मोबाइल / हेल्पलाइन नंबर:
                    </label>
                    <input
                      type="text"
                      value={contact.number || ''}
                      disabled={!helplineToggle}
                      onChange={(e) => handleUpdateContactItem(idx, 'number', e.target.value)}
                      placeholder="उदा: 112 / 9454401000"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex sm:self-end pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleRemoveContactItem(idx)}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition cursor-pointer"
                      title="यह नंबर हटाएं"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddHelplineContact}
                disabled={!helplineToggle}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>+ नया हेल्पलाइन नंबर जोड़ें</span>
              </button>

              <button
                type="submit"
                className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
              >
                {helplineSaved ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Phone className="w-3.5 h-3.5" />}
                <span>{helplineSaved ? 'हेल्पलाइन सहेजी गई!' : 'हेल्पलाइन नंबर सहेजें'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Uploaded Duty Records Table with Add/Edit/Delete Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-6 h-6 text-amber-700" />
            <h3 className="text-base font-black text-slate-950">
              "{eventTitle}" ड्यूटी आवंटन तालिका ({records.length} कुल जवान)
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsBulkPdfModalOpen(true)}
                className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                title="ड्यूटी पास बल्क PDF डाउनलोड या प्रिंट करें"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-400" />
                <span>बल्क पास प्रिंट / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenDutyModal(null)}
                className="h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ नया ड्यूटी पास जोड़ें</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="खोजें..."
                  className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={onResetToDefault}
                className="h-9 w-9 p-0 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200/90 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs transition active:scale-95"
                title="डिफ़ॉल्ट डेटा रीसेट करें"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              </button>

              <button
                type="button"
                onClick={handleClearData}
                className="h-9 w-9 p-0 bg-white hover:bg-rose-50 text-rose-600 rounded-xl border border-rose-200 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs transition active:scale-95"
                title="डेटा साफ़ करें"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs sm:text-sm text-slate-950">
            <thead className="bg-slate-100 text-slate-950 font-black border-b border-slate-200">
              <tr>
                <th className="p-3 border-r border-slate-200">फोटो</th>
                <th className="p-3 border-r border-slate-200">ID</th>
                <th className="p-3 border-r border-slate-200">नाम एवं पदनाम</th>
                <th className="p-3 border-r border-slate-200">मोबाईल नंबर</th>
                <th className="p-3 border-r border-slate-200">ड्यूटी स्थान</th>
                <th className="p-3 border-r border-slate-200">जोन / सेक्टर</th>
                <th className="p-3 border-r border-slate-200">उपस्थिति</th>
                <th className="p-3 text-right">कार्रवाई</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-medium">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => {
                  const isReported = !!attendanceMap[r.id];
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 border-r border-slate-200 text-center">
                        {r.photo ? (
                          <img src={r.photo} alt={r.name} className="w-8 h-8 rounded-full object-cover mx-auto border border-slate-400" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-[9px] font-bold">
                            फोटो
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-amber-900 font-bold border-r border-slate-200">{r.id}</td>
                      <td className="p-3 font-bold text-slate-950 border-r border-slate-200">{r.name} ({r.rank || 'जवान'})</td>
                      <td className="p-3 font-mono text-emerald-950 font-bold bg-emerald-50/50 border-r border-slate-200">{r.mobile}</td>
                      <td className="p-3 font-bold text-slate-950 border-r border-slate-200">{r.duty_place || '-'}</td>
                      <td className="p-3 text-slate-700 border-r border-slate-200">{r.zone || '-'} / {r.sector || '-'}</td>
                      <td className="p-3 border-r border-slate-200">
                        {isReported ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
                            उपस्थित
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                            लंबित
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDutyModal(r)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition cursor-pointer"
                            title="संशोधित करें"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDutyRecord(r.id, r.name)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition cursor-pointer"
                            title="हटाएं"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500 font-bold">
                    "{eventTitle}" के लिए कोई ड्यूटी रिकॉर्ड नहीं मिला। ऊपर "+ नया ड्यूटी पास जोड़ें" क्लिक करें या Excel अपलोड करें।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Duty Record Modal */}
      {isDutyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-devanagari">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-slate-950 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base sm:text-lg font-black text-slate-950">
                {editingDuty ? 'ड्यूटी आवंटन संशोधित करें' : `+ "${eventTitle}" हेतु नया पास जोड़ें`}
              </h3>
              <button
                type="button"
                onClick={() => setIsDutyModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-950 bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDutyRecord} className="space-y-3 text-xs sm:text-sm font-bold">
              {/* Photo Upload in Modal */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4">
                <div className="w-14 h-16 border border-slate-300 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {dutyFormData.photo ? (
                    <img src={dutyFormData.photo} alt="Officer Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-slate-400" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-900">जवान की पासपोर्ट फोटो अपलोड करें:</div>
                  <input
                    ref={officerPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleOfficerPhotoUpload}
                    className="hidden"
                    id="officer-modal-photo-input"
                  />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="officer-modal-photo-input"
                      className="cursor-pointer px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      फोटो चुनें
                    </label>

                    {dutyFormData.photo && (
                      <button
                        type="button"
                        onClick={() => setDutyFormData({ ...dutyFormData, photo: '' })}
                        className="px-2.5 py-1.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-xs font-black cursor-pointer"
                      >
                        हटाएं ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 mb-1">ID (पी.एन. नंबर)</label>
                  <input
                    type="text"
                    value={dutyFormData.id}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-amber-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-800 mb-1">पदनाम</label>
                  <select
                    value={dutyFormData.rank}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, rank: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-950"
                  >
                    <option value="उ0नि0">उ0नि0 (उप-निरीक्षक)</option>
                    <option value="नि0">नि0 (निरीक्षक)</option>
                    <option value="हे0का0">हे0का0 (मुख्य आरक्षी)</option>
                    <option value="का0">का0 (आरक्षी)</option>
                    <option value="म0का0">म0का0 (महिला आरक्षी)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 mb-1">पूरा नाम</label>
                  <input
                    type="text"
                    value={dutyFormData.name}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, name: e.target.value })}
                    placeholder="e.g. अमित कुमार"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-950"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-800 mb-1">मोबाईल नंबर</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={dutyFormData.mobile}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, mobile: e.target.value })}
                    placeholder="9454400001"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-slate-950"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 mb-1">ड्यूटी का स्थान</label>
                <input
                  type="text"
                  value={dutyFormData.duty_place}
                  onChange={(e) => setDutyFormData({ ...dutyFormData, duty_place: e.target.value })}
                  placeholder="e.g. राम जन्मभूमि परिसर - मुख्य द्वार"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-slate-950"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 mb-1">जोन</label>
                  <input
                    type="text"
                    value={dutyFormData.zone}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, zone: e.target.value })}
                    placeholder="e.g. जोन-01 (मंदिर परिसर)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 mb-1">सेक्टर</label>
                  <input
                    type="text"
                    value={dutyFormData.sector}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, sector: e.target.value })}
                    placeholder="e.g. सेक्टर-01 (मुख्य प्रवेश द्वार)"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 mb-1">जोनल प्रभारी</label>
                  <input
                    type="text"
                    value={dutyFormData.zonal_incharge}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, zonal_incharge: e.target.value })}
                    placeholder="e.g. क्षेत्राधिकारी अयोध्या - 9454401234"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 mb-1">सेक्टर प्रभारी</label>
                  <input
                    type="text"
                    value={dutyFormData.sector_incharge}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, sector_incharge: e.target.value })}
                    placeholder="e.g. प्रभारी निरीक्षक कोतवाली - 9454402655"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 mb-1">मूल तैनाती / थाना</label>
                  <input
                    type="text"
                    value={dutyFormData.posting}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, posting: e.target.value })}
                    placeholder="e.g. थाना कोतवाली"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-slate-800 mb-1">जनपद</label>
                  <input
                    type="text"
                    value={dutyFormData.district}
                    onChange={(e) => setDutyFormData({ ...dutyFormData, district: e.target.value })}
                    placeholder="e.g. अयोध्या"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-800 mb-1">ड्यूटी का समय / शिफ्ट</label>
                <input
                  type="text"
                  value={dutyFormData.shift}
                  onChange={(e) => setDutyFormData({ ...dutyFormData, shift: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDutyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer text-xs"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs cursor-pointer text-xs transition active:scale-95"
                >
                  सहेजें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Legal 4-in-1 PDF Download Modal */}
      <BulkLegalPdfModal
        isOpen={isBulkPdfModalOpen}
        onClose={() => setIsBulkPdfModalOpen(false)}
        records={records}
        eventTitle={eventTitle}
        eventSubtitle={eventSubtitle}
        signatureImg={signaturePreview || signatureImg}
        signatoryText={signText || signatoryText}
        customNote={noteText}
        isNoteEnabled={noteToggle}
        customBriefing={briefingText}
        isBriefingEnabled={briefingToggle}
      />
    </div>
  );
}
