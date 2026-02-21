import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  CreditCard,
  Lock,
  Settings2,
  Banknote,
  FileText,
  Settings,
  BarChart3,
  MessageSquare,
  Menu,
  LogOut,
  User,
  ChevronDown,
  Shield,
} from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "@/hooks/use-toast";
import { SandboxBanner } from "./SandboxBanner";
import ComplianceBanner from "./compliance/ComplianceBanner";

const overviewItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const apiItems = [
  { title: "Collections", url: "/dashboard/collections", icon: CreditCard, badge: "LIVE", badgeColor: "bg-primary text-white" },
  { title: "Escrow / Hold", url: "/dashboard/escrow", icon: Lock },
  { title: "Conditions", url: "/dashboard/conditions", icon: Settings2 },
  { title: "Disbursement", url: "/dashboard/disbursement", icon: Banknote },
];

const accountItems = [
  { title: "Compliance", url: "/dashboard/compliance", icon: FileText, badge: "!", badgeColor: "bg-destructive text-white" },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
  { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Support", url: "/dashboard/support", icon: MessageSquare },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: account } = useAccount();
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useAdmin();
  const businessName = account?.business_name || "Dashboard";

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out successfully" });
    navigate("/login");
  };

  const statusBadge = {
    EMAIL_UNVERIFIED: { label: "Verify Email", color: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30" },
    EMAIL_VERIFIED: { label: "SANDBOX", color: "bg-yellow-400/20 text-yellow-400 border-yellow-400/30" },
    PENDING: { label: "PENDING", color: "bg-blue-400/20 text-blue-400 border-blue-400/30" },
    APPROVED: { label: "LIVE", color: "bg-primary/20 text-primary border-primary/30" },
    REJECTED: { label: "REJECTED", color: "bg-red-400/20 text-red-400 border-red-400/30" },
    SUSPENDED: { label: "SUSPENDED", color: "bg-red-400/20 text-red-400 border-red-400/30" },
  };
  const currentStatus = account?.status || "EMAIL_UNVERIFIED";
  const badge = statusBadge[currentStatus as keyof typeof statusBadge];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#0a0a14]">
        <Sidebar className="border-r border-white/[0.06] bg-[#0d0d1a]">
          <SidebarContent className="bg-[#0d0d1a]">
            {/* Logo */}
            <div className="px-5 py-5 border-b border-white/[0.06] mb-4">
              <span className="font-display font-extrabold text-lg text-white">
                Pay<span className="text-primary">Chain</span>
              </span>
            </div>

            {/* Overview */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[9px] font-bold tracking-[2px] uppercase text-white/25 px-5">
                Overview
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {overviewItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 mx-3 rounded-lg text-xs font-medium transition-colors ${
                              isActive
                                ? "bg-[rgba(108,71,255,0.2)] text-[#a78bfa]"
                                : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
                            }`
                          }
                        >
                          <item.icon className="w-[14px] h-[14px]" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* APIs */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[9px] font-bold tracking-[2px] uppercase text-white/25 px-5">
                APIs
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {apiItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 mx-3 rounded-lg text-xs font-medium transition-colors ${
                              isActive
                                ? "bg-[rgba(108,71,255,0.2)] text-[#a78bfa]"
                                : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
                            }`
                          }
                        >
                          <item.icon className="w-[14px] h-[14px]" />
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Account */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[9px] font-bold tracking-[2px] uppercase text-white/25 px-5">
                Account
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 mx-3 rounded-lg text-xs font-medium transition-colors ${
                              isActive
                                ? "bg-[rgba(108,71,255,0.2)] text-[#a78bfa]"
                                : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
                            }`
                          }
                        >
                          <item.icon className="w-[14px] h-[14px]" />
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          {/* Top bar */}
          <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-white/50 hover:text-white">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <span className="font-display font-bold text-[15px] text-white">
                Good morning, {businessName} 👋
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${badge.color}`}>
                ● {badge.label}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/[0.05] gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-xs max-w-[120px] truncate hidden sm:inline">{user?.email}</span>
                    <ChevronDown className="w-3 h-3 text-white/40" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#0d0d1a] border-white/10">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-white truncate">{businessName}</p>
                    <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem
                    onClick={() => navigate("/dashboard/settings")}
                    className="text-xs text-white/70 focus:bg-white/[0.08] focus:text-white cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 mr-2" /> Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/dashboard/compliance")}
                    className="text-xs text-white/70 focus:bg-white/[0.08] focus:text-white cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 mr-2" /> Compliance
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator className="bg-white/[0.08]" />
                      <DropdownMenuItem
                        onClick={() => navigate("/admin")}
                        className="text-xs text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5 mr-2" /> Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-xs text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Banners */}
          <SandboxBanner />
          <ComplianceBanner />

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
