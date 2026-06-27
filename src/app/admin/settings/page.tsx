"use client";

import { Settings, Moon, Sun, Shield, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/theme-provider";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">System configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings size={18} />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground capitalize">{theme} mode</p>
              </div>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              Switch to {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield size={18} />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>✓ JWT-based session authentication</p>
          <p>✓ Role-based access control (RBAC)</p>
          <p>✓ Password hashing with bcrypt</p>
          <p>✓ Input validation with Zod</p>
          <p>✓ API rate limiting (100 req/min)</p>
          <p>✓ CSRF protection via NextAuth</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database size={18} />
            System Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span>1.0.0 (Thesis Prototype)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Points per Bottle</span>
            <span>10</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hardware Mode</span>
            <span>Simulated</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
