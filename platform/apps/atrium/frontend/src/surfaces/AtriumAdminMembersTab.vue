<script setup>
defineProps({
  addMembership: { type: Function, required: true },
  importMemberships: { type: Function, required: true },
  membershipBulk: { type: Object, required: true },
  membershipForm: { type: Object, required: true },
  memberships: { type: Array, required: true },
  membershipSegmentOptions: { type: Array, required: true },
  membershipSpaceId: { type: [String, Number], default: "" },
  roles: { type: Array, required: true },
  spacesAdmin: { type: Array, required: true },
  t: { type: Function, required: true },
  updateMemberSegment: { type: Function, required: true },
  removeMembership: { type: Function, required: true }
});

const emit = defineEmits(["membership-space-change"]);

const onMembershipSpaceChange = (event) => {
  emit("membership-space-change", event.target.value);
};
</script>

<template>
  <div class="admin-card">
    <h4 class="font-medium mb-4">{{ t("admin.members.title") }}</h4>
    <div class="admin-grid-2 mb-6">
      <div class="space-y-3">
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.space") }}</label>
          <select :value="membershipSpaceId" class="select w-full text-sm" @change="onMembershipSpaceChange">
            <option value="">{{ t("admin.common.selectSpace") }}</option>
            <option v-for="space in spacesAdmin" :key="space.id" :value="space.id">
              {{ space.title }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.email") }}</label>
          <input v-model="membershipForm.email" class="input" :placeholder="t('admin.common.placeholder.email')" />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.role") }}</label>
          <select v-model="membershipForm.roleKey" class="select w-full text-sm">
            <option value="">{{ t("admin.common.selectRole") }}</option>
            <option v-for="role in roles" :key="role.key" :value="role.key">
              {{ role.name }} ({{ role.key }})
            </option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.segment") }}</label>
          <input
            v-model="membershipForm.userSegment"
            class="input"
            :placeholder="t('admin.common.placeholder.segment')"
            list="membership-segments"
          />
        </div>
        <div>
          <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.validUntil") }}</label>
          <input v-model="membershipForm.validTo" type="datetime-local" class="input" />
        </div>
        <button class="btn btn-primary w-full" @click="addMembership">{{ t("admin.members.add") }}</button>
      </div>
      <div class="space-y-3">
        <div class="text-[11px] text-white/40 uppercase tracking-wider">{{ t("admin.common.bulkImport") }}</div>
        <textarea v-model="membershipBulk.emails" class="input font-mono text-xs" rows="4" :placeholder="t('admin.common.placeholder.emails')"></textarea>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.role") }}</label>
            <select v-model="membershipBulk.roleKey" class="select w-full text-sm">
              <option value="">{{ t("admin.common.selectRole") }}</option>
              <option v-for="role in roles" :key="role.key" :value="role.key">
                {{ role.name }} ({{ role.key }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] text-white/40 uppercase tracking-wider mb-1.5">{{ t("admin.common.validUntil") }}</label>
            <input v-model="membershipBulk.validTo" type="datetime-local" class="input" />
          </div>
          <button class="btn btn-ghost w-full col-span-2" @click="importMemberships">{{ t("admin.common.import") }}</button>
        </div>
      </div>
    </div>
    <div v-if="memberships.length === 0" class="text-white/30 text-sm py-4">
      {{ t("admin.members.none") }}
    </div>
    <div v-else class="space-y-2">
      <datalist id="membership-segments">
        <option v-for="seg in membershipSegmentOptions" :key="seg" :value="seg"></option>
      </datalist>
      <div
        v-for="member in memberships"
        :key="`${member.principal_id}-${member.space_id}`"
        class="admin-list-item"
      >
        <div>
          <div class="font-medium text-sm">{{ member.email }}</div>
          <div class="text-[11px] text-white/40">
            {{ member.role_name }} · {{ member.role_key }}
            <span v-if="member.user_segment"> · {{ member.user_segment }}</span>
            <span v-if="member.valid_to"> · {{ t("admin.members.until", { date: new Date(member.valid_to).toLocaleString() }) }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="member.user_segment"
            class="input text-xs w-28"
            :placeholder="t('admin.segment')"
            list="membership-segments"
          />
          <button class="btn btn-ghost text-xs" @click="updateMemberSegment(member)">{{ t("app.save") }}</button>
          <button class="btn btn-ghost text-xs" @click="removeMembership(member)">{{ t("admin.common.remove") }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
