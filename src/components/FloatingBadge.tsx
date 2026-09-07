export default function FloatingBadge() {
  return (
    <aside className="fixed bottom-6 right-6 z-30 bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2 shadow-lg cursor-pointer transition" data-purpose="floating-badge">
      <div className="text-xs font-bold leading-tight flex items-center space-x-1">
        <span>文</span>
        <span className="text-[10px]">A</span>
      </div>
    </aside>
  );
}