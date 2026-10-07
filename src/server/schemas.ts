import { z } from "zod";

// --- 1. Customer Agent Chat ---
export const CustomerAgentChatSchema = z.object({
  agentId: z.string().min(1, "agentId is required").max(128),
  message: z.string().min(1, "Customer message is required").max(1000, "Message cannot exceed 1000 characters"),
  conversationHistory: z.array(z.object({
    role: z.string().max(20),
    content: z.string().max(2000),
  })).optional().default([]),
  language: z.string().max(50).optional(),
});

// --- 2. Customer Agent Voice ---
export const CustomerAgentVoiceSchema = z.object({
  agentId: z.string().min(1, "agentId is required").max(128),
  callerAudioTranscript: z.string().min(1, "Caller transcript is required").max(1000, "Transcript cannot exceed 1000 characters"),
  conversationHistory: z.array(z.object({
    role: z.string().max(20),
    content: z.string().max(2000),
  })).optional().default([]),
});

// --- 3. Visitor Leads ---
export const CustomerLeadSchema = z.object({
  agentId: z.string().min(1, "agentId is required").max(128),
  name: z.string().max(100, "Name cannot exceed 100 characters").optional().default("Website Visitor"),
  email: z.string().email("Invalid email format").max(200).optional().or(z.literal("")),
  phone: z.string().max(30, "Invalid phone number").regex(/^[\+]?[0-9\s\-\(\)\.]{5,30}$/, "Invalid phone format").optional().or(z.literal("")),
  requirement: z.string().max(1000, "Requirement cannot exceed 1000 characters").optional().default(""),
  serviceOrProduct: z.string().max(200).optional().default(""),
  source: z.string().max(50).optional().default("website_widget"),
}).refine(data => Boolean(data.name || data.email || data.phone), {
  message: "At least one contact method (name, email, or phone) must be provided",
});

// --- 4. Visitor Appointments ---
export const CustomerAppointmentSchema = z.object({
  agentId: z.string().min(1, "agentId is required").max(128),
  customerName: z.string().min(1, "Name is required").max(100, "Name cannot exceed 100 characters"),
  customerEmail: z.string().email("Invalid email format").max(200).optional().or(z.literal("")),
  customerPhone: z.string().max(30).regex(/^[\+]?[0-9\s\-\(\)\.]{5,30}$/, "Invalid phone format").optional().or(z.literal("")),
  service: z.string().max(200).optional().default("General Consultation"),
  preferredDate: z.string().max(50).optional().default("Earliest available"),
  preferredTime: z.string().max(50).optional().default("Morning"),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").optional().default(""),
}).refine(data => Boolean(data.customerEmail || data.customerPhone), {
  message: "Customer email or phone number is required to book an appointment",
});

// --- 5. URL Inspection & SEO Audit ---
export const UrlInputSchema = z.object({
  url: z.string().min(1, "URL is required").max(2048, "URL exceeds maximum length"),
});

// --- 6. AI Assistant / Business / SEO / Social / Export ---
export const AssistantRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(5000),
  language: z.string().max(50).optional(),
  languageName: z.string().max(50).optional(),
  websiteUrl: z.string().max(2048).optional(),
  doItForMe: z.boolean().optional(),
  businessProfile: z.record(z.any()).optional(),
});

export const SeoRequestSchema = z.object({
  url: z.string().min(1, "Website URL is required").max(2048),
  language: z.string().max(50).optional(),
  languageName: z.string().max(50).optional(),
});

export const ExportRequestSchema = z.object({
  product: z.string().min(1, "Product description is required").max(500),
  targetCountry: z.string().max(100).optional(),
  sourceCountry: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
  languageName: z.string().max(50).optional(),
});

export const BusinessRequestSchema = z.object({
  toolType: z.string().min(1, "Tool type is required").max(50),
  inputs: z.record(z.any()),
  language: z.string().max(50).optional(),
  languageName: z.string().max(50).optional(),
});

export const SocialRequestSchema = z.object({
  businessDescription: z.string().min(1, "Business description is required").max(2000),
  campaignGoal: z.string().max(500).optional(),
  targetAudience: z.string().max(500).optional(),
  tone: z.string().max(50).optional(),
  platforms: z.array(z.string().max(50)).optional(),
  language: z.string().max(50).optional(),
  languageName: z.string().max(50).optional(),
});
