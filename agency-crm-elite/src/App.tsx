/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  CheckSquare, 
  TrendingUp, 
  Briefcase, 
  Calendar, 
  ChevronRight, 
  Plus, 
  X, 
  Search,
  Filter,
  DollarSign,
  Flame,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Trash2,
  FileText,
  FolderOpen,
  PieChart as PieChartIcon,
  Copy,
  Sparkles,
  ArrowUpRight,
  Download,
  Sliders
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { format } from 'date-fns';

// --- Types ---

type LeadStatus = 'New' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';
type LeadTemperature = 'Chaud' | 'Tiède' | 'Froid';
type ServiceType = 'Web' | 'SEO' | 'Design' | 'Consulting';

interface Document {
  id: string;
  name: string;
  type: string;
  date: string;
}

interface ClientNote {
  id: string;
  text: string;
  date: string;
  author: string;
}

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  need: string;
  budget: number;
  temperature: LeadTemperature;
  status: LeadStatus;
  serviceType: ServiceType;
  createdAt: number;
  documents: Document[];
  projectStatus?: string;
  projectProgress?: number;
  deliveryDate?: string;
  clientNotes?: ClientNote[];
}

interface Action {
  id: string;
  title: string;
  leadId?: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface Invoice {
  id: string;
  leadId: string;
  companyName: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  dueDate: string;
  createdAt: number;
}

type View = 'dashboard' | 'leads' | 'clients' | 'actions' | 'invoices' | 'statistics';

// --- Components ---

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: string }) => {
  const styles: Record<string, string> = {
    Chaud: 'bg-red-50 text-red-700 border-red-200',
    Tiède: 'bg-orange-50 text-orange-700 border-orange-200',
    Froid: 'bg-blue-50 text-blue-700 border-blue-200',
    Won: 'bg-green-50 text-green-700 border-green-200',
    New: 'bg-purple-50 text-purple-700 border-purple-200',
    default: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${styles[variant] || styles.default}`}>
      {children}
    </span>
  );
};

// --- Profiles for change account ---
interface AgentProfile {
  id: string;
  name: string;
  role: string;
  avatarSeed: string;
  email: string;
}

const AGENT_PROFILES: AgentProfile[] = [
  { id: '1', name: 'Marc-Antoine Dudon', role: 'Directeur de l\'Agence', avatarSeed: 'Marc', email: 'ma.dudon@elite.io' },
  { id: '2', name: 'Léa Joly', role: 'Chef de Projet Senior', avatarSeed: 'Lea', email: 'leajoly.hor@gmail.com' },
  { id: '3', name: 'Thibaut Mercier', role: 'Tech Lead Front-End', avatarSeed: 'Thibaut', email: 't.mercier@elite.io' },
];

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isNewActionModalOpen, setIsNewActionModalOpen] = useState(false);
  const [isNewInvoiceModalOpen, setIsNewInvoiceModalOpen] = useState(false);
  const [isAIMagicModalOpen, setIsAIMagicModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [proposalText, setProposalText] = useState('');
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [isAnalysingLead, setIsAnalysingLead] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile management
  const [currentProfile, setCurrentProfile] = useState<AgentProfile>(() => {
    const saved = localStorage.getItem('crm_current_profile');
    return saved ? JSON.parse(saved) : AGENT_PROFILES[1]; // default to Léa Joly
  });
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    const savedLeads = localStorage.getItem('crm_leads');
    const savedActions = localStorage.getItem('crm_actions');
    const savedInvoices = localStorage.getItem('crm_invoices');
    
    if (savedLeads) {
      try {
        const parsed = JSON.parse(savedLeads);
        const migrated = parsed.map((l: any) => ({
          ...l,
          projectStatus: l.projectStatus || 'Cadrage',
          projectProgress: l.projectProgress !== undefined ? l.projectProgress : 0,
          deliveryDate: l.deliveryDate || format(new Date(Date.now() + 86400000 * 45), 'yyyy-MM-dd'),
          documents: l.documents || [],
          clientNotes: l.clientNotes || [],
        }));
        setLeads(migrated);
      } catch (err) {
        console.error("Failed to parse saved leads:", err);
      }
    } else {
      // Seed Data
      const initialLeads: Lead[] = [
        {
          id: '1',
          companyName: 'Acme Corp',
          contactName: 'Thomas Martin',
          email: 't.martin@acme.com',
          need: 'Refonte globale du site web grand public et plateforme E-Commerce sous Next.js',
          budget: 15000,
          temperature: 'Chaud',
          status: 'Won',
          serviceType: 'Web',
          createdAt: Date.now() - 86400000 * 15,
          documents: [
            { id: '1', name: 'Charte Graphique.pdf', type: 'PDF', date: '2026-05-10' }
          ],
          projectStatus: 'Développement',
          projectProgress: 45,
          deliveryDate: '2026-07-20',
          clientNotes: [
            { id: 'n1', text: 'Réunion de cadrage validée. Maquettes Figma approuvées.', date: '2026-05-18 10:30', author: 'Léa Joly' },
            { id: 'n2', text: 'Configuration initiale de TypeScript, Tailwind v4 et routes de l\'application.', date: '2026-05-22 15:45', author: 'Thibaut Mercier' }
          ]
        },
        {
          id: '2',
          companyName: 'Starlight Agency',
          contactName: 'Marie Curie',
          email: 'm.curie@starlight.io',
          need: 'Audit de mots-clés SEO complet & Campagnes Google Ads optimisées',
          budget: 5000,
          temperature: 'Tiède',
          status: 'Won',
          serviceType: 'SEO',
          createdAt: Date.now() - 86400000 * 8,
          documents: [],
          projectStatus: 'Cadrage',
          projectProgress: 15,
          deliveryDate: '2026-06-15',
          clientNotes: [
            { id: 'n3', text: 'Analyses concurrentielles SEO terminées. Identification des opportunités clés.', date: '2026-05-24 11:15', author: 'Léa Joly' }
          ]
        },
        {
          id: '3',
          companyName: 'Global Tech',
          contactName: 'Alan Turing',
          email: 'a.turing@globaltech.com',
          need: 'Audit infrastructure sécurité pour conformité RGPD & Migration Cloud AWS',
          budget: 25000,
          temperature: 'Froid',
          status: 'Qualified',
          serviceType: 'Consulting',
          createdAt: Date.now() - 86400000 * 20,
          documents: [],
          projectStatus: 'Cadrage',
          projectProgress: 0,
          deliveryDate: '2026-08-30',
          clientNotes: []
        }
      ];
      setLeads(initialLeads);
    }

    if (savedActions) {
      setActions(JSON.parse(savedActions));
    } else {
      const initialActions: Action[] = [
        { id: 'a1', title: 'Relancer Acme pour la signature', dueDate: format(new Date(), 'yyyy-MM-dd'), completed: false, priority: 'high' },
        { id: 'a2', title: 'Préparer audit Global Tech', dueDate: format(new Date(Date.now() + 86400000 * 2), 'yyyy-MM-dd'), completed: false, priority: 'medium' }
      ];
      setActions(initialActions);
    }

    if (savedInvoices) {
      setInvoices(JSON.parse(savedInvoices));
    } else {
      const initialInvoices: Invoice[] = [
        {
          id: 'INV-1024',
          leadId: '1',
          companyName: 'Acme Corp',
          amount: 15000,
          status: 'Pending',
          dueDate: '2026-06-15',
          createdAt: Date.now() - 86400000 * 5,
        },
        {
          id: 'INV-1023',
          leadId: '2',
          companyName: 'Starlight Agency',
          amount: 5000,
          status: 'Paid',
          dueDate: '2026-05-30',
          createdAt: Date.now() - 86400000 * 8,
        }
      ];
      setInvoices(initialInvoices);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('crm_current_profile', JSON.stringify(currentProfile));
  }, [currentProfile]);

  useEffect(() => {
    localStorage.setItem('crm_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('crm_actions', JSON.stringify(actions));
  }, [actions]);

  useEffect(() => {
    localStorage.setItem('crm_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('crm_invoices', JSON.stringify(invoices));
  }, [invoices]);

  // --- PDF & Client Exchange Helpers ---
  const generateInvoicePDF = (inv: Invoice) => {
    try {
      const doc = new jsPDF();
      
      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900 color
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text("AGENCY ELITE", 15, 25);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text("FACTURE PROFESSIONNELLE", 140, 25);
      
      // Bill From
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(10);
      doc.setFont("Helvetica", "bold");
      doc.text("Emetteur :", 15, 55);
      doc.setFont("Helvetica", "normal");
      doc.text("Agency Elite SAS", 15, 61);
      doc.text("8 Rue de la Paix, Paris 75002", 15, 67);
      doc.text("contact@agencyelite.io", 15, 73);
      
      // Bill To
      doc.setFont("Helvetica", "bold");
      doc.text("Destinataire :", 115, 55);
      doc.setFont("Helvetica", "normal");
      doc.text(inv.companyName, 115, 61);
      doc.text("Client Actif", 115, 67);
      
      // Invoice Info
      doc.setFont("Helvetica", "bold");
      doc.text("Details Facturation :", 15, 90);
      doc.setFont("Helvetica", "normal");
      doc.text(`Facture N : ${inv.id}`, 15, 96);
      doc.text(`Date d'emission : ${format(inv.createdAt, 'yyyy-MM-dd')}`, 15, 102);
      doc.text(`Date d'echeance : ${inv.dueDate}`, 15, 108);
      
      // Table Header
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(15, 120, 180, 10, 'F');
      doc.setFont("Helvetica", "bold");
      doc.text("Description de la prestation", 20, 126);
      doc.text("Total (TTC)", 160, 126);
      
      // Table Value
      doc.setFont("Helvetica", "normal");
      doc.text(`Prestation de Services Digitaux - ${inv.companyName}`, 20, 138);
      doc.text(`${inv.amount.toLocaleString()} EUR`, 160, 138);
      
      // Underline elements
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(15, 145, 195, 145);
      
      // Total Breakdown
      doc.setFont("Helvetica", "bold");
      doc.text("Sous-Total HT :", 120, 160);
      doc.setFont("Helvetica", "normal");
      doc.text(`${(inv.amount * 0.833).toFixed(2)} EUR`, 160, 160);
      
      doc.setFont("Helvetica", "bold");
      doc.text("TVA (20%) :", 120, 166);
      doc.setFont("Helvetica", "normal");
      doc.text(`${(inv.amount * 0.167).toFixed(2)} EUR`, 160, 166);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Total à payer :", 120, 175);
      doc.text(`${inv.amount.toLocaleString()} EUR`, 160, 175);
      
      // Status Stamp watermarks
      doc.setFontSize(22);
      doc.setFont("Helvetica", "bold");
      if (inv.status === 'Paid') {
        doc.setTextColor(16, 185, 129); // green-500
        doc.rect(15, 195, 55, 18);
        doc.text("PAYEE", 28, 207);
      } else if (inv.status === 'Overdue') {
        doc.setTextColor(239, 68, 68); // red-500
        doc.rect(15, 195, 55, 18);
        doc.text("RETARD", 24, 207);
      } else {
        doc.setTextColor(245, 158, 11); // orange-500
        doc.rect(15, 195, 55, 18);
        doc.text("ATTENTE", 22, 207);
      }
      
      // Footer
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(8);
      doc.setFont("Helvetica", "normal");
      doc.text("Agency Elite SAS - RCS Paris - TVA FR 99 123456789 - Capital 50 000 EUR", 15, 280);
      doc.text("Merci pour votre confiance !", 85, 285);
      
      doc.save(`Facture_${inv.id}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF invoice:", error);
    }
  };

  const generatePDFReport = () => {
    try {
      const doc = new jsPDF();
      
      // Cover banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.text("AGENCY ELITE - CRM REPORT", 15, 22);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Généré le ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 15, 32);
      doc.text("BILAN COMPLET D'ACTIVITÉ DE L'AGENCE", 115, 32);
      
      // High-Level Statistics
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFontSize(13);
      doc.setFont("Helvetica", "bold");
      doc.text("1. CHIFFRES CLÉS GLOBAUX", 15, 60);
      
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      doc.text(`* Total Opportunités qualifiées : ${stats.totalLeads} dossiers`, 20, 70);
      doc.text(`* Clients Actifs (Portefeuille) : ${stats.clients} comptes`, 20, 76);
      doc.text(`* Valeur Active du Pipeline : ${stats.pipelineValue.toLocaleString()} EUR`, 20, 82);
      
      const calcTotalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const calcTotalPaid = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
      doc.text(`* Cumul Facturation Générée : ${calcTotalInvoiced.toLocaleString()} EUR`, 110, 70);
      doc.text(`* Revenus Encaissés Réels : ${calcTotalPaid.toLocaleString()} EUR`, 110, 76);
      doc.text(`* Reste à Recouvrer : ${(calcTotalInvoiced - calcTotalPaid).toLocaleString()} EUR`, 110, 82);
      
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(15, 90, 195, 90);
      
      // Service répartition details
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.text("2. VENTILATION DU PORTFOLIO COMMERCIAL", 15, 105);
      
      doc.setFontSize(9);
      doc.setFont("Helvetica", "normal");
      const sCounts: Record<string, number> = { Web: 0, SEO: 0, Design: 0, Consulting: 0 };
      leads.forEach(l => { sCounts[l.serviceType] = (sCounts[l.serviceType] || 0) + 1; });
      doc.text(`Services : Web (${sCounts.Web || 0}) | SEO (${sCounts.SEO || 0}) | Design (${sCounts.Design || 0}) | Consulting (${sCounts.Consulting || 0})`, 20, 115);
      
      const tCounts: Record<string, number> = { Chaud: 0, Tiède: 0, Froid: 0 };
      leads.forEach(l => { tCounts[l.temperature] = (tCounts[l.temperature] || 0) + 1; });
      doc.text(`Températures : Chauds (${tCounts.Chaud || 0}) | Pièces Tièdes (${tCounts.Tiède || 0}) | Froids (${tCounts.Froid || 0})`, 20, 122);
      
      doc.line(15, 132, 195, 132);
      
      // Active portfolio breakdown text
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.text("3. ETAT DU PORTEFEUILLE CLIENT", 15, 147);
      
      doc.setFontSize(8);
      // Table header
      doc.setFillColor(241, 245, 249);
      doc.rect(15, 154, 180, 8, 'F');
      doc.text("Entreprise", 18, 160);
      doc.text("Prestation principale", 70, 160);
      doc.text("Budget TTC", 130, 160);
      doc.text("Phase du Projet", 160, 160);
      
      let currentY = 168;
      const activeWonLeads = leads.filter(l => l.status === 'Won');
      if (activeWonLeads.length > 0) {
        doc.setFont("Helvetica", "normal");
        activeWonLeads.forEach(client => {
          if (currentY < 265) {
            doc.text(client.companyName, 18, currentY);
            doc.text(client.need.substring(0, 38) + (client.need.length > 38 ? '...' : ''), 70, currentY);
            doc.text(`${client.budget.toLocaleString()} EUR`, 130, currentY);
            doc.text(client.projectStatus || 'Cadrage', 160, currentY);
            currentY += 8;
          }
        });
      } else {
        doc.setFont("Helvetica", "italic");
        doc.text("Aucun client actif ('Won') enregistré pour le moment.", 20, 168);
      }
      
      // Thank you & signature
      doc.line(15, 245, 195, 245);
      doc.setTextColor(30, 41, 59);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Rapport signé electroniquement par la Direction", 15, 255);
      
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFontSize(8);
      doc.setFont("Helvetica", "normal");
      doc.text("Document à usage interne confidentiel pour les membres de l'agence.", 15, 280);
      
      doc.save("Rapport_Bilan_Agence.pdf");
    } catch (err) {
      console.error("Error generating global report:", err);
    }
  };

  const handleAddClientNote = (text: string) => {
    if (!selectedLead || !text.trim()) return;
    const newNote: ClientNote = {
      id: crypto.randomUUID(),
      text,
      date: format(new Date(), 'yyyy-MM-dd HH:mm'),
      author: currentProfile.name,
    };
    const updatedLead = {
      ...selectedLead,
      documents: selectedLead.documents || [],
      clientNotes: [newNote, ...(selectedLead.clientNotes || [])],
    };
    setLeads(leads.map(l => l.id === selectedLead.id ? updatedLead : l));
    setSelectedLead(updatedLead);
  };

  const handleUpdateProjectDetails = (leadId: string, status: string, progress: number, date: string) => {
    setLeads(leads.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          projectStatus: status,
          projectProgress: progress,
          deliveryDate: date
        };
      }
      return l;
    }));
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({
        ...selectedLead,
        projectStatus: status,
        projectProgress: progress,
        deliveryDate: date
      });
    }
  };

  // --- Helpers ---
  const handleAddLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
      const newLead: Lead = {
        id: crypto.randomUUID(),
        companyName: formData.get('companyName') as string,
        contactName: formData.get('contactName') as string,
        email: formData.get('email') as string,
        need: formData.get('need') as string,
        budget: Number(formData.get('budget')),
        temperature: formData.get('temperature') as LeadTemperature,
        serviceType: (formData.get('serviceType') as ServiceType) || 'Web',
        status: 'New',
        createdAt: Date.now(),
        documents: [],
      };
    setLeads([newLead, ...leads]);
    setIsNewLeadModalOpen(false);
  };

  const handleAddAction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAction: Action = {
      id: crypto.randomUUID(),
      title: formData.get('title') as string,
      leadId: formData.get('leadId') as string || undefined,
      dueDate: formData.get('dueDate') as string,
      completed: false,
      priority: formData.get('priority') as 'low' | 'medium' | 'high',
    };
    setActions([newAction, ...actions]);
    setIsNewActionModalOpen(false);
  };

  const handleAIAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicText.trim()) return;

    setIsAnalysingLead(true);
    try {
      const resp = await fetch('/api/leads/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: magicText }),
      });
      
      if (!resp.ok) throw new Error('Failed to analyze');
      
      const data = await resp.json();
      const newLead: Lead = {
        id: crypto.randomUUID(),
        ...data,
        status: 'New',
        serviceType: 'Web',
        createdAt: Date.now(),
        documents: [],
      };
      
      setLeads([newLead, ...leads]);
      setIsAIMagicModalOpen(false);
      setMagicText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalysingLead(false);
    }
  };

  const toggleAction = (id: string) => {
    setActions(actions.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
  };

  const deleteLead = (id: string) => {
    setLeads(leads.filter(l => l.id !== id));
  };

  const generateInvoice = (lead: Lead) => {
    const newInvoice: Invoice = {
      id: `INV-${Date.now()}`,
      leadId: lead.id,
      companyName: lead.companyName,
      amount: lead.budget,
      status: 'Pending',
      dueDate: format(new Date(Date.now() + 86400000 * 30), 'yyyy-MM-dd'),
      createdAt: Date.now(),
    };
    setInvoices([newInvoice, ...invoices]);
    setView('invoices');
  };

  const exportLeadsToCSV = () => {
    const headers = ['Entreprise', 'Contact', 'Email', 'Besoin', 'Budget', 'Temperature', 'Statut', 'Date Création'];
    const rows = leads.map(l => [
      l.companyName,
      l.contactName,
      l.email,
      l.need,
      l.budget,
      l.temperature,
      l.status,
      format(l.createdAt, 'yyyy-MM-dd')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "crm_export_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddInvoice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const selectedLeadId = formData.get('leadId') as string;
    const selectedLead = leads.find(l => l.id === selectedLeadId);
    
    if (selectedLead) {
      const newInvoice: Invoice = {
        id: `INV-${Date.now()}`,
        leadId: selectedLead.id,
        companyName: selectedLead.companyName,
        amount: Number(formData.get('amount')),
        status: 'Pending',
        dueDate: formData.get('dueDate') as string || format(new Date(Date.now() + 86400000 * 30), 'yyyy-MM-dd'),
        createdAt: Date.now(),
      };
      setInvoices([newInvoice, ...invoices]);
      setIsNewInvoiceModalOpen(false);
    }
  };

  const handleGenerateProposal = async (lead: Lead) => {
    setSelectedLead(lead);
    setIsGeneratingProposal(true);
    setIsProposalModalOpen(true);
    setProposalText('');

    try {
      const resp = await fetch('/api/leads/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });
      if (!resp.ok) throw new Error('Failed to generate proposal');
      const data = await resp.json();
      setProposalText(data.proposal);
    } catch (err) {
      console.error(err);
      setProposalText("Erreur lors de la génération de la proposition.");
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  const addMockDocument = (leadId: string) => {
    const newDoc: Document = {
      id: crypto.randomUUID(),
      name: `Accord_${format(new Date(), 'yyyyMMdd')}.pdf`,
      type: 'PDF',
      date: format(new Date(), 'yyyy-MM-dd')
    };
    setLeads(leads.map(l => l.id === leadId ? { ...l, documents: [...l.documents, newDoc] } : l));
  };

  const deleteDocument = (leadId: string, docId: string) => {
    setLeads(leads.map(l => l.id === leadId ? { ...l, documents: l.documents.filter(d => d.id !== docId) } : l));
  };

  const updateLeadStatus = (id: string, status: LeadStatus) => {
    setLeads(leads.map(l => l.id === id ? { ...l, status } : l));
  };

  // --- Analytics Data ---
  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const activeLeads = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length;
    const clients = leads.filter(l => l.status === 'Won').length;
    const pipelineValue = leads
      .filter(l => l.status !== 'Won' && l.status !== 'Lost')
      .reduce((sum, l) => sum + l.budget, 0);
    
    const chartData = [
      { name: 'Chaud', value: leads.filter(l => l.temperature === 'Chaud').length, color: '#ef4444' },
      { name: 'Tiède', value: leads.filter(l => l.temperature === 'Tiède').length, color: '#f97316' },
      { name: 'Froid', value: leads.filter(l => l.temperature === 'Froid').length, color: '#3b82f6' },
    ];

    const pipelineData = [
      { name: 'Nouveau', count: leads.filter(l => l.status === 'New').length },
      { name: 'Qualifié', count: leads.filter(l => l.status === 'Qualified').length },
      { name: 'Proposition', count: leads.filter(l => l.status === 'Proposal').length },
      { name: 'Négociation', count: leads.filter(l => l.status === 'Negotiation').length },
    ];

    return { totalLeads, activeLeads, clients, pipelineValue, chartData, pipelineData };
  }, [leads]);

  const filteredLeads = leads.filter(l => 
    l.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.contactName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const wonLeads = leads.filter(l => l.status === 'Won');

  // --- Sub-Views ---

  const DashboardView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Leads', val: stats.totalLeads, icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Clients Gagnés', val: stats.clients, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pipeline Active', val: `${stats.pipelineValue.toLocaleString()}€`, icon: TrendingUp, color: 'text-blue-700', bg: 'bg-slate-100' },
          { label: 'Taux de Conv.', val: stats.totalLeads > 0 ? `${Math.round((stats.clients / stats.totalLeads) * 100)}%` : '0%', icon: ArrowUpRight, color: 'text-slate-800', bg: 'bg-slate-200/50' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="high-density-label mb-1">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-800">{stat.val}</h3>
              </div>
              <div className={`p-2 rounded ${stat.bg} ${stat.color}`}>
                <stat.icon size={16} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="high-density-card p-4"
        >
          <h3 className="high-density-label mb-6">Répartition par Température</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '10px', padding: '4px 8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {stats.chartData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="high-density-card p-4"
        >
          <h3 className="high-density-label mb-6">Pipeline de Vente</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip 
                   cursor={{ fill: '#f8fafc' }}
                   contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '10px' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[2, 2, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );

  const LeadsView = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button 
            onClick={exportLeadsToCSV}
            className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase transition-all hover:bg-slate-200"
          >
            Exporter CSV
          </button>
          <button 
            onClick={() => setIsAIMagicModalOpen(true)}
            className="px-4 py-2 bg-slate-900 border border-slate-800 text-blue-400 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Sparkles size={14} /> Ajouter via IA
          </button>
          <button 
            onClick={() => setIsNewLeadModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Plus size={14} /> Nouveau Lead
          </button>
        </div>
      </div>

      <div className="high-density-card">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2 high-density-label">Entreprise</th>
              <th className="px-4 py-2 high-density-label">Contact</th>
              <th className="px-4 py-2 high-density-label text-center">Estimation</th>
              <th className="px-4 py-2 high-density-label text-center">T°</th>
              <th className="px-4 py-2 high-density-label">Statut</th>
              <th className="px-4 py-2 high-density-label text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <AnimatePresence mode="popLayout">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={lead.id} 
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-slate-800">{lead.companyName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{lead.need}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                      <div>{lead.contactName}</div>
                      <div className="text-[9px] opacity-60 font-mono italic">{lead.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-mono text-xs text-center font-bold">
                      {lead.budget.toLocaleString()}€
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={lead.temperature}>{lead.temperature}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as LeadStatus)}
                        className="bg-white border border-slate-200 text-[10px] font-bold uppercase text-blue-600 rounded px-2 py-0.5 outline-none cursor-pointer hover:border-blue-300"
                      >
                        {['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleGenerateProposal(lead)}
                          title="Générer Proposition IA"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <FileText size={14} />
                        </button>
                        <button 
                          onClick={() => { setSelectedLead(lead); setIsDocumentsModalOpen(true); }}
                          title="Gérer Documents"
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                        >
                          <FolderOpen size={14} />
                        </button>
                        <button 
                          onClick={() => generateInvoice(lead)}
                          title="Générer Facture"
                          className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                        >
                          Facturer
                        </button>
                        <button onClick={() => deleteLead(lead.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-xs italic">
                    Aucun dossier actif dans la vue actuelle.
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );

  const ClientsView = () => {
    // Portefeuille only lists won clients
    const activeClients = useMemo(() => leads.filter(l => l.status === 'Won'), [leads]);
    
    // Note input state
    const [noteInput, setNoteInput] = useState('');

    return (
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)] overflow-hidden">
        {/* Left pane: Directory list */}
        <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-lg flex flex-col h-full overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="high-density-label">Répertoire Clients ({activeClients.length})</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">Contrats Signés & Actifs</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {activeClients.length > 0 ? (
              activeClients.map((client) => {
                const isActive = selectedLead?.id === client.id;
                const statusPhases: Record<string, string> = {
                  Cadrage: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  Développement: 'bg-blue-50 text-blue-700 border-blue-200',
                  Tests: 'bg-orange-50 text-orange-700 border-orange-200',
                  Livré: 'bg-green-50 text-green-700 border-green-200',
                  Maintenance: 'bg-purple-50 text-purple-700 border-purple-200',
                };
                return (
                  <button
                    key={client.id}
                    onClick={() => setSelectedLead(client)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-all flex flex-col gap-2 border-l-4 ${
                      isActive ? 'bg-blue-50/30 border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[150px]">{client.companyName}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${statusPhases[client.projectStatus as string] || 'bg-slate-50 border-slate-200'}`}>
                        {client.projectStatus || 'Cadrage'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight italic truncate w-full">{client.need}</p>
                    <div className="flex justify-between items-center w-full mt-1">
                      <div className="w-2/3 bg-slate-100 rounded-full h-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full transition-all" 
                          style={{ width: `${client.projectProgress || 0}%` }} 
                        />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-500">{client.projectProgress || 0}%</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center h-48">
                <Briefcase size={24} className="text-slate-200 mb-2" />
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Aucun client actif</p>
                <p className="text-[10px] text-slate-400 italic mt-1 leading-none">Passez un lead en statut "Won" pour l'activer</p>
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Focus details and notes exchange */}
        <div className="flex-1 bg-white border border-slate-200 rounded-lg flex flex-col h-full overflow-hidden">
          {selectedLead && selectedLead.status === 'Won' ? (
            <div className="flex flex-col h-full divide-y divide-slate-100 overflow-hidden">
              {/* Header and key details */}
              <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/20 shrink-0">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-base shadow-sm shrink-0 border border-blue-200">
                    {selectedLead.companyName[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{selectedLead.companyName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{selectedLead.contactName} ({selectedLead.email})</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Valeur Signée</p>
                  <p className="text-base font-black text-blue-600 font-mono leading-none mt-1">{selectedLead.budget.toLocaleString()} €</p>
                </div>
              </div>

              {/* Sub-panels container: side-by-side or stacked grid depending on height */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 min-h-0">
                {/* Left block: Project Tracking controls */}
                <div className="p-5 space-y-5 overflow-y-auto max-h-full">
                  <h4 className="high-density-label flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <CheckSquare size={12} className="text-blue-500" />
                    Suivi de Projet & Timeline
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="high-density-label block mb-1">Phase du Projet</label>
                      <select 
                        value={selectedLead.projectStatus || 'Cadrage'}
                        onChange={(e) => handleUpdateProjectDetails(selectedLead.id, e.target.value, selectedLead.projectProgress || 0, selectedLead.deliveryDate || '')}
                        className="high-density-input appearance-none px-3 font-bold uppercase text-[10px] w-full"
                      >
                        <option value="Cadrage">Cadrage & Spécifications</option>
                        <option value="Développement">Développement & Phase Active</option>
                        <option value="Tests">Recette & Assurance Qualité</option>
                        <option value="Livré">Livré / Clôturé</option>
                        <option value="Maintenance">Maintenance & Hébergement</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="high-density-label block">Pourcentage d'avancement</label>
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{selectedLead.projectProgress || 0}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={selectedLead.projectProgress || 0}
                        onChange={(e) => handleUpdateProjectDetails(selectedLead.id, selectedLead.projectStatus || 'Cadrage', Number(e.target.value), selectedLead.deliveryDate || '')}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                      />
                    </div>

                    <div>
                      <label className="high-density-label block mb-1">Date estimée de livraison</label>
                      <input 
                        type="date"
                        value={selectedLead.deliveryDate || ''}
                        onChange={(e) => handleUpdateProjectDetails(selectedLead.id, selectedLead.projectStatus || 'Cadrage', selectedLead.projectProgress || 0, e.target.value)}
                        className="high-density-input w-full"
                      />
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Informations projet</p>
                      <p className="text-[11px] font-bold text-slate-700 leading-snug">{selectedLead.need}</p>
                      <p className="text-[10px] text-slate-400 mt-2">Dossier de service configuré comme : <b className="text-slate-600 font-black uppercase text-[9px] bg-white border border-slate-200 p-0.5 px-1 rounded inline-block mt-1">{selectedLead.serviceType}</b></p>
                    </div>
                  </div>
                </div>

                {/* Right block: Exchange Log & Add note */}
                <div className="p-5 flex flex-col h-full overflow-hidden justify-between min-h-0">
                  <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
                    <h4 className="high-density-label flex items-center gap-1.5 border-b border-slate-100 pb-2 mb-3 shrink-0">
                      <Clock size={12} className="text-blue-500" />
                      Historique des Échanges & Notes ({selectedLead.clientNotes?.length || 0})
                    </h4>

                    {/* Log list flow */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4 min-h-0">
                      {selectedLead.clientNotes && selectedLead.clientNotes.length > 0 ? (
                        selectedLead.clientNotes.map((note) => (
                          <div key={note.id} className="bg-slate-50/50 border border-slate-100 p-3 rounded-lg space-y-1 relative group transition-all">
                            <button 
                              onClick={() => {
                                const updatedNotes = selectedLead.clientNotes?.filter(n => n.id !== note.id) || [];
                                setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, clientNotes: updatedNotes } : l));
                                setSelectedLead({ ...selectedLead, clientNotes: updatedNotes });
                              }}
                              className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                              title="Supprimer la note"
                            >
                              <X size={10} />
                            </button>
                            <div className="flex justify-between items-center text-[8px] font-bold uppercase text-slate-400 tracking-wider">
                              <span>Auteur : {note.author}</span>
                              <span>{note.date}</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-700 leading-snug whitespace-pre-wrap">{note.text}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded text-[10px] text-slate-400 italic">
                          Aucun échange n'a été consigné encore.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Note creation textbox */}
                  <div className="space-y-2 shrink-0 border-t border-slate-100 pt-3">
                    <textarea 
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Consigner un nouvel appel, email ou meeting avec le client..." 
                      className="high-density-input resize-none h-16 text-[11px] w-full"
                      rows={2}
                    />
                    <button 
                      onClick={() => {
                        handleAddClientNote(noteInput);
                        setNoteInput('');
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[9px] uppercase tracking-widest transition-all"
                    >
                      Enregistrer l'échange
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
              <Users size={32} className="text-slate-300 mb-2" />
              <p className="text-slate-400 text-xs uppercase font-black tracking-widest">Aperçu du Client Sélectionné</p>
              <p className="text-[10px] text-slate-400 italic mt-1 leading-none">Choisissez un client dans le répertoire à gauche pour suivre son projet ou voir l'historique de ses échanges.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ActionsView = () => {
    const sortedActions = [...actions].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
          <div>
            <h2 className="high-density-label">Next Actions</h2>
            <p className="text-[11px] text-slate-500 font-bold">{actions.filter(a => !a.completed).length} prioritaires</p>
          </div>
          <button 
            onClick={() => setIsNewActionModalOpen(true)}
            className="w-8 h-8 bg-slate-900 hover:bg-slate-800 text-white rounded flex items-center justify-center shadow-lg transition-all"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {sortedActions.map((action) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                key={action.id} 
                className={`flex items-center gap-3 p-3 rounded border transition-all ${
                  action.completed 
                    ? 'bg-slate-50/50 border-transparent opacity-50' 
                    : 'bg-white border-slate-200 hover:border-blue-300'
                } ${!action.completed && action.priority === 'high' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-slate-200'}`}
              >
                <button 
                  onClick={() => toggleAction(action.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    action.completed 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-slate-300 hover:border-blue-500'
                  }`}
                >
                  {action.completed && <CheckCircle2 size={10} className="text-white" />}
                </button>

                <div className="flex-1 min-w-0">
                  <h4 className={`text-[11px] font-bold transition-all ${action.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {action.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                      <Clock size={10} /> {format(new Date(action.dueDate), 'dd MMM')}
                    </span>
                    {action.leadId && (
                      <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-1.5 rounded uppercase">
                        {leads.find(l => l.id === action.leadId)?.companyName}
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setActions(actions.filter(a => a.id !== action.id))}
                  className="p-1 px-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                   <Trash2 size={12} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const InvoicesView = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200">
        <div>
          <h2 className="high-density-label">Factures & Paiements</h2>
          <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
            Cumul : {invoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}€
          </div>
        </div>
        <button 
          onClick={() => setIsNewInvoiceModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus size={14} /> Nouvelle Facture
        </button>
      </div>

      <div className="high-density-card">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2 high-density-label">N° Facture</th>
              <th className="px-4 py-2 high-density-label">Client</th>
              <th className="px-4 py-2 high-density-label text-center">Montant</th>
              <th className="px-4 py-2 high-density-label text-center">Échéance</th>
              <th className="px-4 py-2 high-density-label">Statut</th>
              <th className="px-4 py-2 high-density-label text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {invoices.length > 0 ? (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono font-bold text-slate-800">{inv.id}</td>
                  <td className="px-4 py-3 text-xs font-black text-slate-600">{inv.companyName}</td>
                  <td className="px-4 py-3 text-center text-xs font-bold font-mono">{inv.amount.toLocaleString()}€</td>
                  <td className="px-4 py-3 text-center text-[10px] text-slate-400">{inv.dueDate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                      inv.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                      inv.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' : 
                      'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => generateInvoicePDF(inv)}
                        className="p-1 px-2 border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 bg-white rounded text-[9px] font-bold uppercase flex items-center justify-center gap-1 transition-all"
                        title="Télécharger la facture PDF"
                      >
                        <Download size={11} />
                        PDF
                      </button>
                      <select 
                        value={inv.status}
                        onChange={(e) => setInvoices(invoices.map(i => i.id === inv.id ? { ...i, status: e.target.value as any } : i))}
                        className="bg-white border border-slate-200 text-[10px] font-bold uppercase rounded px-2 py-0.5 outline-none cursor-pointer"
                      >
                        <option value="Pending">Attente</option>
                        <option value="Paid">Payé</option>
                        <option value="Overdue">Retard</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-xs italic">Aucune facture générée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const StatisticsView = () => {
    const serviceStats = useMemo(() => {
      const counts: Record<string, number> = { Web: 0, SEO: 0, Design: 0, Consulting: 0 };
      leads.forEach(l => { counts[l.serviceType] = (counts[l.serviceType] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [leads]);

    const financialData = [
      { name: 'Pipeline', total: stats.pipelineValue },
      { name: 'Facturé', total: invoices.reduce((sum, i) => sum + i.amount, 0) },
      { name: 'Payé', total: invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0) },
    ];

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#6366f1'];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="high-density-card p-6">
          <h3 className="high-density-label mb-6">Répartition Services</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={serviceStats} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {serviceStats.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="high-density-card p-6">
          <h3 className="high-density-label mb-6">Pipeline vs Revenus Réels</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip formatter={(value: number) => `${value.toLocaleString()}€`} />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // --- Localized view titles ---
  const viewTitles: Record<View, string> = {
    dashboard: 'Tableau de bord',
    leads: 'Opportunités',
    clients: 'Portefeuille',
    invoices: 'Facturation',
    actions: 'Planning',
    statistics: 'Statistiques'
  };

  // --- Main Layout ---

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-60 bg-brand-sidebar text-white flex flex-col shrink-0 z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white italic text-lg shadow-lg">A</div>
            <span className="font-black text-lg tracking-tighter uppercase whitespace-nowrap">Agency Elite</span>
          </div>
        </div>
        
        <nav className="flex-1 py-6">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
            { id: 'leads', label: 'Opportunités', icon: UserPlus },
            { id: 'clients', label: 'Portefeuille', icon: Users },
            { id: 'invoices', label: 'Facturation', icon: DollarSign },
            { id: 'actions', label: 'Planning', icon: CheckSquare },
            { id: 'statistics', label: 'Statistiques', icon: PieChartIcon },
          ].map((item) => (
            <button 
              key={item.id}
              onClick={() => {
                setView(item.id as View);
                // Clear selected client if going away from clients, or default it to first Won client
                if (item.id === 'clients') {
                  const won = leads.find(l => l.status === 'Won');
                  setSelectedLead(won || null);
                }
              }}
              className={`w-full flex items-center px-6 py-2.5 transition-all border-l-4 ${
                view === item.id 
                ? 'bg-blue-600/20 text-blue-400 border-blue-500' 
                : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <item.icon size={13} className="mr-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div 
          onClick={() => setIsProfileSwitcherOpen(true)}
          className="p-4 bg-slate-950 border-t border-slate-800 mt-auto cursor-pointer hover:bg-slate-900 transition-all group"
          title="Changer de compte d'agent"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 shrink-0 overflow-hidden group-hover:border-blue-500 transition-colors">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentProfile.avatarSeed}`} alt={currentProfile.name[0]} className="w-full h-full rounded-full" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-bold truncate text-white uppercase tracking-tight group-hover:text-blue-400 transition-colors">{currentProfile.name}</p>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-slate-500 truncate uppercase font-black">{currentProfile.role}</p>
                <span className="text-[8px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Changer</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
             {viewTitles[view]}
          </h1>
          <div className="flex items-center space-x-6">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Pipeline Total</p>
              <p className="text-sm font-black text-blue-600 leading-none">{stats.pipelineValue.toLocaleString()} €</p>
            </div>
            <button 
              onClick={generatePDFReport}
              className="bg-slate-900 text-white px-4 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-slate-700 transition-all shadow-sm flex items-center gap-1.5"
            >
                <Download size={11} /> Rapport .PDF
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="max-w-7xl mx-auto h-full"
            >
              {view === 'dashboard' && <DashboardView />}
              {view === 'leads' && <LeadsView />}
              {view === 'clients' && <ClientsView />}
              {view === 'invoices' && <InvoicesView />}
              {view === 'actions' && <ActionsView />}
              {view === 'statistics' && <StatisticsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isNewLeadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsNewLeadModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" 
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}
              className="bg-white border border-slate-200 w-full max-w-lg rounded-lg p-6 relative shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="high-density-label !text-slate-800 !text-sm">Nouveau Lead</h2>
                <button onClick={() => setIsNewLeadModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddLead} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="high-density-label block mb-1">Entreprise</label>
                    <input required name="companyName" className="high-density-input" placeholder="Acme Inc." />
                  </div>
                  <div>
                    <label className="high-density-label block mb-1">Contact</label>
                    <input required name="contactName" className="high-density-input" placeholder="Prénom Nom" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="high-density-label block mb-1">Email</label>
                    <input required name="email" type="email" className="high-density-input" placeholder="email@client.com" />
                  </div>
                   <div>
                    <label className="high-density-label block mb-1">Budget (€)</label>
                    <input required name="budget" type="number" className="high-density-input" />
                  </div>
                </div>
                <div>
                   <label className="high-density-label block mb-1">Type de Service</label>
                   <select name="serviceType" className="high-density-input appearance-none px-2 font-bold uppercase !text-[10px]">
                      <option value="Web">Web Development</option>
                      <option value="SEO">SEO Strategy</option>
                      <option value="Design">UI/UX Design</option>
                      <option value="Consulting">Technical Consulting</option>
                   </select>
                </div>
                <div>
                  <label className="high-density-label block mb-1">Description Besoin</label>
                  <textarea required name="need" rows={3} className="high-density-input h-20 resize-none py-2" placeholder="Détails du projet..." />
                </div>
                <div>
                  <label className="high-density-label block mb-1">Température</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Chaud', 'Tiède', 'Froid'].map((t) => (
                      <label key={t} className="cursor-pointer">
                        <input type="radio" name="temperature" value={t} defaultChecked={t === 'Chaud'} className="peer hidden" />
                        <div className="text-center py-2 border border-slate-200 rounded text-[9px] font-black uppercase peer-checked:bg-slate-900 peer-checked:text-white transition-all">
                          {t}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-black uppercase tracking-widest mt-4 shadow-lg shadow-blue-600/20">
                  Enregistrer et Qualifier
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isAIMagicModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAIMagicModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-white border border-slate-200 w-full max-w-lg rounded-lg p-6 relative shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                   <div className="p-1 px-2 bg-blue-600 text-white rounded text-[10px] font-black uppercase italic">Magic AI</div>
                   <h2 className="high-density-label !text-slate-800 !text-sm">Extraction Automatique</h2>
                </div>
                <button onClick={() => setIsAIMagicModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X size={16} />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mb-6 italic">Collez un e-mail ou une note brute de réunion. L'IA extrait entreprise, contact, besoin et budget.</p>
              <form onSubmit={handleAIAnalysis} className="space-y-4">
                <div>
                  <textarea 
                    required 
                    value={magicText}
                    onChange={(e) => setMagicText(e.target.value)}
                    rows={8} 
                    className="high-density-input h-48 resize-none py-3" 
                    placeholder="Ex: Salut Marc, j'ai eu Acme Corp au téléphone, ils veulent un audit cloud pour environ 20k€. Le contact est Thomas Martin..." 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isAnalysingLead}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/10"
                >
                  {isAnalysingLead ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                        <Sparkles size={14} />
                      </motion.div>
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Générer l'Opportunité
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isProposalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProposalModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-white border border-slate-200 w-full max-w-2xl rounded-lg p-0 relative shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-indigo-600 text-white rounded"><FileText size={14}/></div>
                  <h2 className="high-density-label !text-slate-800 !text-sm">Proposition Stratégique pour {selectedLead?.companyName}</h2>
                </div>
                <button onClick={() => setIsProposalModalOpen(false)} className="p-1 hover:bg-slate-200 rounded">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-white prose prose-slate max-w-none">
                {isGeneratingProposal ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                      <Sparkles className="text-indigo-600" size={32} />
                    </motion.div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Rédaction en cours par l'IA...</p>
                  </div>
                ) : (
                  <div className="markdown-body text-xs leading-relaxed text-slate-700">
                    <Markdown>{proposalText}</Markdown>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3">
                <button 
                  onClick={() => { navigator.clipboard.writeText(proposalText); }}
                  className="px-4 py-2 border border-slate-300 rounded text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-white transition-all"
                >
                  <Copy size={14} /> Copier le texte
                </button>
                <button 
                  className="px-4 py-2 bg-indigo-600 text-white rounded text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => setIsProposalModalOpen(false)}
                >
                   Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isDocumentsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDocumentsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-white border border-slate-200 w-full max-w-md rounded-lg p-6 relative shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <FolderOpen className="text-slate-400" size={20} />
                  <h2 className="high-density-label !text-slate-800 !text-sm">Documents : {selectedLead?.companyName}</h2>
                </div>
                <button onClick={() => setIsDocumentsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded">
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-3 mb-6">
                 {selectedLead?.documents.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded italic text-[10px] text-slate-400 uppercase font-black">
                      Aucun document partagé
                    </div>
                 ) : (
                    selectedLead?.documents.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-200 rounded bg-slate-50/30 group">
                         <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white border border-slate-200 rounded flex items-center justify-center font-black text-[10px] text-slate-400">{doc.type}</div>
                            <div>
                               <p className="text-[11px] font-bold text-slate-800">{doc.name}</p>
                               <p className="text-[9px] text-slate-400">{doc.date}</p>
                            </div>
                         </div>
                         <button 
                          onClick={() => deleteDocument(selectedLead.id, doc.id)}
                          className="p-1 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                         >
                            <Trash2 size={12} />
                         </button>
                      </div>
                    ))
                 )}
              </div>

              <button 
                onClick={() => addMockDocument(selectedLead!.id)}
                className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-400 rounded text-[9px] font-black uppercase tracking-wider transition-all"
              >
                + Téléverser Nouveau Document
              </button>
            </motion.div>
          </div>
        )}

        {isNewInvoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewInvoiceModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-white border border-slate-200 w-full max-w-sm rounded-lg p-6 relative shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="high-density-label !text-slate-800 !text-sm">Nouvelle Facture</h2>
                <button onClick={() => setIsNewInvoiceModalOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddInvoice} className="space-y-4">
                <div>
                  <label className="high-density-label block mb-1">Sélectionner Client</label>
                  <select required name="leadId" className="high-density-input appearance-none px-2 font-bold uppercase !text-[10px]">
                    <option value="">-- Choisir un client --</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.companyName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="high-density-label block mb-1">Montant (€)</label>
                  <input required name="amount" type="number" className="high-density-input" placeholder="0.00" />
                </div>
                <div>
                  <label className="high-density-label block mb-1">Date d'échéance</label>
                  <input required name="dueDate" type="date" defaultValue={format(new Date(Date.now() + 86400000 * 30), 'yyyy-MM-dd')} className="high-density-input" />
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-black uppercase tracking-widest mt-4">
                  Créer la Facture
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isNewActionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewActionModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-white border border-slate-200 w-full max-w-sm rounded-lg p-6 relative shadow-2xl">
              <h2 className="high-density-label !text-slate-800 !text-sm mb-6">Planifier Action</h2>
              <form onSubmit={handleAddAction} className="space-y-4">
                <div>
                  <label className="high-density-label block mb-1">Tâche</label>
                  <input required name="title" className="high-density-input" />
                </div>
                <div>
                   <label className="high-density-label block mb-1">Client Lié (Optionnel)</label>
                   <select name="leadId" className="high-density-input appearance-none px-2 font-bold uppercase !text-[10px]">
                      <option value="">Aucun</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.companyName}</option>
                      ))}
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="high-density-label block mb-1">Date</label>
                    <input required name="dueDate" type="date" className="high-density-input" />
                  </div>
                  <div>
                    <label className="high-density-label block mb-1">Priorité</label>
                    <select name="priority" className="high-density-input appearance-none px-2 font-bold uppercase !text-[10px]">
                      <option value="low">Bas</option>
                      <option value="medium">Moyen</option>
                      <option value="high">Urgent</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-black uppercase tracking-widest mt-2 hover:shadow-xl transition-all">
                  Ajouter au planning
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isProfileSwitcherOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileSwitcherOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-white border border-slate-200 w-full max-w-sm rounded-lg p-6 relative shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="high-density-label !text-slate-800 !text-sm">Changer de Session</h2>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Membres Actifs de l'Agence</p>
                </div>
                <button onClick={() => setIsProfileSwitcherOpen(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                {AGENT_PROFILES.map((profile) => {
                  const isCurrent = profile.id === currentProfile.id;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setCurrentProfile(profile);
                        setIsProfileSwitcherOpen(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-center gap-3 hover:bg-slate-50 ${
                        isCurrent ? 'bg-blue-50/50 border-blue-500 shadow-sm' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed}`} alt={profile.name} className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-800 tracking-tight">{profile.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{profile.role}</p>
                      </div>
                      {isCurrent && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 md:hidden flex justify-around items-center px-4 z-20">
        {[
          { id: 'dashboard', icon: LayoutDashboard },
          { id: 'leads', icon: UserPlus },
          { id: 'clients', icon: Users },
          { id: 'invoices', icon: DollarSign },
          { id: 'actions', icon: CheckSquare },
          { id: 'statistics', icon: PieChartIcon },
        ].map((item) => (
          <button key={item.id} onClick={() => setView(item.id as View)} className={`p-2 rounded-xl transition-all ${view === item.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}>
            <item.icon size={20} />
          </button>
        ))}
      </nav>
    </div>
  );
}
