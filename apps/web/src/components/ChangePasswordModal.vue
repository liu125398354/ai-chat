<!--
  @file ChangePasswordModal.vue
  @author liunannan
  @date 2026-09-13
  @description 修改密码弹窗：校验后加密提交
-->

<template>
  <a-modal
    :open="open"
    title="修改密码"
    ok-text="保存"
    cancel-text="取消"
    :confirm-loading="submitting"
    destroy-on-close
    @ok="onOk"
    @cancel="onCancel"
  >
    <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
      <a-form-item label="原密码" name="oldPassword">
        <a-input-password v-model:value="form.oldPassword" autocomplete="current-password" :maxlength="128" />
      </a-form-item>
      <a-form-item label="新密码" name="newPassword">
        <a-input-password v-model:value="form.newPassword" autocomplete="new-password" :maxlength="128" />
      </a-form-item>
      <a-form-item label="确认新密码" name="confirmPassword">
        <a-input-password v-model:value="form.confirmPassword" autocomplete="new-password" :maxlength="128" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import { useAuthStore } from '@/stores/auth';
import { errorMessage } from '@/utils/axios-error';

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open']);

const auth = useAuthStore();
const submitting = ref(false);
const formRef = ref<FormInstance>();
const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const rules = {
  oldPassword: [{ required: true, message: '请输入原密码' }],
  newPassword: [
    { required: true, message: '请输入新密码' },
    { min: 8, max: 128, message: '新密码长度为 8–128 个字符' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码' },
    {
      validator: async (_rule: unknown, value: string) => {
        if (value && value !== form.newPassword) {
          throw new Error('两次输入的新密码不一致');
        }
      },
    },
  ],
};

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    form.oldPassword = '';
    form.newPassword = '';
    form.confirmPassword = '';
    formRef.value?.clearValidate?.();
  },
);

function onCancel() {
  emit('update:open', false);
}

async function onOk() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  submitting.value = true;
  try {
    await auth.changePassword(form.oldPassword, form.newPassword);
    message.success('密码已更新');
    emit('update:open', false);
  } catch (err) {
    message.error(errorMessage(err, '修改失败'));
  } finally {
    submitting.value = false;
  }
}
</script>
