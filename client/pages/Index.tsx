import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { PencilLine } from "lucide-react";

type Role = "superadmin" | "teacher";

export default function Index() {
  const [adminConfigured, setAdminConfigured] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Role>("teacher");
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    fetch("/api/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAdminConfigured(!!d.adminConfigured));
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/setup-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) return alert("Setup failed");
    nav("/admin");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role: mode, ...form }),
    });
    setLoading(false);
    if (!res.ok) {
      return alert("Invalid credentials");
    }
    if (mode === "superadmin") nav("/admin");
    else nav("/teacher");
  };

  const forceReset = async () => {
    setLoading(true);
    const r = await fetch("/api/setup-admin/force", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!r.ok) return alert("Reset failed");
    nav("/admin");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-violet-100 px-4">
      <div className="flex-1 w-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              <div className="flex items-center justify-between">
                <span>
                  {adminConfigured === false
                    ? "Set up Superadmin"
                    : mode === "superadmin"
                      ? "Admin Login"
                      : "Teacher Login"}
                </span>
                {adminConfigured !== false && (
                  <div className="flex gap-1 bg-muted rounded p-1">
                    <Button
                      type="button"
                      variant={mode === "superadmin" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMode("superadmin")}
                    >
                      <span className="sr-only">Admin</span>
                      <PencilLine className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={mode === "teacher" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setMode("teacher")}
                    >
                      Teacher
                    </Button>
                  </div>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adminConfigured === false ? (
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating..." : "Create Superadmin"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="l-email">Email</Label>
                  <Input
                    id="l-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="l-password">Password</Label>
                  <Input
                    id="l-password"
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
