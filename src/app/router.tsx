import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@shared/ui/AppShell";
import { DashboardPage } from "@pages/DashboardPage";
import { ConversationPage } from "@pages/ConversationPage";
import { WorkflowsPage } from "@pages/WorkflowsPage";
import { WorkflowResultPage } from "@pages/WorkflowResultPage";
import { ProfilesPage } from "@pages/ProfilesPage";
import { TenantsPage } from "@pages/TenantsPage";
import { RagPage } from "@pages/RagPage";
import { EventsPage } from "@pages/EventsPage";
import { TemplatesPage } from "@pages/TemplatesPage";
import { RolesPage } from "@pages/RolesPage";
import { PermissionsPage } from "@pages/PermissionsPage";
import { ChannelsPage } from "@pages/ChannelsPage";
import { AdminAuditPage } from "@pages/AdminAuditPage";
import { LLMConfigPage } from "@pages/LLMConfigPage";
import { MCPConfigPage, MCPOAuthResultPage } from "@pages/MCPConfigPage";
import { LoginPage } from "@pages/LoginPage";
import { ForgotPasswordPage } from "@pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@pages/ResetPasswordPage";
import { SignupPage } from "@pages/SignupPage";
import { VerifyEmailPage } from "@pages/VerifyEmailPage";
import { LandingPage } from "@pages/LandingPage";
import { AccountPrivacyPage } from "@pages/AccountPrivacyPage";
import { BillingPage } from "@pages/BillingPage";
import { ObservabilityPage } from "@pages/ObservabilityPage";
import { PrivacyPolicyPage } from "@pages/legal/PrivacyPolicyPage";
import { TermsPage } from "@pages/legal/TermsPage";
import { DpoPage } from "@pages/legal/DpoPage";
import { HandoffsPage } from "@pages/HandoffsPage";
import { CRMContactsPage } from "@pages/CRMContactsPage";
import { CRMCardsPage } from "@pages/CRMCardsPage";
import { PublicCardPage } from "@pages/PublicCardPage";
import { WorkflowBuilder } from "@features/workflow-builder";
import { AuthProvider } from "./auth-context";
import { ProtectedRoute } from "./protected-route";
import { FeedbackProvider } from "@shared/ui/feedback";
import { CookieBanner } from "@shared/ui/CookieBanner";

export function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <FeedbackProvider>
        <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          {/* Public marketing landing page. */}
          <Route path="/" element={<LandingPage />} />
          {/* Public legal pages (LGPD: must remain accessible without auth). */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/dpo" element={<DpoPage />} />
          {/* Public business card — no auth */}
          <Route path="/c/:slug" element={<PublicCardPage />} />
          <Route
            path="/workflows/builder"
            element={
              <ProtectedRoute>
                <WorkflowBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workflows/builder/:id"
            element={
              <ProtectedRoute>
                <WorkflowBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/conversation" element={<ConversationPage />} />
                    <Route path="/handoffs" element={<HandoffsPage />} />
                    <Route path="/crm/contacts" element={<CRMContactsPage />} />
                    <Route path="/crm/cards" element={<CRMCardsPage />} />
                    <Route path="/workflows" element={<WorkflowsPage />} />
                    <Route path="/workflows/result" element={<WorkflowResultPage />} />
                    <Route path="/profiles" element={<ProfilesPage />} />
                    <Route path="/tenants" element={<TenantsPage />} />
                    <Route path="/rag" element={<RagPage />} />
                    <Route path="/events" element={<EventsPage />} />
                    <Route path="/templates" element={<TemplatesPage />} />
                    <Route path="/roles" element={<RolesPage />} />
                    <Route path="/permissions" element={<PermissionsPage />} />
                    <Route path="/channels" element={<ChannelsPage />} />
                    <Route path="/admin-audit" element={<AdminAuditPage />} />
                    <Route path="/llm-config" element={<LLMConfigPage />} />
                    <Route path="/mcp-config" element={<MCPConfigPage />} />
                    <Route path="/admin/mcp/connected" element={<MCPOAuthResultPage kind="connected" />} />
                    <Route path="/admin/mcp/error" element={<MCPOAuthResultPage kind="error" />} />
                    <Route path="/account/privacy" element={<AccountPrivacyPage />} />
                    <Route path="/account/billing" element={<BillingPage />} />
                    <Route path="/observability" element={<ObservabilityPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            }
          />
        </Routes>
        <CookieBanner />
        </AuthProvider>
      </FeedbackProvider>
    </BrowserRouter>
  );
}
