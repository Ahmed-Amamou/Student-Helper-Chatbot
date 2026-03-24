import { useAuthStore } from "@/stores/auth-store";
import { User } from "lucide-react";

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-md mx-auto py-12 px-4 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-xl font-bold">{user?.full_name}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <div className="space-y-4 bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className="capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Auth Provider</span>
            <span className="capitalize">{user?.auth_provider}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
