<script setup>
defineProps({
  contentSpaceId: { type: [String, Number], default: "" },
  createDirectoryItem: { type: Function, required: true },
  deleteDirectoryItem: { type: Function, required: true },
  directoryAdmin: { type: Array, required: true },
  directoryForm: { type: Object, required: true },
  enableResourceDetails: { type: Boolean, default: false },
  normalizeIconUrl: { type: Function, required: true },
  openServiceDetails: { type: Function, required: true },
  provisioningDirectoryAdmin: { type: Array, required: true },
  selectedContentSpace: { type: Object, default: null },
  spacesAdmin: { type: Array, required: true },
  t: { type: Function, required: true },
  updateDirectoryItem: { type: Function, required: true }
});

const emit = defineEmits(["content-space-change"]);

const onContentSpaceChange = (event) => {
  emit("content-space-change", event.target.value);
};
</script>

<template>
  <div class="admin-grid-2">
    <div class="admin-card">
      <h4 class="font-medium mb-4">{{ t("admin.content.directory") }}</h4>
      <div class="space-y-3 mb-6">
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.space") }}</label>
          <select :value="contentSpaceId" class="select w-full text-sm" @change="onContentSpaceChange">
            <option value="">{{ t("admin.common.selectSpace") }}</option>
            <option v-for="space in spacesAdmin" :key="space.id" :value="space.id">
              {{ space.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.title") }}</label>
          <input v-model="directoryForm.title" class="input" :placeholder="t('admin.common.placeholder.title')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.description") }}</label>
          <input v-model="directoryForm.description" class="input" :placeholder="t('admin.common.placeholder.description')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.iconUrl") }}</label>
          <input
            v-model="directoryForm.iconUrl"
            class="input"
            :placeholder="t('admin.common.placeholder.iconUrl')"
            @blur="directoryForm.iconUrl = normalizeIconUrl(directoryForm.iconUrl)"
          />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.url") }}</label>
          <input v-model="directoryForm.url" class="input" :placeholder="t('admin.common.placeholder.url')" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.type") }}</label>
            <select v-model="directoryForm.type" class="select w-full text-sm">
              <option value="resource">{{ t("admin.common.option.type.resource") }}</option>
              <option value="link">{{ t("admin.common.option.type.link") }}</option>
              <option value="action">{{ t("admin.common.option.type.action") }}</option>
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-xs text-white/60">
              <input v-model="directoryForm.pinned" type="checkbox" class="accent-white/70" />
              {{ t("admin.common.pinned") }}
            </label>
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tags") }}</label>
          <input v-model="directoryForm.tags" class="input text-xs" :placeholder="t('admin.common.placeholder.tags')" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.serviceType") }}</label>
            <input v-model="directoryForm.serviceType" class="input text-xs" :placeholder="t('admin.common.placeholder.serviceType')" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.tier") }}</label>
            <input v-model="directoryForm.tier" class="input text-xs" :placeholder="t('admin.common.placeholder.tier')" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.lifecycle") }}</label>
            <input v-model="directoryForm.lifecycle" class="input text-xs" :placeholder="t('admin.common.placeholder.lifecycle')" />
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.classification") }}</label>
            <input v-model="directoryForm.classification" class="input text-xs" :placeholder="t('admin.common.placeholder.classification')" />
          </div>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.runbookUrl") }}</label>
          <input v-model="directoryForm.runbookUrl" class="input text-xs" :placeholder="t('admin.common.placeholder.runbookUrl')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.accessPath") }}</label>
          <input v-model="directoryForm.accessPath" class="input text-xs" :placeholder="t('admin.common.placeholder.accessPath')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.dependsOn") }}</label>
          <input v-model="directoryForm.dependsOn" class="input text-xs" :placeholder="t('admin.common.placeholder.dependsOn')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.ownersJson") }}</label>
          <textarea v-model="directoryForm.owners" class="input text-xs" rows="3" :placeholder="t('admin.common.placeholder.ownersJson')"></textarea>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.linksJson") }}</label>
          <textarea v-model="directoryForm.links" class="input text-xs" rows="3" :placeholder="t('admin.common.placeholder.linksJson')"></textarea>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.endpointsJson") }}</label>
          <textarea v-model="directoryForm.endpoints" class="input text-xs" rows="3" :placeholder="t('admin.common.placeholder.endpointsJson')"></textarea>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.audienceGroups") }}</label>
          <input v-model="directoryForm.audienceGroups" class="input text-xs" placeholder="admin, user, guest" />
        </div>
        <button class="btn btn-primary w-full" @click="createDirectoryItem">{{ t("admin.common.create") }}</button>
      </div>
      <div
        v-if="selectedContentSpace"
        class="mt-8 border-t border-white/10 pt-6"
      >
        <h4 class="font-medium">{{ t("admin.content.provisionedDirectory") }}</h4>
        <p class="mt-2 text-sm text-white/50">
          {{ t("admin.content.provisionedDirectoryHint") }}
        </p>
        <div v-if="provisioningDirectoryAdmin.length === 0" class="text-white/30 text-sm py-4">
          {{ t("admin.content.noneProvisionedDirectory") }}
        </div>
        <div v-else class="mt-4 space-y-2">
          <div
            v-for="item in provisioningDirectoryAdmin"
            :key="`${item.space}:${item.key}`"
            class="admin-list-item flex-col items-start"
          >
            <div class="flex items-center justify-between w-full gap-3">
              <div>
                <div class="font-medium text-sm truncate">{{ item.title || item.key }}</div>
                <div class="text-[11px] text-white/30">{{ item.key }}</div>
              </div>
              <div class="flex items-center gap-2">
                <span class="chip chip-muted">{{ item.pinned ? t("admin.common.pinned") : t("admin.common.unpinned") }}</span>
                <button
                  v-if="enableResourceDetails"
                  class="btn btn-ghost text-xs"
                  @click="openServiceDetails(item)"
                >
                  {{ t("app.details") }}
                </button>
              </div>
            </div>
            <div v-if="item.description" class="mt-2 text-sm text-white/60">
              {{ item.description }}
            </div>
            <div v-if="item.url" class="text-[11px] text-white/40 mt-1 truncate">{{ item.url }}</div>
            <div class="flex flex-wrap items-center gap-2 mt-2 w-full">
              <span class="chip chip-muted">{{ item.item_type || t("admin.common.none") }}</span>
              <span v-if="item.service_type" class="chip chip-muted">{{ item.service_type }}</span>
              <span v-if="item.tier" class="chip chip-muted">{{ item.tier }}</span>
              <span v-if="item.lifecycle" class="chip chip-muted">{{ item.lifecycle }}</span>
            </div>
            <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/45">
              <span>
                {{ t("admin.common.audienceGroups") }}:
                {{ item.audience_groups?.length ? item.audience_groups.join(", ") : t("admin.common.none") }}
              </span>
              <span>
                {{ t("admin.common.tags") }}:
                {{ item.tags?.length ? item.tags.join(", ") : t("admin.common.none") }}
              </span>
              <span>
                {{ t("admin.common.accessPath") }}:
                {{ item.access_path || t("admin.common.none") }}
              </span>
              <span>
                {{ t("admin.common.classification") }}:
                {{ item.classification || t("admin.common.none") }}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-8 border-t border-white/10 pt-6">
        <h4 class="font-medium">{{ t("admin.content.mutableDirectory") }}</h4>
        <p class="mt-2 text-sm text-white/50">
          {{ t("admin.content.mutableDirectoryHint") }}
        </p>
      </div>
      <div v-if="directoryAdmin.length === 0" class="text-white/30 text-sm py-4">
        {{ t("admin.content.noneDirectory") }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="item in directoryAdmin"
          :key="item.id"
          class="admin-list-item flex-col items-start"
        >
          <div class="flex items-center justify-between w-full">
            <div class="font-medium text-sm truncate">{{ item.title }}</div>
            <div class="flex items-center gap-2">
              <button v-if="enableResourceDetails" class="btn btn-ghost text-xs" @click="openServiceDetails(item)">{{ t("app.details") }}</button>
              <button class="btn btn-ghost text-xs" @click="deleteDirectoryItem(item)">{{ t("admin.spaces.delete") }}</button>
            </div>
          </div>
          <div class="text-[11px] text-white/40 mt-1 truncate">{{ item.url }}</div>
          <div class="flex items-center gap-2 mt-2 w-full">
            <span class="chip chip-muted">{{ item.type }}</span>
            <span v-if="item.serviceType" class="chip chip-muted">{{ item.serviceType }}</span>
            <span v-if="item.tier" class="chip chip-muted">{{ item.tier }}</span>
            <label class="flex items-center gap-2 text-[11px] text-white/50">
              <input v-model="item.pinned" type="checkbox" class="accent-white/70" />
              {{ t("admin.common.pinned") }}
            </label>
            <input v-model="item.description" class="input text-xs mt-2" placeholder="description" />
            <input
              v-model="item.icon_url"
              class="input text-xs mt-2"
              placeholder="printer or /icons/printer.svg"
              @blur="item.icon_url = normalizeIconUrl(item.icon_url)"
            />
            <input v-model="item.tagsInput" class="input text-xs mt-2" placeholder="tags" />
            <input v-model="item.actionKeysInput" class="input text-xs mt-2" placeholder="action keys" />
            <input v-model="item.audienceInput" class="input text-xs mt-2" placeholder="audience groups" />
            <button class="btn btn-ghost text-xs mt-2" @click="updateDirectoryItem(item)">{{ t("app.save") }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
