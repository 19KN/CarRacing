export function generateGamingId(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `IND${digits}`;
}

export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function generateChatId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
