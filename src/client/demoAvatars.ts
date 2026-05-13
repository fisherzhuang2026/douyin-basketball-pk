const colors = ["#ff6b6b", "#4dabf7", "#f08c00", "#12b886", "#845ef7", "#f06595"];

export function createDemoAvatarUrl(nickname: string, index = 0): string {
  const color = colors[index % colors.length];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="${color}"/>
          <stop offset="1" stop-color="#111827"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="48" fill="url(#g)"/>
      <circle cx="72" cy="22" r="12" fill="rgba(255,255,255,0.26)"/>
      <text x="48" y="58" text-anchor="middle" font-size="40" font-family="Microsoft YaHei, sans-serif" font-weight="800" fill="white">${nickname.slice(0, 1)}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
