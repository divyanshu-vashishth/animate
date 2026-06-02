"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@stickman/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
  IconMovie,
  IconCloudUpload,
  IconLogout,
  IconPlus,
  IconPhoto,
  IconFileCode,
  IconAlertCircle,
  IconLoader2,
  IconSun,
  IconMoon,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  updatedAt: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  url: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"animations" | "assets">("animations");
  
  // Collapse and Theme States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  // Upload States
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: session, isPending } = authClient.useSession();


  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? "light" : "dark";
    setTheme(nextTheme);
    toast.success(`Switched to ${nextTheme === "dark" ? "Dark" : "Light"} Mode`);
  };

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Custom modals state
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnimationName, setNewAnimationName] = useState("");
  const [creating, setCreating] = useState(false);

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    const { id, name } = projectToDelete;
    setProjectToDelete(null);
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success(`"${name}" deleted successfully`);
    } catch (err) {
      console.error("Failed to delete project", err);
      toast.error("Failed to delete project");
    }
  };

  const handleConfirmCreate = async () => {
    if (!newAnimationName.trim() || creating) return;
    setCreating(true);
    try {
      const { project } = await api.createProject(newAnimationName.trim());
      toast.success("Animation created successfully!");
      setShowCreateModal(false);
      setNewAnimationName("");
      router.push(`/editor/${project.id}`);
    } catch {
      toast.error("Failed to create new animation");
    } finally {
      setCreating(false);
    }
  };

  // Load Projects on Mount
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/sign-in");
      return;
    }
    void api
      .listProjects()
      .then(({ projects: list }) => setProjects(list))
      .catch(() => router.replace("/sign-in"))
      .finally(() => setLoading(false));
  }, [session, isPending, router]);

  // Load Assets when Tab changes
  useEffect(() => {
    if (!session?.user) return;
    if (activeTab === "assets") {
      api.listAssets()
        .then(({ assets: list }) => setAssets(list))
        .catch((err) => {
          console.error("Failed to load assets", err);
          toast.error("Failed to load assets from server");
        });
    }
  }, [activeTab, session]);

  const signOut = async () => {
    await authClient.signOut();
    toast.success("Signed out successfully");
    router.replace("/sign-in");
    router.refresh();
  };

  const getUserInitials = (nameOrEmail: string) => {
    if (!nameOrEmail) return "U";
    return nameOrEmail.slice(0, 2).toUpperCase();
  };

  // Handle Asset Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG/JPG/SVG/GIF)");
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => {
      setUploading(true);
      setUploadProgress(10);
    };
    
    // Simulate upload progress bar micro-animation
    let progressInterval: NodeJS.Timeout;
    reader.onload = async () => {
      let currentProgress = 10;
      progressInterval = setInterval(() => {
        currentProgress += 15;
        if (currentProgress >= 90) {
          clearInterval(progressInterval);
          setUploadProgress(90);
        } else {
          setUploadProgress(currentProgress);
        }
      }, 100);

      const base64Url = reader.result as string;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      let fileUrl = base64Url;

      if (supabaseUrl && supabaseKey) {
        try {
          const fileExt = file.name.split(".").pop() || "png";
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${fileName}`;

          // Upload binary directly to Supabase Storage REST API
          const storageRes = await fetch(`${supabaseUrl}/storage/v1/object/assets/${filePath}`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseKey}`,
              "apikey": supabaseKey,
            },
            body: file,
          });

          if (storageRes.ok) {
            fileUrl = `${supabaseUrl}/storage/v1/object/public/assets/${filePath}`;
          } else {
            console.error("Supabase Storage REST upload failed, status:", storageRes.status);
          }
        } catch (err) {
          console.error("Failed to upload to Supabase Storage, falling back to base64:", err);
        }
      }

      try {
        const { asset } = await api.uploadAsset(file.name, file.type, fileUrl, { size: file.size });
        clearInterval(progressInterval);
        setUploadProgress(100);
        setTimeout(() => {
          setAssets((prev) => [asset, ...prev]);
          setUploading(false);
          setUploadProgress(0);
          toast.success(`Asset "${file.name}" uploaded successfully!`);
        }, 300);
      } catch (err) {
        clearInterval(progressInterval);
        setUploading(false);
        setUploadProgress(0);
        toast.error("Failed to save asset to the server");
      }
    };

    reader.onerror = () => {
      setUploading(false);
      setUploadProgress(0);
      toast.error("Error reading file");
    };

    reader.readAsDataURL(file);
  };

  if (isPending || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Loading your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans text-foreground">
      {/* LEFT SIDEBAR */}
      <div 
        className={`flex shrink-0 flex-col justify-between border-r border-border/50 bg-card/30 backdrop-blur-md transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "w-16 p-2" : "w-64 p-4"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Brand Header */}
          <div className={`flex items-center justify-between px-2 py-1 select-none ${isSidebarCollapsed ? "flex-col gap-4" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20">
                S
              </div>
              {!isSidebarCollapsed && (
                <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
                  Stickman Studio
                </span>
              )}
            </div>
            
            {/* Sidebar Collapse Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="text-muted-foreground hover:text-primary transition-colors p-1 hover:bg-accent/40 rounded-md"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                className={`h-4 w-4 transform transition-transform duration-300 ${isSidebarCollapsed ? "rotate-180" : ""}`}
              >
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Sidebar Menu Items */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab("animations")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                isSidebarCollapsed ? "justify-center" : ""
              } ${
                activeTab === "animations"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
              title="Animations"
            >
              <IconMovie className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span>Animations</span>}
            </button>

            <button
              onClick={() => setActiveTab("assets")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                isSidebarCollapsed ? "justify-center" : ""
              } ${
                activeTab === "assets"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              }`}
              title="Assets Manager"
            >
              <IconCloudUpload className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span>Assets Manager</span>}
            </button>
          </div>
        </div>

        {/* BOTTOM AUTH PROFILE WIDGET */}
        <div className="flex flex-col gap-3 border-t border-border/40 pt-4 relative select-none">
          {/* FLOATING AUTH MENU POPUP */}
          {isProfileMenuOpen && (
            <div 
              className={`absolute bottom-full mb-2 z-50 w-52 rounded-xl border border-border/60 bg-card/90 backdrop-blur-lg p-2.5 shadow-2xl flex flex-col gap-1 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
                isSidebarCollapsed ? "left-2" : "left-0"
              }`}
            >
              <div className="flex flex-col px-2 py-1.5 min-w-0">
                <span className="text-xs font-black text-foreground truncate">
                  {session?.user?.name || session?.user?.email?.split("@")[0] || "User"}
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-medium">
                  {session?.user?.email}
                </span>
              </div>
              <div className="h-px bg-border/40 my-1" />
              
              {/* Toggle Theme Item */}
              <button
                onClick={() => {
                  toggleTheme();
                  setIsProfileMenuOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150"
              >
                {isDarkMode ? (
                  <>
                    <IconSun className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Light Mode</span>
                  </>
                ) : (
                  <>
                    <IconMoon className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>Dark Mode</span>
                  </>
                )}
              </button>

              {/* Sign Out Item */}
              <button
                onClick={() => {
                  void signOut();
                  setIsProfileMenuOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
              >
                <IconLogout className="h-4 w-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* AUTH TRIGGER BUTTON */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-xs font-extrabold uppercase shadow-md hover:scale-[1.05] active:scale-[0.95] transition-all duration-200"
                title="Account Settings"
              >
                {getUserInitials(session?.user?.name || session?.user?.email || "U")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-accent/20 p-2 border border-border/20 hover:bg-accent/40 active:scale-[0.98] transition-all duration-200 text-left"
              title="Account Menu"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-xs font-bold uppercase shadow-sm">
                  {getUserInitials(session?.user?.name || session?.user?.email || "U")}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-extrabold text-foreground">
                    {session?.user?.name || session?.user?.email?.split("@")[0] || "User"}
                  </span>
                  <span className="truncate text-[10px] text-muted-foreground font-medium">
                    {session?.user?.email}
                  </span>
                </div>
              </div>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                className={`h-4 w-4 text-muted-foreground transform transition-transform duration-200 shrink-0 ${
                  isProfileMenuOpen ? "rotate-180" : ""
                }`}
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* MAIN VIEW CONTENT */}
      <div className="flex-1 overflow-y-auto bg-neutral-950/10 p-8 min-w-0">
        
        {/* VIEW 1: ANIMATIONS (BOX/GRID FORMAT) */}
        {activeTab === "animations" && (
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">My Animations</h1>
                <p className="text-xs text-muted-foreground">Create, edit, and orchestrate stickman sprite animations</p>
              </div>
              <Button
                onClick={() => {
                  setNewAnimationName("");
                  setShowCreateModal(true);
                }}
                className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform duration-200"
              >
                <IconPlus className="h-4 w-4" /> New Animation
              </Button>
            </div>

            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-card/10 py-16 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <IconMovie className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">No animations yet</h3>
                <p className="text-xs text-muted-foreground max-w-xs mb-6">
                  Get started by creating your very first stickman canvas project!
                </p>
                <Button onClick={() => {
                  setNewAnimationName("");
                  setShowCreateModal(true);
                }} size="sm">
                  Create First Animation
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                {projects.map((p) => (
                  <div key={p.id} className="group relative block select-none">
                    <Link href={`/editor/${p.id}`}>
                      <div className="h-36 flex flex-col justify-between rounded-xl border border-border/40 bg-card/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card/70 hover:shadow-xl hover:shadow-primary/5">
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 border border-border/30 group-hover:border-primary/20 transition-colors">
                            <IconMovie className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                          </div>
                          <span className="text-[10px] text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                            {new Date(p.updatedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="min-w-0 pr-8">
                          <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                            {p.name}
                          </h3>
                          <p className="mt-1 text-[10px] text-muted-foreground font-medium">
                            Last edited {new Date(p.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </Link>
                    
                    {/* Delete Animation Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setProjectToDelete({ id: p.id, name: p.name });
                      }}
                      className="absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 bg-card/60 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md"
                      title="Delete Animation"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: ASSETS MANAGER */}
        {activeTab === "assets" && (
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight">Assets Manager</h1>
              <p className="text-xs text-muted-foreground">Upload your custom image sprites, visual elements, backgrounds, or combat props</p>
            </div>

            {/* Upload Zone Card */}
            <div className="mb-8 rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-md">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-4">
                Upload New Asset
              </h3>
              
              <div className="relative flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-neutral-900/40 py-8 px-4 text-center transition-colors hover:border-primary/50">
                <input
                  type="file"
                  id="asset-upload-input"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept="image/*"
                />
                
                {uploading ? (
                  <div className="flex flex-col items-center w-full max-w-xs">
                    <IconLoader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                    <p className="text-xs font-bold text-foreground mb-1.5">Uploading Element...</p>
                    <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-150" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 font-semibold">{uploadProgress}%</span>
                  </div>
                ) : (
                  <>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-muted-foreground mb-3 border border-border/20">
                      <IconCloudUpload className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-bold text-foreground mb-1">
                      Click to browse or drag & drop files here
                    </p>
                    <p className="text-[10px] text-muted-foreground max-w-sm">
                      PNG, JPG, GIF, or SVG images. Elements uploaded here become fully cataloged.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Assets Grid */}
            <div className="rounded-xl border border-border/30 bg-card/25 p-6">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-4">
                My Uploaded Elements ({assets.length})
              </h3>

              {assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <IconPhoto className="h-8 w-8 text-muted-foreground/40 mb-2.5" />
                  <p className="text-xs font-semibold text-muted-foreground">No uploaded assets found</p>
                  <p className="text-[10px] text-muted-foreground/60 max-w-xs mt-1">
                    Upload sprite sheets or combat assets above to populate your inventory library.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {assets.map((asset) => (
                    <div 
                      key={asset.id} 
                      className="group flex flex-col justify-between overflow-hidden rounded-lg border border-border/40 bg-neutral-900/50 p-2.5 transition-all duration-300 hover:border-primary/20 hover:bg-neutral-900"
                    >
                      {/* Image Thumbnail Container */}
                      <div className="relative flex h-24 w-full items-center justify-center rounded bg-neutral-950 p-2 overflow-hidden border border-border/20">
                        {asset.url.startsWith("data:") || asset.url.startsWith("http") ? (
                          <img 
                            src={asset.url} 
                            alt={asset.name} 
                            className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <IconPhoto className="h-8 w-8 text-muted-foreground/30" />
                        )}
                      </div>
                      
                      {/* Asset Details */}
                      <div className="mt-2 min-w-0">
                        <p className="truncate text-xs font-bold text-foreground" title={asset.name}>
                          {asset.name}
                        </p>
                        <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider block mt-0.5">
                          {asset.type.split("/")[1] || asset.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-border/50 bg-card/95 p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-extrabold text-foreground">Delete Animation</h3>
              <p className="text-xs text-muted-foreground">
                Are you sure you want to delete <span className="font-bold text-foreground">"{projectToDelete.name}"</span>? This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProjectToDelete(null)}
                className="h-8 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  void confirmDelete();
                }}
                className="h-8 text-xs font-semibold"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Animation Custom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-border/50 bg-card/95 p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-sm font-extrabold text-foreground">Create New Animation</h3>
              <p className="text-xs text-muted-foreground">
                Give your animation a name to get started.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-anim-name" className="text-xs text-muted-foreground font-semibold">Animation Name</Label>
              <Input
                id="new-anim-name"
                value={newAnimationName}
                onChange={(e) => setNewAnimationName(e.target.value)}
                placeholder="My Awesome Stickman Animation"
                className="h-9 text-xs font-semibold px-2 py-0.5"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleConfirmCreate();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2.5 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAnimationName("");
                }}
                className="h-8 text-xs font-semibold"
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void handleConfirmCreate();
                }}
                className="h-8 text-xs font-semibold"
                disabled={creating || !newAnimationName.trim()}
              >
                {creating ? (
                  <IconLoader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Create
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
