export default function StatusBadge({ estado }: { estado: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    ia_activa: {
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      label: "IA Activa",
    },
    asignada: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      label: "Asignada",
    },
    cerrada: {
      bg: "bg-gray-500/10",
      text: "text-gray-400",
      label: "Cerrada",
    },
  };

  const s = styles[estado] || styles.ia_activa;

  return (
    <span
      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}
