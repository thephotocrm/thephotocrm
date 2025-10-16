import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

export default function Galleries() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && (!user || user.role !== "PHOTOGRAPHER")) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user || user.role !== "PHOTOGRAPHER") {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-red-500 p-8">
      <h1 className="text-4xl font-bold text-white">GALLERIES PAGE TEST</h1>
      <p className="text-white mt-4">If you can see this, the page is rendering correctly.</p>
    </div>
  );
}
