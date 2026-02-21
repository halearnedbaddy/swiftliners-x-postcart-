import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
  Building2,
  FileCheck,
  CreditCard,
  AlertTriangle,
  DollarSign,
  Bell,
  Settings,
  Menu,
  LogOut,
  User,
  ChevronDown,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const overviewItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
];

const managementItems = [
  { title: "Businesses", url: "/admin/businesses", icon: Building2 },
  { title: "Compliance", url: "/admin/compliance", icon: FileCheck, badge: "3", badgeColor: "bg-yellow-400/20 text-yellow-400" },
  { title: "Transactions", url: "/admin/transactions", icon: CreditCard },
  { title: "Disputes", url: "/admin/disputes", icon: AlertTriangle },
];

const systemItems = [
  { title: "Revenue", url: "/admin/revenue", icon: DollarSign },
  { title: "Notifications", url: "/admin/notifications", icon: Bell },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out successfully" });
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#0a0a14]">
        <Sidebar className="border-r border-white/[0.06] bg-[#0d0d1a]">
          <SidebarContent className="bg-[#0d0d1a]">
            {/* Logo */}
            <div className="px-5 py-5 border-b border-white/[0.06] mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-red-400" />
                </div>
                <span className="font-display font-extrabold text-lg text-white">
                  Pay<span className="text-primary">Chain</span>
                  <span className="text-red-400 text-xs ml-1">Admin</span>
                </span>
              </div>
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
                                ? "bg-red-500/20 text-red-400"
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

            {/* Management */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[9px] font-bold tracking-[2px] uppercase text-white/25 px-5">
                Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {managementItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 mx-3 rounded-lg text-xs font-medium transition-colors ${
                              isActive
                                ? "bg-red-500/20 text-red-400"
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

            {/* System */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[9px] font-bold tracking-[2px] uppercase text-white/25 px-5">
                System
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {systemItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-3 py-2 mx-3 rounded-lg text-xs font-medium transition-colors ${
                              isActive
                                ? "bg-red-500/20 text-red-400"
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

            {/* Back to Dashboard */}
            <div className="mt-auto px-5 pb-5">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-white/40 hover:text-white/60 hover:bg-white/[0.04] text-xs"
                onClick={() => navigate("/dashboard")}
              >
                ← Back to Dashboard
              </Button>
            </div>
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
                Admin Panel
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                ● ADMIN
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/[0.05] gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <span className="text-xs max-w-[120px] truncate hidden sm:inline">{user?.email}</span>
                    <ChevronDown className="w-3 h-3 text-white/40" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-[#0d0d1a] border-white/10">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-white">Admin Account</p>
                    <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/[0.08]" />
                  <DropdownMenuItem
                    onClick={() => navigate("/admin/settings")}
                    className="text-xs text-white/70 focus:bg-white/[0.08] focus:text-white cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 mr-2" /> Admin Settings
                  </DropdownMenuItem>
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

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
