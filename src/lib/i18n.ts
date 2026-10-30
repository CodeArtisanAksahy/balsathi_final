import type { AppLocale, AppRole, DevelopmentDomain } from "./domain";

type Messages = {
  appName: string;
  tagline: string;
  demoMode: string;
  signIn: string;
  signOut: string;
  language: string;
  welcome: string;
  worker: string;
  parent: string;
  admin: string;
  search: string;
  filters: string;
  save: string;
  cancel: string;
  syncPending: string;
  syncNow: string;
  latestSummary: string;
  recentObservations: string;
  completedMilestones: string;
  upcomingMilestones: string;
  recommendations: string;
  messages: string;
  reports: string;
  assistant: string;
  noData: string;
  childDirectory: string;
  dashboard: string;
  addChild: string;
  observations: string;
  milestones: string;
  analytics: string;
  settings: string;
  riskAttention: string;
  workerDashboard: string;
  parentHome: string;
  adminDashboard: string;
  communication: string;
  growth: string;
  totalChildren: string;
  myChildren: string;
  registered: string;
  thisWeek: string;
  followUps: string;
  network: string;
  online: string;
  offline: string;
  checking: string;
  developmentJourney: string;
  recordedMilestoneHistory: string;
  todaySummary: string;
  noDateAssessments: string;
  noMilestoneDefinitions: string;
  onTrack: string;
  needsSupport: string;
  atRisk: string;
  developmentOverview: string;
  domainWise: string;
  childrenNeedingAttention: string;
  childrenInScope: string;
  noChildrenAttention: string;
  viewAll: string;
  quickActions: string;
  voiceObservation: string;
  addPhoto: string;
  milestoneCheck: string;
  growthEntry: string;
  viewReports: string;
  progress: string;
  activities: string;
  recentUpdates: string;
  recentActivity: string;
  aiInsights: string;
  riskAssessment: string;
  notDiagnosis: string;
  reviewBeforeAction: string;
  activeFollowUps: string;
  reviewed: string;
  dismissed: string;
  observationsAnalyzed: string;
  needsReview: string;
  thisSession: string;
  falseFlags: string;
  fromRecords: string;
  followUpSummary: string;
  noActiveFollowUps: string;
  allClear: string;
  aiInsightFlag: string;
  whyNeedsAttention: string;
  flagged: string;
  reviewRequired: string;
  yes: string;
  no: string;
  recordedObservations: string;
  nextStep: string;
  nextStepText: string;
  markReviewed: string;
  viewRecommendations: string;
  viewProfile: string;
  addObservation: string;
  dismissFlag: string;
  developmentalDomainIndicators: string;
  noObsAvailable: string;
  allReviewedDismissed: string;
  recordObservation: string;
  documentObservation: string;
  observationMethod: string;
  child: string;
  selectChild: string;
  dateTime: string;
  observationLanguage: string;
  developmentalDomain: string;
  activityContext: string;
  activityContextPlaceholder: string;
  observationNotes: string;
  observationPlaceholder: string;
  workerNotes: string;
  workerNotesPlaceholder: string;
  linkMilestones: string;
  noMilestonesForDomain: string;
  followUpRequired: string;
  saveObservation: string;
  reportsTitle: string;
  generate: string;
  period: string;
  generated: string;
  noReports: string;
  generateOne: string;
  progressReport: string;
  basedOnSavedRecords: string;
  noLinkedChild: string;
  overallProgress: string;
  notEnoughAssessments: string;
  progressAppears: string;
  ofAssessedMilestones: string;
  savedReports: string;
  noSavedReport: string;
  downloadFullReport: string;
  viewProgressDetails: string;
  milestonesMet: string;
  home: string;
  children: string;
  newObservation: string;
  heightWeight: string;
  voiceObs: string;
  photoObs: string;
  aiInsightsSidebar: string;
  notifications: string;
  offlineSync: string;
  homeActivities: string;
  milestoneJourney: string;
  messageCenter: string;
  workerDashboardHeader: string;
  parentHomeHeader: string;
  adminPanel: string;
};

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

const messages: Record<AppLocale, Messages> = {
  en: {
    appName: "Balsathi AI",
    tagline: "Nurturing Every Child's Development Through AI",
    demoMode: "Demo mode with clearly labeled synthetic records",
    signIn: "Sign in",
    signOut: "Sign out",
    language: "Language",
    welcome: "Welcome back",
    worker: "Worker",
    parent: "Parent",
    admin: "Administrator",
    search: "Search",
    filters: "Filters",
    save: "Save",
    cancel: "Cancel",
    syncPending: "Pending sync",
    syncNow: "Sync now",
    latestSummary: "Latest summary",
    recentObservations: "Recent observations",
    completedMilestones: "Completed milestones",
    upcomingMilestones: "Upcoming milestones",
    recommendations: "Recommendations",
    messages: "Messages",
    reports: "Reports",
    assistant: "Balsathi AI Assistant",
    noData: "No records available yet.",
    childDirectory: "Children Directory",
    dashboard: "Dashboard",
    addChild: "Add Child",
    observations: "Observations",
    milestones: "Milestones",
    analytics: "Analytics",
    settings: "Settings",
    riskAttention: "Needs attention",
    workerDashboard: "Worker Dashboard",
    parentHome: "Parent Home",
    adminDashboard: "Admin Dashboard",
    communication: "Parent Communication",
    growth: "Growth",
    totalChildren: "Total Children",
    myChildren: "My Children",
    registered: "Registered",
    thisWeek: "This week",
    followUps: "Follow-ups",
    network: "Network",
    online: "Online",
    offline: "Offline",
    checking: "Checking",
    developmentJourney: "Development Journey",
    recordedMilestoneHistory: "Recorded milestone history by age and domain",
    todaySummary: "Today's Summary",
    noDateAssessments: "No dated assessments yet; the chart will fill in as milestones are updated.",
    noMilestoneDefinitions: "No milestone definitions or assessments are available yet.",
    onTrack: "On Track: recorded milestones achieved",
    needsSupport: "Needs Support: in progress / review",
    atRisk: "At Risk: high risk flag linked to domain",
    developmentOverview: "Development Overview",
    domainWise: "Domain-wise",
    childrenNeedingAttention: "Children Needing Attention",
    childrenInScope: "Children in your authorized scope",
    noChildrenAttention: "No children currently need attention.",
    viewAll: "View All",
    quickActions: "Quick Actions",
    voiceObservation: "Voice Observation",
    addPhoto: "Add Photo",
    milestoneCheck: "Milestone Check",
    growthEntry: "Growth Entry",
    viewReports: "View Reports",
    progress: "Progress",
    activities: "Activities",
    recentUpdates: "Recent Updates",
    recentActivity: "Recent activity for your linked children",
    aiInsights: "AI Insights & Risk Assessment",
    riskAssessment: "Risk Assessment",
    notDiagnosis: "Illustrative indicators compiled from recorded observations and milestone assessments. Not a clinical diagnosis.",
    reviewBeforeAction: "Review before action — not a diagnosis",
    activeFollowUps: "Active Follow-ups",
    reviewed: "Reviewed",
    dismissed: "Dismissed",
    observationsAnalyzed: "Observations Analyzed",
    needsReview: "Needs review",
    thisSession: "This session",
    falseFlags: "False flags",
    fromRecords: "From records",
    followUpSummary: "Follow-up Summary",
    noActiveFollowUps: "No active follow-ups. All clear!",
    allClear: "All clear!",
    aiInsightFlag: "AI Insight · Follow-up flag",
    whyNeedsAttention: "Why this needs attention",
    flagged: "Flagged",
    reviewRequired: "Review required",
    yes: "Yes",
    no: "No",
    recordedObservations: "Recorded observations",
    nextStep: "Next step",
    nextStepText: "Review the child's progress with their caregiver and explore age-appropriate activities. This flag is an indicator for follow-up, not a diagnosis.",
    markReviewed: "Mark Reviewed",
    viewRecommendations: "View Recommendations",
    viewProfile: "View Profile",
    addObservation: "Add Observation",
    dismissFlag: "Dismiss Flag",
    developmentalDomainIndicators: "Developmental Domain Indicators",
    noObsAvailable: "No observation details are available to show here.",
    allReviewedDismissed: "All flagged items have been reviewed or dismissed.",
    recordObservation: "Record Observation",
    documentObservation: "Document a child's developmental observation.",
    observationMethod: "Observation Method",
    child: "Child",
    selectChild: "Select child…",
    dateTime: "Date & Time",
    observationLanguage: "Observation Language",
    developmentalDomain: "Developmental Domain",
    activityContext: "Activity Context",
    activityContextPlaceholder: "e.g., Story circle, outdoor play",
    observationNotes: "Observation Notes",
    observationPlaceholder: "Describe what you observed…",
    workerNotes: "Worker Notes",
    workerNotesPlaceholder: "Additional notes for follow-up…",
    linkMilestones: "Link Milestones (optional)",
    noMilestonesForDomain: "No milestones for this domain.",
    followUpRequired: "Follow-up required",
    saveObservation: "Save Observation",
    reportsTitle: "Reports",
    generate: "Generate",
    period: "Period",
    generated: "Generated",
    noReports: "No reports yet. Generate one for a child above.",
    generateOne: "Generate one for a child above.",
    progressReport: "Progress Report",
    basedOnSavedRecords: "Based on saved records",
    noLinkedChild: "No linked child record is available.",
    overallProgress: "Overall Progress",
    notEnoughAssessments: "Not enough assessments",
    progressAppears: "A progress percentage appears after milestone assessments are recorded.",
    ofAssessedMilestones: "Recorded milestones marked achieved",
    savedReports: "Saved reports",
    noSavedReport: "No saved report yet.",
    downloadFullReport: "Download Full Report",
    viewProgressDetails: "View progress details",
    milestonesMet: "Milestones",
    home: "Home",
    children: "Children",
    newObservation: "New Observation",
    heightWeight: "Height & Weight",
    voiceObs: "Voice Observation",
    photoObs: "Photo Observation",
    aiInsightsSidebar: "AI Insights",
    notifications: "Notifications",
    offlineSync: "Offline & Sync",
    homeActivities: "Home Activities",
    milestoneJourney: "Milestone Journey",
    messageCenter: "Message Center",
    workerDashboardHeader: "Worker Dashboard",
    parentHomeHeader: "Parent Home",
    adminPanel: "Admin Panel",
  },
  hi: {
    appName: "Balsathi AI",
    tagline: "हर बच्चे के विकास को AI के साथ सहारा",
    demoMode: "डेमो मोड, जिसमें सिंथेटिक रिकॉर्ड स्पष्ट रूप से चिन्हित हैं",
    signIn: "साइन इन करें",
    signOut: "साइन आउट",
    language: "भाषा",
    welcome: "फिर से स्वागत है",
    worker: "कार्यकर्ता",
    parent: "अभिभावक",
    admin: "प्रशासक",
    search: "खोजें",
    filters: "फ़िल्टर",
    save: "सहेजें",
    cancel: "रद्द करें",
    syncPending: "सिंक लंबित",
    syncNow: "अभी सिंक करें",
    latestSummary: "नवीनतम सारांश",
    recentObservations: "हाल की टिप्पणियाँ",
    completedMilestones: "पूर्ण माइलस्टोन",
    upcomingMilestones: "आगामी माइलस्टोन",
    recommendations: "सुझाव",
    messages: "संदेश",
    reports: "रिपोर्ट",
    assistant: "Balsathi AI सहायक",
    noData: "अभी कोई रिकॉर्ड उपलब्ध नहीं है।",
    childDirectory: "बच्चों की निर्देशिका",
    dashboard: "डैशबोर्ड",
    addChild: "बच्चा जोड़ें",
    observations: "अवलोकन",
    milestones: "माइलस्टोन",
    analytics: "विश्लेषण",
    settings: "सेटिंग्स",
    riskAttention: "ध्यान आवश्यक",
    workerDashboard: "कार्यकर्ता डैशबोर्ड",
    parentHome: "अभिभावक होम",
    adminDashboard: "प्रशासक डैशबोर्ड",
    communication: "अभिभावक संवाद",
    growth: "विकास मापन",
    totalChildren: "कुल बच्चे",
    myChildren: "मेरे बच्चे",
    registered: "पंजीकृत",
    thisWeek: "इस सप्ताह",
    followUps: "अनुवर्ती",
    network: "नेटवर्क",
    online: "ऑनलाइन",
    offline: "ऑफलाइन",
    checking: "जाँच हो रही है",
    developmentJourney: "विकास यात्रा",
    recordedMilestoneHistory: "आयु और क्षेत्र के अनुसार दर्ज माइलस्टोन इतिहास",
    todaySummary: "आज का सारांश",
    noDateAssessments: "अभी तक कोई दिनांकित मूल्यांकन नहीं; माइलस्टोन अपडेट होने पर चार्ट भरेगा।",
    noMilestoneDefinitions: "अभी तक कोई माइलस्टोन परिभाषाएँ या मूल्यांकन उपलब्ध नहीं हैं।",
    onTrack: "ट्रैक पर: दर्ज माइलस्टोन प्राप्त",
    needsSupport: "सहायता आवश्यक: प्रगति में / समीक्षा",
    atRisk: "जोखिम में: उच्च जोखिम क्षेत्र से जुड़ा",
    developmentOverview: "विकास अवलोकन",
    domainWise: "क्षेत्र-वार",
    childrenNeedingAttention: "ध्यान आवश्यक बच्चे",
    childrenInScope: "आपके अधिकृत दायरे में बच्चे",
    noChildrenAttention: "फिलहाल किसी बच्चे को ध्यान की ज़रूरत नहीं।",
    viewAll: "सभी देखें",
    quickActions: "त्वरित कार्य",
    voiceObservation: "आवाज़ अवलोकन",
    addPhoto: "फोटो जोड़ें",
    milestoneCheck: "माइलस्टोन जाँच",
    growthEntry: "वृद्धि प्रविष्टि",
    viewReports: "रिपोर्ट देखें",
    progress: "प्रगति",
    activities: "गतिविधियाँ",
    recentUpdates: "हाल के अपडेट",
    recentActivity: "आपके जुड़े बच्चों की हाल की गतिविधि",
    aiInsights: "AI अंतर्दृष्टि और जोखिम मूल्यांकन",
    riskAssessment: "जोखिम मूल्यांकन",
    notDiagnosis: "दर्ज अवलोकन और माइलस्टोन मूल्यांकन से संकलित संकेतक। यह नैदानिक निदान नहीं है।",
    reviewBeforeAction: "कार्रवाई से पहले समीक्षा करें — यह निदान नहीं है",
    activeFollowUps: "सक्रिय अनुवर्ती",
    reviewed: "समीक्षित",
    dismissed: "खारिज",
    observationsAnalyzed: "विश्लेषित अवलोकन",
    needsReview: "समीक्षा आवश्यक",
    thisSession: "इस सत्र में",
    falseFlags: "गलत संकेत",
    fromRecords: "रिकॉर्ड से",
    followUpSummary: "अनुवर्ती सारांश",
    noActiveFollowUps: "कोई सक्रिय अनुवर्ती नहीं। सब ठीक है!",
    allClear: "सब ठीक है!",
    aiInsightFlag: "AI अंतर्दृष्टि · अनुवर्ती संकेत",
    whyNeedsAttention: "इस पर ध्यान क्यों आवश्यक है",
    flagged: "चिह्नित",
    reviewRequired: "समीक्षा आवश्यक",
    yes: "हाँ",
    no: "नहीं",
    recordedObservations: "दर्ज अवलोकन",
    nextStep: "अगला कदम",
    nextStepText: "बच्चे की देखभाल करने वाले के साथ उसकी प्रगति की समीक्षा करें और उम्र के अनुकूल गतिविधियाँ खोजें। यह संकेत अनुवर्ती के लिए है, निदान नहीं।",
    markReviewed: "समीक्षित चिह्नित करें",
    viewRecommendations: "सुझाव देखें",
    viewProfile: "प्रोफ़ाइल देखें",
    addObservation: "अवलोकन जोड़ें",
    dismissFlag: "संकेत खारिज करें",
    developmentalDomainIndicators: "विकास क्षेत्र संकेतक",
    noObsAvailable: "यहाँ दिखाने के लिए कोई अवलोकन विवरण उपलब्ध नहीं।",
    allReviewedDismissed: "सभी चिह्नित आइटम की समीक्षा की गई या खारिज किए गए।",
    recordObservation: "अवलोकन दर्ज करें",
    documentObservation: "बच्चे का विकासात्मक अवलोकन दस्तावेज़ करें।",
    observationMethod: "अवलोकन विधि",
    child: "बच्चा",
    selectChild: "बच्चा चुनें…",
    dateTime: "तारीख और समय",
    observationLanguage: "अवलोकन भाषा",
    developmentalDomain: "विकास क्षेत्र",
    activityContext: "गतिविधि संदर्भ",
    activityContextPlaceholder: "जैसे, कहानी मंडल, बाहरी खेल",
    observationNotes: "अवलोकन नोट्स",
    observationPlaceholder: "आपने क्या देखा, यह बताएं…",
    workerNotes: "कार्यकर्ता नोट्स",
    workerNotesPlaceholder: "अनुवर्ती के लिए अतिरिक्त नोट्स…",
    linkMilestones: "माइलस्टोन लिंक करें (वैकल्पिक)",
    noMilestonesForDomain: "इस क्षेत्र के लिए कोई माइलस्टोन नहीं।",
    followUpRequired: "अनुवर्ती आवश्यक",
    saveObservation: "अवलोकन सहेजें",
    reportsTitle: "रिपोर्ट",
    generate: "बनाएँ",
    period: "अवधि",
    generated: "बनाई गई",
    noReports: "अभी तक कोई रिपोर्ट नहीं। ऊपर किसी बच्चे के लिए बनाएँ।",
    generateOne: "ऊपर किसी बच्चे के लिए बनाएँ।",
    progressReport: "प्रगति रिपोर्ट",
    basedOnSavedRecords: "सहेजे गए रिकॉर्ड के आधार पर",
    noLinkedChild: "कोई जुड़ा हुआ बच्चा रिकॉर्ड उपलब्ध नहीं है।",
    overallProgress: "कुल प्रगति",
    notEnoughAssessments: "पर्याप्त मूल्यांकन नहीं",
    progressAppears: "माइलस्टोन मूल्यांकन दर्ज होने के बाद प्रगति प्रतिशत दिखेगा।",
    ofAssessedMilestones: "दर्ज माइलस्टोन प्राप्त चिह्नित",
    savedReports: "सहेजी गई रिपोर्ट",
    noSavedReport: "अभी तक कोई सहेजी हुई रिपोर्ट नहीं।",
    downloadFullReport: "पूरी रिपोर्ट डाउनलोड करें",
    viewProgressDetails: "प्रगति विवरण देखें",
    milestonesMet: "माइलस्टोन",
    home: "होम",
    children: "बच्चे",
    newObservation: "नया अवलोकन",
    heightWeight: "ऊंचाई और वजन",
    voiceObs: "आवाज़ अवलोकन",
    photoObs: "फोटो अवलोकन",
    aiInsightsSidebar: "AI अंतर्दृष्टि",
    notifications: "सूचनाएँ",
    offlineSync: "ऑफलाइन और सिंक",
    homeActivities: "घरेलू गतिविधियाँ",
    milestoneJourney: "माइलस्टोन यात्रा",
    messageCenter: "संदेश केंद्र",
    workerDashboardHeader: "कार्यकर्ता डैशबोर्ड",
    parentHomeHeader: "अभिभावक होम",
    adminPanel: "प्रशासक पैनल",
  },
  mr: {
    appName: "Balsathi AI",
    tagline: "प्रत्येक मुलाच्या विकासासाठी AI सोबत साथ",
    demoMode: "डेमो मोड, ज्यात सिंथेटिक नोंदी स्पष्टपणे दाखविल्या आहेत",
    signIn: "साइन इन",
    signOut: "साइन आउट",
    language: "भाषा",
    welcome: "पुन्हा स्वागत आहे",
    worker: "कार्यकर्ता",
    parent: "पालक",
    admin: "प्रशासक",
    search: "शोधा",
    filters: "फिल्टर्स",
    save: "जतन करा",
    cancel: "रद्द करा",
    syncPending: "सिंक प्रलंबित",
    syncNow: "आता सिंक करा",
    latestSummary: "ताजे सारांश",
    recentObservations: "अलीकडील निरीक्षणे",
    completedMilestones: "पूर्ण टप्पे",
    upcomingMilestones: "आगामी टप्पे",
    recommendations: "शिफारसी",
    messages: "संदेश",
    reports: "अहवाल",
    assistant: "Balsathi AI सहाय्यक",
    noData: "अजून कोणतीही नोंद उपलब्ध नाही.",
    childDirectory: "मुलांची यादी",
    dashboard: "डॅशबोर्ड",
    addChild: "मूल जोडा",
    observations: "निरीक्षणे",
    milestones: "टप्पे",
    analytics: "विश्लेषण",
    settings: "सेटिंग्ज",
    riskAttention: "लक्ष आवश्यक",
    workerDashboard: "कार्यकर्ता डॅशबोर्ड",
    parentHome: "पालक होम",
    adminDashboard: "प्रशासक डॅशबोर्ड",
    communication: "पालक संवाद",
    growth: "वाढ मोजमाप",
    totalChildren: "एकूण मुले",
    myChildren: "माझी मुले",
    registered: "नोंदणीकृत",
    thisWeek: "या आठवड्यात",
    followUps: "अनुवर्ती",
    network: "नेटवर्क",
    online: "ऑनलाइन",
    offline: "ऑफलाइन",
    checking: "तपासत आहे",
    developmentJourney: "विकास प्रवास",
    recordedMilestoneHistory: "वय आणि क्षेत्रानुसार नोंदलेला टप्पा इतिहास",
    todaySummary: "आजचा सारांश",
    noDateAssessments: "अद्याप दिनांकित मूल्यमापन नाही; टप्पे अपडेट झाल्यावर आलेख भरेल.",
    noMilestoneDefinitions: "अद्याप टप्पा व्याख्या किंवा मूल्यमापन उपलब्ध नाही.",
    onTrack: "मार्गावर: नोंदलेले टप्पे साधले",
    needsSupport: "मदत हवी: प्रगतीत / आढावा",
    atRisk: "धोक्यात: उच्च जोखीम क्षेत्राशी जोडलेले",
    developmentOverview: "विकास आढावा",
    domainWise: "क्षेत्र-निहाय",
    childrenNeedingAttention: "लक्ष आवश्यक मुले",
    childrenInScope: "तुमच्या अधिकृत कक्षेतील मुले",
    noChildrenAttention: "सध्या कोणत्याही मुलाला लक्ष देण्याची गरज नाही.",
    viewAll: "सर्व पहा",
    quickActions: "जलद क्रिया",
    voiceObservation: "आवाज निरीक्षण",
    addPhoto: "फोटो जोडा",
    milestoneCheck: "टप्पा तपासणी",
    growthEntry: "वाढ नोंद",
    viewReports: "अहवाल पहा",
    progress: "प्रगती",
    activities: "उपक्रम",
    recentUpdates: "अलीकडील अपडेट",
    recentActivity: "तुमच्या जोडलेल्या मुलांची अलीकडील क्रियाकलाप",
    aiInsights: "AI अंतर्दृष्टी आणि जोखीम मूल्यमापन",
    riskAssessment: "जोखीम मूल्यमापन",
    notDiagnosis: "नोंदलेल्या निरीक्षणे आणि टप्पा मूल्यमापनातून संकलित सूचक. हे क्लिनिकल निदान नाही.",
    reviewBeforeAction: "कार्यवाहीपूर्वी आढावा घ्या — हे निदान नाही",
    activeFollowUps: "सक्रिय अनुवर्ती",
    reviewed: "आढावा घेतलेले",
    dismissed: "नाकारलेले",
    observationsAnalyzed: "विश्लेषित निरीक्षणे",
    needsReview: "आढावा आवश्यक",
    thisSession: "या सत्रात",
    falseFlags: "चुकीचे संकेत",
    fromRecords: "नोंदींमधून",
    followUpSummary: "अनुवर्ती सारांश",
    noActiveFollowUps: "कोणतेही सक्रिय अनुवर्ती नाही. सर्व ठीक!",
    allClear: "सर्व ठीक!",
    aiInsightFlag: "AI अंतर्दृष्टी · अनुवर्ती संकेत",
    whyNeedsAttention: "यावर लक्ष का आवश्यक आहे",
    flagged: "चिन्हांकित",
    reviewRequired: "आढावा आवश्यक",
    yes: "होय",
    no: "नाही",
    recordedObservations: "नोंदलेली निरीक्षणे",
    nextStep: "पुढील पाऊल",
    nextStepText: "मुलाच्या काळजी घेणाऱ्यासह त्याच्या प्रगतीचा आढावा घ्या आणि वय-योग्य उपक्रम शोधा. हा संकेत अनुवर्तीसाठी आहे, निदान नाही.",
    markReviewed: "आढावा घेतला म्हणून चिन्हांकित करा",
    viewRecommendations: "शिफारसी पहा",
    viewProfile: "प्रोफाइल पहा",
    addObservation: "निरीक्षण जोडा",
    dismissFlag: "संकेत नाकारा",
    developmentalDomainIndicators: "विकास क्षेत्र सूचक",
    noObsAvailable: "येथे दाखवण्यासाठी कोणतेही निरीक्षण तपशील उपलब्ध नाहीत.",
    allReviewedDismissed: "सर्व चिन्हांकित आयटम आढावा घेतले किंवा नाकारले.",
    recordObservation: "निरीक्षण नोंदवा",
    documentObservation: "मुलाचे विकासात्मक निरीक्षण दस्तऐवजीकरण करा.",
    observationMethod: "निरीक्षण पद्धत",
    child: "मूल",
    selectChild: "मूल निवडा…",
    dateTime: "तारीख आणि वेळ",
    observationLanguage: "निरीक्षण भाषा",
    developmentalDomain: "विकास क्षेत्र",
    activityContext: "उपक्रम संदर्भ",
    activityContextPlaceholder: "उदा., गोष्टी मंडळ, बाहेरचा खेळ",
    observationNotes: "निरीक्षण नोट्स",
    observationPlaceholder: "तुम्ही काय पाहिले ते वर्णन करा…",
    workerNotes: "कार्यकर्ता नोट्स",
    workerNotesPlaceholder: "अनुवर्तीसाठी अतिरिक्त नोट्स…",
    linkMilestones: "टप्पे जोडा (पर्यायी)",
    noMilestonesForDomain: "या क्षेत्रासाठी कोणतेही टप्पे नाहीत.",
    followUpRequired: "अनुवर्ती आवश्यक",
    saveObservation: "निरीक्षण जतन करा",
    reportsTitle: "अहवाल",
    generate: "तयार करा",
    period: "कालावधी",
    generated: "तयार केले",
    noReports: "अद्याप अहवाल नाही. वर एखाद्या मुलासाठी तयार करा.",
    generateOne: "वर एखाद्या मुलासाठी तयार करा.",
    progressReport: "प्रगती अहवाल",
    basedOnSavedRecords: "जतन केलेल्या नोंदींवर आधारित",
    noLinkedChild: "कोणताही जोडलेला मुलाचा रेकॉर्ड उपलब्ध नाही.",
    overallProgress: "एकूण प्रगती",
    notEnoughAssessments: "पुरेसे मूल्यमापन नाही",
    progressAppears: "टप्पा मूल्यमापन नोंदल्यानंतर प्रगती टक्केवारी दिसेल.",
    ofAssessedMilestones: "नोंदलेले टप्पे साधले म्हणून चिन्हांकित",
    savedReports: "जतन केलेले अहवाल",
    noSavedReport: "अद्याप जतन केलेला अहवाल नाही.",
    downloadFullReport: "पूर्ण अहवाल डाउनलोड करा",
    viewProgressDetails: "प्रगती तपशील पहा",
    milestonesMet: "टप्पे",
    home: "होम",
    children: "मुले",
    newObservation: "नवीन निरीक्षण",
    heightWeight: "उंची आणि वजन",
    voiceObs: "आवाज निरीक्षण",
    photoObs: "फोटो निरीक्षण",
    aiInsightsSidebar: "AI अंतर्दृष्टी",
    notifications: "सूचना",
    offlineSync: "ऑफलाइन आणि सिंक",
    homeActivities: "घरगुती उपक्रम",
    milestoneJourney: "टप्पा प्रवास",
    messageCenter: "संदेश केंद्र",
    workerDashboardHeader: "कार्यकर्ता डॅशबोर्ड",
    parentHomeHeader: "पालक होम",
    adminPanel: "प्रशासक पॅनल",
  },
};

export function getMessages(locale: AppLocale): Messages {
  return messages[locale] ?? messages.en;
}

export function roleLabel(role: AppRole, locale: AppLocale): string {
  const dict = getMessages(locale);
  if (role === "WORKER") return dict.worker;
  if (role === "PARENT") return dict.parent;
  return dict.admin;
}

export function domainLabel(domain: DevelopmentDomain, locale: AppLocale): string {
  const labels: Record<DevelopmentDomain, Record<AppLocale, string>> = {
    PHYSICAL: { en: "Physical", hi: "शारीरिक", mr: "शारीरिक" },
    COGNITIVE: { en: "Cognitive", hi: "संज्ञानात्मक", mr: "संज्ञानात्मक" },
    LANGUAGE: { en: "Language", hi: "भाषा", mr: "भाषा" },
    SOCIAL: { en: "Social", hi: "सामाजिक", mr: "सामाजिक" },
    EMOTIONAL: { en: "Emotional", hi: "भावनात्मक", mr: "भावनिक" },
  };
  return labels[domain][locale];
}
