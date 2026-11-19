import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, CalendarPlus, CheckCheck, ChevronsLeft, ChevronsRight, FilePlus2, LogOut, Megaphone, Menu as MenuIcon, Moon, PackagePlus,
  Plus, RotateCcw, Search, Settings, Sun, UserPlus, Wallet, X,
} from 'lucide-react'
import { useDb } from '@/data/db'
import { api } from '@/data/api'
import { pendingCounts } from '@/data/selectors'
import { cn, relTime } from '@/lib/utils'
import { Avatar, Button, ConfirmDialog, IconButton, Menu, MenuDivider, MenuItem, Toaster, toast } from '@/components/ui'
import { NAV, SETTINGS_NAV, type NavItem } from './nav'
import { LogoFull } from './Logo'
import { CommandPalette } from './CommandPalette'
import { useTheme } from './theme'

function useBadges() {
  return useDb((db) => {
    const p = pendingCounts(db)
    return {
      approvals: p.total,
      reports: p.reports,
      leave: p.leaves,
      onboarding: p.onboarding + p.offers,
      mail: db.mails.filter((m) => m.folder === 'inbox' && !m.read).length,
    } as Record<NonNullable<NavItem['badge']>, number>
  })
}

function SideLink({ item, collapsed, badge, onNavigate }: { item: NavItem; collapsed: boolean; badge?: number; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => cn(
        'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-semibold transition-colors',
        isActive ? 'bg-primary-soft text-primary-ink' : 'text-muted hover:bg-surface-3 hover:text-ink',
        collapsed && 'justify-center px-0',
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-primary" aria-hidden />}
          <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary-ink' : 'text-subtle group-hover:text-ink')} />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!!badge && (
            <span className={cn('num rounded-full px-1.5 text-[11px] font-bold leading-5',
              collapsed ? 'absolute right-1 top-1 h-4 min-w-4 px-1 text-[10px] leading-4' : '',
              isActive ? 'bg-primary text-on-primary' : 'bg-primary/15 text-primary-ink')}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function Sidebar({ collapsed, onToggle, onNavigate, mobile }: { collapsed: boolean; onToggle?: () => void; onNavigate?: () => void; mobile?: boolean }) {
  const badges = useBadges()
  const setup = useDb((db) => db.setupDone.length)
  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 shrink-0 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
        <Link to="/" onClick={onNavigate} className="flex items-center" aria-label="SurfSync HRMS home">
          {collapsed ? <LogoFull height={30} /> : <LogoFull height={38} />}
        </Link>
        {mobile && <IconButton className="ml-auto" label="Close menu" onClick={onNavigate} icon={<X className="h-5 w-5" />} />}
      </div>
      <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-3" aria-label="Main">
        {NAV.map((g) => (
          <div key={g.label} className="mt-4 first:mt-1">
            {!collapsed ? <div className="mb-1.5 px-3 label-xs">{g.label}</div> : <div className="mx-auto mb-2 h-px w-6 bg-line" />}
            <div className="flex flex-col gap-0.5">
              {g.items.map((it) => <SideLink key={it.to} item={it} collapsed={collapsed} badge={it.badge ? badges[it.badge] : undefined} onNavigate={onNavigate} />)}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-3 py-3">
        {!collapsed && setup < 11 && (
          <Link to="/settings" onClick={onNavigate} className="mb-2 block rounded-xl bg-gradient-to-br from-primary-soft to-accent-soft p-3">
            <div className="flex items-center justify-between text-[13px] font-bold text-ink">Company setup <span className="num text-primary-ink">{setup}/11</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface/70"><div className="h-full rounded-full bg-primary" style={{ width: `${(setup / 11) * 100}%` }} /></div>
            <p className="mt-1.5 text-xs text-muted">Finish Roles & Permissions to go live.</p>
          </Link>
        )}
        <SideLink item={SETTINGS_NAV} collapsed={collapsed} onNavigate={onNavigate} />
        {onToggle && (
          <button onClick={onToggle} className={cn('mt-1 flex h-9 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-semibold text-subtle hover:bg-surface-3 hover:text-ink', collapsed && 'justify-center px-0')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
          </button>
        )}
      </div>
    </div>
  )
}

function Notifications() {
  const nav = useNavigate()
  const items = useDb((db) => db.notifications)
  const unread = items.filter((n) => !n.read).length
  return (
    <Menu width="w-[min(380px,calc(100vw-24px))]" trigger={(p) => (
      <button {...p} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-3 hover:text-ink" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Bell className="h-[19px] w-[19px]" />
        {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface" />}
      </button>
    )}>
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
            <span className="text-sm font-bold">Notifications</span>
            {unread > 0 && (
              <button className="inline-flex items-center gap-1 text-xs font-semibold text-accent-ink hover:underline" onClick={() => api.notifications.markRead()}>
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="scroll-thin max-h-[60vh] overflow-y-auto">
            {items.map((n) => (
              <button key={n.id} onClick={() => { api.notifications.markRead(n.id); if (n.link) nav(n.link); close() }}
                className="flex w-full gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-surface-3">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{n.title}</span>
                  <span className="block text-[13px] text-muted">{n.body}</span>
                  <span className="mt-0.5 block text-xs text-subtle">{relTime(n.date)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Menu>
  )
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('ss-collapsed') === '1' } catch { return false } })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [palette, setPalette] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const { dark, toggle } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const company = useDb((db) => db.company)

  useEffect(() => { try { localStorage.setItem('ss-collapsed', collapsed ? '1' : '0') } catch { /* ignore */ } }, [collapsed])
  useEffect(() => { setMobileOpen(false); document.getElementById('main')?.focus({ preventScroll: true }); window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const closePalette = useCallback(() => setPalette(false), [])

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop">Skip to content</a>
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-surface transition-[width] duration-200 lg:block', collapsed ? 'w-[76px]' : 'w-[264px]')}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-[#0b1118]/45" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] animate-slide-in border-r border-line bg-surface shadow-pop">
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} mobile />
          </aside>
        </div>
      )}

      <div className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <IconButton className="lg:hidden" label="Open menu" onClick={() => setMobileOpen(true)} icon={<MenuIcon className="h-5 w-5" />} />
          <button onClick={() => setPalette(true)}
            className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 text-sm text-subtle transition-colors hover:border-line-strong sm:max-w-md">
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search people, assets, actions…</span>
            <kbd className="ml-auto hidden rounded-md border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold sm:block">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Menu width="w-60" trigger={(p) => (
              <Button {...p} variant="primary" size="md" icon={<Plus className="h-4 w-4" />} className="hidden sm:inline-flex">Create</Button>
            )}>
              {(close) => (
                <>
                  <MenuItem icon={<UserPlus className="h-4 w-4" />} onClick={() => { close(); nav('/people/new') }}>Add employee</MenuItem>
                  <MenuItem icon={<FilePlus2 className="h-4 w-4" />} onClick={() => { close(); nav('/onboarding/offer/new') }}>Offer letter</MenuItem>
                  <MenuItem icon={<CalendarPlus className="h-4 w-4" />} onClick={() => { close(); nav('/leave?log=1') }}>Log leave</MenuItem>
                  <MenuItem icon={<PackagePlus className="h-4 w-4" />} onClick={() => { close(); nav('/assets?new=1') }}>Asset</MenuItem>
                  <MenuItem icon={<Megaphone className="h-4 w-4" />} onClick={() => { close(); nav('/announcements?compose=notice') }}>Announcement</MenuItem>
                  <MenuDivider />
                  <MenuItem icon={<Wallet className="h-4 w-4" />} onClick={() => { close(); nav('/payroll/run') }}>Run payroll</MenuItem>
                </>
              )}
            </Menu>
            <IconButton label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggle} icon={dark ? <Sun className="h-[19px] w-[19px]" /> : <Moon className="h-[19px] w-[19px]" />} />
            <Notifications />
            <Menu width="w-64" trigger={(p) => (
              <button {...p} className="ml-1 flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-surface-3" aria-label="Account menu">
                <Avatar name="HR Admin" hue={28} size={34} />
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-[13px] font-bold text-ink">HR Admin</span>
                  <span className="block text-[11px] text-subtle">Tenant admin</span>
                </span>
              </button>
            )}>
              {(close) => (
                <>
                  <div className="px-2.5 pb-2 pt-1.5">
                    <p className="text-sm font-bold">{company.name}</p>
                    <p className="truncate text-xs text-subtle">{company.email}</p>
                    <span className="mt-2 inline-flex rounded-md bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success">Starter plan · Active</span>
                  </div>
                  <MenuDivider />
                  <MenuItem icon={<Settings className="h-4 w-4" />} onClick={() => { close(); nav('/settings') }}>Company settings</MenuItem>
                  <MenuItem icon={<RotateCcw className="h-4 w-4" />} onClick={() => { close(); setResetOpen(true) }}>Reset demo data</MenuItem>
                  <MenuDivider />
                  <MenuItem icon={<LogOut className="h-4 w-4" />} onClick={() => { close(); nav('/login') }}>Sign out</MenuItem>
                </>
              )}
            </Menu>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={palette} onClose={closePalette} />
      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} tone="primary" confirmLabel="Reset data" loading={resetting}
        title="Reset demo data?" body="All changes you made in this browser will be replaced with the original sample company data."
        onConfirm={async () => { setResetting(true); await api.reset(); setResetting(false); setResetOpen(false); toast.success('Demo data restored') }} />
      <Toaster />
    </div>
  )
}
