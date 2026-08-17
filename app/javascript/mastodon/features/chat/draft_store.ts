const drafts = new Map<number, string>();

export const getDraft = (conversationId: number): string =>
  drafts.get(conversationId) ?? '';

export const setDraft = (conversationId: number, text: string): void => {
  if (text) {
    drafts.set(conversationId, text);
  } else {
    drafts.delete(conversationId);
  }
};

export const clearDraft = (conversationId: number): void => {
  drafts.delete(conversationId);
};
