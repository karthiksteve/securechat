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
import { KeyStatusBadge } from "@/components/KeyStatusBadge";
import { decryptMessage, generateRSAKeyPair, storePrivateKey, getPrivateKey, encryptMessageForBoth } from "@/utils/encryption";
import { getQueuedMessages, addQueuedMessage, removeQueuedMessage } from "@/utils/messageQueue";

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
  iv: string;
  created_at: string;
  decrypted?: string;
}

export default function Chat() {
  // Use explicit user and nullable types instead of any
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unsent, setUnsent] = useState(getQueuedMessages());
  // Try to resend unsent messages on mount or when user changes
  useEffect(() => {
    if (!currentUser) return;
    resendUnsentMessages();
    // eslint-disable-next-line
  }, [currentUser]);

  const resendUnsentMessages = async () => {
    const queue = getQueuedMessages();
    for (let i = 0; i < queue.length; i++) {
      const msg = queue[i];
      try {
        await actuallySendMessage(msg.content, msg.conversationId, msg.recipientId);
        removeQueuedMessage(i);
      } catch {
        // Still failed, keep in queue
      }
    }
    setUnsent(getQueuedMessages());
  };
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
  }, [navigate, toast]);

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
  }, [conversationId, currentUser]);

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
    setHasMore(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const [id1, id2] = [userId, user.id].sort();
    // Fetch or create conversation deterministically (sorted user IDs)
    const { data: existingConv, error: convSelectError } = await supabase
      .from("conversations")
      .select("id")
      .eq("user1_id", id1)
      .eq("user2_id", id2)
      .single();
    
    let conversation = existingConv;
    if (convSelectError || !conversation) {
      const { data: newConv, error: convInsertError } = await supabase
        .from("conversations")
        .insert({ user1_id: id1, user2_id: id2 })
        .select()
        .single();
      if (convInsertError) {
        toast({
          title: "Error creating conversation",
          description: convInsertError.message,
          variant: "destructive",
        });
        return;
      }
      conversation = newConv;
    }
    setConversationId(conversation.id);
    loadMessages(conversation.id, true);
  };

  // Load messages with pagination
  const loadMessages = async (convId: string, fromStart = true) => {
    setLoadingMore(true);
    const offset = fromStart ? 0 : messages.length;
    const { data, error, count } = await supabase
      .from("messages")
      .select("id, sender_id, encrypted_content, encrypted_key, sender_encrypted_key, iv, created_at", { count: "exact" })
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
      setLoadingMore(false);
      return;
    }

    const decryptedMessages = await Promise.all(
      (data || []).map(async (msg) => ({
        ...msg,
        decrypted: await decryptMessageContent(msg),
      }))
    );

    if (fromStart) {
      setMessages(decryptedMessages);
    } else {
      setMessages((prev) => [...decryptedMessages, ...prev]);
    }
    setHasMore((offset + (data?.length || 0)) < (count || 0));
    setLoadingMore(false);
  };

  const decryptMessageContent = async (msg: Message): Promise<string> => {
    const privateKey = getPrivateKey();
    if (!privateKey) {
      console.warn("Private key not found in localStorage");
      return "[🔒 Cannot decrypt - Private key missing. Sign out and sign in again.]";
    }

    // Validate message has required encryption fields
    if (!msg.encrypted_content || !msg.iv) {
      console.error("Message missing encryption data:", msg);
      return "[❌ Invalid message format]";
    }

    try {
      // Determine which encrypted key to use
      let encryptedKey: string;
      
      if (currentUser && msg.sender_id === currentUser.id) {
        // We sent this message - use sender_encrypted_key
        if (!msg.sender_encrypted_key) {
          console.warn("Sender encrypted key missing for sent message ID:", msg.id);
          return "[⚠️ Old message - sent before encryption update]";
        }
        encryptedKey = msg.sender_encrypted_key;
      } else {
        // We received this message - use encrypted_key
        if (!msg.encrypted_key) {
          console.error("Encrypted key missing for received message ID:", msg.id);
          return "[❌ Message missing encryption key]";
        }
        encryptedKey = msg.encrypted_key;
      }

      // Validate encrypted key format (base64)
      if (!encryptedKey || encryptedKey.length < 20) {
        console.error("Invalid encrypted key format for message ID:", msg.id);
        return "[❌ Corrupted encryption key]";
      }

      const decrypted = await decryptMessage(
        msg.encrypted_content,
        encryptedKey,
        msg.iv,
        privateKey
      );
      
      // Check if decryption returned an error message
      if (decrypted.startsWith("[❌")) {
        return decrypted;
      }
      
      return decrypted;
    } catch (error) {
      console.error("Decryption error for message ID:", msg.id, error);
      return "[❌ Decryption failed - check console]";
    }
  };

  const handleNewMessage = async (msg: Message) => {
    const decrypted = await decryptMessageContent(msg);
    setMessages((prev) => [...prev, { ...msg, decrypted }]);
  };

  // Actually send a message (used for both normal and resend)
  const actuallySendMessage = async (content: string, convId: string, recipientId: string) => {
    const recipient = users.find(u => u.id === recipientId);
    if (!recipient || !currentUser) throw new Error("Recipient or sender missing");
    const recipientPublicKey = recipient.public_key;
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('public_key')
      .eq('id', currentUser.id)
      .single();
    const senderPublicKey = senderProfile?.public_key;
    if (!recipientPublicKey || !senderPublicKey) throw new Error("Missing public keys");
    const encryption = await encryptMessageForBoth(
      content,
      recipientPublicKey,
      senderPublicKey
    );
    const { error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: currentUser.id,
      encrypted_content: encryption.encryptedContent,
      encrypted_key: encryption.recipientEncryptedKey,
      sender_encrypted_key: encryption.senderEncryptedKey,
      iv: encryption.iv,
    });
    if (error) throw error;
  };

  // Send message with queue fallback
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUser || !conversationId) {
      console.warn("Cannot send message - missing required data");
      return;
    }
    setIsLoading(true);
    try {
      await actuallySendMessage(newMessage, conversationId, selectedUser.id);
      setNewMessage("");
    } catch (error) {
      // Queue message for resend
      addQueuedMessage({
        conversationId,
        content: newMessage,
        recipientId: selectedUser.id,
        timestamp: Date.now(),
      });
      setUnsent(getQueuedMessages());
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Send failed",
        description: `Message queued for resend: ${message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
          <KeyStatusBadge />
        </div>
        <Button variant="outline" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Unsent message queue UI */}
        {unsent.length > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2">
            <span>{unsent.length} message(s) failed to send.</span>
            <button
              className="underline font-bold"
              onClick={resendUnsentMessages}
            >
              Retry now
            </button>
          </div>
        )}
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
                  {hasMore && (
                    <div className="flex justify-center mb-2">
                      <button
                        className="text-xs underline text-blue-600 disabled:opacity-50"
                        disabled={loadingMore}
                        onClick={() => conversationId && loadMessages(conversationId, false)}
                      >
                        {loadingMore ? "Loading..." : "Load more messages"}
                      </button>
                    </div>
                  )}
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
