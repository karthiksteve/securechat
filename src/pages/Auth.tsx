import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";
import { generateRSAKeyPair, storePrivateKey } from "@/utils/encryption";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
});

export default function Auth() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ email, password, username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Generate RSA key pair
      const { publicKey, privateKey } = await generateRSAKeyPair();
      
      const redirectBase = (import.meta.env.VITE_APP_URL as string) || window.location.origin;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Use explicit deploy-time URL so Supabase confirmation links point to production
          emailRedirectTo: `${redirectBase}/`,
          data: {
            username,
            public_key: publicKey,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Store private key locally
        storePrivateKey(privateKey);
        
        // Wait for auth to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create or update profile directly
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ 
            id: data.user.id,
            username: username,
            display_name: username,
            public_key: publicKey 
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Try update if insert fails
          await supabase
            .from("profiles")
            .update({ 
              username: username,
              display_name: username,
              public_key: publicKey 
            })
            .eq("id", data.user.id);
        }

        toast({
          title: "Account created!",
          description: data.session ? "Welcome to SecureChat" : "Please check your email to confirm your account",
        });
        
        if (data.session) {
          navigate("/");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Sign up failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has a private key stored locally
      const existingPrivateKey = localStorage.getItem("privateKey");
      
      if (!existingPrivateKey && data.user) {
        // Generate new RSA key pair if missing
        const { publicKey, privateKey } = await generateRSAKeyPair();
        storePrivateKey(privateKey);
        
        // Update profile with new public key
        await supabase
          .from("profiles")
          .update({ public_key: publicKey })
          .eq("id", data.user.id);
        
        toast({
          title: "Welcome back!",
          description: "New encryption keys generated",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in",
        });
      }

      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Sign in failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <MessageSquare className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">SecureChat</CardTitle>
          <CardDescription>
            End-to-end encrypted messaging with AES-256 & RSA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
