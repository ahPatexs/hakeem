export function AuthMark() {
  return (
    <svg
      viewBox="0 0 220 48"
      className="mx-auto h-12 w-[220px]"
      fill="none"
      aria-hidden
    >
      <path
        className="auth-pulse"
        d="M8 24h42l8-14 10 28 8-14h22"
        stroke="#9AEFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="110" cy="24" r="17" fill="#9AEFFF" />
      <rect x="106.5" y="13.5" width="7" height="21" rx="1.6" fill="#0B3A66" />
      <rect x="99.5" y="20.5" width="21" height="7" rx="1.6" fill="#0B3A66" />
      <path
        d="M127 24h85"
        stroke="#9AEFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}