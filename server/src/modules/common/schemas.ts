// Small reusable JSON schemas for Fastify request validation.
export const objectSchema = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object', additionalProperties: false, required, properties,
});
export const mobileSchema = { type: 'string', minLength: 9, maxLength: 16, pattern: '^\\+[1-9][0-9]{7,14}$' };
export const passwordSchema = { type: 'string', minLength: 12, maxLength: 128 };
export const otpSchema = { type: 'string', pattern: '^[0-9]{6}$' };
export const mobileBodySchema = objectSchema({ mobile: mobileSchema }, ['mobile']);
export const mobileCodeSchema = objectSchema({ mobile: mobileSchema, code: otpSchema }, ['mobile', 'code']);
export const registerSchema = objectSchema({
  displayName: { type: 'string', minLength: 2, maxLength: 80 },
  mobile: mobileSchema, password: passwordSchema,
}, ['displayName', 'mobile', 'password']);
export const loginSchema = objectSchema({
  mobile: mobileSchema, password: { type: 'string', minLength: 1, maxLength: 128 },
}, ['mobile', 'password']);
export const resetPasswordSchema = objectSchema({
  resetToken: { type: 'string', minLength: 40, maxLength: 100 },
  newPassword: passwordSchema,
}, ['resetToken', 'newPassword']);
export const changePasswordSchema = objectSchema({
  currentPassword: passwordSchema, newPassword: passwordSchema,
}, ['currentPassword', 'newPassword']);
export const changeMobileSchema = objectSchema({
  currentPassword: passwordSchema, newMobile: mobileSchema,
}, ['currentPassword', 'newMobile']);
export const confirmMobileSchema = objectSchema({
  newMobile: mobileSchema, code: otpSchema,
}, ['newMobile', 'code']);
export const sessionIdSchema = objectSchema({
  id: { type: 'string', format: 'uuid' },
}, ['id']);
