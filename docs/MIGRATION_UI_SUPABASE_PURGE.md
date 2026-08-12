# Backlog purge appels Supabase (UI)

Ces fichiers contiennent encore des appels style Supabase (`supabase.from` / `auth` / `functions`).
Dans Newcarboscan-2027 ils importent `@/integrations/api/client` mais **doivent être réécrits vers `api.*`**.
Aucune correction 1:1 n'est faite volontairement (décision audit / migration).

Total:       84 fichiers

| Fichier | Priorité suggérée |
|---|---|
| `apps/web/src/app/parametres/ParametresApiKeys.tsx` | P2 |
| `apps/web/src/app/parametres/ParametresMonCompte.tsx` | P2 |
| `apps/web/src/app/parametres/ParametresOrganisation.tsx` | P2 |
| `apps/web/src/app/parametres/ParametresOrganisationPro.tsx` | P2 |
| `apps/web/src/app/parametres/ParametresUtilisateurs.tsx` | P2 |
| `apps/web/src/app/reporting/ProReportsHome.tsx` | P2 |
| `apps/web/src/components/admin-blog/BlogPostEditor.tsx` | P1 |
| `apps/web/src/components/carbo-start/BilanHistory.tsx` | P2 |
| `apps/web/src/components/carbo-start/CarboScanQuestionnaire.tsx` | P2 |
| `apps/web/src/components/carbo-start/CarboScanReports.tsx` | P2 |
| `apps/web/src/components/carbo-start/CarboTrackDashboard.tsx` | P2 |
| `apps/web/src/components/carbo-start/CompanyLogo.tsx` | P2 |
| `apps/web/src/components/carbo-start/DatabaseCarboScanQuestionnaire.tsx` | P2 |
| `apps/web/src/components/carbo-start/ModernCarboScanSidebar.tsx` | P2 |
| `apps/web/src/components/carbo-start/RecoverLocalData.tsx` | P2 |
| `apps/web/src/components/carbo-start/SimpleDashboard.tsx` | P2 |
| `apps/web/src/components/carbo-start/settings/OrganizationSettings.tsx` | P2 |
| `apps/web/src/components/carbo-start/settings/UserManagement.tsx` | P2 |
| `apps/web/src/components/checkout/CheckoutContent.tsx` | P2 |
| `apps/web/src/components/demo/DemoStepsWizard.tsx` | P2 |
| `apps/web/src/components/empreinte-produit-calculator/EmpreinteProduitCalculatorSurvey.tsx` | P2 |
| `apps/web/src/components/homepage/GuideDownloadSection.tsx` | P2 |
| `apps/web/src/components/inscription/InscriptionForm.tsx` | P2 |
| `apps/web/src/components/layout/SimplifiedSidebar.tsx` | P2 |
| `apps/web/src/components/onboarding/OnboardingWizard.tsx` | P2 |
| `apps/web/src/components/payment/PaymentContent.tsx` | P2 |
| `apps/web/src/components/personal-carbon-calculator/PersonalCarbonSurvey.tsx` | P2 |
| `apps/web/src/components/pricing/SimplePricingPage.tsx` | P2 |
| `apps/web/src/components/scope3/EmissionFactorSelector.tsx` | P2 |
| `apps/web/src/components/superadmin/AdemeImporter.tsx` | P2 |
| `apps/web/src/components/superadmin/DeleteOrganizationDialog.tsx` | P2 |
| `apps/web/src/components/superadmin/OrganizationModulesManager.tsx` | P2 |
| `apps/web/src/components/superadmin/OrganizationPlanMenu.tsx` | P2 |
| `apps/web/src/components/superadmin/OrganizationYearsManager.tsx` | P2 |
| `apps/web/src/components/superadmin/SuperAdminLayout.tsx` | P2 |
| `apps/web/src/hooks/__tests__/useAuth.test.tsx` | P1 |
| `apps/web/src/hooks/useACVProjects.tsx` | P2 |
| `apps/web/src/hooks/useAcademyCourse.ts` | P2 |
| `apps/web/src/hooks/useAssessmentUsage.tsx` | P2 |
| `apps/web/src/hooks/useAuth.tsx` | P1 |
| `apps/web/src/hooks/useCacheStats.tsx` | P2 |
| `apps/web/src/hooks/useEstimations.ts` | P2 |
| `apps/web/src/hooks/usePeriodicSessions.ts` | P2 |
| `apps/web/src/hooks/useSubscriptionStatus.tsx` | P2 |
| `apps/web/src/hooks/useUserRole.tsx` | P2 |
| `apps/web/src/lib/activity-data/CollectDataRoomService.ts` | P2 |
| `apps/web/src/lib/activity-data/CollectNotificationService.ts` | P2 |
| `apps/web/src/lib/ai/ocrService.ts` | P2 |
| `apps/web/src/lib/automatedBilanCalculation.ts` | P2 |
| `apps/web/src/lib/bilan-carbone/BilanCarboneDetailService.ts` | P0 |
| `apps/web/src/lib/calculators/BilanCarboneCalculator.ts` | P2 |
| `apps/web/src/lib/calculators/ProductFootprintCalculator.ts` | P2 |
| `apps/web/src/lib/logoService.ts` | P2 |
| `apps/web/src/lib/recalculation/RecalculationService.ts` | P2 |
| `apps/web/src/lib/reporting/ReportParagraphService.ts` | P2 |
| `apps/web/src/lib/services/BilanWorkflowService.ts` | P2 |
| `apps/web/src/lib/services/DataValidationService.ts` | P2 |
| `apps/web/src/lib/services/ReportGeneratorService.ts` | P2 |
| `apps/web/src/modules/cbam/CBAMPage.tsx` | P2 |
| `apps/web/src/modules/cbam/hooks/useCBAMData.ts` | P2 |
| `apps/web/src/modules/climate-roadmap/components/ActionDetailPopup.tsx` | P2 |
| `apps/web/src/modules/climate-roadmap/components/CreateActionDialog.tsx` | P2 |
| `apps/web/src/modules/climate-roadmap/hooks/useClimateRoadmap.ts` | P2 |
| `apps/web/src/modules/collect/components/InvoiceUploadTab.tsx` | P0 |
| `apps/web/src/modules/collect/hooks/useCollectComments.ts` | P0 |
| `apps/web/src/modules/empreinte-produit/components/study/PCFResults.tsx` | P2 |
| `apps/web/src/modules/empreinte-produit/hooks/usePCFStudy.ts` | P2 |
| `apps/web/src/modules/empreinte-produit/hooks/usePCFVersions.ts` | P2 |
| `apps/web/src/modules/scenarios/hooks/useScenarios.ts` | P2 |
| `apps/web/src/modules/scenarios/sections/ScenarioTrajectoriesSection.tsx` | P2 |
| `apps/web/src/modules/wattbim/apiKeysHooks.ts` | P2 |
| `apps/web/src/modules/wattbim/hooks.ts` | P2 |
| `apps/web/src/pages/AdminBlog.tsx` | P1 |
| `apps/web/src/pages/Auth.tsx` | P1 |
| `apps/web/src/pages/Inscription.tsx` | P2 |
| `apps/web/src/pages/academy/CourseDetailPage.tsx` | P2 |
| `apps/web/src/pages/academy/LessonPage.tsx` | P2 |
| `apps/web/src/pages/superadmin/SuperAdminBlog.tsx` | P1 |
| `apps/web/src/pages/superadmin/SuperAdminDashboard.tsx` | P2 |
| `apps/web/src/pages/superadmin/SuperAdminOrders.tsx` | P2 |
| `apps/web/src/pages/superadmin/SuperAdminOrganizations.tsx` | P2 |
| `apps/web/src/pages/superadmin/SuperAdminUsers.tsx` | P2 |
| `apps/web/src/shared/hooks/usePlanAccess.tsx` | P2 |
| `apps/web/src/utils/excelGenerator.ts` | P2 |
