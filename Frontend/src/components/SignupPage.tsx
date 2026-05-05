
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  Check, 
  ChevronsUpDown, 
  Search, 
  AlertCircle,
  Smartphone,
  ShieldCheck,
  User as UserIcon,
  Mail,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getInventoryItems, type InventoryItem } from "@/lib/inventory-api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    simImei: '',
    simInventoryId: null as number | null,
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // SIM Selection State
  const [simItems, setSimItems] = useState<InventoryItem[]>([]);
  const [fetchingSims, setFetchingSims] = useState(false);
  const [simSearch, setSimSearch] = useState("");
  const [simOpen, setSimOpen] = useState(false);

  useEffect(() => {
    async function loadSims() {
      setFetchingSims(true);
      try {
        // Fetch all inventory and filter for SIMs (case-insensitive)
        const all = await getInventoryItems();
        const sims = all.filter(item => 
          item.category.toLowerCase().includes("sim") || 
          item.type.toLowerCase().includes("sim")
        );
        setSimItems(sims);
      } catch (err) {
        console.error("Failed to load SIM items:", err);
      } finally {
        setFetchingSims(false);
      }
    }
    loadSims();
  }, []);

  const filteredSims = useMemo(() => {
    if (!simSearch) return simItems;
    const s = simSearch.toLowerCase();
    return simItems.filter(item => 
      item.imei_number.toLowerCase().includes(s) || 
      item.type.toLowerCase().includes(s)
    );
  }, [simItems, simSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        username: form.username,
        email: form.email,
        password: form.password,
        // If we want to associate a SIM/IMEI during register (e.g. for installers/technicians)
        // we might store it in user metadata or a profile table later.
        // For now, we'll just send the basic fields to the existing endpoint.
      };

      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess('Account created successfully!');
        // Redirect or clear
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch {
      setError('Network error. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 flex items-center justify-center gap-2">
          <ShieldCheck className="h-8 w-8 text-blue-600" />
          Create Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <button 
            onClick={() => router.push('/login')} 
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            sign in to your existing account
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Username */}
            <div>
              <Label htmlFor="username">Username</Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.username}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="johndoe"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* SIM Selector (The IME / SIM Item mentioned by user) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-gray-500" />
                Select Assigned SIM / IMEI (Optional)
              </Label>
              
              <Popover open={simOpen} onOpenChange={setSimOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={simOpen}
                    className="w-full justify-between font-normal"
                    disabled={fetchingSims}
                  >
                    {form.simImei ? (
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {form.simImei}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {simItems.find(i => i.imei_number === form.simImei)?.type}
                        </span>
                      </span>
                    ) : (
                      fetchingSims ? "Loading SIMs..." : "Select SIM / IMEI"
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-75 p-0" align="start">
                  <div className="flex items-center border-b px-3">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <input
                      className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Search SIM or IMEI..."
                      value={simSearch}
                      onChange={(e) => setSimSearch(e.target.value)}
                    />
                  </div>
                    <div className="max-h-52 overflow-y-auto p-1">
                    {filteredSims.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No active SIMs found.
                      </div>
                    ) : (
                      filteredSims.map((item) => (
                        <button
                          key={item.id}
                          className={cn(
                            "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            form.simImei === item.imei_number && "bg-accent"
                          )}
                          onClick={() => {
                            setForm(f => ({ ...f, simImei: item.imei_number, simInventoryId: item.id }));
                            setSimOpen(false);
                            setSimSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              form.simImei === item.imei_number ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col items-start">
                            <span className="font-mono font-medium text-xs">
                              {item.imei_number}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.type} • {item.category}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-muted-foreground">
                Matches &quot;SIM&quot; categories in your stock (case-insensitive)
              </p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <Check className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{success}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

