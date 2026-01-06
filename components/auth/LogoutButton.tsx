"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
  return (
    <Button
      variant="ghost"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm"
    >
      Sign out
    </Button>
  );
}
