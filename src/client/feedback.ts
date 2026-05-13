type InteractionKind = "like" | "gift";

export interface InteractionFeedbackInput {
  accepted: boolean;
  reason?: string;
}

const actionName: Record<InteractionKind, string> = {
  like: "点赞",
  gift: "送礼"
};

const reasonText: Record<string, string> = {
  not_joined: "该观众还没入队，请先发送红队/蓝队口令",
  not_running: "对局还没开始，请先点击开始",
  gift_not_configured: "这个礼物还没有配置投篮规则"
};

export function formatInteractionFeedback(result: InteractionFeedbackInput, kind: InteractionKind): string | undefined {
  if (result.accepted) {
    return undefined;
  }

  return `${actionName[kind]}未触发：${reasonText[result.reason ?? ""] ?? "本次互动没有生成投篮事件"}`;
}
