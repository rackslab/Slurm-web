<script setup lang="ts">
import SettingsLayout from '@/components/settings/SettingsLayout.vue'
import SettingsTabs from '@/components/settings/SettingsTabs.vue'
</script>

<template>
  <SettingsLayout>
    <SettingsTabs entry="General" />
    <div class="pt-16 px-4 sm:px-6 lg:px-8">General Settings</div>
  </SettingsLayout>
</template>
