import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Send, Shield, Users, MessageSquare } from "lucide-react";
import { encryptMessage, decryptMessage, generateRSAKeyPair, storePrivateKey, getPrivateKey, encryptMessageForBoth } from "@/utils/encryption";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  public_key: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  encrypted_content: string;
  encrypted_key: string;
  sender_encrypted_key?: string | null;
  sender_iv?: string | null;
  iv: string;
  created_at: string;
  decrypted?: string;
}

export default function Chat() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUser(session.user);
      
      // Check and regenerate keys if missing
      const privateKey = getPrivateKey();
      if (!privateKey) {
        try {
          const { generateRSAKeyPair, storePrivateKey } = await import("@/utils/encryption");
          const { publicKey, privateKey: newPrivateKey } = await generateRSAKeyPair();
          storePrivateKey(newPrivateKey);
          
          // Update profile with new public key
          await supabase
            .from("profiles")
            .update({ public_key: publicKey })
            .eq("id", session.user.id);
          
          toast({
            title: "🔑 Encryption Keys Generated",
            description: "New keys created. You can now send and receive encrypted messages.",
          });
        } catch (error) {
          console.error("Error generating keys:", error);
        }
      }
      
      loadUsers();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setCurrentUser(session.user);
      }
    });

    initAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (conversationId) {
      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            handleNewMessage(payload.new as Message);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", (await supabase.auth.getUser()).data.user?.id);

    if (error) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setUsers(data || []);
  };

  const selectUser = async (user: Profile) => {
    setSelectedUser(user);
    setMessages([]);
    
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const [id1, id2] = [userId, user.id].sort();

    let { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user1_id", id1)
      .eq("user2_id", id2)
      .single();

    if (convError || !conversation) {
      const { data: newConv, error: createError } = await supabase
        .from("conversations")
        .insert({ user1_id: id1, user2_id: id2 })
        .select()
        .single();

      if (createError) {
        toast({
          title: "Error creating conversation",
          description: createError.message,
          variant: "destructive",
        });
        return;
      }
      conversation = newConv;
    }

    setConversationId(conversation.id);
    loadMessages(conversation.id);
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, encrypted_content, encrypted_key, sender_encrypted_key, iv, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const decryptedMessages = await Promise.all(
      (data || []).map(async (msg) => ({
        ...msg,
        decrypted: await decryptMessageContent(msg),
      }))
    );

    setMessages(decryptedMessages);
  };

  const decryptMessageContent = async (msg: Message): Promise<string> => {
    const privateKey = getPrivateKey();
    if (!privateKey) {
      console.warn("Private key not found in localStorage");
      return "[🔒 Cannot decrypt - Private key missing. Sign out and sign in again.]";
    }

    try {
      // Determine which encrypted key to use
      let encryptedKey: string;
      
      if (currentUser && msg.sender_id === currentUser.id) {
        // We sent this message - use sender_encrypted_key
        if (!msg.sender_encrypted_key) {
          console.warn("Sender encrypted key missing for sent message");
          return "[⚠️ Old message - sent before dual encryption update]";
        }
        encryptedKey = msg.sender_encrypted_key;
        console.log("Decrypting sent message with sender_encrypted_key");
      } else {
        // We received this message - use encrypted_key
        encryptedKey = msg.encrypted_key;
        console.log("Decrypting received message with encrypted_key");
      }

      const decrypted = await decryptMessage(
        msg.encrypted_content,
        encryptedKey,
        msg.iv,
        privateKey
      );
      
      console.log("Decryption successful");
      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      return "[❌ Decryption failed]";
    }
  };

  const handleNewMessage = async (msg: Message) => {
    const decrypted = await decryptMessageContent(msg);
    setMessages((prev) => [...prev, { ...msg, decrypted }]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUser || !conversationId) return;
    
    try {
      console.log("Starting message send...");
      const recipientPublicKey = selectedUser.public_key;
      
      console.log("Fetching sender public key...");
      const senderPublicKey = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', currentUser.id)
        .single()
        .then(({ data }) => data?.public_key);

      console.log("Keys:", { recipientPublicKey: !!recipientPublicKey, senderPublicKey: !!senderPublicKey });

      if (!recipientPublicKey || !senderPublicKey) {
        console.error("Missing public keys", { recipientPublicKey, senderPublicKey });
        toast({
          title: "Error",
          description: "Unable to encrypt message. Missing public keys.",
          variant: "destructive",
        });
        return;
      }

      console.log("Encrypting message...");
      // Encrypt message ONCE with both public keys
      const { encryptedContent, recipientEncryptedKey, senderEncryptedKey, iv } = 
        await encryptMessageForBoth(newMessage, recipientPublicKey, senderPublicKey);
      
      console.log("Encryption complete, inserting into database...");
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        encrypted_content: encryptedContent,
        encrypted_key: recipientEncryptedKey,
        sender_encrypted_key: senderEncryptedKey,
        iv: iv,
      });

      if (error) {
        console.error("Database insert error:", error);
        throw error;
      }
      
      console.log("Message sent successfully!");
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">SecureChat</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r bg-card p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Available Users</span>
          </div>
          <div className="space-y-2">
            {users.map((user) => (
              <Button
                key={user.id}
                variant={selectedUser?.id === user.id ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => selectUser(user)}
              >
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback>
                    {user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user.display_name || user.username}</span>
              </Button>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <div className="border-b bg-card p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {selectedUser.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedUser.display_name || selectedUser.username}</p>
                    <p className="text-xs text-muted-foreground">End-to-end encrypted</p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_id === currentUser?.id ? "justify-end" : "justify-start"
                      }`}
                    >
                      <Card
                        className={`max-w-[70%] p-3 ${
                          msg.sender_id === currentUser?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.decrypted}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </Card>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t bg-card p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                  />
                  <Button type="submit" disabled={isLoading || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a user to start chatting</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
