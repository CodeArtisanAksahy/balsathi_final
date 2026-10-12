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
