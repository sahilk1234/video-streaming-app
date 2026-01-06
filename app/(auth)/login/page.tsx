"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Invalid credentials");
      return;
    }

    toast.success("Welcome back");
    window.location.href = "/profiles";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-4xl tracking-wide text-text">Welcome back</h1>
        <p className="text-sm text-muted">Sign in to continue your watchlist.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        New here? <Link href="/signup" className="text-accent">Create an account</Link>
      </p>
    </div>
  );
}
