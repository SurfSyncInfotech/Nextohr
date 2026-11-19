import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Skeleton } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Approvals = lazy(() => import('@/pages/Approvals'))
const Employees = lazy(() => import('@/pages/people/Employees'))
const EmployeeForm = lazy(() => import('@/pages/people/EmployeeForm'))
const EmployeeProfile = lazy(() => import('@/pages/people/EmployeeProfile'))
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'))
const OfferEditor = lazy(() => import('@/pages/onboarding/OfferEditor'))
const Assets = lazy(() => import('@/pages/Assets'))
const Attendance = lazy(() => import('@/pages/Attendance'))
const Leave = lazy(() => import('@/pages/Leave'))
const Goals = lazy(() => import('@/pages/Goals'))
const WorkReports = lazy(() => import('@/pages/WorkReports'))
const Payroll = lazy(() => import('@/pages/payroll/Payroll'))
const PayrollRunWizard = lazy(() => import('@/pages/payroll/PayrollRunWizard'))
const PayrollRunDetail = lazy(() => import('@/pages/payroll/PayrollRunDetail'))
const Announcements = lazy(() => import('@/pages/Announcements'))
const MailPage = lazy(() => import('@/pages/Mail'))
const Settings = lazy(() => import('@/pages/settings/Settings'))
const Login = lazy(() => import('@/pages/Login'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function PageLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="mt-4 h-64 w-full rounded-2xl" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="people" element={<Employees />} />
        <Route path="people/new" element={<EmployeeForm />} />
        <Route path="people/:id" element={<EmployeeProfile />} />
        <Route path="people/:id/edit" element={<EmployeeForm />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="onboarding/offer/:id" element={<OfferEditor />} />
        <Route path="assets" element={<Assets />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="leave" element={<Leave />} />
        <Route path="goals" element={<Goals />} />
        <Route path="reports" element={<WorkReports />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="payroll/run" element={<PayrollRunWizard />} />
        <Route path="payroll/runs/:id" element={<PayrollRunDetail />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="mail" element={<MailPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/:section" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
