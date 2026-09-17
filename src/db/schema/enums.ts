import { pgEnum } from "drizzle-orm/pg-core";

// --- Tenancy & roles ---
export const participantRoleEnum = pgEnum("participant_role", [
  "STAKEHOLDER",
  "PM",
  "COLLABORATOR",
  "OBSERVER",
]);

export const participantStatusEnum = pgEnum("participant_status", [
  "ACTIVE",
  "FORMER",
]);

// --- Completeness (Section 19 + addendum #8) ---
export const completenessStateEnum = pgEnum("completeness_state", [
  "MISSING", // 🔴
  "PARTIAL", // 🟡
  "DEFINED", // 🟢
  "CONFIRMED", // ✅
]);

// --- Product definition ---
export const productDefinitionStatusEnum = pgEnum("product_definition_status", [
  "DISCOVERY",
  "AWAITING_PM_REVIEW",
  "PM_REVIEW",
  "APPROVED",
  "BASELINED",
]);

// --- Discovery session ---
export const discoverySessionStatusEnum = pgEnum("discovery_session_status", [
  "ACTIVE",
  "PAUSED",
  "COMPLETE",
]);

export const messageRoleEnum = pgEnum("message_role", ["AI", "STAKEHOLDER", "PM"]);

export const answerSourceEnum = pgEnum("answer_source", [
  "STAKEHOLDER_STATEMENT",
  "EVIDENCE",
  "AI_INFERENCE",
  "UNKNOWN", // the "I don't know yet" case — Section 13
]);

// --- Requirements (Section 7 — the seven-dimension contract) ---
export const requirementDimensionTypeEnum = pgEnum("requirement_dimension_type", [
  "USER",
  "NEED",
  "CONTEXT",
  "BEHAVIOUR",
  "OUTCOME",
  "CONSTRAINTS",
  "ACCEPTANCE_CONDITIONS",
]);

// --- Orchestrator pathway config (Section 11 + addendum #6) ---
export const pathwayCategoryEnum = pgEnum("pathway_category", [
  "ALWAYS_ON", // Discovery, Problem/Value, User/Customer, Requirements/Behaviour
  "PRODUCT_TYPE", // General, Automation — active for MVP
]);

// --- AI inference (Section 16/17) ---
export const inferenceStatusEnum = pgEnum("inference_status", [
  "PENDING",
  "CONFIRMED",
  "EDITED",
  "REJECTED",
]);

// --- Delivery ---
export const changeImpactStatusEnum = pgEnum("change_impact_status", [
  "PENDING_PM_REVIEW",
  "ACCEPTED_INTO_BASELINE",
  "REJECTED",
]);

// --- Evidence / storage (addendum #10) ---
export const storageProviderEnum = pgEnum("storage_provider", [
  "SUPABASE",
  "LOCAL_FILESYSTEM",
]);

export const evidenceTypeEnum = pgEnum("evidence_type", [
  "PDF",
  "WORD_DOC",
  "SPREADSHEET",
  "IMAGE",
  "URL",
  "FREE_TEXT_NOTE",
]);

// --- Notifications (addendum #5) ---
export const notificationTypeEnum = pgEnum("notification_type", [
  "HAND_OFF",
  "QUESTION_SENT_TO_STAKEHOLDER",
  "PM_REVIEW_REQUESTED",
  "INFERENCE_READY_FOR_REVIEW",
  "BASELINE_CREATED",
  "POST_BASELINE_CHANGE_FLAGGED",
]);

export const notificationChannelTypeEnum = pgEnum("notification_channel_type", [
  "EMAIL",
  "SLACK",
  "TEAMS",
]);
