"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      setLoading(false);
      toast.error("Unable to create account");
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Account created. Please sign in.");
      window.location.href = "/login";
      return;
    }

    toast.success("Account created");
    window.location.href = "/profiles";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-display text-4xl tracking-wide text-text">Create account</h1>
        <p className="text-sm text-muted">Get instant access to your own cinema.</p>
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
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="text-accent">Sign in</Link>
      </p>
    </div>
  );
}
