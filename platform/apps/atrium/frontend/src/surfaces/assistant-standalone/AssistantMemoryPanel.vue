<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import { useAssistantMemoryStore } from "../../stores/assistant-memory.js";

const CATEGORIES = ["preference", "fact", "project", "habit", "relationship"];
const SALIENCES = ["low", "normal", "high"];

const props = defineProps({
  t: { type: Function, required: true }
});

const store = useAssistantMemoryStore();
const { notes, loading, error } = storeToRefs(store);
const t = (key, vars = {}) => props.t(key, vars);

const form = reactive({
  title: "",
  statement: "",
  category: "preference",
  salience: "normal"
});
const editForm = reactive({
  title: "",
  statement: "",
  category: "preference",
  salience: "normal"
});

const creating = ref(false);
const savingId = ref("");
const deletingId = ref("");
const editingId = ref("");
const confirmDeleteId = ref("");

const canCreate = computed(
  () => form.title.trim().length > 0 && form.statement.trim().length > 0 && !creating.value
);
const canSaveEdit = computed(
  () => editForm.title.trim().length > 0 && editForm.statement.trim().length > 0 && !savingId.value
);
const isEmpty = computed(() => !loading.value && !error.value && notes.value.length === 0);

const loadNotes = () => store.loadNotes();

const createNote = async () => {
  if (!canCreate.value) return;
  creating.value = true;
  try {
    await store.createNote({
      title: form.title.trim(),
      statement: form.statement.trim(),
      category: form.category,
      salience: form.salience
    });
    form.title = "";
    form.statement = "";
    form.category = "preference";
    form.salience = "normal";
  } catch (error) {
    console.error("void-assistant-memory: create action failed", error);
  } finally {
    creating.value = false;
  }
};

const startEdit = (note) => {
  confirmDeleteId.value = "";
  editingId.value = note.instance_id;
  editForm.title = note.title;
  editForm.statement = note.statement;
  editForm.category = note.category;
  editForm.salience = note.salience;
};

const cancelEdit = () => {
  editingId.value = "";
  savingId.value = "";
};

const saveEdit = async (note) => {
  if (!canSaveEdit.value) return;
  savingId.value = note.instance_id;
  try {
    await store.patchNote(note.instance_id, {
      title: editForm.title.trim(),
      statement: editForm.statement.trim(),
      category: editForm.category,
      salience: editForm.salience
    });
    editingId.value = "";
  } catch (error) {
    console.error("void-assistant-memory: save action failed", error);
  } finally {
    savingId.value = "";
  }
};

const requestDelete = async (note) => {
  if (confirmDeleteId.value !== note.instance_id) {
    confirmDeleteId.value = note.instance_id;
    editingId.value = "";
    return;
  }
  deletingId.value = note.instance_id;
  try {
    await store.deleteNote(note.instance_id);
    confirmDeleteId.value = "";
  } catch (error) {
    console.error("void-assistant-memory: delete action failed", error);
  } finally {
    deletingId.value = "";
  }
};

const categoryLabel = (category) => t(`assistant.memory.category.${category}`);
const salienceLabel = (salience) => t(`assistant.memory.salience.${salience}`);

function formatCreatedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(document.documentElement.lang || "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

onMounted(loadNotes);
</script>

<template>
  <div class="assistant-memory">
    <div class="assistant-memory__inner">
      <header class="assistant-memory__head">
        <div>
          <h1 class="assistant-memory__title">{{ t("assistant.memory.title") }}</h1>
          <p class="assistant-memory__sub">{{ t("assistant.memory.intro") }}</p>
        </div>
      </header>

      <form class="assistant-memory__form" @submit.prevent="createNote">
        <div class="assistant-memory__form-grid">
          <label class="assistant-memory__field">
            <span>{{ t("assistant.memory.field.title") }}</span>
            <input
              v-model="form.title"
              type="text"
              class="assistant-memory__input"
              :placeholder="t('assistant.memory.placeholder.title')"
              data-test="memory-title-input"
            />
          </label>
          <label class="assistant-memory__field">
            <span>{{ t("assistant.memory.field.category") }}</span>
            <select v-model="form.category" class="assistant-memory__select">
              <option v-for="category in CATEGORIES" :key="category" :value="category">
                {{ categoryLabel(category) }}
              </option>
            </select>
          </label>
          <label class="assistant-memory__field">
            <span>{{ t("assistant.memory.field.salience") }}</span>
            <select v-model="form.salience" class="assistant-memory__select">
              <option v-for="salience in SALIENCES" :key="salience" :value="salience">
                {{ salienceLabel(salience) }}
              </option>
            </select>
          </label>
        </div>
        <label class="assistant-memory__field">
          <span>{{ t("assistant.memory.field.statement") }}</span>
          <textarea
            v-model="form.statement"
            class="assistant-memory__textarea"
            :placeholder="t('assistant.memory.placeholder.statement')"
            rows="3"
            data-test="memory-statement-input"
          />
        </label>
        <div class="assistant-memory__form-actions">
          <button
            type="submit"
            class="assistant-memory__primary"
            :disabled="!canCreate"
            data-test="memory-create-submit"
          >
            {{ creating ? t("assistant.memory.adding") : t("assistant.memory.add") }}
          </button>
        </div>
      </form>

      <section v-if="error" class="assistant-memory__error" role="alert">
        <div>
          <p class="assistant-memory__error-title">{{ t("assistant.memory.error") }}</p>
          <p class="assistant-memory__error-detail">{{ error }}</p>
        </div>
        <button type="button" class="assistant-memory__secondary" @click="loadNotes">
          {{ t("assistant.memory.retry") }}
        </button>
      </section>

      <p v-if="loading && notes.length === 0" class="assistant-memory__hint">
        {{ t("assistant.memory.loading") }}
      </p>

      <section v-else-if="isEmpty" class="assistant-memory__empty">
        <h2 class="assistant-memory__empty-title">{{ t("assistant.memory.emptyTitle") }}</h2>
        <p class="assistant-memory__empty-text">{{ t("assistant.memory.emptyText") }}</p>
      </section>

      <div v-else class="assistant-memory__list">
        <article v-for="note in notes" :key="note.instance_id" class="assistant-memory-note">
          <form
            v-if="editingId === note.instance_id"
            class="assistant-memory-note__edit"
            @submit.prevent="saveEdit(note)"
          >
            <label class="assistant-memory__field">
              <span>{{ t("assistant.memory.field.title") }}</span>
              <input v-model="editForm.title" type="text" class="assistant-memory__input" />
            </label>
            <label class="assistant-memory__field">
              <span>{{ t("assistant.memory.field.statement") }}</span>
              <textarea v-model="editForm.statement" class="assistant-memory__textarea" rows="3" />
            </label>
            <div class="assistant-memory__form-grid assistant-memory__form-grid--compact">
              <label class="assistant-memory__field">
                <span>{{ t("assistant.memory.field.category") }}</span>
                <select v-model="editForm.category" class="assistant-memory__select">
                  <option v-for="category in CATEGORIES" :key="category" :value="category">
                    {{ categoryLabel(category) }}
                  </option>
                </select>
              </label>
              <label class="assistant-memory__field">
                <span>{{ t("assistant.memory.field.salience") }}</span>
                <select v-model="editForm.salience" class="assistant-memory__select">
                  <option v-for="salience in SALIENCES" :key="salience" :value="salience">
                    {{ salienceLabel(salience) }}
                  </option>
                </select>
              </label>
            </div>
            <div class="assistant-memory-note__actions">
              <button type="submit" class="assistant-memory__primary" :disabled="!canSaveEdit">
                {{ savingId === note.instance_id ? t("assistant.memory.saving") : t("assistant.memory.save") }}
              </button>
              <button type="button" class="assistant-memory__secondary" @click="cancelEdit">
                {{ t("assistant.memory.cancel") }}
              </button>
            </div>
          </form>

          <template v-else>
            <div class="assistant-memory-note__body">
              <h2 class="assistant-memory-note__title">{{ note.title }}</h2>
              <p class="assistant-memory-note__statement">{{ note.statement }}</p>
              <div class="assistant-memory-note__meta">
                <span class="assistant-memory-note__chip">{{ categoryLabel(note.category) }}</span>
                <span class="assistant-memory-note__salience" :data-salience="note.salience">
                  {{ salienceLabel(note.salience) }}
                </span>
                <time v-if="note.created_at" :datetime="note.created_at">
                  {{ formatCreatedAt(note.created_at) }}
                </time>
                <RouterLink
                  v-if="note.source_session_id"
                  :to="{ name: 'assistant-chat', params: { id: note.source_session_id } }"
                  class="assistant-memory-note__source"
                >
                  {{ t("assistant.memory.sourceDialog") }}
                </RouterLink>
              </div>
            </div>
            <div class="assistant-memory-note__actions">
              <button type="button" class="assistant-memory__secondary" @click="startEdit(note)">
                {{ t("assistant.memory.edit") }}
              </button>
              <button
                type="button"
                class="assistant-memory__danger"
                data-test="memory-delete"
                @click="requestDelete(note)"
              >
                {{
                  deletingId === note.instance_id
                    ? t("assistant.memory.deleting")
                    : confirmDeleteId === note.instance_id
                      ? t("assistant.memory.deleteConfirm")
                      : t("assistant.memory.delete")
                }}
              </button>
            </div>
          </template>
        </article>
      </div>
    </div>
  </div>
</template>
