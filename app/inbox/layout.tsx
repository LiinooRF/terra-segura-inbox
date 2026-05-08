"use client";

import { usePathname, useRouter } from "next/navigation";
import ConversationList from "@/components/ConversationList";
import { useAuth, AuthProvider } from "@/components/AuthProvider";

function InboxContent({ children }: { children: React.ReactNode }) {
  const agente = useAuth()!;
  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname.split("/").filter(Boolean);
  const selectedId = segments.length > 1 ? segments[1] : null;

  return (
    <div className="h-screen flex">
      <div className="w-[380px] flex-shrink-0">
        <ConversationList
          selectedId={selectedId}
          onSelect={(id) => router.push(`/inbox/${id}`)}
          agenteId={agente.id}
          rol={agente.rol}
        />
      </div>
      <div className="flex-1 flex">
        {children}
      </div>
    </div>
  );
}

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <InboxContent>{children}</InboxContent>
    </AuthProvider>
  );
}
