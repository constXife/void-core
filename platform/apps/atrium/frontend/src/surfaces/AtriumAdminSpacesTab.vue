<script setup>
defineProps({
  archiveSpace: { type: Function, required: true },
  archivedSpacesAdmin: { type: Array, required: true },
  createSpace: { type: Function, required: true },
  dashboardTemplates: { type: Array, required: true },
  deleteSpace: { type: Function, required: true },
  editDisplayConfig: { type: String, default: "" },
  editPersonalizationRules: { type: String, default: "" },
  editSpace: { type: Object, default: null },
  newSpace: { type: Object, required: true },
  restoreSpace: { type: Function, required: true },
  spacesAdmin: { type: Array, required: true },
  startEditSpace: { type: Function, required: true },
  t: { type: Function, required: true },
  updateSpace: { type: Function, required: true }
});

const emit = defineEmits([
  "close-edit",
  "update:edit-display-config",
  "update:edit-personalization-rules"
]);
</script>

<template>
  <div class="admin-grid-2">
    <div class="admin-card">
      <h4 class="font-medium mb-4">{{ t("admin.spaces.create") }}</h4>
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.title") }}</label>
          <input v-model="newSpace.title" class="input" :placeholder="t('admin.spaces.placeholder.title')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.description") }}</label>
          <input v-model="newSpace.description" class="input" :placeholder="t('admin.spaces.placeholder.description')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.slug") }}</label>
          <input v-model="newSpace.slug" class="input" :placeholder="t('admin.spaces.placeholder.slug')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.visibilityGroups") }}</label>
          <input v-model="newSpace.visibilityGroups" class="input" :placeholder="t('admin.spaces.placeholder.visibilityGroups')" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.type") }}</label>
            <select v-model="newSpace.type" class="select w-full text-sm">
              <option value="audience">{{ t("admin.spaces.option.type.audience") }}</option>
              <option value="shared">{{ t("admin.spaces.option.type.shared") }}</option>
              <option value="system">{{ t("admin.spaces.option.type.system") }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.parent") }}</label>
            <select v-model="newSpace.parentId" class="select w-full text-sm">
              <option value="">{{ t("admin.spaces.option.parentNone") }}</option>
              <option v-for="space in spacesAdmin" :key="space.id" :value="space.id">
                {{ space.title }}
              </option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.dashboardTemplate") }}</label>
          <select v-model="newSpace.dashboardTemplateId" class="select w-full text-sm">
            <option value="">{{ t("admin.spaces.option.templateAuto") }}</option>
            <option v-for="tmpl in dashboardTemplates" :key="tmpl.id" :value="tmpl.id">
              {{ tmpl.key }} (v{{ tmpl.version }})
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.layoutMode") }}</label>
            <select v-model="newSpace.layoutMode" class="select w-full text-sm">
              <option value="grid">{{ t("admin.spaces.option.layout.grid") }}</option>
              <option value="hero">{{ t("admin.spaces.option.layout.hero") }}</option>
              <option value="list">{{ t("admin.spaces.option.layout.list") }}</option>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-xs text-white/60">
              <input v-model="newSpace.isLockable" type="checkbox" class="accent-white/70" />
              {{ t("admin.spaces.lockable") }}
            </label>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.accessMode") }}</label>
            <select v-model="newSpace.accessMode" class="select w-full text-sm">
              <option value="private">{{ t("admin.spaces.option.access.private") }}</option>
              <option value="public_readonly">{{ t("admin.spaces.option.access.publicReadonly") }}</option>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-xs text-white/60">
              <input
                v-model="newSpace.isDefaultPublicEntry"
                :disabled="newSpace.accessMode !== 'public_readonly'"
                type="checkbox"
                class="accent-white/70 disabled:opacity-40"
              />
              {{ t("admin.spaces.defaultPublicEntry") }}
            </label>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.backgroundUrl") }}</label>
          <input v-model="newSpace.backgroundUrl" class="input" :placeholder="t('admin.spaces.placeholder.backgroundUrl')" />
        </div>
        <div class="space-y-2 rounded-2xl border border-white/10 bg-white/3 p-3">
          <div class="text-[11px] uppercase tracking-wider text-white/40">{{ t("admin.spaces.field.publicEntry") }}</div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryTitle") }}</label>
            <input v-model="newSpace.publicEntryTitle" class="input" :placeholder="t('admin.spaces.placeholder.publicEntryTitle')" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntrySubtitle") }}</label>
            <textarea v-model="newSpace.publicEntrySubtitle" class="input font-mono text-xs" rows="2" :placeholder="t('admin.spaces.placeholder.publicEntrySubtitle')"></textarea>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryHelp") }}</label>
            <textarea v-model="newSpace.publicEntryHelp" class="input font-mono text-xs" rows="2" :placeholder="t('admin.spaces.placeholder.publicEntryHelp')"></textarea>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryContact") }}</label>
            <textarea v-model="newSpace.publicEntryContact" class="input font-mono text-xs" rows="2" :placeholder="t('admin.spaces.placeholder.publicEntryContact')"></textarea>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.displayConfig") }}</label>
          <textarea v-model="newSpace.displayConfig" class="input font-mono text-xs" rows="2"></textarea>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.personalizationRules") }}</label>
          <textarea v-model="newSpace.personalizationRules" class="input font-mono text-xs" rows="2"></textarea>
        </div>
        <button class="btn btn-primary w-full" @click="createSpace">{{ t("admin.spaces.createAction") }}</button>
      </div>
    </div>

    <div class="admin-card">
      <h4 class="font-medium mb-4">{{ t("admin.spaces.active") }}</h4>
      <div v-if="spacesAdmin.length === 0" class="text-white/30 text-sm py-4">
        {{ t("app.noSpaces") }}
      </div>
      <div v-else class="space-y-1">
        <div
          v-for="space in spacesAdmin"
          :key="space.id"
          class="admin-list-item"
        >
          <div>
            <div class="font-medium text-sm">{{ space.title }}</div>
            <div class="text-[11px] text-white/30">{{ space.slug }}</div>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn btn-ghost text-xs" @click="startEditSpace(space)">
              {{ t("admin.spaces.edit") }}
            </button>
            <button class="btn btn-ghost text-xs" @click="archiveSpace(space)">
              {{ t("admin.spaces.archive") }}
            </button>
            <button class="btn btn-ghost btn-danger text-xs" @click="deleteSpace(space)">
              {{ t("admin.spaces.delete") }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="archivedSpacesAdmin.length > 0" class="admin-card">
      <h4 class="font-medium mb-4">{{ t("admin.spaces.archived") }}</h4>
      <div class="space-y-1">
        <div
          v-for="space in archivedSpacesAdmin"
          :key="space.id"
          class="admin-list-item"
        >
          <div>
            <div class="font-medium text-sm">{{ space.title }}</div>
            <div class="text-[11px] text-white/30">{{ space.slug }}</div>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn btn-ghost text-xs" @click="restoreSpace(space)">
              {{ t("admin.spaces.restore") }}
            </button>
            <button class="btn btn-ghost btn-danger text-xs" @click="deleteSpace(space)">
              {{ t("admin.spaces.delete") }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="editSpace" class="modal-backdrop" @click.self="emit('close-edit')">
    <div class="modal-content">
      <h4 class="font-medium mb-4">{{ t("admin.spaces.editTitle") }}</h4>
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.title") }}</label>
          <input v-model="editSpace.title" class="input" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.description") }}</label>
          <input v-model="editSpace.description" class="input" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.slug") }}</label>
          <input v-model="editSpace.slug" class="input" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.visibilityGroups") }}</label>
          <input v-model="editSpace.visibilityGroups" class="input" :placeholder="t('admin.spaces.placeholder.visibilityGroups')" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.type") }}</label>
            <select v-model="editSpace.type" class="select w-full text-sm">
              <option value="audience">{{ t("admin.spaces.option.type.audience") }}</option>
              <option value="shared">{{ t("admin.spaces.option.type.shared") }}</option>
              <option value="system">{{ t("admin.spaces.option.type.system") }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.parent") }}</label>
            <select v-model="editSpace.parentId" class="select w-full text-sm">
              <option value="">{{ t("admin.spaces.option.parentNone") }}</option>
              <option v-for="space in spacesAdmin" :key="space.id" :value="space.id" :disabled="space.id === editSpace.id">
                {{ space.title }}
              </option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.dashboardTemplate") }}</label>
          <select v-model="editSpace.dashboardTemplateId" class="select w-full text-sm">
            <option value="">{{ t("admin.spaces.option.templateAuto") }}</option>
            <option v-for="tmpl in dashboardTemplates" :key="tmpl.id" :value="tmpl.id">
              {{ tmpl.key }} (v{{ tmpl.version }})
            </option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.layoutMode") }}</label>
            <select v-model="editSpace.layoutMode" class="select w-full text-sm">
              <option value="grid">{{ t("admin.spaces.option.layout.grid") }}</option>
              <option value="hero">{{ t("admin.spaces.option.layout.hero") }}</option>
              <option value="list">{{ t("admin.spaces.option.layout.list") }}</option>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-xs text-white/60">
              <input v-model="editSpace.isLockable" type="checkbox" class="accent-white/70" />
              {{ t("admin.spaces.lockable") }}
            </label>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.accessMode") }}</label>
            <select v-model="editSpace.accessMode" class="select w-full text-sm">
              <option value="private">{{ t("admin.spaces.option.access.private") }}</option>
              <option value="public_readonly">{{ t("admin.spaces.option.access.publicReadonly") }}</option>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-xs text-white/60">
              <input
                v-model="editSpace.isDefaultPublicEntry"
                :disabled="editSpace.accessMode !== 'public_readonly'"
                type="checkbox"
                class="accent-white/70 disabled:opacity-40"
              />
              {{ t("admin.spaces.defaultPublicEntry") }}
            </label>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.backgroundUrl") }}</label>
          <input v-model="editSpace.backgroundUrl" class="input" />
        </div>
        <div class="space-y-2 rounded-2xl border border-white/10 bg-white/3 p-3">
          <div class="text-[11px] uppercase tracking-wider text-white/40">{{ t("admin.spaces.field.publicEntry") }}</div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryTitle") }}</label>
            <input v-model="editSpace.publicEntryTitle" class="input" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntrySubtitle") }}</label>
            <textarea v-model="editSpace.publicEntrySubtitle" class="input font-mono text-xs" rows="2"></textarea>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryHelp") }}</label>
            <textarea v-model="editSpace.publicEntryHelp" class="input font-mono text-xs" rows="2"></textarea>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.publicEntryContact") }}</label>
            <textarea v-model="editSpace.publicEntryContact" class="input font-mono text-xs" rows="2"></textarea>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.displayConfig") }}</label>
          <textarea
            :value="editDisplayConfig"
            class="input font-mono text-xs"
            rows="4"
            @input="emit('update:edit-display-config', $event.target.value)"
          ></textarea>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.spaces.field.personalizationRules") }}</label>
          <textarea
            :value="editPersonalizationRules"
            class="input font-mono text-xs"
            rows="4"
            @input="emit('update:edit-personalization-rules', $event.target.value)"
          ></textarea>
        </div>
        <div class="flex items-center gap-2 pt-2">
          <button class="btn btn-primary flex-1" @click="updateSpace">{{ t("app.save") }}</button>
          <button class="btn btn-ghost" @click="emit('close-edit')">{{ t("app.cancel") }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
