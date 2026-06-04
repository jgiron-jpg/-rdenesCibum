export function CibumLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`${className} bg-white dark:bg-white rounded-lg flex items-center justify-center flex-shrink-0`}>
      <span className="text-black font-black leading-none text-center" style={{ fontSize: "35%", lineHeight: 1.1 }}>
        CIB<br />UM
      </span>
    </div>
  );
}
