const assistantOperations = {
  "assistant.chat.v1": "chat",
  "assistant.title.v1": "title",
  "assistant.memory.extract.v1": "memoryExtract",
  "assistant.memory.consolidate.v1": "memoryConsolidate"
};

export function modelJobPresentation(binding, t) {
  const operation = assistantOperations[binding.job_id];
  if (!operation) return { label: binding.operation_id, hint: "" };
  return {
    label: t(`admin.models.job.${operation}.label`),
    hint: t(`admin.models.job.${operation}.hint`)
  };
}
